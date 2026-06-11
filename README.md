# WTWR Backend API

Backend API for **WTWR — What To Wear?**, a clothing recommendation application.

This project implements the server-side foundation for user accounts, authentication, clothing item management, likes, ownership permissions, and structured error handling. It was built with Node.js, Express, MongoDB, and Mongoose as part of the TripleTen Software Engineering program.

The main goal of this sprint was to move the project from a hard-coded user prototype into a real authenticated API where users can sign up, sign in, receive a JSON Web Token, and access protected resources based on their identity.

---

## Project Overview

WTWR allows users to manage clothing items and interact with item data through a REST API.

This backend supports:

* User registration and login
* Password hashing with `bcryptjs`
* JWT-based authentication
* Protected routes for user-specific actions
* Public access to clothing items
* Clothing item creation and deletion
* Ownership checks before deletion
* Like and unlike functionality
* MongoDB/Mongoose schema validation
* Centralized HTTP status and error handling
* Development-only diagnostic routes for testing error responses
* ESLint and Prettier-based code formatting

---

## Tech Stack

* **Node.js**
* **Express**
* **MongoDB**
* **Mongoose**
* **JSON Web Tokens**
* **bcryptjs**
* **validator**
* **cors**
* **ESLint**
* **Prettier**
* **Nodemon**
* **Postman / VS Code Postman extension**

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

These routes are useful for manually checking standardized error responses during development. They are not intended for production use and should be disabled, guarded, or removed before deploying a production application.

---

## API Routes

### Public Routes

| Method | Endpoint       | Description                              |
| ------ | -------------- | ---------------------------------------- |
| `GET`  | `/`            | Health check route                       |
| `POST` | `/signup`      | Register a new user                      |
| `POST` | `/signin`      | Log in and receive a JWT                 |
| `GET`  | `/items`       | Get all clothing items                   |
| `GET`  | `/test-errors` | Development-only error diagnostic routes |

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

* `name` — required string, 2 to 30 characters
* `avatar` — required URL string
* `email` — required unique email string
* `password` — required string, hidden from normal query results

### Clothing Item

The clothing item schema includes:

* `name` — required string, 2 to 30 characters
* `weather` — required string with allowed values: `hot`, `warm`, `cold`
* `imageUrl` — required URL string
* `owner` — required user reference
* `likes` — array of user references
* `createdAt` — creation date

---

## Project Structure

```txt
.
├── controllers
│   ├── clothingItems.js
│   └── users.js
├── middlewares
│   └── auth.js
├── models
│   ├── clothingItem.js
│   └── user.js
├── routes
│   ├── clothingItems.js
│   ├── debugErrors.js
│   ├── index.js
│   └── users.js
├── utils
│   ├── config.js
│   └── errors.js
├── app.js
├── package.json
├── README.md
└── sprint.txt
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/AEMxr/se_project_express.git
cd se_project_express
```

### 2. Install dependencies

```bash
npm install
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

| Command         | Description                               |
| --------------- | ----------------------------------------- |
| `npm run start` | Starts the server with Node               |
| `npm run dev`   | Starts the server with Nodemon hot reload |
| `npm run lint`  | Runs ESLint on the project                |

---

## Environment and Configuration Notes

The project currently uses a local MongoDB database by default.

For development, the JWT secret is stored in `utils/config.js`.

For a production deployment, the JWT secret should be moved into an environment variable and excluded from source control.

Recommended future production pattern:

```bash
JWT_SECRET=your-secure-secret
MONGODB_URI=your-production-database-uri
```

---

## Testing and Validation

This project was tested with:

* Postman request collections
* Manual API route testing
* GitHub Actions validation
* ESLint

The current project does not yet include a full automated integration test suite. A strong future improvement would be adding automated tests for authentication, authorization, ownership checks, and standardized error responses.

---

## Project Status

Current status:

* Backend API implemented
* Authentication flow implemented
* Protected routes implemented
* Password hashing implemented
* Password hashes hidden from normal responses
* Ownership checks implemented
* Centralized error handling implemented
* Linting passes locally
* Old backup files removed from repository tracking
* README updated for the current auth-based backend structure

Known future improvements:

* Add automated integration tests
* Guard or disable `/test-errors` outside development
* Move JWT secret handling to environment variables
* Add deployment documentation
* Improve production-level logging
* Add screenshots or request/response examples
* Connect this backend to the WTWR frontend authentication flow

---

## Project Pitch Video

[link]

---

## What I Learned

This project helped me understand how authentication changes the structure of a backend API.

Adding signup and signin routes is only one part of the work. A secure API also needs protected routes, ownership checks, safe password handling, clear error responses, and maintainable developer-side debugging patterns.

The biggest lesson from this project was that backend development is not just about making successful requests work. It is also about designing predictable failure behavior, protecting user data, and making the system easier to debug and maintain.
