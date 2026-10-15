// Package vm holds the view models the templates render: plain values,
// already formatted, built from the domain so that no template needs to
// know how GBIF shapes its records.
package vm

import (
	"cmp"
	"fmt"
	"net/url"
	"path"
	"strconv"
	"strings"
	"time"
	"workshop/internal/domain/atlas"
	"workshop/internal/domain/sighting"
	"workshop/internal/domain/species"
)

type (
	// Site is what every page shows of the site itself.
	Site struct {
		Name        string
		CountryName string
	}
	// Photo is an image and the credit it must carry. URL is empty when
	// there's no photo, and templates draw a placeholder instead.
	Photo struct {
		URL     string
		Large   string
		Small   string
		Alt     string
		Credit  string
		License string
	}
	// IUCN is a Red List category ready to show as a badge.
	IUCN struct {
		Code       string
		Label      string
		Threatened bool
	}
	// Card is a species in the browse grid.
	Card struct {
		Href           string
		CommonName     string
		ScientificName string
		Family         string
		Sightings      string
		LastSeen       string
		IUCN           IUCN
		Photo          Photo
	}
	// Slide is a species featured in the hero.
	Slide struct {
		Number         string
		Href           string
		SelfHref       string
		CommonName     string
		ScientificName string
		Kicker         string
		Lead           string
		Place          string
		IUCN           IUCN
		Photo          Photo
	}
	// Hero is the featured species, one of which is showing.
	Hero struct {
		Slides []Slide
		Active int
	}
	// Option is one choice in a filter.
	Option struct {
		Value    string
		Label    string
		Selected bool
	}
	// Filters is the browse form, as submitted, with the choices left
	// open given what has been chosen.
	Filters struct {
		Query    string
		Classes  []Option
		Orders   []Option
		Families []Option
		IUCN     []Option
		// Active reports whether anything narrows the listing.
		Active bool
	}
	// Results is a page of the grid and how to ask for the next.
	Results struct {
		Cards    []Card
		NextHref string
		// FirstNumber numbers the cards, carrying on across pages.
		FirstNumber int
		Summary     string
		Filtered    bool
	}
	// Rank is one step of a species' classification.
	Rank struct {
		Label string
		Value string
	}
	// Stat is a figure and what it counts.
	Stat struct {
		Value string
		Label string
	}
	// Note is a sighting's remarks, attributed.
	Note struct {
		Text   string
		Byline string
	}
	// Observation is a row in a species' sighting list.
	Observation struct {
		Date      string
		ISODate   string
		Place     string
		Observer  string
		Count     string
		SourceURL string
	}
	// MapPoint is a sighting on the map, encoded into the page as JSON.
	MapPoint struct {
		Lat   float64 `json:"lat"`
		Lng   float64 `json:"lng"`
		Date  string  `json:"date"`
		Place string  `json:"place"`
	}
	// Detail is a species' page.
	Detail struct {
		CommonName     string
		ScientificName string
		Kicker         string
		GBIFURL        string
		IUCN           IUCN
		Cover          Photo
		Stats          []Stat
		Taxonomy       []Rank
		Notes          []Note
		Gallery        []Photo
		Observations   []Observation
		MoreObserved   int
		Points         []MapPoint
	}
)

// dateLayout is how dates read on the site.
const dateLayout = "2 Jan 2006"

// DisplayName prefers the name a reader would recognise, falling back
// through the taxonomy as GBIF records thin out.
func DisplayName(sp species.Species) string {
	if sp.VernacularName != "" {
		return titleCase(sp.VernacularName)
	}
	return cmp.Or(sp.CanonicalName, sp.ScientificName, "Unknown species")
}

// titleCase capitalises each word of a common name, which GBIF often
// gives in lower case, such as "spotted hyaena".
func titleCase(s string) string {
	words := strings.Fields(s)
	for i, w := range words {
		words[i] = strings.ToUpper(w[:1]) + w[1:]
	}
	return strings.Join(words, " ")
}

// SpeciesHref is the path of a species' page.
func SpeciesHref(sp species.Species) string {
	return "/species/" + strconv.Itoa(sp.GBIFKey)
}

// NewIUCN returns the badge for a category, or the zero IUCN for none.
func NewIUCN(c atlas.IUCNCategory) IUCN {
	if c == "" {
		return IUCN{}
	}
	return IUCN{Code: string(c), Label: c.Label(), Threatened: c.Threatened()}
}

// NewPhoto returns the photo for a media item of a species.
func NewPhoto(m sighting.Media, name string) Photo {
	if m.Type != "" && m.Type != "StillImage" {
		return Photo{}
	}
	return Photo{
		URL:     sized(m.URL, "medium"),
		Large:   sized(m.URL, "large"),
		Small:   sized(m.URL, "small"),
		Alt:     cmp.Or(m.Title, m.Description, "Photograph of "+name),
		Credit:  cmp.Or(m.Creator, m.RightsHolder),
		License: licenseName(m.License),
	}
}

// sized asks iNaturalist, which most GBIF media in Kenya comes from, for
// a smaller rendition than the original, which can run to megabytes.
// Its open data bucket names each size in the path. Other hosts are left
// as they are.
func sized(rawURL, size string) string {
	u, err := url.Parse(rawURL)
	if err != nil || u.Host != "inaturalist-open-data.s3.amazonaws.com" {
		return rawURL
	}
	// The path ends /photos/{id}/original.{ext}.
	dir, file := path.Split(u.Path)
	if name, ext, ok := strings.Cut(file, "."); ok && name == "original" {
		u.Path = dir + size + "." + ext
		return u.String()
	}
	return rawURL
}

// licenseName shortens a Creative Commons licence URL to its usual name,
// such as "CC BY-NC 4.0".
func licenseName(raw string) string {
	u, err := url.Parse(raw)
	if err != nil || !strings.HasSuffix(u.Host, "creativecommons.org") {
		return raw
	}
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	switch {
	case len(parts) >= 3 && parts[0] == "licenses":
		return "CC " + strings.ToUpper(parts[1]) + " " + parts[2]
	case len(parts) >= 1 && parts[0] == "publicdomain":
		return "CC0"
	}
	return raw
}

// Count formats a number with thousands separators.
func Count(n int) string {
	s := strconv.Itoa(n)
	for i := len(s) - 3; i > 0; i -= 3 {
		s = s[:i] + "," + s[i:]
	}
	return s
}

func plural(n int, one, many string) string {
	if n == 1 {
		return "1 " + one
	}
	return Count(n) + " " + many
}

func formatDate(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format(dateLayout)
}

// Number pads a position to two digits, as the hero's counter shows it.
func Number(i int) string {
	return fmt.Sprintf("%02d", i)
}
