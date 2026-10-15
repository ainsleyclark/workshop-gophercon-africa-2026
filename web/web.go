package web

import (
	"embed"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"workshop/internal/domain/sighting"
	"workshop/internal/infra/config"
	"workshop/web/handlers"
)

//go:generate go tool templ generate ./...

// assets holds the static files served under /assets.
// Note: The embedded paths keep their "assets/" prefix.
//
//go:embed assets
var assets embed.FS

// domain.SightingStore
// sighting.Store

// New returns a ServeMux serving the static assets and handler's patterns.
func New(logger *slog.Logger, config config.Config, sightingsSvc *sighting.Service) *http.ServeMux {
	mux := http.NewServeMux()

	mux.Handle("GET /assets/", http.FileServerFS(assetsFs(config.IsProduction())))
	mux.Handle("GET /{$}", handlers.Home(logger, sightingsSvc))
	mux.Handle("GET /sightings/new", handlers.NewSighting(logger, sightingsSvc))
	mux.Handle("POST /sightings", handlers.CreateSighting(logger, sightingsSvc))
	mux.Handle("GET /sightings/{id}", handlers.Sighting(logger, sightingsSvc))
	mux.Handle("GET /sightings/{id}/edit", handlers.EditSighting(logger, sightingsSvc))
	mux.Handle("POST /sightings/{id}", handlers.UpdateSighting(logger, sightingsSvc))
	mux.Handle("POST /sightings/{id}/delete", handlers.DeleteSighting(logger, sightingsSvc))
	mux.Handle("/", handlers.NotFound(logger))

	return mux
}

func assetsFs(prod bool) fs.FS {
	if prod {
		return assets
	}
	return os.DirFS("web")
}
