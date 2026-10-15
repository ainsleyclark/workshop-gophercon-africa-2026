package handlers

import (
	"context"
	"log/slog"
	"net/http"
	"workshop/internal/domain/sighting"
	"workshop/web/views/pages"
)

type SightingsLister interface {
	List(ctx context.Context, filter sighting.ListFilter) ([]sighting.Sighting, error)
}

func Home(logger *slog.Logger, sightings SightingsLister) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		items, err := sightings.List(ctx, sighting.ListFilter{})
		if err != nil {
			logger.ErrorContext(ctx, "handlers: listing sightings: "+err.Error())
			renderError(ctx, w, logger, http.StatusInternalServerError, "Unable to load sightings.")
			return
		}

		var notice string
		if r.URL.Query().Has("deleted") {
			notice = "The sighting was deleted."
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		err = pages.Home(pages.HomeProps{
			Sightings: items,
			Summary:   sighting.Summarise(items),
			Notice:    notice,
		}).Render(ctx, w)
		if err != nil {
			logger.ErrorContext(ctx, "handlers: rendering sightings: "+err.Error())
			renderError(ctx, w, logger, http.StatusInternalServerError, "Unable to render page.")
		}
	}
}

// NotFound renders the error page for any address no other route matches.
func NotFound(logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		renderError(r.Context(), w, logger, http.StatusNotFound, "We couldn't find the page you were looking for.")
	}
}
