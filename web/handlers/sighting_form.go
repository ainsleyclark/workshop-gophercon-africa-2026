package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"
	"uuid"
	"workshop/internal/domain/sighting"
	"workshop/web/views/pages"
)

type SightingRecorder interface {
	SightingsLister
	Record(ctx context.Context, params sighting.CreateParams) (sighting.Sighting, error)
}

type SightingEditor interface {
	SightingsLister
	SightingFinder
	Update(ctx context.Context, id uuid.UUID, params sighting.CreateParams) (sighting.Sighting, error)
}

func NewSighting(logger *slog.Logger, sightings SightingsLister) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		props := newFormProps()
		props.Values.HappenedAt = time.Now().UTC().Format(formTime)
		renderForm(w, r, logger, sightings, http.StatusOK, props)
	}
}

func CreateSighting(logger *slog.Logger, sightings SightingRecorder) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		props := newFormProps()
		props.Values = formValues(r)

		params, fieldErrs := parseForm(props.Values)
		if len(fieldErrs) > 0 {
			props.Errors = fieldErrs
			renderForm(w, r, logger, sightings, http.StatusUnprocessableEntity, props)
			return
		}
		if props.Values.PhotoURL != "" {
			params.Media = []sighting.Media{photo(props.Values.PhotoURL, params.RecordedBy)}
		}
		params.BasisOfRecord = "HUMAN_OBSERVATION"

		created, err := sightings.Record(ctx, params)
		if errors.Is(err, sighting.ErrInvalid) {
			props.Problems = problems(err)
			renderForm(w, r, logger, sightings, http.StatusUnprocessableEntity, props)
			return
		} else if err != nil {
			logger.ErrorContext(ctx, "handlers: creating sighting: "+err.Error())
			renderError(ctx, w, logger, http.StatusInternalServerError, "Unable to save the sighting.")
			return
		}

		http.Redirect(w, r, "/sightings/"+created.ID.String()+"?created=1", http.StatusSeeOther)
	}
}

func EditSighting(logger *slog.Logger, sightings SightingEditor) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		s, ok := findSighting(w, r, logger, sightings)
		if !ok {
			return
		}

		renderForm(w, r, logger, sightings, http.StatusOK, editFormProps(s, valuesOf(s)))
	}
}

func UpdateSighting(logger *slog.Logger, sightings SightingEditor) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		s, ok := findSighting(w, r, logger, sightings)
		if !ok {
			return
		}

		props := editFormProps(s, formValues(r))

		parsed, fieldErrs := parseForm(props.Values)
		if len(fieldErrs) > 0 {
			props.Errors = fieldErrs
			renderForm(w, r, logger, sightings, http.StatusUnprocessableEntity, props)
			return
		}

		params := s.CreateParams()
		params.SpeciesID = parsed.SpeciesID
		params.HappenedAt = parsed.HappenedAt
		params.RecordedBy = parsed.RecordedBy
		params.IndividualCount = parsed.IndividualCount
		params.Remarks = parsed.Remarks
		params.Location.Locality = parsed.Location.Locality
		params.Location.StateProvince = parsed.Location.StateProvince
		params.Location.Country = parsed.Location.Country
		params.Location.CountryCode = parsed.Location.CountryCode
		params.Location.Coordinates = parsed.Location.Coordinates
		params.Media = withPhoto(s, props.Values.PhotoURL)

		_, err := sightings.Update(ctx, s.ID, params)
		if errors.Is(err, sighting.ErrInvalid) {
			props.Problems = problems(err)
			renderForm(w, r, logger, sightings, http.StatusUnprocessableEntity, props)
			return
		} else if errors.Is(err, sighting.ErrNotFound) {
			renderError(ctx, w, logger, http.StatusNotFound, "That sighting doesn't exist.")
			return
		} else if err != nil {
			logger.ErrorContext(ctx, "handlers: updating sighting: "+err.Error())
			renderError(ctx, w, logger, http.StatusInternalServerError, "Unable to save the sighting.")
			return
		}

		http.Redirect(w, r, "/sightings/"+s.ID.String()+"?saved=1", http.StatusSeeOther)
	}
}

func newFormProps() pages.SightingFormProps {
	return pages.SightingFormProps{
		Heading: "Add a sighting",
		Intro:   "Spotted something? Record what you saw, where and when.",
		Action:  "/sightings",
		Submit:  "Add sighting",
		Cancel:  "/#sightings",
		Current: "new",
	}
}

func editFormProps(s sighting.Sighting, values pages.SightingFormValues) pages.SightingFormProps {
	url := "/sightings/" + s.ID.String()
	return pages.SightingFormProps{
		Heading: "Edit sighting",
		Intro:   "Correct or add to what was recorded.",
		Action:  url,
		Submit:  "Save changes",
		Cancel:  url,
		Values:  values,
	}
}

// renderForm writes the sighting form with the species seen so far to pick from.
func renderForm(w http.ResponseWriter, r *http.Request, logger *slog.Logger, sightings SightingsLister, code int, props pages.SightingFormProps) {
	ctx := r.Context()

	all, err := sightings.List(ctx, sighting.ListFilter{})
	if err != nil {
		logger.ErrorContext(ctx, "handlers: listing species: "+err.Error())
		renderError(ctx, w, logger, http.StatusInternalServerError, "Unable to load the form.")
		return
	}
	props.Species = speciesOf(all)
	props.MaxDate = time.Now().UTC().Format(formTime)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(code)
	if err = pages.SightingForm(props).Render(ctx, w); err != nil {
		logger.ErrorContext(ctx, "handlers: rendering sighting form: "+err.Error())
	}
}

// problems turns the domain's joined validation errors into sentences.
func problems(err error) []string {
	var out []string
	for line := range strings.SplitSeq(err.Error(), "\n") {
		line = strings.TrimPrefix(line, sighting.ErrInvalid.Error()+": ")
		if line != "" {
			out = append(out, strings.ToUpper(line[:1])+line[1:]+".")
		}
	}
	return out
}
