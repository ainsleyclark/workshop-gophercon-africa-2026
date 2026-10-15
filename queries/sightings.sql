-- name: SightingFind :one
SELECT sqlc.embed(sightings), sqlc.embed(species), sqlc.embed(weather)
FROM sightings
	JOIN species ON species.id = sightings.species_id
	JOIN weather ON weather.id = sightings.weather_id
WHERE sightings.id = ?;

-- name: SightingFindByGbifKey :one
SELECT sqlc.embed(sightings), sqlc.embed(species), sqlc.embed(weather)
FROM sightings
	JOIN species ON species.id = sightings.species_id
	JOIN weather ON weather.id = sightings.weather_id
WHERE sightings.gbif_key = ?;

-- name: SightingList :many
SELECT sqlc.embed(sightings), sqlc.embed(species), sqlc.embed(weather)
FROM sightings
	JOIN species ON species.id = sightings.species_id
	JOIN weather ON weather.id = sightings.weather_id
WHERE (sqlc.narg('from_date') IS NULL OR happened_at >= sqlc.narg('from_date'))
	AND (sqlc.narg('to_date') IS NULL OR happened_at <= sqlc.narg('to_date'))
	AND (sqlc.arg('country_code') = '' OR sightings.country_code = sqlc.arg('country_code'))
	AND (CAST(sqlc.arg('any_species') AS BOOLEAN) OR species.gbif_key IN (SELECT value FROM json_each(sqlc.arg('species_keys'))))
ORDER BY sightings.happened_at DESC, sightings.id DESC
LIMIT sqlc.arg('limit');

-- name: SightingCreate :one
INSERT INTO sightings (
	id,
	gbif_key,
	occurrence_id,
	happened_at,
	basis_of_record,
	recorded_by,
	individual_count,
	remarks,
	reference_url,
	locality,
	state_province,
	country,
	country_code,
	latitude,
	longitude,
	coordinate_uncertainty_in_metres,
	elevation_in_metres,
	species_id,
	weather_id,
	media
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *;

-- name: SightingUpdate :execrows
UPDATE sightings SET
	happened_at = ?,
	recorded_by = ?,
	individual_count = ?,
	remarks = ?,
	locality = ?,
	state_province = ?,
	country = ?,
	country_code = ?,
	latitude = ?,
	longitude = ?,
	species_id = ?,
	media = ?,
	updated_at = CURRENT_TIMESTAMP
WHERE id = ?;

-- name: SightingDelete :execrows
DELETE FROM sightings WHERE id = ?;
