package vm

import (
	"cmp"
	"fmt"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"workshop/internal/domain/atlas"
	"workshop/internal/domain/sighting"
)

// NewCard returns the grid card for an entry.
func NewCard(e atlas.Entry) Card {
	name := DisplayName(e.Species)
	return Card{
		Href:           SpeciesHref(e.Species),
		CommonName:     name,
		ScientificName: cmp.Or(e.Species.CanonicalName, e.Species.ScientificName),
		Family:         e.Species.Family,
		Sightings:      plural(e.SightingCount, "sighting", "sightings"),
		LastSeen:       formatDate(e.LastSeen),
		IUCN:           NewIUCN(e.IUCN),
		Photo:          coverOf(e, name),
	}
}

func coverOf(e atlas.Entry, name string) Photo {
	if e.Cover.Media.URL == "" {
		return Photo{}
	}
	return NewPhoto(e.Cover.Media, name)
}

// NewHero returns the hero for the featured entries, showing the one at
// active, counted from zero.
func NewHero(entries []atlas.Entry, countryName string, active int) Hero {
	slides := make([]Slide, 0, len(entries))
	for i, e := range entries {
		name := DisplayName(e.Species)
		place := joinNonEmpty(", ", e.Cover.Locality, e.Cover.StateProvince)

		lead := fmt.Sprintf("Recorded %s in %s", times(e.SightingCount), countryName)
		if last := formatDate(e.LastSeen); last != "" {
			lead += ", most recently on " + last
		}
		lead += "."

		slides = append(slides, Slide{
			Number:         Number(i + 1),
			Href:           SpeciesHref(e.Species),
			SelfHref:       "/?featured=" + strconv.Itoa(i+1) + "#hero",
			CommonName:     name,
			ScientificName: cmp.Or(e.Species.CanonicalName, e.Species.ScientificName),
			Kicker:         joinNonEmpty(" · ", e.Species.Order, e.Species.Family),
			Lead:           lead,
			Place:          place,
			IUCN:           NewIUCN(e.IUCN),
			Photo:          coverOf(e, name),
		})
	}

	return Hero{Slides: slides, Active: min(max(active, 0), max(len(slides)-1, 0))}
}

func times(n int) string {
	switch n {
	case 1:
		return "once"
	case 2:
		return "twice"
	}
	return Count(n) + " times"
}

// FilterValues is what was asked for in the browse form.
type FilterValues struct {
	Query, Class, Order, Family, IUCN string
}

// Filter returns the values as an atlas filter, without paging.
func (v FilterValues) Filter() atlas.ListFilter {
	return atlas.ListFilter{
		Class:  v.Class,
		Order:  v.Order,
		Family: v.Family,
		Query:  v.Query,
		IUCN:   atlas.IUCNCategory(v.IUCN),
	}
}

// Values returns the values as URL parameters, leaving out empty ones.
func (v FilterValues) Values() url.Values {
	q := url.Values{}
	for k, val := range map[string]string{
		"q": v.Query, "class": v.Class, "order": v.Order, "family": v.Family, "iucn": v.IUCN,
	} {
		if val != "" {
			q.Set(k, val)
		}
	}
	return q
}

// Narrow drops an order or family that doesn't belong to the class or
// order chosen alongside it, such as an order kept from a class the
// reader has since changed, so the listing can't come back empty for
// a combination nobody meant.
func (v FilterValues) Narrow(facets atlas.Facets) FilterValues {
	fits := func(match func(atlas.Taxon) bool) bool {
		return slices.ContainsFunc(facets.Taxa, match)
	}
	if v.Order != "" && !fits(func(t atlas.Taxon) bool {
		return t.Order == v.Order && (v.Class == "" || t.Class == v.Class)
	}) {
		v.Order = ""
	}
	if v.Family != "" && !fits(func(t atlas.Taxon) bool {
		return t.Family == v.Family &&
			(v.Class == "" || t.Class == v.Class) &&
			(v.Order == "" || t.Order == v.Order)
	}) {
		v.Family = ""
	}
	if v.IUCN != "" && !slices.Contains(facets.IUCN, atlas.IUCNCategory(v.IUCN)) {
		v.IUCN = ""
	}
	return v
}

// NewFilters returns the browse form for the values, offering only the
// orders and families that fit the class and order chosen.
func NewFilters(v FilterValues, facets atlas.Facets) Filters {
	var classes, orders, families []string
	for _, t := range facets.Taxa {
		classes = appendUnique(classes, t.Class)
		if v.Class == "" || t.Class == v.Class {
			orders = appendUnique(orders, t.Order)
			if v.Order == "" || t.Order == v.Order {
				families = appendUnique(families, t.Family)
			}
		}
	}

	iucn := make([]Option, 0, len(facets.IUCN))
	for _, c := range facets.IUCN {
		iucn = append(iucn, Option{Value: string(c), Label: c.Label(), Selected: string(c) == v.IUCN})
	}

	return Filters{
		Query:    v.Query,
		Classes:  options(classes, v.Class),
		Orders:   options(orders, v.Order),
		Families: options(families, v.Family),
		IUCN:     iucn,
		Active:   v != FilterValues{},
	}
}

