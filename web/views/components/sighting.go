package components

import (
	"cmp"
	"fmt"
	"slices"
	"strings"
	"workshop/internal/domain/sighting"
	"workshop/internal/domain/species"

	"github.com/a-h/templ"
)

// DisplayName prefers the name a reader would recognise, falling back
// through the taxonomy as GBIF records thin out.
func DisplayName(sp species.Species) string {
	return cmp.Or(sp.VernacularName, sp.CanonicalName, sp.ScientificName, "Unknown species")
}

// Place joins whichever parts of the location GBIF supplied.
func Place(l sighting.Location) string {
	parts := slices.DeleteFunc(
		[]string{l.Locality, l.StateProvince, l.Country},
		func(s string) bool { return s == "" },
	)
	return cmp.Or(strings.Join(parts, ", "), "Location unknown")
}

// Individuals renders how many animals were seen in a single sighting.
func Individuals(n int) string {
	if n == 1 {
		return "1 individual"
	}
	return fmt.Sprintf("%d individuals", n)
}

// CoverPhoto returns the first still image of the sighting, if it has one.
func CoverPhoto(s sighting.Sighting) (sighting.Media, bool) {
	i := slices.IndexFunc(s.Media, func(m sighting.Media) bool { return m.Type == "StillImage" && m.URL != "" })
	if i < 0 {
		return sighting.Media{}, false
	}
	return s.Media[i], true
}

// SightingURL is the address of a sighting's own page.
func SightingURL(s sighting.Sighting) templ.SafeURL {
	return templ.URL("/sightings/" + s.ID.String())
}

func altText(m sighting.Media) string {
	return cmp.Or(m.Title, m.Description, "Sighting photo")
}

// credit names who took a photo, for the lightbox caption.
func credit(m sighting.Media) string {
	if m.Creator == "" {
		return ""
	}
	return "© " + m.Creator
}
