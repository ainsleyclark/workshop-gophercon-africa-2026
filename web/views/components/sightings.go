package components

import (
	"cmp"
	"fmt"
	"math/rand/v2"
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

// Slide is one photo in the hero's rotating backdrop.
type Slide struct {
	URL   string
	Name  string
	Place string
	ID    string
}

// Slides picks up to n random sightings with a photo, one per animal.
func Slides(sightings []sighting.Sighting, n int) []Slide {
	slides := make([]Slide, 0, n)
	seen := make(map[string]bool)
	for _, i := range rand.Perm(len(sightings)) {
		s := sightings[i]
		photo, ok := Cover(s)
		if !ok || seen[Name(s)] {
			continue
		}
		seen[Name(s)] = true
		slides = append(slides, Slide{URL: photo.URL, Name: Name(s), Place: cmp.Or(s.Location.Country, "Somewhere wild"), ID: ItemID(s)})
		if len(slides) == n {
			break
		}
	}
	return slides
}

// CountryOption is a country in the search's dropdown.
type CountryOption struct {
	Name  string
	Code  string
	Count int
}

// CountryOptions lists every country with a sighting, most seen first.
func CountryOptions(sightings []sighting.Sighting) []CountryOption {
	codes := make(map[string]string)
	for _, s := range sightings {
		if s.Location.Country != "" && codes[s.Location.Country] == "" {
			codes[s.Location.Country] = s.Location.CountryCode.String()
		}
	}
	tallies := Countries(sightings)
	options := make([]CountryOption, len(tallies))
	for i, t := range tallies {
		options[i] = CountryOption{Name: t.Name, Code: codes[t.Name], Count: t.Count}
	}
	return options
}

// ItemID is the id of a sighting's place in the list, for links to it.
func ItemID(s sighting.Sighting) string { return "s-" + s.ID.String() }

// Name is the animal's name as the card shows it.
func Name(s sighting.Sighting) string { return displayName(s.Species) }

// ItemAttrs marks a list item with what the search and "similar" match on.
func ItemAttrs(s sighting.Sighting) templ.Attributes {
	return templ.Attributes{
		"id":           ItemID(s),
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

// SightingCount says how many sightings, in words.
func SightingCount(n int) string {
	if n == 1 {
		return "1 sighting"
	}
	return fmt.Sprintf("%d sightings", n)
}
