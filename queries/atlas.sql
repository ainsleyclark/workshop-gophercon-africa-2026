-- name: AtlasSpeciesList :many
-- One row per species seen in a country, with how often and when it was
-- last seen, its IUCN category and the newest photo of it there.
SELECT
	sqlc.embed(species),
	CAST(count(sightings.id) AS INTEGER) AS sighting_count,
	CAST(max(sightings.happened_at) AS TEXT) AS last_seen,
	-- Every occurrence of a species carries the same category, or none,
	-- so max picks whichever one was recorded.
	CAST(max(sightings.iucn_category) AS TEXT) AS iucn_category,
	-- The first photo of the newest sighting with one, and where it was taken.
	CAST(coalesce((
		SELECT json_object(
			'media', json(json_extract(cover.media, '$[0]')),
			'locality', cover.locality,
			'stateProvince', cover.state_province
		)
		FROM sightings AS cover
		WHERE cover.species_id = species.id
			AND cover.country_code = sqlc.arg('country_code')
			AND json_array_length(cover.media) > 0
		ORDER BY cover.happened_at DESC
		LIMIT 1
	), '') AS TEXT) AS cover
FROM species
	JOIN sightings ON sightings.species_id = species.id
WHERE sightings.country_code = sqlc.arg('country_code')
	AND (CAST(sqlc.arg('class') AS TEXT) = '' OR species.class = sqlc.arg('class'))
	AND (CAST(sqlc.arg('order') AS TEXT) = '' OR species."order" = sqlc.arg('order'))
	AND (CAST(sqlc.arg('family') AS TEXT) = '' OR species.family = sqlc.arg('family'))
	AND (CAST(sqlc.arg('query') AS TEXT) = ''
		OR species.vernacular_name LIKE '%' || sqlc.arg('query') || '%'
		OR species.canonical_name LIKE '%' || sqlc.arg('query') || '%'
		OR species.scientific_name LIKE '%' || sqlc.arg('query') || '%')
GROUP BY species.id
HAVING CAST(sqlc.arg('iucn') AS TEXT) = '' OR max(sightings.iucn_category) = sqlc.arg('iucn')
ORDER BY sighting_count DESC, species.vernacular_name, species.canonical_name
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: AtlasTaxa :many
-- The class, order and family of every species seen in a country, for
-- building the filters.
SELECT DISTINCT species.class, species."order", species.family
FROM species
	JOIN sightings ON sightings.species_id = species.id
WHERE sightings.country_code = ?
ORDER BY species.class, species."order", species.family;

-- name: AtlasIUCNCategories :many
SELECT DISTINCT iucn_category
FROM sightings
WHERE country_code = ? AND iucn_category != ''
ORDER BY iucn_category;

-- name: AtlasSpeciesFind :one
SELECT * FROM species WHERE gbif_key = ?;

-- name: AtlasObservations :many
-- Every sighting of a species in a country, newest first.
SELECT *
FROM sightings
WHERE species_id = sqlc.arg('species_id') AND country_code = sqlc.arg('country_code')
ORDER BY happened_at DESC, id DESC
LIMIT sqlc.arg('limit');

-- name: AtlasObservationSummary :one
-- Totals over every sighting of a species in a country, however many
-- AtlasObservations returns.
SELECT
	CAST(count(*) AS INTEGER) AS sightings,
	CAST(coalesce(min(happened_at), '') AS TEXT) AS first_seen,
	CAST(coalesce(max(happened_at), '') AS TEXT) AS last_seen,
	CAST(count(DISTINCT nullif(state_province, '')) AS INTEGER) AS regions,
	CAST(coalesce(sum(individual_count), 0) AS INTEGER) AS individuals
FROM sightings
WHERE species_id = sqlc.arg('species_id') AND country_code = sqlc.arg('country_code');
