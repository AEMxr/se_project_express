# Request validation, errors and logging

These changes were developed in `se_project_express-tests` on `automated-tests` and integrated into `se_project_express` on `main`. The optional iPhone worktree remains separate and unchanged.

## Request boundaries

Celebrate uses the Joi version exported by Celebrate. The schemas in `middlewares/validation.js` run before controllers, password hashing and database queries.

| Request                        | Accepted data                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `POST /signup`                 | Required name (2–30 characters without surrounding whitespace), HTTP(S) avatar URL, email and password of at least 8 characters |
| `POST /signin`                 | Required email and nonempty password; existing passwords are not subjected to signup rules                                      |
| `PATCH /users/me`              | At least one of name or avatar, with the same field constraints                                                                 |
| `POST /items`                  | Required name, HTTP(S) imageUrl and weather (`hot`, `warm` or `cold`)                                                           |
| Item deletion, like and unlike | Required itemId containing exactly 24 hexadecimal characters                                                                    |

No string coercion is enabled. Objects, arrays, nulls and numbers cannot stand in for string fields. URL validation uses the same protocol/host restrictions as the frontend, including rejection of embedded credentials and protocol-relative URLs. Password bytes are preserved.

Unknown body fields are explicitly stripped to preserve the existing API contract. They cannot set ownership, likes, account IDs or profile email/password fields. The controller still constructs its own field whitelist. Protected mutations authenticate before validating their bodies/IDs; browser headers are accepted as usual.

Mongoose schema validation, unique indexes and update validators remain in place as the database's additional checks. Express's existing JSON body limit rejects oversized requests with 413, and malformed JSON returns 400.

`GET /weather` also validates numeric latitude (−90 to 90) and longitude (−180 to 180) before calling the fixed upstream provider. Unknown query parameters, including caller-supplied keys/URLs/units, are rejected. Weather requests have an independent per-client rate limit. See [WEATHER.md](WEATHER.md).

## Centralized failures

Controllers return their promise chains and finish with `.catch(next)`. Known errors extend `AppError`; incorrect credentials use `UnauthorizedError`, and ownership failures use `ForbiddenError`.

The middleware order is:

1. Request logger.
2. CORS, JSON parsing, routes with authentication/validation/controllers.
3. Error logger.
4. Celebrate's `errors()` middleware.
5. The four-argument centralized error handler.

Celebrate returns 400 with validation details. Other failures use the shared mapper: database validation/casting → 400, missing document → 404, duplicate email → 409, known application status → its public response, unexpected failures → 500 with a generic message. A 500 never sends its exception message or stack to the client. If headers were already sent, the central handler delegates to Express instead of responding again.

The frontend reads Celebrate's segment messages from 400 responses. Existing form alerts show the useful field explanation, keep the draft and allow retry. The frontend retains its own form validation; Celebrate is only installed on the server.

## Logging

Winston and express-winston write timestamped JSON to the console and to `logs/request.log` and `logs/error.log` relative to this backend worktree. Each file transport rotates at 5 MiB with at most three files. Logs are ignored by Git.

An allowlist records the HTTP method, configured route pattern, response status and timing. Error logs record the error name/status, plus stack locations for server failures. They omit request/response bodies, headers, cookies, query strings, actual URL parameters and raw exception messages, which can contain credentials or rejected input.

Under Jest, default transports are silent and do not create log files. Logging tests inject memory streams to inspect actual middleware output. Tests do not start the normal server or use the normal database.

## Dependency compatibility

Celebrate 15 retains this project's CommonJS and Node 22/Jest compatibility. Its pinned Lodash range includes an advisory, so a scoped npm override selects patched Lodash `^4.18.1`. The HTTP/middleware regression suites run against that resolved dependency, and the production dependency audit reports zero vulnerabilities as of October 19, 2026. Recheck the audit when updating packages.

## Verification

Run `npm test`, `npm run test:coverage`, `npm run test:handles` and `npm run lint` from this backend worktree. See [TESTING.md](TESTING.md) for disposable MongoDB setup and results.

Tests prove invalid bodies and IDs do not reach hashing or database operations, valid API lifecycles still persist correctly, errors return safe statuses/messages, and logged output excludes sample secrets.

## References

- [Celebrate schemas and error middleware](https://github.com/arb/celebrate)
- [Express error handling](https://expressjs.com/en/guide/error-handling/)
- [express-winston logger options](https://github.com/bithavoc/express-winston)
- [Winston transports and formats](https://github.com/winstonjs/winston)
