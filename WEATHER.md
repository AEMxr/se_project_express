# Weather credentials stay on the server

This implementation lives in the `se_project_express-tests` worktree on branch `automated-tests`. The original backend checkout and optional iPhone worktree are unchanged.

The browser requests `GET /weather?lat=...&lon=...` from Express. Express adds its private OpenWeather key when requesting the fixed HTTPS provider endpoint, then returns only the city, temperature, condition and sunrise/sunset timestamps needed by the existing UI. The browser does not send or receive an OpenWeather key.

## Local setup

The existing local key was moved into the backend worktree's ignored `.env.local` as `OPEN_WEATHER_API_KEY`. No key needs to be copied into the frontend. The old frontend environment variable was removed, and the local source snapshot was redacted.

If the old backend is running on port 3001, stop it with Ctrl+C in its terminal before starting this worktree. Do not start two backend servers on that port.

In the backend terminal:

```bash
cd ~/Documents/TripleTen/se_project_express-tests
npm ci
npm run setup:env
npm run dev
```

Keep MongoDB running as before. In a separate frontend terminal:

```bash
cd ~/Documents/TripleTen/se_project_react
npm run dev
```

For a fresh checkout, run `npm run setup:env` to generate a private JWT secret and the ignored `.env.local`, then set `OPEN_WEATHER_API_KEY` there. Node loads that file during normal startup; tests skip it entirely. Restart Express after changing the key.

The frontend `.env.local` only needs `VITE_API_BASE_URL` when using a different API address. Its Vite configuration exposes only that public address, including when an old weather variable accidentally remains in the local environment.

## Checks that prevent regressions

Run `npm run test:all` from the frontend. This includes an actual Vite build with fake private and legacy weather keys; the test verifies that the public API address reaches client code and neither key does.

The backend has tests for:

- Coordinate validation before provider calls; arbitrary URLs, units and client-supplied keys are rejected.
- Public weather access without JWTs, with no provider credentials in responses or logs.
- Five-minute server caching, nearby-coordinate rounding, deduplicated requests and bounded cache/concurrency.
- An eight-second upstream timeout, safe errors and retries.
- A limit of 30 weather requests per minute per client IP.

Cache entries, pending requests and request limits are held per server process. Multi-instance deployment would need shared stores to enforce a common cache/limit.

## Deployment

Deploy the updated backend as well as the frontend. Set `JWT_SECRET` and `OPEN_WEATHER_API_KEY` in the backend host's private environment configuration. Build the frontend with `VITE_API_BASE_URL` pointing to the HTTPS backend URL. GitHub Pages serves only the frontend and cannot run this Express endpoint.

If the hosting platform uses a reverse proxy, configure Express's `trust proxy` for that platform's documented topology so client-IP limits work correctly. Do not enable unrestricted proxy trust.

The published old key remains in older Git commits, clones or previous deployed bundles. Moving it server-side prevents exposure in new builds; it cannot revoke a previously shared credential. Revocation requires access to the OpenWeather account. Repository history and deployed assets have not been rewritten or replaced remotely.

## References

- [Vite environment variable exposure](https://vite.dev/guide/env-and-mode#env-variables)
- [OpenWeather current weather endpoint](https://openweathermap.org/current)
- [Express request-limit configuration](https://express-rate-limit.mintlify.app/reference/configuration)
