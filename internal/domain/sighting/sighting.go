package sighting

import (
	"context"
	"errors"
	"log/slog"
	"regexp"
	"strings"
	"time"
	"uuid"
	"workshop/internal/clients/gbif"
	"workshop/internal/clients/openmeteo"
	"workshop/internal/domain/species"
	"workshop/internal/domain/weather"
)

// Store defines the operations used to persist and query
// sighting data.
type Store interface {
	Find(ctx context.Context, id uuid.UUID) (Sighting, error)
	FindByGbifKey(ctx context.Context, gbifKey int) (Sighting, error)
	List(ctx context.Context, filter ListFilter) ([]Sighting, error)
	Create(ctx context.Context, id uuid.UUID, in CreateParams) (Sighting, error)
	Update(ctx context.Context, id uuid.UUID, in CreateParams) (Sighting, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// Service is the entry point for working with sighting data.
// Handlers and other domains should use this type instead
// of interacting with the store directly.
type Service struct {
	logger    *slog.Logger
	store     Store
	species   SpeciesReadWriter
	weather   WeatherWriter
	gbif      *gbif.Client
	openmeteo *openmeteo.Client
}

// NewService returns a Service backed by the given store.
func NewService(
	logger *slog.Logger,
	store Store,
	speciesSvc SpeciesReadWriter,
	weatherSvc WeatherWriter,
	gbifClient *gbif.Client,
	openMeteoClient *openmeteo.Client,
) *Service {
	return &Service{
		logger:    logger,
		store:     store,
		species:   speciesSvc,
		weather:   weatherSvc,
		gbif:      gbifClient,
		openmeteo: openMeteoClient,
	}
}

// SpeciesReadWriter is required by ingest to find species and
// create the ones that don't exist yet.
type SpeciesReadWriter interface {
	FindByGbifKey(ctx context.Context, gbifKey int) (species.Species, error)
	Create(ctx context.Context, params species.CreateParams) (species.Species, error)
}

// WeatherWriter is required by ingest to create weather records.
type WeatherWriter interface {
	Create(ctx context.Context, params weather.CreateParams) (weather.Weather, error)
}

var (
	// ErrNotFound represents an error where a sighting is
	// not found in the data store.
	ErrNotFound = errors.New("sighting not found")

	// ErrAlreadyExists represents an error where a sighting with
	// the same GBIF key is already in the data store.
	ErrAlreadyExists = errors.New("sighting already exists")

	// ErrInvalid represents an error where a sighting breaks
	// one of the rules in Validate.
	ErrInvalid = errors.New("invalid sighting")
)

// Find returns the sighting with the given ID, or ErrNotFound.
func (s Service) Find(ctx context.Context, id uuid.UUID) (Sighting, error) {
	sight, err := s.store.Find(ctx, id)
	if err != nil {
		return Sighting{}, err
	}

	sight.RecordedBy = observers(sight.RecordedBy)

	return sight, nil
}

// List returns the sightings matching the filter, with each one's
// observers tidied for reading.
func (s Service) List(ctx context.Context, filter ListFilter) ([]Sighting, error) {
	sightings, err := s.store.List(ctx, filter)
	if err != nil {
		return nil, err
	}

	for i := range sightings {
		sightings[i].RecordedBy = observers(sightings[i].RecordedBy)
	}

	return sightings, nil
}

// Create validates the params and assigns the sighting its identity
// before handing it to the store.
func (s Service) Create(ctx context.Context, params CreateParams) (Sighting, error) {
	if err := params.Validate(time.Now()); err != nil {
		return Sighting{}, err
	}

	return s.store.Create(ctx, uuid.New(), params)
}

// Record creates a sighting entered by hand rather than ingested from GBIF.
// It is given a negative GBIF key, which GBIF never issues, and a weather
// record marked as not recorded, since no reading was fetched for it.
func (s Service) Record(ctx context.Context, params CreateParams) (Sighting, error) {
	if params.GBIFKey == 0 {
		params.GBIFKey = -time.Now().UnixNano()
	}
	if err := params.Validate(time.Now()); err != nil {
		return Sighting{}, err
	}

	if params.WeatherID == uuid.Nil() {
		w, err := s.weather.Create(ctx, weather.CreateParams{
			ObservedAt: params.HappenedAt,
			Condition:  weather.Condition{Code: -1, Description: "Not recorded"},
		})
		if err != nil {
			return Sighting{}, err
		}
		params.WeatherID = w.ID
	}

	return s.store.Create(ctx, uuid.New(), params)
}

// Update validates the params and overwrites the sighting with id, or
// returns ErrNotFound.
func (s Service) Update(ctx context.Context, id uuid.UUID, params CreateParams) (Sighting, error) {
	if err := params.Validate(time.Now()); err != nil {
		return Sighting{}, err
	}

	sight, err := s.store.Update(ctx, id, params)
	if err != nil {
		return Sighting{}, err
	}

	sight.RecordedBy = observers(sight.RecordedBy)

	return sight, nil
}

// Delete removes the sighting with id, or returns ErrNotFound.
func (s Service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.store.Delete(ctx, id)
}

// observers turns GBIF's pipe-separated observer list into a readable,
// comma-separated one, stripping any bracketed collector ID GBIF tags a
// name with, e.g. "J. Smith [12345]".
func observers(raw string) string {
	if raw == "" {
		return ""
	}

	tag := regexp.MustCompile(`\s*\[[^\]]*\]`)

	names := strings.Split(raw, "|")
	for i, n := range names {
		names[i] = strings.TrimSpace(tag.ReplaceAllString(n, ""))
	}

	return strings.Join(names, ", ")
}
