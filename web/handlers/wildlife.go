package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"slices"
	"strings"
	"time"
	"workshop/internal/domain/sighting"
	"workshop/internal/domain/species"
)

const mapObservationLimit = 5000

var showcaseAnimals = []species.Animal{
	species.AnimalSnowLeopard,
	species.AnimalTiger,
	species.AnimalGiantPanda,
	species.AnimalLion,
}

type wildlifeObservation struct {
	ID         string    `json:"id"`
	SpeciesID  string    `json:"speciesId"`
	HappenedAt time.Time `json:"happenedAt"`
	Latitude   float64   `json:"latitude"`
	Longitude  float64   `json:"longitude"`
	Locality   string    `json:"locality,omitempty"`
	Country    string    `json:"country"`
	ImageURL   string    `json:"imageUrl,omitempty"`
}

type SpeciesLister interface {
	List(ctx context.Context) ([]species.Species, error)
}

// Wildlife returns the database-backed species catalogue and observation
// locations used by the interactive showcase and its map.
func Wildlife(logger *slog.Logger, sightings SightingsLister, speciesSvc SpeciesLister) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		animals, err := speciesSvc.List(ctx)
		if err != nil {
			logger.ErrorContext(ctx, "handlers: listing species: "+err.Error())
			http.Error(w, "Unable to load species.", http.StatusInternalServerError)
			return
		}
		showcaseKeys := make(map[int]struct{})
		for _, animal := range showcaseAnimals {
			for _, key := range animal.TaxonKeys() {
				showcaseKeys[key] = struct{}{}
			}
		}
		animals = slices.DeleteFunc(animals, func(animal species.Species) bool {
			_, ok := showcaseKeys[animal.GBIFKey]
			return !ok
		})

		// The showcase only displays these four animals. Filter in SQLite so
		// loading the page doesn't decode and serialize thousands of unrelated
		// sighting, weather and media records before the UI can render.
		observations, err := sightings.List(ctx, sighting.ListFilter{
			Animals: showcaseAnimals,
			Limit:   mapObservationLimit,
		})
		if err != nil {
			logger.ErrorContext(ctx, "handlers: listing sightings: "+err.Error())
			http.Error(w, "Unable to load observations.", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		points := make([]wildlifeObservation, 0, len(observations))
		for _, observation := range observations {
			point := wildlifeObservation{
				ID:         observation.ID.String(),
				SpeciesID:  observation.Species.ID.String(),
				HappenedAt: observation.HappenedAt,
				Latitude:   observation.Location.Latitude,
				Longitude:  observation.Location.Longitude,
				Locality:   observation.Location.Locality,
				Country:    observation.Location.Country,
			}
			for _, media := range observation.Media {
				kind := strings.ToLower(media.Type + " " + media.Format)
				if strings.Contains(kind, "image") || strings.Contains(kind, "photo") || strings.Contains(kind, "jpeg") || strings.Contains(kind, "png") || strings.Contains(kind, "webp") {
					point.ImageURL = media.URL
					break
				}
			}
			points = append(points, point)
		}
		if err := json.NewEncoder(w).Encode(struct {
			Species      []species.Species     `json:"species"`
			Observations []wildlifeObservation `json:"observations"`
		}{Species: animals, Observations: points}); err != nil {
			logger.ErrorContext(ctx, "handlers: encoding wildlife: "+err.Error())
		}
	}
}
