package handlers

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"workshop/internal/domain/atlas"
	"workshop/internal/domain/sighting/country"
	"workshop/web/views/components"
	"workshop/web/views/pages"
	"workshop/web/views/vm"

	"github.com/a-h/templ"
)

// Atlas reads what has been seen in a country.
type Atlas interface {
	List(ctx context.Context, filter atlas.ListFilter) (atlas.Page, error)
	Facets(ctx context.Context, code country.Code) (atlas.Facets, error)
	Profile(ctx context.Context, code country.Code, gbifKey int) (atlas.Profile, error)
}

// Site is the country the site is about and how it presents itself.
type Site struct {
	Country country.Code
	View    vm.Site
}

const (
	// pageSize is how many species a page of the grid holds.
	pageSize = 12
	// maxPages bounds how many pages a reader without JavaScript can
	// have at once by following "load more".
	maxPages = 10
	// featuredCount is how many species the hero carries.
	featuredCount = 6
)

// Home renders the hero of the most seen species above the grid.
func Home(logger *slog.Logger, site Site, a Atlas) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		facets, err := a.Facets(ctx, site.Country)
		if err != nil {
			serverError(ctx, w, r, logger, site, "listing facets", err)
			return
		}

		filter := atlas.ListFilter{Country: site.Country, Limit: pageSize}
		page, err := a.List(ctx, filter)
		if err != nil {
			serverError(ctx, w, r, logger, site, "listing species", err)
			return
		}

		// The grid is ordered most seen first, so its head is the
		// featured set, less any species without a photo to show.
		var featured []atlas.Entry
		for _, e := range page.Entries {
			if e.Cover.Media.URL != "" && len(featured) < featuredCount {
				featured = append(featured, e)
			}
		}
		active, _ := strconv.Atoi(r.URL.Query().Get("featured"))

		render(ctx, w, logger, http.StatusOK, pages.Home(pages.HomeProps{
			Site:    site.View,
			Hero:    vm.NewHero(featured, site.View.CountryName, active-1),
			Filters: vm.NewFilters(vm.FilterValues{}, facets),
			Results: vm.NewResults(page, vm.FilterValues{}, 1, 1),
		}))
	}
}

// Species renders the grid, filtered by the query string. A request from
// HTMX gets only the part it swaps: the results for a change of filter,
// or the next cards for "load more".
func Species(logger *slog.Logger, site Site, a Atlas) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		q := r.URL.Query()

		facets, err := a.Facets(ctx, site.Country)
		if err != nil {
			serverError(ctx, w, r, logger, site, "listing facets", err)
			return
		}

		values := vm.FilterValues{
			Query:  strings.TrimSpace(q.Get("q")),
			Class:  q.Get("class"),
			Order:  q.Get("order"),
			Family: q.Get("family"),
			IUCN:   q.Get("iucn"),
		}.Narrow(facets)

		page, _ := strconv.Atoi(q.Get("page"))
		page = min(max(page, 1), maxPages)

		filter := values.Filter()
		filter.Country = site.Country

		fragment := isHTMX(r)
		appending := fragment && q.Get("fragment") == "cards"
		if appending {
			// Only the requested page, to append to those on screen.
			filter.Limit, filter.Offset = pageSize, (page-1)*pageSize
		} else {
			// Every page up to the requested one, so a reader who
			// followed "load more" without JavaScript keeps what
			// they had.
			filter.Limit = page * pageSize
		}

		listing, err := a.List(ctx, filter)
		if err != nil {
			serverError(ctx, w, r, logger, site, "listing species", err)
			return
		}

		first := filter.Offset + 1
		results := vm.NewResults(listing, values, page, first)
		w.Header().Add("Vary", "HX-Request")

		switch {
		case appending:
			render(ctx, w, logger, http.StatusOK, components.MoreResults(results))
		case fragment:
			// The URL in the address bar is the filter as applied,
			// without anything Narrow dropped.
			push := "/species"
			if v := values.Values(); len(v) > 0 {
				push += "?" + v.Encode()
			}
			w.Header().Set("HX-Push-Url", push)
			render(ctx, w, logger, http.StatusOK, filterResults(results, values, facets, r.Header.Get("HX-Trigger-Name")))
		default:
			render(ctx, w, logger, http.StatusOK, pages.SpeciesList(pages.SpeciesListProps{
				Site:    site.View,
				Filters: vm.NewFilters(values, facets),
				Results: results,
			}))
		}
	}
}

// filterResults is the results for a change of filter, with the order
// and family drop-downs replaced when the choice above them changed, so
// they only offer what fits. The one that changed is left alone, so it
// keeps the reader's focus.
func filterResults(results vm.Results, values vm.FilterValues, facets atlas.Facets, changed string) templ.Component {
	f := vm.NewFilters(values, facets)
	return templ.ComponentFunc(func(ctx context.Context, w io.Writer) error {
		if err := components.Results(results).Render(ctx, w); err != nil {
			return err
		}
		if changed == "class" {
			if err := components.FilterSelect("order", "Order", "All orders", f.Orders, true).Render(ctx, w); err != nil {
				return err
			}
		}
		if changed == "class" || changed == "order" {
			return components.FilterSelect("family", "Family", "All families", f.Families, true).Render(ctx, w)
		}
		return nil
	})
}

// SpeciesDetail renders a species and its sightings in the country.
func SpeciesDetail(logger *slog.Logger, site Site, a Atlas) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		key, err := strconv.Atoi(r.PathValue("key"))
		if err != nil || key <= 0 {
			renderError(ctx, w, r, logger, site, http.StatusNotFound, "That isn't a species we know of.")
			return
		}

		profile, err := a.Profile(ctx, site.Country, key)
		if errors.Is(err, atlas.ErrNotFound) {
			renderError(ctx, w, r, logger, site, http.StatusNotFound,
				"No sightings of that species have been recorded in "+site.View.CountryName+" yet.")
			return
		} else if err != nil {
			serverError(ctx, w, r, logger, site, "loading species", err)
			return
		}

		render(ctx, w, logger, http.StatusOK, pages.Species(pages.SpeciesProps{
			Site:   site.View,
			Detail: vm.NewDetail(profile),
		}))
	}
}

// NotFound renders the 404 page for any path nothing else matched.
func NotFound(logger *slog.Logger, site Site) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		renderError(r.Context(), w, r, logger, site, http.StatusNotFound,
			"There's nothing at this address. The animal may have moved on.")
	}
}

// isHTMX reports whether HTMX asked for a part of the page. A request to
// restore history after a cache miss wants the whole page.
func isHTMX(r *http.Request) bool {
	return r.Header.Get("HX-Request") == "true" && r.Header.Get("HX-History-Restore-Request") != "true"
}
