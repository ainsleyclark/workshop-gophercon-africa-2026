package components

import (
	"fmt"
	"strings"

	"github.com/a-h/templ"

	"workshop/internal/domain/sighting"
)

// GlobePoint is a sighting as the globe draws it.
type GlobePoint struct {
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	Country string  `json:"country"`
}

// GlobePoints keeps the sightings that have a position.
func GlobePoints(sightings []sighting.Sighting) []GlobePoint {
	points := make([]GlobePoint, 0, len(sightings))
	for _, s := range sightings {
		c := s.Location.Coordinates
		if c.Latitude == 0 && c.Longitude == 0 {
			continue
		}
		points = append(points, GlobePoint{Lat: c.Latitude, Lng: c.Longitude, Country: s.Location.Country})
	}
	return points
}

// Countries lists every country with a sighting, most seen first.
func Countries(sightings []sighting.Sighting) []sighting.Tally {
	return sighting.Top(sighting.CountBy(sightings, func(s sighting.Sighting) string { return s.Location.Country }), 0)
}

// Cover is the sighting's first photo.
func Cover(s sighting.Sighting) (sighting.Media, bool) {
	for _, m := range s.Media {
		if m.Type == "StillImage" && m.URL != "" {
			return m, true
		}
	}
	return sighting.Media{}, false
}

// Featured is the first sighting with a photo.
func Featured(sightings []sighting.Sighting) (sighting.Sighting, bool) {
	for _, s := range sightings {
		if _, ok := Cover(s); ok {
			return s, true
		}
	}
	return sighting.Sighting{}, false
}

// Name is the animal's name as the card shows it.
func Name(s sighting.Sighting) string { return displayName(s.Species) }

// ItemAttrs marks a list item with what the search and "similar" match on.
func ItemAttrs(s sighting.Sighting) templ.Attributes {
	return templ.Attributes{
		"data-id":      s.ID.String(),
		"data-name":    displayName(s.Species),
		"data-country": strings.ToLower(s.Location.Country),
		"data-family":  s.Species.Family,
		"data-order":   s.Species.Order,
		"data-class":   s.Species.Class,
	}
}

func photoCount(s sighting.Sighting) int {
	n := 0
	for _, m := range s.Media {
		if m.Type == "StillImage" {
			n++
		}
	}
	return n
}

func gbifURL(s sighting.Sighting) templ.SafeURL {
	return templ.URL(fmt.Sprintf("https://www.gbif.org/occurrence/%d", s.GBIFKey))
}
