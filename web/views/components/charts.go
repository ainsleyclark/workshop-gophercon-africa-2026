package components

import (
	"strconv"
	"workshop/internal/domain/sighting"
)

// YearColumn is one year's bar in the per-year chart.
type YearColumn struct {
	Year  int
	Count int
	Share int
}

// YearColumns lists the last n years up to the newest sighting, quiet years included.
func YearColumns(sightings []sighting.Sighting, sum sighting.Summary, n int) []YearColumn {
	if sum.Sightings == 0 {
		return nil
	}
	byYear := sighting.CountByYear(sightings)
	first := max(sum.Earliest.Year(), sum.Latest.Year()-n+1)
	high := 0
	for y := first; y <= sum.Latest.Year(); y++ {
		high = max(high, byYear[y])
	}
	cols := make([]YearColumn, 0, n)
	for y := first; y <= sum.Latest.Year(); y++ {
		share := 0
		if high > 0 {
			share = byYear[y] * 100 / high
		}
		cols = append(cols, YearColumn{Year: y, Count: byYear[y], Share: share})
	}
	return cols
}

// TopAnimals ranks the most-seen animals.
func TopAnimals(sightings []sighting.Sighting, n int) []sighting.Tally {
	return sighting.Top(sighting.CountBy(sightings, Animal), n)
}

// TopCountries ranks the countries with the most sightings.
func TopCountries(sightings []sighting.Sighting, n int) []sighting.Tally {
	return sighting.Top(sighting.CountBy(sightings, Country), n)
}

// TopObservers ranks the people who recorded the most sightings, skipping unnamed ones.
func TopObservers(sightings []sighting.Sighting, n int) []sighting.Tally {
	counts := sighting.CountBy(sightings, func(s sighting.Sighting) string { return s.RecordedBy })
	delete(counts, "")
	return sighting.Top(counts, n)
}

// bar sets --bar to a row's share of the longest, for the CSS to draw.
func bar(count, longest int) map[string]string {
	if longest <= 0 {
		return map[string]string{"--bar": "0%"}
	}
	return map[string]string{"--bar": strconv.Itoa(count*100/longest) + "%"}
}

// column sets --bar to a year's share of the busiest.
func column(c YearColumn) map[string]string {
	return map[string]string{"--bar": strconv.Itoa(max(c.Share, 2)) + "%"}
}
