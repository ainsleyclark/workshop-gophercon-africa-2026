package cmd

import (
	"cmp"
	"context"
	"errors"
	"fmt"
	"maps"
	"slices"
	"strings"
	"time"
	"uuid"
	"workshop/internal/clients/gbif"
	"workshop/internal/cmd/internal/lookup"
	"workshop/internal/cmd/internal/prompt"
	"workshop/internal/cmd/internal/view"
	"workshop/internal/common/printer"
	"workshop/internal/common/printer/styles"
	"workshop/internal/domain/sighting"
	"workshop/internal/domain/sighting/country"
	"workshop/internal/domain/species"

	"github.com/charmbracelet/huh"
	"github.com/urfave/cli/v3"
)

func sightingsCmd(app *app) *cli.Command {
	return &cli.Command{
		Name:    "sightings",
		Aliases: []string{"s"},
		Usage:   "Ingest, list and inspect sightings",
		Commands: []*cli.Command{
			{
				Name:      "find",
				Aliases:   []string{"show"},
				Usage:     "Show everything about a single sighting",
				ArgsUsage: "<id or id prefix>",
				Metadata:  prompt.With(pickSighting(app)),
				Action: func(ctx context.Context, cmd *cli.Command) error {
					s, err := findSighting(ctx, app, cmd.Args().First())
					if err != nil {
						return err
					}

					view.Render(app.Printer,
						view.Card{Title: view.SpeciesName(s.Species), Rows: []printer.KV{
							{Key: "ID", Value: s.ID.String()},
							{Key: "Date", Value: s.HappenedAt.Format(view.DateFormat)},
							{Key: "Location", Value: view.Location(s.Location)},
							{Key: "Coordinates", Value: view.Coordinates(s.Location)},
							{Key: "Elevation", Value: view.Ptr(s.Location.ElevationInMetres, "%.0fm")},
							{Key: "Individuals", Value: view.Ptr(s.IndividualCount, "%d")},
							{Key: "Recorded by", Value: s.RecordedBy},
							{Key: "Basis", Value: view.Humanise(s.BasisOfRecord)},
							{Key: "GBIF key", Value: fmt.Sprint(s.GBIFKey)},
							{Key: "Reference", Value: s.ReferenceURL},
						}},
						view.Text{Title: "Remarks", Body: s.Remarks},
						// view.List{Title: fmt.Sprintf("Media (%d)", len(s.Media)), Items: view.MediaItems(s.Media)},
						view.Hintf("%s workshop species find %d", styles.IconArrow, s.Species.GBIFKey),
					)
					return nil
				},
			},
			{
				Name:    "list",
				Aliases: []string{"ls"},
				Usage:   "List saved sightings, newest first",
				Flags: []cli.Flag{
					countryFlag("only show sightings in this country (ISO code or name)"),
					limitFlag(50, "maximum number of sightings to show, 0 for all"),
				},
				Metadata: prompt.With(askList(app)),
				Action: func(ctx context.Context, cmd *cli.Command) error {
					all, err := allSightings(ctx, app)
					if err != nil {
						return err
					}

					countryStr := strings.TrimSpace(cmd.String("country"))
					if countryStr != "" {
						all = slices.DeleteFunc(all, func(s sighting.Sighting) bool {
							return !strings.EqualFold(s.Location.CountryCode.String(), countryStr) &&
								!strings.EqualFold(s.Location.Country, countryStr)
						})
					}
					shown := all
					if limit := cmd.Int("limit"); limit > 0 && len(shown) > limit {
						shown = shown[:limit]
					}

					title := "Sightings"
					if countryStr != "" {
						title += " " + styles.IconDot + " " + strings.ToUpper(countryStr)
					}

					var hint view.Hint
					switch {
					case len(shown) == 0:
					case len(shown) < len(all):
						hint = view.Hintf("Showing %d of %d %s use --limit to see more", len(shown), len(all), styles.IconDot)
					default:
						hint = view.Hintf("%d sighting(s) %s workshop sightings find <id>", len(all), styles.IconArrow)
					}

					view.Render(app.Printer, sightingsTable(title, shown), hint)
					return nil
				},
			},
			{
				Name:      "ingest",
				Usage:     "Fetch sightings from GBIF and save them locally",
				UsageText: "workshop sightings ingest [-c KE] [-n 500]",
				Flags: []cli.Flag{
					countryFlag("two letter ISO country code, e.g. KE, leave out for anywhere"),
					limitFlag(500, "maximum number of occurrences to fetch"),
				},
				Metadata: prompt.With(askIngest),
				Action: func(ctx context.Context, cmd *cli.Command) error {
					code, err := country.Parse(cmd.String("country"))
					if err != nil {
						return err
					}

					return runIngest(ctx, app, sighting.IngestRequest{
						Limit:   cmd.Int("limit"),
						Country: code,
					})
				},
			},
		},
	}
}

