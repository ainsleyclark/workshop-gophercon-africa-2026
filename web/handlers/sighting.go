package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"uuid"
	"workshop/internal/domain/sighting"
	"workshop/web/views/pages"
)

type SightingFinder interface {
	Find(ctx context.Context, id uuid.UUID) (sighting.Sighting, error)
}

type SightingDeleter interface {
	Delete(ctx context.Context, id uuid.UUID) error
}

func Sighting(logger *slog.Logger, sightings SightingFinder) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		s, ok := findSighting(w, r, logger, sightings)
		if !ok {
			return
		}

		var notice string
		switch {
		case r.URL.Query().Has("created"):
			notice = "Your sighting was added."
		case r.URL.Query().Has("saved"):
			notice = "Your changes were saved."
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		if err := pages.Sighting(s, notice).Render(ctx, w); err != nil {
			logger.ErrorContext(ctx, "handlers: rendering sighting: "+err.Error())
			renderError(ctx, w, logger, http.StatusInternalServerError, "Unable to render page.")
		}
	}
}

func DeleteSighting(logger *slog.Logger, sightings SightingDeleter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		id, err := uuid.Parse(r.PathValue("id"))
		if err != nil {
			renderError(ctx, w, logger, http.StatusNotFound, "That sighting doesn't exist.")
			return
		}

		if err = sightings.Delete(ctx, id); errors.Is(err, sighting.ErrNotFound) {
			renderError(ctx, w, logger, http.StatusNotFound, "That sighting doesn't exist.")
			return
		} else if err != nil {
			logger.ErrorContext(ctx, "handlers: deleting sighting: "+err.Error())
			renderError(ctx, w, logger, http.StatusInternalServerError, "Unable to delete the sighting.")
			return
		}

		http.Redirect(w, r, "/?deleted=1#sightings", http.StatusSeeOther)
	}
}

// findSighting loads the sighting named by the path's id, writing the error
// page and returning false if it can't.
func findSighting(w http.ResponseWriter, r *http.Request, logger *slog.Logger, sightings SightingFinder) (sighting.Sighting, bool) {
	ctx := r.Context()

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		renderError(ctx, w, logger, http.StatusNotFound, "That sighting doesn't exist.")
		return sighting.Sighting{}, false
	}

	s, err := sightings.Find(ctx, id)
	if errors.Is(err, sighting.ErrNotFound) {
		renderError(ctx, w, logger, http.StatusNotFound, "That sighting doesn't exist.")
		return sighting.Sighting{}, false
	} else if err != nil {
		logger.ErrorContext(ctx, "handlers: finding sighting: "+err.Error())
		renderError(ctx, w, logger, http.StatusInternalServerError, "Unable to load the sighting.")
		return sighting.Sighting{}, false
	}

	return s, true
}
