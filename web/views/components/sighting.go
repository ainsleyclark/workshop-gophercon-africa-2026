package components

import (
	"cmp"
	"fmt"
	"net/url"
	"path"
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

// Sized asks iNaturalist, which hosts most of the photos, for a smaller copy:
// "medium" is 500px and "large" 1024px. Other hosts' URLs come back as they are.
func Sized(link, size string) string {
	u, err := url.Parse(link)
	if err != nil || (u.Host != "inaturalist-open-data.s3.amazonaws.com" && u.Host != "static.inaturalist.org") {
		return link
	}
	dir, file := path.Split(u.Path)
	if !strings.HasPrefix(file, "original.") {
		return link
	}
	u.Path = dir + size + strings.TrimPrefix(file, "original")
	return u.String()
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
