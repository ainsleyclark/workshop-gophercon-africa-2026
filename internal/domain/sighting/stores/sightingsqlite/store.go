package sightingsqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"uuid"
	"workshop/internal/domain/sighting"
	"workshop/internal/infra/db/sqlc"
	"workshop/internal/infra/db/sqlite"
)

// Store persists sightings using sqlc-generated SQLite queries.
type Store struct {
	queries db.Querier
}

var _ sighting.Store = (*Store)(nil)

// New constructs a sighting SQLite store.
func New(queries db.Querier) *Store {
	return &Store{queries: queries}
}

// Find returns the sighting for id, or sighting.ErrNotFound if it
// doesn't exist.
func (s Store) Find(ctx context.Context, id uuid.UUID) (sighting.Sighting, error) {
	row, err := s.queries.SightingFind(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return sighting.Sighting{}, sighting.ErrNotFound
	} else if err != nil {
		return sighting.Sighting{}, err
	}

	return transform(db.SightingListRow(row))
}

// FindByGbifKey returns the sighting for gbifKey, or
// sighting.ErrNotFound if it doesn't exist.
func (s Store) FindByGbifKey(ctx context.Context, gbifKey int) (sighting.Sighting, error) {
	row, err := s.queries.SightingFindByGbifKey(ctx, int64(gbifKey))
	if errors.Is(err, sql.ErrNoRows) {
		return sighting.Sighting{}, sighting.ErrNotFound
	} else if err != nil {
		return sighting.Sighting{}, err
	}

	return transform(db.SightingListRow(row))
}

// List returns every sighting matching filter.
func (s Store) List(ctx context.Context, filter sighting.ListFilter) ([]sighting.Sighting, error) {
	// The keys go in as one JSON array rather than through sqlc.slice, which
	// expands at runtime and throws SQLite's numbered placeholders out for
	// any argument after it, such as the limit.
	keys, err := json.Marshal(filter.TaxonKeys())
	if err != nil {
		return nil, err
	}

	// SQLite reads a negative limit as no limit.
	limit := int64(filter.Limit)
	if limit <= 0 {
		limit = -1
	}

	rows, err := s.queries.SightingList(ctx, db.SightingListParams{
		FromDate:    filter.FromDate,
		ToDate:      filter.ToDate,
		CountryCode: filter.Country.String(),
		AnySpecies:  len(filter.Animals) == 0,
		SpeciesKeys: string(keys),
		Limit:       limit,
	})
	if err != nil {
		return nil, err
	}

	result := make([]sighting.Sighting, len(rows))
	for i, row := range rows {
		result[i], err = transform(row)
		if err != nil {
			return nil, err
		}
	}

	return result, nil
}

// Create persists a new sighting under id, or returns
// sighting.ErrAlreadyExists if one is already there.
func (s Store) Create(ctx context.Context, id uuid.UUID, in sighting.CreateParams) (sighting.Sighting, error) {
	params, err := toSightingCreateParams(id, in)
	if err != nil {
		return sighting.Sighting{}, err
	}

	row, err := s.queries.SightingCreate(ctx, params)
	if sqlite.IsUniqueViolation(err) {
		return sighting.Sighting{}, sighting.ErrAlreadyExists
	} else if err != nil {
		return sighting.Sighting{}, err
	}

	// INSERT ... RETURNING cannot join, so the species and weather carry
	// only their IDs.
	return transform(db.SightingListRow{
		Sighting: row,
		Species:  db.Species{ID: row.SpeciesID},
		Weather:  db.Weather{ID: row.WeatherID},
	})
}
