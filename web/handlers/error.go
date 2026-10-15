package handlers

import (
	"context"
	"log/slog"
	"net/http"
	"workshop/web/views/components"
	"workshop/web/views/pages"

	"github.com/a-h/templ"
)

// render writes c with code as the response status, logging if rendering
// fails.
func render(ctx context.Context, w http.ResponseWriter, logger *slog.Logger, code int, c templ.Component) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(code)

	if err := c.Render(ctx, w); err != nil {
		logger.ErrorContext(ctx, "handlers: rendering: "+err.Error())
	}
}

// renderError writes code as the response status with message: as the
// error page, or, for HTMX, as an error in place of the results.
func renderError(ctx context.Context, w http.ResponseWriter, r *http.Request, logger *slog.Logger, site Site, code int, message string) {
	if isHTMX(r) {
		render(ctx, w, logger, code, components.ErrorState(message))
		return
	}
	render(ctx, w, logger, code, pages.Error(site.View, message, code))
}

// serverError logs err and renders a 500 that doesn't expose it.
func serverError(ctx context.Context, w http.ResponseWriter, r *http.Request, logger *slog.Logger, site Site, doing string, err error) {
	logger.ErrorContext(ctx, "handlers: "+doing+": "+err.Error())
	renderError(ctx, w, r, logger, site, http.StatusInternalServerError,
		"We couldn't load the atlas just now. Please try again in a moment.")
}
