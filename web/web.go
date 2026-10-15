package web

import (
	"embed"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"workshop/internal/domain/atlas"
	"workshop/internal/domain/sighting/country"
	"workshop/internal/infra/config"
	"workshop/web/handlers"
	"workshop/web/views/vm"
)

//go:generate go tool templ generate ./...

// assets holds the static files served under /assets.
// Note: The embedded paths keep their "assets/" prefix.
//
//go:embed assets
var assets embed.FS

// site is the country this site is about, and what it calls itself.
var site = handlers.Site{
	Country: country.Code("KE"),
	View: vm.Site{
		Name:        "Nyika",
		CountryName: "Kenya",
	},
}

// New returns a ServeMux serving the static assets and handler's patterns.
func New(logger *slog.Logger, config config.Config, atlasSvc *atlas.Service) *http.ServeMux {
	mux := http.NewServeMux()

	mux.Handle("GET /assets/", http.FileServerFS(assetsFs(config.IsProduction())))
	mux.Handle("GET /{$}", handlers.Home(logger, site, atlasSvc))
	mux.Handle("GET /species", handlers.Species(logger, site, atlasSvc))
	mux.Handle("GET /species/{key}", handlers.SpeciesDetail(logger, site, atlasSvc))
	mux.Handle("/", handlers.NotFound(logger, site))

	return mux
}

func assetsFs(prod bool) fs.FS {
	if prod {
		return assets
	}
	return os.DirFS("web")
}
