package pages

import (
	"fmt"
	"workshop/internal/domain/sighting"
	"workshop/internal/domain/species"
	"workshop/internal/domain/weather"
	"workshop/web/views/components"
)

// dateSpan describes the years the sightings cover.
func dateSpan(s sighting.Summary) string {
	if s.Earliest.IsZero() || s.Latest.IsZero() {
		return ""
	}
	if s.Earliest.Year() == s.Latest.Year() {
		return fmt.Sprintf("Seen in %d", s.Latest.Year())
	}
	return fmt.Sprintf("Seen between %d and %d, newest first", s.Earliest.Year(), s.Latest.Year())
}

// hasWeather reports whether a reading was fetched for the sighting.
func hasWeather(w weather.Weather) bool {
	return !w.ObservedAt.IsZero() && w.Condition.Code >= 0
}

// coordinates formats a position to five decimal places, about a metre.
func coordinates(c sighting.Coordinates) string {
	return fmt.Sprintf("%.5f, %.5f", c.Latitude, c.Longitude)
}

// mapURL links to OpenStreetMap centred on the position.
func mapURL(c sighting.Coordinates) string {
	return fmt.Sprintf("https://www.openstreetmap.org/?mlat=%f&mlon=%f#map=11/%f/%f", c.Latitude, c.Longitude, c.Latitude, c.Longitude)
}

// temperature renders a reading in degrees Celsius.
func temperature(t weather.Temperature) string {
	return fmt.Sprintf("%.0f°C, feels like %.0f°C", t.Actual, t.Apparent)
}

// speciesLabel names a species in the form's picker.
func speciesLabel(sp species.Species) string {
	name := components.DisplayName(sp)
	if sp.ScientificName != "" && sp.ScientificName != name {
		return name + " (" + sp.ScientificName + ")"
	}
	return name
}

// heroPhotos picks up to n sightings with a photo, one per species, newest first.
func heroPhotos(sightings []sighting.Sighting, n int) []sighting.Sighting {
	seen := map[string]bool{}
	var out []sighting.Sighting
	for _, s := range sightings {
		name := components.DisplayName(s.Species)
		if _, ok := components.CoverPhoto(s); !ok || seen[name] {
			continue
		}
		seen[name] = true
		out = append(out, s)
		if len(out) == n {
			break
		}
	}
	return out
}

// half returns the first or second half of the photos, one per marquee row.
func half(photos []sighting.Sighting, which int) []sighting.Sighting {
	mid := (len(photos) + 1) / 2
	if which == 0 {
		return photos[:mid]
	}
	return photos[mid:]
}

// spotlight is the newest sighting with a photo.
func spotlight(sightings []sighting.Sighting) (sighting.Sighting, bool) {
	for _, s := range sightings {
		if _, ok := components.CoverPhoto(s); ok {
			return s, true
		}
	}
	return sighting.Sighting{}, false
}
