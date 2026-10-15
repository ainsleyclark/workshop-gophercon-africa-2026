package handlers

import (
	"cmp"
	"net/http"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"time"
	"uuid"
	"workshop/internal/domain/sighting"
	"workshop/internal/domain/sighting/country"
	"workshop/internal/domain/species"
	"workshop/web/views/components"
	"workshop/web/views/pages"
)

// formTime is the layout of a datetime-local input's value.
const formTime = "2006-01-02T15:04"

// formValues reads the submitted sighting form, trimmed.
func formValues(r *http.Request) pages.SightingFormValues {
	v := func(name string) string { return strings.TrimSpace(r.PostFormValue(name)) }
	return pages.SightingFormValues{
		SpeciesID:       v("species_id"),
		HappenedAt:      v("happened_at"),
		RecordedBy:      v("recorded_by"),
		IndividualCount: v("individual_count"),
		Locality:        v("locality"),
		StateProvince:   v("state_province"),
		Country:         v("country"),
		CountryCode:     v("country_code"),
		Latitude:        v("latitude"),
		Longitude:       v("longitude"),
		PhotoURL:        v("photo_url"),
		Remarks:         v("remarks"),
	}
}

// valuesOf fills the form from a saved sighting.
func valuesOf(s sighting.Sighting) pages.SightingFormValues {
	values := pages.SightingFormValues{
		SpeciesID:     s.Species.ID.String(),
		HappenedAt:    s.HappenedAt.UTC().Format(formTime),
		RecordedBy:    s.RecordedBy,
		Locality:      s.Location.Locality,
		StateProvince: s.Location.StateProvince,
		Country:       s.Location.Country,
		CountryCode:   s.Location.CountryCode.String(),
		Latitude:      strconv.FormatFloat(s.Location.Latitude, 'f', -1, 64),
		Longitude:     strconv.FormatFloat(s.Location.Longitude, 'f', -1, 64),
		Remarks:       s.Remarks,
	}
	if s.IndividualCount != nil {
		values.IndividualCount = strconv.Itoa(*s.IndividualCount)
	}
	if p, ok := components.CoverPhoto(s); ok {
		values.PhotoURL = p.URL
	}
	return values
}

// parseForm turns the form into params, with a message for each field it couldn't read.
func parseForm(v pages.SightingFormValues) (sighting.CreateParams, map[string]string) {
	errs := map[string]string{}
	var params sighting.CreateParams

	if id, err := uuid.Parse(v.SpeciesID); err != nil {
		errs["species_id"] = "Choose the species you saw."
	} else {
		params.SpeciesID = id
	}

	if at, err := time.ParseInLocation(formTime, v.HappenedAt, time.UTC); err != nil {
		errs["happened_at"] = "Give the date and time of the sighting."
	} else if at.After(time.Now()) {
		errs["happened_at"] = "The sighting can't be in the future."
	} else {
		params.HappenedAt = at
	}

	if v.IndividualCount != "" {
		if n, err := strconv.Atoi(v.IndividualCount); err != nil || n < 0 {
			errs["individual_count"] = "Use a whole number, 0 or more."
		} else {
			params.IndividualCount = &n
		}
	}

	lat, latErr := strconv.ParseFloat(v.Latitude, 64)
	if latErr != nil || lat < -90 || lat > 90 {
		errs["latitude"] = "Use a number between -90 and 90."
	}
	lng, lngErr := strconv.ParseFloat(v.Longitude, 64)
	if lngErr != nil || lng < -180 || lng > 180 {
		errs["longitude"] = "Use a number between -180 and 180."
	}
	if coords, err := sighting.ParseCoordinates(lat, lng); err == nil {
		params.Location.Coordinates = coords
	}

	if code, err := country.Parse(v.CountryCode); err != nil {
		errs["country_code"] = "Use a two-letter code, such as KE."
	} else {
		params.Location.CountryCode = code
	}

	if v.PhotoURL != "" {
		if u, err := url.Parse(v.PhotoURL); err != nil || (u.Scheme != "https" && u.Scheme != "http") || u.Host == "" {
			errs["photo_url"] = "Use a full web address starting with https://."
		}
	}

	params.RecordedBy = v.RecordedBy
	params.Remarks = v.Remarks
	params.Location.Locality = v.Locality
	params.Location.StateProvince = v.StateProvince
	params.Location.Country = v.Country

	return params, errs
}

// photo is a still image added through the form.
func photo(link, creator string) sighting.Media {
	return sighting.Media{
		ID:      uuid.New(),
		Type:    "StillImage",
		URL:     link,
		Creator: creator,
		Created: time.Now().UTC(),
	}
}

// withPhoto swaps the sighting's cover photo for link, or drops it if link is empty.
func withPhoto(s sighting.Sighting, link string) []sighting.Media {
	cover, ok := components.CoverPhoto(s)
	if ok && cover.URL == link {
		return s.Media
	}

	media := slices.DeleteFunc(slices.Clone(s.Media), func(m sighting.Media) bool { return ok && m.ID == cover.ID })
	if link == "" {
		return media
	}
	return append([]sighting.Media{photo(link, s.RecordedBy)}, media...)
}

// speciesOf lists each species once, by name.
func speciesOf(sightings []sighting.Sighting) []species.Species {
	seen := map[uuid.UUID]bool{}
	var out []species.Species
	for _, s := range sightings {
		if !seen[s.Species.ID] {
			seen[s.Species.ID] = true
			out = append(out, s.Species)
		}
	}
	slices.SortFunc(out, func(a, b species.Species) int {
		return cmp.Compare(strings.ToLower(components.DisplayName(a)), strings.ToLower(components.DisplayName(b)))
	})
	return out
}
