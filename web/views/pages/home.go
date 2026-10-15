package pages

import "workshop/internal/domain/sighting"

// topN keeps the first n tallies.
func topN(t []sighting.Tally, n int) []sighting.Tally {
	return t[:min(n, len(t))]
}
