package web

import (
	"embed"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"workshop/internal/domain/sighting"
	"workshop/internal/domain/species"
	"workshop/internal/infra/config"
	"workshop/web/handlers"
)

//go:generate go tool templ generate ./...

// assets holds the static files served under /assets.
// Note: The embedded paths keep their "assets/" prefix.
//
//go:embed assets
var assets embed.FS

// New returns a ServeMux serving the static assets and handler's patterns.
func New(logger *slog.Logger, config config.Config, sightingsSvc *sighting.Service, speciesSvc *species.Service) *http.ServeMux {
	mux := http.NewServeMux()

	mux.Handle("GET /assets/", http.FileServerFS(assetsFs(config.IsProduction())))
	mux.Handle("GET /api/wildlife", handlers.Wildlife(logger, sightingsSvc, speciesSvc))
	mux.Handle("GET /map", handlers.Home(logger, sightingsSvc))
	mux.Handle("GET /", handlers.Home(logger, sightingsSvc))

	return mux
}

func assetsFs(prod bool) fs.FS {
	if prod {
		return assets
	}
	return os.DirFS("web")
}
