# WTWR Backend API

Backend API for **WTWR — What To Wear?**, a clothing recommendation application.

This project implements the server-side foundation for user accounts, authentication, clothing item management, likes, ownership permissions, and structured error handling. It was built with Node.js, Express, MongoDB, and Mongoose as part of the TripleTen Software Engineering program.

The main goal of this sprint was to move the project from a hard-coded user prototype into a real authenticated API where users can sign up, sign in, receive a JSON Web Token, and access protected resources based on their identity.

---

## Project Overview

WTWR allows users to manage clothing items and interact with item data through a REST API.

This backend supports:

- User registration and login
- Password hashing with `bcryptjs`
- JWT-based authentication
- Protected routes for user-specific actions
- Server-side weather requests with private credentials, bounded caching and request limits
- Public access to clothing items
- Clothing item creation and deletion
- Ownership checks before deletion
- Like and unlike functionality
- MongoDB/Mongoose schema validation
- Centralized HTTP status and error handling
- Development-only diagnostic routes for testing error responses
- ESLint and Prettier-based code formatting

---

## Tech Stack

- **Node.js**
- **Express**
- **MongoDB**
- **Mongoose**
- **JSON Web Tokens**
- **bcryptjs**
- **Celebrate / Joi**
- **Winston / express-winston**
- **validator**
- **cors**
- **ESLint**
- **Prettier**
- **Nodemon**
- **Postman / VS Code Postman extension**

---

## Features

### Authentication

Users can create accounts and log in with an email and password.

Passwords are hashed before being stored in the database. The password field is configured with `select: false` so password hashes are not returned in normal query results.

When a user logs in successfully, the server returns a JWT containing the user ID. The token is used to authorize protected requests.

### Authorization Middleware

Protected routes require a valid Bearer token.

The authorization middleware:

1. Reads the `Authorization` header
2. Extracts the JWT from the Bearer token
3. Verifies the token
4. Attaches the decoded payload to `req.user`
5. Allows the request to continue

Public routes remain available without authentication.

### Clothing Item Ownership

Users can create clothing items and delete items they own.

Before deleting an item, the server checks whether the authenticated user is the owner of that item. If the user attempts to delete an item created by another user, the API returns a `403 Forbidden` response.

### Centralized Error Handling

The project includes shared error constants and helper functions for consistent API responses.

Supported error behavior includes:

| Status Code | Meaning                                                |
| ----------- | ------------------------------------------------------ |
| `400`       | Invalid request data or invalid ID                     |
| `401`       | Authentication or authorization failure                |
| `403`       | User does not have permission for the requested action |
| `404`       | Resource or route not found                            |
| `409`       | Duplicate email conflict during signup                 |
| `500`       | Unexpected server error                                |

Client-facing error responses are kept simple and safe, while server-side logging can include additional debugging context.

### Developer Diagnostics

The project includes development-only diagnostic routes under `/test-errors`.

These routes are useful for manually checking standardized error responses. They are enabled only in explicit development/test mode and return 404 otherwise.

---

## API Routes

### Public Routes

| Method | Endpoint                   | Description                                       |
| ------ | -------------------------- | ------------------------------------------------- |
| `GET`  | `/`                        | Health check route                                |
| `POST` | `/signup`                  | Register a new user                               |
| `POST` | `/signin`                  | Log in and receive a JWT                          |
| `GET`  | `/items`                   | Get all clothing items                            |
| `GET`  | `/weather?lat=...&lon=...` | Get weather without exposing provider credentials |
| `GET`  | `/test-errors`             | Development-only error diagnostic routes          |

### Protected Routes

Protected routes require an `Authorization` header:

```http
Authorization: Bearer <token>
```

| Method   | Endpoint               | Description                                      |
| -------- | ---------------------- | ------------------------------------------------ |
| `GET`    | `/users/me`            | Get the current authenticated user               |
| `PATCH`  | `/users/me`            | Update the current user's profile                |
| `POST`   | `/items`               | Create a new clothing item                       |
| `DELETE` | `/items/:itemId`       | Delete a clothing item owned by the current user |
| `PUT`    | `/items/:itemId/likes` | Like a clothing item                             |
| `DELETE` | `/items/:itemId/likes` | Unlike a clothing item                           |

---

## Data Models

### User

The user schema includes:

- `name` — required string, 2 to 30 characters
- `avatar` — required URL string
- `email` — required unique email string
- `password` — required string, hidden from normal query results

### Clothing Item

The clothing item schema includes:

- `name` — required string, 2 to 30 characters
- `weather` — required string with allowed values: `hot`, `warm`, `cold`
- `imageUrl` — required URL string
- `owner` — required user reference
- `likes` — array of user references
- `createdAt` — creation date

