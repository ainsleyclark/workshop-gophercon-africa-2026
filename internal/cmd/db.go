package cmd

import (
	"context"
	"fmt"
	"workshop/internal/cmd/internal/prompt"
	"workshop/internal/domain/sighting"
	"workshop/internal/domain/species"

	"github.com/urfave/cli/v3"
)

func dbCmd(app *app) *cli.Command {
	return &cli.Command{
		Name:  "db",
		Usage: "Manage the database",
		Commands: []*cli.Command{
			{
				Name:  "ping",
				Usage: "Check database connectivity",
				Action: func(ctx context.Context, _ *cli.Command) error {
					if err := app.DB.PingContext(ctx); err != nil {
						return fmt.Errorf("pinging database: %w", err)
					}
					app.Printer.Success("Database connection OK")
					return nil
				},
			},
			{
				Name:  "reset",
				Usage: "Roll back every migration and re-apply them, deleting all data",
				Flags: []cli.Flag{
					&cli.BoolFlag{
						Name:    "yes",
						Aliases: []string{"y"},
						Usage:   "skip the confirmation prompt",
					},
				},
				Action: func(ctx context.Context, cmd *cli.Command) error {
					if !cmd.Bool("yes") {
						ok, err := prompt.Confirm("This deletes every sighting and species. Continue?")
						if err != nil {
							return err
						} else if !ok {
							app.Printer.Muted("Reset cancelled")
							return nil
						}
					}
					if _, err := app.Migrations.DownTo(ctx, 0); err != nil {
						return fmt.Errorf("rolling back migrations: %w", err)
					}
					if _, err := app.Migrations.Up(ctx); err != nil {
						return fmt.Errorf("applying migrations: %w", err)
					}
					app.Printer.Success("Database reset")
					return nil
				},
			},
			{
				Name:  "seed",
				Usage: "Apply migrations and seed a starter set, including the four showcase species",
				Action: func(ctx context.Context, _ *cli.Command) error {
					if _, err := app.Migrations.Up(ctx); err != nil {
						return fmt.Errorf("applying migrations: %w", err)
					}
					if err := runIngest(ctx, app, sighting.IngestRequest{
						Limit: 500,
					}); err != nil {
						return err
					}
					// The general sample is intentionally spread across every known
					// taxon. Seed the four designed species separately so a fresh
					// database always gives the showcase map real observation pins.
					for _, animal := range []species.Animal{
						species.AnimalSnowLeopard,
						species.AnimalTiger,
						species.AnimalGiantPanda,
						species.AnimalLion,
					} {
						if err := runIngest(ctx, app, sighting.IngestRequest{
							Limit:   100,
							Animals: []species.Animal{animal},
						}); err != nil {
							return err
						}
					}
					return nil
				},
			},
			migrateCmd(app),
		},
	}
}
