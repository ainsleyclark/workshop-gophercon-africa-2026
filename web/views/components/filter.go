package components

import (
	"strconv"
	"strings"
	"workshop/internal/domain/sighting"

	"github.com/a-h/templ"
)

// Animal names the animal seen, as the card does.
func Animal(s sighting.Sighting) string { return DisplayName(s.Species) }

// Country is where it was seen.
func Country(s sighting.Sighting) string { return s.Location.Country }

// Year is when, to the year.
func Year(s sighting.Sighting) string { return strconv.Itoa(s.HappenedAt.Year()) }

// FilterOptions counts how often each key appears, keeping the n most common; 0 keeps all.
func FilterOptions(sightings []sighting.Sighting, n int, key func(sighting.Sighting) string) []sighting.Tally {
	return sighting.Top(sighting.CountBy(sightings, key), n)
}

// FilterAttrs marks a list item with what the filter matches and sorts on.
func FilterAttrs(s sighting.Sighting) templ.Attributes {
	return templ.Attributes{
		"data-animal":  Animal(s),
		"data-country": Country(s),
		"data-year":    Year(s),
		"data-name":    strings.ToLower(Animal(s)),
		"data-link":    "/sightings/" + s.ID.String(),
		"data-search": strings.ToLower(strings.Join([]string{
			Animal(s), s.Species.ScientificName, Place(s.Location), s.RecordedBy, s.Species.Family,
		}, " ")),
	}
}