---

## Project Structure

```txt
.
├── controllers
│   ├── clothingItems.js
│   ├── users.js
│   └── weather.js
├── middlewares
│   ├── auth.js
│   ├── errorHandler.js
│   ├── logger.js
│   ├── validation.js
│   └── weatherLimiter.js
├── models
│   ├── clothingItem.js
│   └── user.js
├── routes
│   ├── clothingItems.js
│   ├── debugErrors.js
│   ├── index.js
│   └── users.js
├── services
│   └── weather.js
├── utils
│   ├── AppError.js
│   ├── config.js
│   ├── errors.js
│   └── loadEnvironment.js
├── app.js
├── package.json
├── README.md
└── sprint.txt
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone --branch main https://github.com/AEMxr/se_project_express.git
cd se_project_express
```

### 2. Install dependencies

```bash
npm ci
npm run setup:env
```

### 3. Start MongoDB

The app expects MongoDB to be available locally.

Default local database:

```txt
mongodb://127.0.0.1:27017/wtwr_db
```

### 4. Start the development server

```bash
npm run dev
```

The server will run on:

```txt
http://localhost:3001
```

### 5. Run linting

```bash
npm run lint
```

---

## Available Scripts

| Command                 | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `npm run start`         | Starts the server with Node                        |
| `npm run dev`           | Starts the server with Nodemon hot reload          |
| `npm run lint`          | Runs ESLint on the project                         |
| `npm run setup:env`     | Creates private local configuration                |
| `npm run format:check`  | Checks source and documentation formatting         |
| `npm run test:coverage` | Runs Jest, SuperTest and disposable MongoDB checks |

---

## Environment and Configuration Notes

Use Node.js 22 or newer. Run `npm run setup:env` after installing dependencies. It creates an ignored `.env.local`, generates a random JWT signing secret, and preserves valid existing secrets and weather settings. The command never prints credentials.

Normal startup loads this configuration before importing authenticated routes. Missing, short or template JWT secrets stop startup with a configuration message. Restarting with the same private secret preserves sessions; replacing the old public development secret requires signing in again.

Set `OPEN_WEATHER_API_KEY` in the backend's `.env.local` for weather. Production hosts must supply private `JWT_SECRET` and `OPEN_WEATHER_API_KEY` values in their server environment. Neither belongs in client configuration or Git. MongoDB defaults to the local database documented above; `MONGODB_URI` and `PORT` remain optional overrides.

Diagnostic routes are available only when `NODE_ENV` explicitly equals `development` or `test`; they return 404 in other environments. To enable local diagnostics, set `NODE_ENV=development` in the ignored local file. Jest uses its own public fixture signing secret and never loads that file.

---

## Testing and Validation

This project was tested with:

- Postman request collections
- Manual API route testing
- GitHub Actions validation
- ESLint

The backend includes Jest, SuperTest and disposable MongoDB suites for authentication, authorization, ownership, validation, logging and standardized error responses. See [TESTING.md](TESTING.md).

---

## Project Status

Current status:

- Backend API implemented
- Authentication flow implemented
- Protected routes implemented
- Password hashing implemented
- Password hashes hidden from normal responses
- Ownership checks implemented
- Centralized error handling implemented
- Linting passes locally
- Old backup files removed from repository tracking
- README updated for the current auth-based backend structure

Known future improvements:

- Add deployment documentation
- Add screenshots or request/response examples

---

## Project Pitch Video

[link](https://drive.google.com/file/d/14jRwIALX3W8jMD5OuxHY-BEF31NrbLtO/view?usp=sharing)

---

## What I Learned

This project helped me understand how authentication changes the structure of a backend API.

Adding signup and signin routes is only one part of the work. A secure API also needs protected routes, ownership checks, safe password handling, clear error responses, and maintainable developer-side debugging patterns.

The biggest lesson from this project was that backend development is not just about making successful requests work. It is also about designing predictable failure behavior, protecting user data, and making the system easier to debug and maintain.

## Automated testing

See [TESTING.md](TESTING.md) for Jest, SuperTest, disposable MongoDB tests, coverage, and commands.

See [VALIDATION.md](VALIDATION.md) for Celebrate/Joi request schemas, centralized error handling, safe logging and dependency compatibility.

## Weather configuration

The `/weather` endpoint is public. Store `OPEN_WEATHER_API_KEY` only in this backend's ignored `.env.local` or the backend host's environment; no weather key belongs in frontend variables. Normal startup loads that local file, while tests skip it. The existing local key was preserved when integrating the tested backend into `main`. See [WEATHER.md](WEATHER.md) for startup, limits, deployment and tests.
