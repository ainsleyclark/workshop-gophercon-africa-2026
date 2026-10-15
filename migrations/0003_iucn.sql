-- +goose Up
-- +goose StatementBegin
-- GBIF interprets an IUCN Red List category onto each occurrence, so it is
-- kept per sighting, as it arrives, and read per species when listing.
ALTER TABLE sightings ADD COLUMN iucn_category TEXT NOT NULL DEFAULT '';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE sightings DROP COLUMN iucn_category;
-- +goose StatementEnd
