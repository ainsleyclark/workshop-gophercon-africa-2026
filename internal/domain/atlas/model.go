package atlas

import (
	"time"
	"workshop/internal/domain/sighting"
	"workshop/internal/domain/sighting/country"
	"workshop/internal/domain/species"
)

type (
	// Entry is one species as it has been seen in a country: how often,
	// when last, and the newest photograph taken of it there.
	Entry struct {
		Species       species.Species
		SightingCount int
		LastSeen      time.Time
		IUCN          IUCNCategory
		// Cover is the zero Cover when none of its sightings came with media.
		Cover Cover
	}
	// Cover is the newest photograph of a species in a country, and the
	// place it was taken.
	Cover struct {
		Media         sighting.Media `json:"media"`
		Locality      string         `json:"locality"`
		StateProvince string         `json:"stateProvince"`
	}
	// Page is a run of entries, and whether more follow it.
	Page struct {
		Entries []Entry
		HasMore bool
	}
	// ListFilter narrows a listing to a country and, optionally, a taxon,
	// a name and an IUCN category. Empty fields match everything.
	ListFilter struct {
		Country country.Code
		Class   string
		Order   string
		Family  string
		// Query matches common, canonical or scientific names in part.
		Query  string
		IUCN   IUCNCategory
		Limit  int
		Offset int
	}
	// Taxon is the class, order and family of a species, any of which
	// GBIF may leave empty.
	Taxon struct {
		Class  string
		Order  string
		Family string
	}
	// Facets are the values a listing for a country can be filtered by,
	// taken from what has been seen there.
	Facets struct {
		Taxa []Taxon
		IUCN []IUCNCategory
	}
	// Profile is a species and its sightings in a country: the newest of
	// them, and totals over them all.
	Profile struct {
		Species      species.Species
		IUCN         IUCNCategory
		Summary      Summary
		Observations []sighting.Sighting
	}
	// Summary totals every sighting of a species in a country.
	Summary struct {
		Sightings   int
		FirstSeen   time.Time
		LastSeen    time.Time
		Regions     int
		Individuals int
	}
)

// IUCNCategory is an IUCN Red List category code, as GBIF interprets it
// onto an occurrence.
type IUCNCategory string

// The IUCN Red List categories GBIF uses.
//
// See: https://www.iucnredlist.org/assessment/categories
const (
	IUCNExtinct        IUCNCategory = "EX"
	IUCNExtinctWild    IUCNCategory = "EW"
	IUCNCritical       IUCNCategory = "CR"
	IUCNEndangered     IUCNCategory = "EN"
	IUCNVulnerable     IUCNCategory = "VU"
	IUCNNearThreatened IUCNCategory = "NT"
	IUCNLeastConcern   IUCNCategory = "LC"
	IUCNDataDeficient  IUCNCategory = "DD"
	IUCNNotEvaluated   IUCNCategory = "NE"
)

var iucnLabels = map[IUCNCategory]string{
	IUCNExtinct:        "Extinct",
	IUCNExtinctWild:    "Extinct in the wild",
	IUCNCritical:       "Critically endangered",
	IUCNEndangered:     "Endangered",
	IUCNVulnerable:     "Vulnerable",
	IUCNNearThreatened: "Near threatened",
	IUCNLeastConcern:   "Least concern",
	IUCNDataDeficient:  "Data deficient",
	IUCNNotEvaluated:   "Not evaluated",
}

// Label returns the category in words, or the code itself for one this
// package doesn't know.
func (c IUCNCategory) Label() string {
	if label, ok := iucnLabels[c]; ok {
		return label
	}
	return string(c)
}

// Threatened reports whether the category is one of the three IUCN
// counts as threatened with extinction.
func (c IUCNCategory) Threatened() bool {
	return c == IUCNCritical || c == IUCNEndangered || c == IUCNVulnerable
}
