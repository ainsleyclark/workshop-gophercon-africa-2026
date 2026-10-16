# Wildlife Atlas UI

This React interface is served by the Go application. The Go backend remains the source of truth for species and field observations; the interface reads them from `GET /api/wildlife`.

## Local development

1. Start the Go web app on port 8080.
2. From this directory run `npm install` and `npm run dev`.
3. Open the Vite URL. API requests are proxied to the Go app.

## Production assets

Run `npm install` and `npm run build`. Vite writes the production bundle to `web/assets/showcase`, which the Go server embeds and serves with the home page.
