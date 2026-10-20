# Backend test suites

All changes are isolated in the `se_project_express-tests` worktree on branch `automated-tests`. The original `se_project_express` checkout and optional iPhone backend are unchanged.

## Run in Git Bash

Use Node.js 22 or newer. Open a terminal in this backend worktree:

```bash
cd ~/Documents/TripleTen/se_project_express-tests
npm ci
npm test
```

Additional commands:

```bash
npm run test:unit
npm run test:integration
npm run test:coverage
npm run test:handles
npm run lint
```

There is no need to start the normal Express server or MongoDB service first. SuperTest starts and closes temporary HTTP listeners. Jest runs the suites sequentially to limit MongoDB resource use. Every promise/request is awaited, and the suite exits without `--forceExit`.

## What is covered

| Suite                              | Coverage                                                                                                                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/app.test.js`           | Importing the app does not connect to MongoDB or listen on the normal port                                                                                                                                                 |
| `tests/unit/auth.test.js`          | Valid, missing, malformed, expired, and incorrectly signed JWTs                                                                                                                                                            |
| `tests/unit/errors.test.js`        | Error classes, public/private messages, database error mapping, upstream failures, and response helpers                                                                                                                    |
| `tests/integration/models.test.js` | Real model validation, length boundaries, unique email index, hidden passwords, bcrypt credential checks, timestamps, and persisted likes                                                                                  |
| `tests/integration/api.test.js`    | Real HTTP routes, account creation/login, protected operations, profile updates, garment ownership/deletion, likes, malformed data, concurrent duplicate signup, structured errors, and complete account/garment lifecycle |
| `tests/unit/validation.test.js`    | Request boundary checks, invalid input blocked before bcrypt/database work, field whitelists and password preservation                                                                                                     |
| `tests/unit/logger.test.js`        | Real middleware log output, credential exclusion, safe stack metadata, error forwarding and file transport configuration                                                                                                   |

The API suite uses SuperTest with the real app, middleware, routes, controllers, models, bcrypt, and JWT. Most database operations are real; one deliberate database-failure case mocks a query to verify a safe 500 response.

## Disposable database lifecycle

The helper in `tests/helpers/database.js` starts a dedicated MongoDB process bound to loopback on a temporary port. Each suite gets a unique `wtwr_test_...` database. It never accepts the normal `MONGODB_URI`.

- `beforeAll` starts the owned MongoDB process, connects Mongoose, and initializes model indexes.
- `beforeEach` and `afterEach` clear only the test models' collections, after checking the generated database name and owned server's port.
- Test cases create sample accounts/garments and inspect saved records.
- `afterAll` disconnects Mongoose and stops the owned MongoDB process, including after assertion failures.

An existing local `mongod` executable is reused, but its running service or data files are not used. The helper searches PATH and default Windows MongoDB installation folders. If none is found, mongodb-memory-server downloads a test binary on first use; that requires network access.

To choose an executable explicitly:

```bash
MONGOMS_SYSTEM_BINARY="C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe" npm test
```

Substitute the actual installed path. The helper reads that executable's version so the harness can use it without a mismatched download.

## App startup and corrections found by tests

`app.js` exports Express without startup side effects. Its database connection and `app.listen()` run only when the file is executed directly with `node app.js`, including through the existing start/dev scripts.

The regression tests exposed two input-handling defects. Requests to create a garment without a body and signup/signin requests with non-string passwords used to return 500. The test branch now reports those as 400 client errors. Normal account and garment behavior is preserved.

Request bodies and item IDs are now validated with Celebrate/Joi before controller work, and all controller failures flow through centralized middleware. Logging tests use memory streams; default Jest loggers do not create files. See [VALIDATION.md](VALIDATION.md) for schemas, middleware order, log contents and dependency compatibility.

Compatible dependency audit fixes are also captured in this worktree's lockfile. No forced major downgrades were applied.

## Results and limits

On October 19, 2026: **187 tests across 7 suites pass**, with **98.17% line coverage**, **99.18% branch coverage**, and **100% function coverage**. The coverage gate requires at least 90% lines/statements, 85% branches, and 95% functions.

The `--detectOpenHandles` run also passes and exits normally. Open `coverage/index.html` after a coverage run for uncovered paths, including direct production startup. Coverage files are ignored by Git and lint.

The tests do not use the normal database, a deployed API, real weather services, or production credentials. They do not prove browser layout, deployment availability, or every possible concurrency scenario.

Production dependency audits currently report zero vulnerabilities. Development-only advisories remain in tooling dependencies, including Jest's transitive `sprintf-js` chain and nodemon's file-watching dependencies; review `npm audit` when updating tooling.
