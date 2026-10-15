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