func appendUnique(list []string, s string) []string {
	if s == "" || slices.Contains(list, s) {
		return list
	}
	return append(list, s)
}

func options(values []string, selected string) []Option {
	slices.Sort(values)
	out := make([]Option, len(values))
	for i, v := range values {
		out[i] = Option{Value: v, Label: v, Selected: v == selected}
	}
	return out
}

// NewResults returns a page of the grid. page counts from one, and the
// cards are numbered from first.
func NewResults(p atlas.Page, v FilterValues, page, first int) Results {
	cards := make([]Card, len(p.Entries))
	for i, e := range p.Entries {
		cards[i] = NewCard(e)
	}

	r := Results{Cards: cards, FirstNumber: first, Filtered: v != FilterValues{}}
	if p.HasMore {
		q := v.Values()
		q.Set("page", strconv.Itoa(page+1))
		r.NextHref = "/species?" + q.Encode()
	}

	shown := first - 1 + len(cards)
	switch {
	case shown == 0:
		r.Summary = "No species match"
	case p.HasMore:
		r.Summary = "Showing the first " + plural(shown, "species", "species")
	default:
		r.Summary = plural(shown, "species", "species")
	}

	return r
}

// galleryMax and observationsMax bound how much of a profile a page shows.
const (
	galleryMax      = 12
	observationsMax = 25
	notesMax        = 4
)

// NewDetail returns the page for a species' profile.
func NewDetail(p atlas.Profile) Detail {
	sp := p.Species
	name := DisplayName(sp)

	d := Detail{
		CommonName:     name,
		ScientificName: cmp.Or(sp.CanonicalName, sp.ScientificName),
		Kicker:         joinNonEmpty(" · ", sp.Class, sp.Family),
		GBIFURL:        "https://www.gbif.org/species/" + strconv.Itoa(sp.GBIFKey),
		IUCN:           NewIUCN(p.IUCN),
	}

	for _, r := range []Rank{
		{"Kingdom", sp.Kingdom},
		{"Phylum", sp.Phylum},
		{"Class", sp.Class},
		{"Order", sp.Order},
		{"Family", sp.Family},
		{"Genus", sp.Genus},
		{"Species", sp.Species},
	} {
		if r.Value != "" {
			d.Taxonomy = append(d.Taxonomy, r)
		}
	}

	for i, o := range p.Observations {
		for _, m := range o.Media {
			if len(d.Gallery) >= galleryMax {
				break
			}
			if photo := NewPhoto(m, name); photo.URL != "" {
				d.Gallery = append(d.Gallery, photo)
			}
		}

		if o.Remarks != "" && len(d.Notes) < notesMax {
			d.Notes = append(d.Notes, Note{
				Text:   o.Remarks,
				Byline: joinNonEmpty(" · ", o.RecordedBy, formatDate(o.HappenedAt)),
			})
		}

		if i < observationsMax {
			d.Observations = append(d.Observations, newObservation(o))
		}

		d.Points = append(d.Points, MapPoint{
			Lat:   o.Location.Latitude,
			Lng:   o.Location.Longitude,
			Date:  formatDate(o.HappenedAt),
			Place: place(o.Location),
		})
	}
	d.MoreObserved = max(p.Summary.Sightings-len(d.Observations), 0)

	if len(d.Gallery) > 0 {
		d.Cover = d.Gallery[0]
	}

	sum := p.Summary
	d.Stats = []Stat{
		{Count(sum.Sightings), "Sightings"},
		{formatDate(sum.FirstSeen), "First recorded"},
		{formatDate(sum.LastSeen), "Last recorded"},
		{Count(sum.Regions), "Counties"},
	}
	if sum.Individuals > 0 {
		d.Stats = append(d.Stats, Stat{Count(sum.Individuals), "Individuals counted"})
	}

	return d
}

func newObservation(o sighting.Sighting) Observation {
	obs := Observation{
		Date:      formatDate(o.HappenedAt),
		ISODate:   o.HappenedAt.Format("2006-01-02"),
		Place:     place(o.Location),
		Observer:  cmp.Or(o.RecordedBy, "Unknown"),
		SourceURL: "https://www.gbif.org/occurrence/" + strconv.FormatInt(o.GBIFKey, 10),
	}
	if o.IndividualCount != nil {
		obs.Count = strconv.Itoa(*o.IndividualCount)
	}
	return obs
}

func place(l sighting.Location) string {
	return cmp.Or(joinNonEmpty(", ", l.Locality, l.StateProvince), l.Country, "Location withheld")
}

func joinNonEmpty(sep string, parts ...string) string {
	return strings.Join(slices.DeleteFunc(parts, func(s string) bool { return s == "" }), sep)
}
