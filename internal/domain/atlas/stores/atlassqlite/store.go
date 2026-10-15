package atlassqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"uuid"
	"workshop/internal/domain/atlas"
	"workshop/internal/domain/sighting"
	"workshop/internal/domain/sighting/country"
	"workshop/internal/domain/species"
	"workshop/internal/infra/db/sqlc"
)

// Store reads the atlas using sqlc-generated SQLite queries.
type Store struct {
	queries db.Querier
}

var _ atlas.Store = (*Store)(nil)

// New constructs an atlas SQLite store.
func New(queries db.Querier) *Store {
	return &Store{queries: queries}
}

// likeEscaper drops LIKE's wildcards from a search, so typing one
// matches nothing special.
var likeEscaper = strings.NewReplacer("%", "", "_", "")

// List returns the species matching filter, most seen first.
func (s Store) List(ctx context.Context, filter atlas.ListFilter) ([]atlas.Entry, error) {
	rows, err := s.queries.AtlasSpeciesList(ctx, db.AtlasSpeciesListParams{
		CountryCode: filter.Country.String(),
		Class:       filter.Class,
		Order:       filter.Order,
		Family:      filter.Family,
		Query:       likeEscaper.Replace(strings.TrimSpace(filter.Query)),
		Iucn:        string(filter.IUCN),
		Limit:       int64(filter.Limit),
		Offset:      int64(filter.Offset),
	})
	if err != nil {
		return nil, err
	}

	entries := make([]atlas.Entry, len(rows))
	for i, row := range rows {
		var cover atlas.Cover
		if row.Cover != "" {
			if err := json.Unmarshal([]byte(row.Cover), &cover); err != nil {
				return nil, fmt.Errorf("decode cover: %w", err)
			}
		}
		entries[i] = atlas.Entry{
			Species:       toSpecies(row.Species),
			SightingCount: int(row.SightingCount),
			LastSeen:      parseTime(row.LastSeen),
			IUCN:          atlas.IUCNCategory(row.IucnCategory),
			Cover:         cover,
		}
	}

	return entries, nil
}

// Taxa returns every class, order and family seen in a country.
func (s Store) Taxa(ctx context.Context, code country.Code) ([]atlas.Taxon, error) {
	rows, err := s.queries.AtlasTaxa(ctx, code.String())
	if err != nil {
		return nil, err
	}

	taxa := make([]atlas.Taxon, len(rows))
	for i, row := range rows {
		taxa[i] = atlas.Taxon{Class: row.Class, Order: row.Order, Family: row.Family}
	}

	return taxa, nil
}

// IUCNCategories returns every category recorded in a country.
func (s Store) IUCNCategories(ctx context.Context, code country.Code) ([]atlas.IUCNCategory, error) {
	rows, err := s.queries.AtlasIUCNCategories(ctx, code.String())
	if err != nil {
		return nil, err
	}

	out := make([]atlas.IUCNCategory, len(rows))
	for i, row := range rows {
		out[i] = atlas.IUCNCategory(row)
	}

	return out, nil
}

// FindSpecies returns the species for gbifKey, or species.ErrNotFound.
func (s Store) FindSpecies(ctx context.Context, gbifKey int) (species.Species, error) {
	row, err := s.queries.AtlasSpeciesFind(ctx, int64(gbifKey))
	if errors.Is(err, sql.ErrNoRows) {
		return species.Species{}, species.ErrNotFound
	} else if err != nil {
		return species.Species{}, err
	}

	return toSpecies(row), nil
}

// Observations returns up to limit sightings of a species in a country,
// newest first. They carry no species or weather, which a profile has no
// use for.
func (s Store) Observations(ctx context.Context, speciesID uuid.UUID, code country.Code, limit int) ([]sighting.Sighting, error) {
	rows, err := s.queries.AtlasObservations(ctx, db.AtlasObservationsParams{
		SpeciesID:   speciesID,
		CountryCode: code.String(),
		Limit:       int64(limit),
	})
	if err != nil {
		return nil, err
	}

	out := make([]sighting.Sighting, len(rows))
	for i, r := range rows {
		var media []sighting.Media
		if err := json.Unmarshal([]byte(r.Media), &media); err != nil {
			return nil, fmt.Errorf("decode media: %w", err)
		}

		out[i] = sighting.Sighting{
			ID:              r.ID,
			GBIFKey:         r.GbifKey,
			OccurrenceID:    r.OccurrenceID,
			HappenedAt:      r.HappenedAt,
			BasisOfRecord:   r.BasisOfRecord,
			RecordedBy:      r.RecordedBy,
			IndividualCount: r.IndividualCount,
			Remarks:         r.Remarks,
			ReferenceURL:    r.ReferenceUrl,
			IUCNCategory:    r.IucnCategory,
			Location: sighting.Location{
				Locality:      r.Locality,
				StateProvince: r.StateProvince,
				Country:       r.Country,
				CountryCode:   country.Code(r.CountryCode),
				Coordinates: sighting.Coordinates{
					Latitude:  r.Latitude,
					Longitude: r.Longitude,
				},
				CoordinateUncertaintyInMetres: r.CoordinateUncertaintyInMetres,
				ElevationInMetres:             r.ElevationInMetres,
			},
			Media:     media,
			CreatedAt: r.CreatedAt,
			UpdatedAt: r.UpdatedAt,
		}
	}

	return out, nil
}

// Summary totals every sighting of a species in a country.
func (s Store) Summary(ctx context.Context, speciesID uuid.UUID, code country.Code) (atlas.Summary, error) {
	row, err := s.queries.AtlasObservationSummary(ctx, db.AtlasObservationSummaryParams{
		SpeciesID:   speciesID,
		CountryCode: code.String(),
	})
	if err != nil {
		return atlas.Summary{}, err
	}

	return atlas.Summary{
		Sightings:   int(row.Sightings),
		FirstSeen:   parseTime(row.FirstSeen),
		LastSeen:    parseTime(row.LastSeen),
		Regions:     int(row.Regions),
		Individuals: int(row.Individuals),
	}, nil
}

func toSpecies(r db.Species) species.Species {
	return species.Species{
		ID:             r.ID,
		GBIFKey:        int(r.GbifKey),
		Kingdom:        r.Kingdom,
		Phylum:         r.Phylum,
		Class:          r.Class,
		Order:          r.Order,
		Family:         r.Family,
		Genus:          r.Genus,
		Species:        r.Species,
		Rank:           r.Rank,
		ScientificName: r.ScientificName,
		CanonicalName:  r.CanonicalName,
		VernacularName: r.VernacularName,
		CreatedAt:      r.CreatedAt,
		UpdatedAt:      r.UpdatedAt,
	}
}

// parseTime reads a DATETIME that came back through an aggregate, which
// the driver returns as the text it stored rather than a time.Time.
func parseTime(v string) time.Time {
	for _, layout := range []string{
		"2006-01-02 15:04:05.999999999 -0700 MST",
		time.RFC3339Nano,
		time.DateTime,
	} {
		if t, err := time.Parse(layout, v); err == nil {
			return t
		}
	}
	return time.Time{}
}
