package sighting

import (
	"context"
	"errors"
	"log/slog"
	"time"
	"uuid"
	"workshop/internal/clients/gbif"
	"workshop/internal/clients/openmeteo"
	"workshop/internal/domain/sighting/country"
	"workshop/internal/domain/species"
	"workshop/internal/domain/weather"
)

// IngestRequest is used to configure the ingest process. It is written
// in the application's own terms; turning it into a GBIF search is done
// once, in searchArgs.
type IngestRequest struct {
	// Limit is the total number of occurrences to fetch, across pages.
	Limit int

	// Offset is the number of occurrences to skip, starting from zero.
	Offset int

	// Country restricts the search to one country.
	Country country.Code

	// Animals restricts the search to the taxa these animals stand for.
	Animals []species.Animal

	// Latitude, Longitude and RadiusMiles restrict the search to a circle.
	Latitude    float64
	Longitude   float64
	RadiusMiles float64

	// DateFrom and DateTo restrict the search to a period.
	DateFrom time.Time
	DateTo   time.Time

	// If any of these functions returns true, the occurrence
	// will not be ingested.
	Skippers []IngestShouldSkipFn

	// OnPage, if set, is called after each page is fetched from
	// GBIF with the number of results seen so far and the total
	// number of matching occurrences. Useful for progress output.
	OnPage func(fetched int, total int64)
}

// IngestResult summarises what happened during an ingest.
type IngestResult struct {
	Created    []Sighting `json:"created"`    // Holds the sightings that were saved.
	Fetched    int        `json:"fetched"`    // The number of occurrences returned by GBIF.
	Skipped    int        `json:"skipped"`    // The number of occurrences rejected by a skipper.
	Duplicates int        `json:"duplicates"` // The number of occurrences already in the store.
	Failed     int        `json:"failed"`     // The number of occurrences that errored.
}

// IngestShouldSkipFn determines if an occurrence should be skipped.
type IngestShouldSkipFn func(occurrence gbif.Occurrence) bool

// ErrIngestNoResults is returned when no results are found
// when calling the GBIF API.
var ErrIngestNoResults = errors.New("no results found")

// searchArgs renders the request as a GBIF occurrence search.
func (r IngestRequest) searchArgs() gbif.OccurrencesSearchArgs {
	return gbif.OccurrencesSearchArgs{
		Limit:       r.Limit,
		Offset:      r.Offset,
		Country:     r.Country.String(),
		Latitude:    r.Latitude,
		Longitude:   r.Longitude,
		RadiusMiles: r.RadiusMiles,
		DateFrom:    r.DateFrom,
		DateTo:      r.DateTo,
		TaxonKeys:   taxonKeys(r.Animals),
	}
}

// Ingest fetches occurrences from GBIF and saves them as sightings,
// creating any species that don't exist yet.
func (s Service) Ingest(ctx context.Context, req IngestRequest) (IngestResult, error) {
	remaining := req.Limit
	out := IngestResult{Created: make([]Sighting, 0)}

	for {
		if remaining > 0 {
			req.Limit = min(remaining, 300)
		}

		res, err := s.gbif.Occurrences(ctx, req.searchArgs())
		if err != nil {
			return out, err
		} else if res.Count == 0 && out.Fetched == 0 {
			return out, ErrIngestNoResults
		}

		s.logger.DebugContext(ctx, "Discovered results from GBIF occurrences endpoint",
			slog.Int64("count", res.Count),
			slog.Int("offset", res.Offset),
			slog.Int("limit", res.Limit),
			slog.Bool("end", res.EndOfRecords),
		)

	result:
		for _, v := range res.Results {
			// Check if we're allowed to add the occurrence.
			for _, shouldSkip := range req.Skippers {
				if shouldSkip(v) {
					out.Skipped++
					continue result
				}
			}

			// Find or save the species it belongs to.
			speciesID, err := s.speciesPerSighting(ctx, v)
			if err != nil {
				s.logger.ErrorContext(ctx, "Resolving species", "species_key", v.SpeciesKey, "error", err)
				out.Failed++
				continue result
			}

			// Record the weather where and when it happened.
			weatherID, err := s.weatherPerSighting(ctx, v)
			if err != nil {
				s.logger.ErrorContext(ctx, "Resolving weather", "gbif_key", v.Key, "error", err)
				out.Failed++
				continue result
			}

			newSighting, err := s.saveSighting(ctx, v, speciesID, weatherID)
			if errors.Is(err, ErrAlreadyExists) {
				s.logger.DebugContext(ctx, "Sighting already exists, skipping", "gbif_key", v.Key)
				out.Duplicates++
				continue result
			} else if err != nil {
				out.Failed++
				continue result
			}

			s.logger.DebugContext(ctx, "Sighting created",
				slog.String("sighting_id", newSighting.ID.String()),
			)

			out.Created = append(out.Created, newSighting)
		}

		out.Fetched += len(res.Results)
		if req.OnPage != nil {
			req.OnPage(out.Fetched, res.Count)
		}

		remaining -= len(res.Results)
		if remaining <= 0 || res.EndOfRecords || len(res.Results) == 0 {
			break
		}

		req.Offset += len(res.Results)
	}

	s.logger.InfoContext(ctx, "Successfully ingested sightings",
		slog.Int("count", len(out.Created)),
	)

	return out, nil
}