// sightingsTable describes saved sightings as a table. The list,
// ingest and species commands all show sightings this way.
func sightingsTable(title string, sightings []sighting.Sighting) view.Table[sighting.Sighting] {
	return view.Table[sighting.Sighting]{
		Title:   title,
		Headers: []string{"ID", "DATE", "SPECIES", "LOCATION", "WEATHER", "MEDIA"},
		Items:   sightings,
		Empty:   "No sightings found, try 'workshop sightings ingest' or 'workshop db seed'",
		Row: func(s sighting.Sighting) []string {
			return []string{
				view.ShortID(s.ID),
				s.HappenedAt.Format(view.DateFormat),
				view.SpeciesName(s.Species),
				view.Location(s.Location),
				view.Weather(s.Weather),
				fmt.Sprint(len(s.Media)),
			}
		},
	}
}

// findSighting resolves a full UUID, or a unique prefix of one
// as printed by the list command.
func findSighting(ctx context.Context, app *app, arg string) (sighting.Sighting, error) {
	arg = strings.ToLower(strings.TrimSpace(arg))
	if arg == "" {
		return sighting.Sighting{}, errors.New("missing sighting ID, e.g. 'workshop sightings find 3f2a9c1b'")
	}

	if id, err := uuid.Parse(arg); err == nil {
		s, err := app.Sightings.Find(ctx, id)
		if errors.Is(err, sighting.ErrNotFound) {
			return s, fmt.Errorf("no sighting with ID %s", arg)
		} else if err != nil {
			return s, err
		}
		found, err := withSpecies(ctx, app, []sighting.Sighting{s})
		if err != nil {
			return s, err
		}
		return found[0], nil
	}

	all, err := allSightings(ctx, app)
	if err != nil {
		return sighting.Sighting{}, err
	}

	return lookup.ByIDPrefix(all, arg, "sighting", "sightings", func(s sighting.Sighting) uuid.UUID {
		return s.ID
	})
}

// ingestSkippers are applied to every CLI ingest so the
// database only holds sightings worth displaying.
var ingestSkippers = []sighting.IngestShouldSkipFn{
	// We only care about sightings that are actually present
	// and not detected or assumed.
	func(o gbif.Occurrence) bool {
		return o.OccurrenceStatus != gbif.OccurrenceStatusPresent
	},
	// Only care about sightings with media
	// so we have something to display.
	func(o gbif.Occurrence) bool {
		return len(o.Media) == 0
	},
}

// runIngest ingests sightings with live progress and prints a summary.
// It always searches for every animal the app recognises, since anything
// else couldn't be classified or shown; which of them a page is about is
// decided when reading, not here.
func runIngest(ctx context.Context, app *app, opts sighting.IngestRequest) error {
	if err := app.ensureAPIs(ctx); err != nil {
		return err
	}

	opts.Animals = species.Animals()
	opts.Skippers = ingestSkippers
	opts.OnPage = func(fetched int, total int64) {
		want := min(total, int64(opts.Limit))
		app.Printer.Statusf("Fetching occurrences from GBIF… %d/%d", fetched, want)
	}

	start := time.Now()

	app.Printer.Status("Contacting GBIF…")

	res, err := app.Sightings.Ingest(ctx, opts)
	app.Printer.ClearStatus()
	if errors.Is(err, sighting.ErrIngestNoResults) {
		app.Printer.Warn("GBIF returned no occurrences for that search")
		return nil
	} else if err != nil {
		return fmt.Errorf("ingesting sightings: %w", err)
	}

	created, err := readBack(ctx, app, res.Created)
	if err != nil {
		return err
	}
	res.Created = created

	view.Render(app.Printer, view.Card{Heading: "Ingest complete", Body: ingestSummary(res, time.Since(start))})
	if len(res.Created) > 0 {
		view.Render(app.Printer,
			sightingsTable("New sightings", res.Created),
			view.Hintf("%s workshop sightings find %s", styles.IconArrow, view.ShortID(res.Created[0].ID)),
		)
	}

	return nil
}

// ingestSummary renders the counts from an ingest as a single line,
// highlighting failures so they're hard to miss.
func ingestSummary(res sighting.IngestResult, elapsed time.Duration) string {
	failed := styles.Muted.Render(fmt.Sprintf("%d failed", res.Failed))
	if res.Failed > 0 {
		failed = styles.Error.Render(fmt.Sprintf("%s %d failed", styles.IconError, res.Failed))
	}

	sep := styles.Muted.Render(" " + styles.IconDot + " ")
	counts := strings.Join([]string{
		styles.Success.Render(fmt.Sprintf("%s %d created", styles.IconSuccess, len(res.Created))),
		styles.Value.Render(fmt.Sprintf("%d skipped", res.Skipped)),
		styles.Value.Render(fmt.Sprintf("%d duplicates", res.Duplicates)),
		failed,
	}, sep)

	return counts + "\n" + styles.Muted.Render(fmt.Sprintf(
		"Checked %d occurrences in %s", res.Fetched, elapsed.Round(100*time.Millisecond),
	))
}

