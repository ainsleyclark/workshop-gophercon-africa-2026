// Package atlas is the read side of the sightings: what has been seen in a
// country, species by species. It writes nothing; sightings arrive through
// the sighting domain's ingest.
package atlas

import (
	"context"
	"errors"
	"log/slog"
	"uuid"
	"workshop/internal/domain/sighting"
	"workshop/internal/domain/sighting/country"
	"workshop/internal/domain/species"
)

// Store defines the queries the atlas reads from.
type Store interface {
	List(ctx context.Context, filter ListFilter) ([]Entry, error)
	Taxa(ctx context.Context, code country.Code) ([]Taxon, error)
	IUCNCategories(ctx context.Context, code country.Code) ([]IUCNCategory, error)
	FindSpecies(ctx context.Context, gbifKey int) (species.Species, error)
	Observations(ctx context.Context, speciesID uuid.UUID, code country.Code, limit int) ([]sighting.Sighting, error)
	Summary(ctx context.Context, speciesID uuid.UUID, code country.Code) (Summary, error)
}

// Service is the entry point for reading the atlas.
type Service struct {
	logger *slog.Logger
	store  Store
}

// NewService returns a Service backed by the given store.
func NewService(logger *slog.Logger, store Store) *Service {
	return &Service{logger: logger, store: store}
}

// ErrNotFound is returned when a species has no sightings in the country
// asked about.
var ErrNotFound = errors.New("atlas: species not seen in this country")

const (
	defaultLimit = 12
	// maxLimit allows ten pages at once, which a reader without
	// JavaScript gets by following "load more".
	maxLimit = 120

	// maxObservations bounds the sightings a profile carries, so a common
	// species can't make a page, or the map on it, unboundedly large. Its
	// Summary still counts them all.
	maxObservations = 500
)

// List returns a page of the species seen in the filter's country.
func (s Service) List(ctx context.Context, filter ListFilter) (Page, error) {
	if filter.Limit <= 0 {
		filter.Limit = defaultLimit
	}
	filter.Limit = min(filter.Limit, maxLimit)
	filter.Offset = max(filter.Offset, 0)

	// One more than asked for says whether another page follows, without
	// counting every match.
	want := filter.Limit
	filter.Limit++

	entries, err := s.store.List(ctx, filter)
	if err != nil {
		return Page{}, err
	}

	page := Page{Entries: entries}
	if len(entries) > want {
		page.Entries, page.HasMore = entries[:want], true
	}

	return page, nil
}

// Facets returns the taxa and IUCN categories seen in a country.
func (s Service) Facets(ctx context.Context, code country.Code) (Facets, error) {
	taxa, err := s.store.Taxa(ctx, code)
	if err != nil {
		return Facets{}, err
	}

	categories, err := s.store.IUCNCategories(ctx, code)
	if err != nil {
		return Facets{}, err
	}

	return Facets{Taxa: taxa, IUCN: categories}, nil
}

// Profile returns a species and its sightings in a country, or
// ErrNotFound if it has none there.
func (s Service) Profile(ctx context.Context, code country.Code, gbifKey int) (Profile, error) {
	sp, err := s.store.FindSpecies(ctx, gbifKey)
	if errors.Is(err, species.ErrNotFound) {
		return Profile{}, ErrNotFound
	} else if err != nil {
		return Profile{}, err
	}

	observations, err := s.store.Observations(ctx, sp.ID, code, maxObservations)
	if err != nil {
		return Profile{}, err
	}
	if len(observations) == 0 {
		return Profile{}, ErrNotFound
	}

	summary, err := s.store.Summary(ctx, sp.ID, code)
	if err != nil {
		return Profile{}, err
	}

	profile := Profile{Species: sp, Summary: summary, Observations: observations}
	for _, o := range observations {
		if o.IUCNCategory != "" {
			profile.IUCN = IUCNCategory(o.IUCNCategory)
			break
		}
	}

	return profile, nil
}
