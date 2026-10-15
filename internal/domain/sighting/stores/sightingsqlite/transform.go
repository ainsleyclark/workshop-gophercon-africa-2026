package sightingsqlite

import (
	"encoding/json"
	"fmt"
	"uuid"
	"workshop/internal/domain/sighting"
	"workshop/internal/domain/sighting/country"
	"workshop/internal/domain/species"
	"workshop/internal/domain/weather"
	"workshop/internal/infra/db/sqlc"
)

func transform(row db.SightingListRow) (sighting.Sighting, error) {
	r, sp, w := row.Sighting, row.Species, row.Weather

	var media []sighting.Media
	if err := json.Unmarshal([]byte(r.Media), &media); err != nil {
		return sighting.Sighting{}, fmt.Errorf("decode media: %w", err)
	}
	if media == nil {
		media = []sighting.Media{}
	}

	return sighting.Sighting{
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
		Species: species.Species{
			ID:             sp.ID,
			GBIFKey:        int(sp.GbifKey),
			Kingdom:        sp.Kingdom,
			Phylum:         sp.Phylum,
			Class:          sp.Class,
			Order:          sp.Order,
			Family:         sp.Family,
			Genus:          sp.Genus,
			Species:        sp.Species,
			Rank:           sp.Rank,
			ScientificName: sp.ScientificName,
			CanonicalName:  sp.CanonicalName,
			VernacularName: sp.VernacularName,
			CreatedAt:      sp.CreatedAt,
			UpdatedAt:      sp.UpdatedAt,
		},
		Weather: weather.Weather{
			ID:         w.ID,
			ObservedAt: w.ObservedAt,
			Temperature: weather.Temperature{
				Actual:   w.Temperature,
				Apparent: w.ApparentTemperature,
			},
			Precipitation: weather.Precipitation{
				Total:    w.Precipitation,
				Rain:     w.Rain,
				Snowfall: w.Snowfall,
			},
			Wind: weather.Wind{
				Speed:     w.WindSpeed,
				Gusts:     w.WindGusts,
				Direction: int(w.WindDirection),
			},
			Condition: weather.Condition{
				Code:        int(w.ConditionCode),
				Description: w.Condition,
			},
			CloudCover: int(w.CloudCover),
			Humidity:   int(w.Humidity),
			CreatedAt:  w.CreatedAt,
			UpdatedAt:  w.UpdatedAt,
		},
		Media:     media,
		CreatedAt: r.CreatedAt,
		UpdatedAt: r.UpdatedAt,
	}, nil
}

func toSightingCreateParams(id uuid.UUID, in sighting.CreateParams) (db.SightingCreateParams, error) {
	media := "[]"
	if len(in.Media) > 0 {
		encoded, err := json.Marshal(in.Media)
		if err != nil {
			return db.SightingCreateParams{}, fmt.Errorf("encode media: %w", err)
		}
		media = string(encoded)
	}

	return db.SightingCreateParams{
		ID:                            id,
		GbifKey:                       in.GBIFKey,
		OccurrenceID:                  in.OccurrenceID,
		HappenedAt:                    in.HappenedAt,
		BasisOfRecord:                 in.BasisOfRecord,
		RecordedBy:                    in.RecordedBy,
		IndividualCount:               in.IndividualCount,
		Remarks:                       in.Remarks,
		ReferenceUrl:                  in.ReferenceURL,
		Locality:                      in.Location.Locality,
		StateProvince:                 in.Location.StateProvince,
		Country:                       in.Location.Country,
		CountryCode:                   in.Location.CountryCode.String(),
		Latitude:                      in.Location.Latitude,
		Longitude:                     in.Location.Longitude,
		CoordinateUncertaintyInMetres: in.Location.CoordinateUncertaintyInMetres,
		ElevationInMetres:             in.Location.ElevationInMetres,
		SpeciesID:                     in.SpeciesID,
		WeatherID:                     in.WeatherID,
		Media:                         media,
		IucnCategory:                  in.IUCNCategory,
	}, nil
}