// speciesPerSighting returns the ID of the occurrence's species, fetching
// it from GBIF the first time it is seen.
func (s Service) speciesPerSighting(ctx context.Context, v gbif.Occurrence) (uuid.UUID, error) {
	found, err := s.species.FindByGbifKey(ctx, v.SpeciesKey)
	switch {
	case err == nil:
		return found.ID, nil
	case !errors.Is(err, species.ErrNotFound):
		return uuid.Nil(), err
	}

	// Not seen before, so ask GBIF for it and keep it.
	gbifSpecies, err := s.gbif.Species(ctx, v.SpeciesKey)
	if err != nil {
		return uuid.Nil(), err
	}

	created, err := s.species.Create(ctx, species.CreateParams{
		GBIFKey:        gbifSpecies.Key,
		Kingdom:        gbifSpecies.Kingdom,
		Phylum:         gbifSpecies.Phylum,
		Class:          gbifSpecies.Class,
		Order:          gbifSpecies.Order,
		Family:         gbifSpecies.Family,
		Genus:          gbifSpecies.Genus,
		Species:        gbifSpecies.Species,
		Rank:           gbifSpecies.Rank,
		ScientificName: gbifSpecies.ScientificName,
		CanonicalName:  gbifSpecies.CanonicalName,
		VernacularName: gbifSpecies.VernacularName,
	})
	if err != nil {
		return uuid.Nil(), err
	}

	return created.ID, nil
}

// weatherPerSighting records the conditions where and when it happened.
func (s Service) weatherPerSighting(ctx context.Context, v gbif.Occurrence) (uuid.UUID, error) {
	reading, err := s.openmeteo.Reading(ctx, openmeteo.Request{
		Coordinates: openmeteo.Coordinates{
			Latitude:  v.DecimalLatitude,
			Longitude: v.DecimalLongitude,
		},
		Time: v.EventDate,
	})
	if err != nil {
		return uuid.Nil(), err
	}

	created, err := s.weather.Create(ctx, weather.CreateParams{
		ObservedAt: reading.Time,
		Temperature: weather.Temperature{
			Actual:   reading.Temperature,
			Apparent: reading.ApparentTemperature,
		},
		Precipitation: weather.Precipitation{
			Total:    reading.Precipitation,
			Rain:     reading.Rain,
			Snowfall: reading.Snowfall,
		},
		Wind: weather.Wind{
			Speed:     reading.WindSpeed,
			Gusts:     reading.WindGusts,
			Direction: reading.WindDirection,
		},
		Condition: weather.Condition{
			Code:        int(reading.Code),
			Description: reading.Code.String(),
		},
		CloudCover: reading.CloudCover,
		Humidity:   reading.Humidity,
	})
	if err != nil {
		return uuid.Nil(), err
	}

	return created.ID, nil
}

// saveSighting parses the occurrence's location and media, and stores the
// sighting pointing at the species and weather already gathered.
func (s Service) saveSighting(ctx context.Context, v gbif.Occurrence, speciesID, weatherID uuid.UUID) (Sighting, error) {
	coordinates, err := ParseCoordinates(v.DecimalLatitude, v.DecimalLongitude)
	if err != nil {
		s.logger.ErrorContext(ctx, "Parsing coordinates", "gbif_key", v.Key, "error", err)
		return Sighting{}, err
	}

	countryCode, err := country.Parse(v.CountryCode)
	if err != nil {
		s.logger.ErrorContext(ctx, "Parsing country code", "gbif_key", v.Key, "error", err)
		return Sighting{}, err
	}

	created, err := s.Create(ctx, CreateParams{
		GBIFKey:         v.Key,
		OccurrenceID:    v.OccurrenceID,
		HappenedAt:      v.EventDate,
		BasisOfRecord:   v.BasisOfRecord,
		RecordedBy:      v.RecordedBy,
		IndividualCount: v.IndividualCount,
		Remarks:         v.OccurrenceRemarks,
		ReferenceURL:    v.References,
		IUCNCategory:    v.IucnRedListCategory,
		Location: Location{
			Country:                       v.Country,
			CountryCode:                   countryCode,
			StateProvince:                 v.StateProvince,
			Locality:                      v.Locality,
			Coordinates:                   coordinates,
			CoordinateUncertaintyInMetres: v.CoordinateUncertaintyInMeters,
			ElevationInMetres:             v.Elevation,
		},
		SpeciesID: speciesID,
		WeatherID: weatherID,
		Media:     mediaPerSighting(v),
	})
	if err != nil {
		// A duplicate is expected on re-ingest, so the caller counts it
		// rather than treating it as a failure.
		if !errors.Is(err, ErrAlreadyExists) {
			s.logger.ErrorContext(ctx, "Creating sighting", "gbif_key", v.Key, "error", err)
		}
		return Sighting{}, err
	}

	return created, nil
}

// mediaPerSighting copies the occurrence's media, giving each item an ID
// of its own.
func mediaPerSighting(v gbif.Occurrence) []Media {
	out := make([]Media, 0, len(v.Media))
	for _, item := range v.Media {
		out = append(out, Media{
			ID:           uuid.New(),
			Type:         item.Type,
			Format:       item.Format,
			URL:          item.Identifier,
			Title:        item.Title,
			Description:  item.Description,
			Created:      item.Created,
			Creator:      item.Creator,
			License:      item.License,
			RightsHolder: item.RightsHolder,
		})
	}

	return out
}