// askIngest asks how many occurrences to fetch. The country is left to
// the --country flag, for fetching somewhere the dataset doesn't cover.
func askIngest(context.Context) ([]string, error) {
	limit := "500"
	err := prompt.Form(
		huh.NewSelect[string]().
			Title("How many occurrences should be checked?").
			Options(huh.NewOptions("100", "500", "1000", "5000", "10000", "20000")...).
			Value(&limit),
	)
	if err != nil {
		return nil, err
	}
	return []string{"--limit", limit}, nil
}

// askList asks which country to filter by, offering the
// countries that have saved sightings, and how many to show.
func askList(app *app) prompt.Func {
	return func(ctx context.Context) ([]string, error) {
		all, err := allSightings(ctx, app)
		if err != nil {
			return nil, err
		}

		names := make(map[string]string)
		for _, s := range all {
			if s.Location.CountryCode != "" {
				code := s.Location.CountryCode.String()
				names[code] = cmp.Or(s.Location.Country, code)
			}
		}
		countries := []huh.Option[string]{huh.NewOption("Any country", "")}
		for _, code := range slices.Sorted(maps.Keys(names)) {
			countries = append(countries, huh.NewOption(fmt.Sprintf("%s (%s)", names[code], code), code))
		}

		var country string
		limit := "50"
		err = prompt.Form(
			huh.NewSelect[string]().
				Title("Which country?").
				Options(countries...).
				Height(prompt.Height).
				Value(&country),
			huh.NewSelect[string]().
				Title("How many?").
				Options(
					huh.NewOption("10", "10"),
					huh.NewOption("50", "50"),
					huh.NewOption("100", "100"),
					huh.NewOption("All", "0"),
				).
				Value(&limit),
		)
		if err != nil {
			return nil, err
		}

		args := []string{"--limit", limit}
		if country != "" {
			args = append(args, "--country", country)
		}
		return args, nil
	}
}

// pickSighting lets the user choose a saved sighting,
// newest first, instead of typing its ID.
func pickSighting(app *app) prompt.Func {
	return func(ctx context.Context) ([]string, error) {
		all, err := allSightings(ctx, app)
		if err != nil {
			return nil, err
		} else if len(all) == 0 {
			return nil, errors.New("no sightings yet, ingest some first")
		}
		opts := make([]huh.Option[string], 0, len(all))
		for _, s := range all {
			label := fmt.Sprintf("%s  %s  %s %s %s", view.ShortID(s.ID), s.HappenedAt.Format(view.DateFormat),
				view.SpeciesName(s.Species), styles.IconDot, view.Location(s.Location))
			opts = append(opts, huh.NewOption(label, s.ID.String()))
		}

		id, err := prompt.Choose("Which sighting?", opts...)
		return []string{id}, err
	}
}

// allSightings lists every saved sighting with its species filled in.
// The store only returns the species ID, so they're looked up in one go
// rather than once per sighting.
func allSightings(ctx context.Context, app *app) ([]sighting.Sighting, error) {
	all, err := app.Sightings.List(ctx, sighting.ListFilter{})
	if err != nil {
		return nil, fmt.Errorf("listing sightings: %w", err)
	}
	return withSpecies(ctx, app, all)
}

// readBack reads freshly created sightings back from the store. Creating
// one only needs its species and weather IDs, and returns no more, so the
// join on reading is what fills them in for the summary.
func readBack(ctx context.Context, app *app, created []sighting.Sighting) ([]sighting.Sighting, error) {
	out := make([]sighting.Sighting, len(created))
	for i, s := range created {
		found, err := app.Sightings.Find(ctx, s.ID)
		if err != nil {
			return nil, fmt.Errorf("reading back sighting %s: %w", s.ID, err)
		}
		out[i] = found
	}
	return out, nil
}

// withSpecies fills in the species on each sighting, for sightings that
// didn't come from allSightings.
func withSpecies(ctx context.Context, app *app, sightings []sighting.Sighting) ([]sighting.Sighting, error) {
	all, err := allSpecies(ctx, app)
	if err != nil {
		return nil, err
	}

	index := make(map[uuid.UUID]species.Species, len(all))
	for _, s := range all {
		index[s.ID] = s
	}
	for i, s := range sightings {
		if sp, ok := index[s.Species.ID]; ok {
			sightings[i].Species = sp
		}
	}

	return sightings, nil
}
