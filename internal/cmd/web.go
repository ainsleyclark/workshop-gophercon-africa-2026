package cmd

import (
	"context"
	"net/http"
	_ "net/http/pprof" // Registers /debug/pprof/ on http.DefaultServeMux.
	"os"
	"os/signal"
	"syscall"
	"workshop/internal/common/logs"
	"workshop/internal/common/server"
	"workshop/web"

	"github.com/urfave/cli/v3"
)

func webCmd(app *app) *cli.Command {
	return &cli.Command{
		Name:      "web",
		Aliases:   []string{"w"},
		Usage:     "Serve the sightings web interface",
		UsageText: "workshop web [-p 8080]",
		Flags: []cli.Flag{
			&cli.IntFlag{
				Name:    "port",
				Aliases: []string{"p"},
				Usage:   "port to listen on",
				Value:   app.Config.Port,
			},
			&cli.StringFlag{
				Name:  "live-reload-url",
				Usage: "browser URL of the live-reload proxy, shown at startup",
			},
		},
		Action: func(ctx context.Context, cmd *cli.Command) error {
			ctx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
			defer stop()

			router := web.New(app.Logger, app.Config, app.Atlas)

			port := cmd.Int("port")
			if url := cmd.String("live-reload-url"); url != "" {
				app.Printer.Successf("Open %s (live reload enabled)\n", url)
			} else {
				app.Printer.Successf("Listening on http://localhost:%d\n", port)
			}

			// The site has its own mux, so pprof stays on the default one,
			// bound to localhost and never reachable from the public site.
			go func() { _ = http.ListenAndServe("localhost:6060", nil) }() //nolint:gosec // Local profiling only.

			handler := logs.RequestLogger(app.Logger)(router)
			if err := server.New(port, handler).Start(ctx); err != nil {
				return err
			}

			app.Printer.Info("Stopped")

			return ctx.Err()
		},
	}
}
