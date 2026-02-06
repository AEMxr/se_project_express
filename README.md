WTWR (What To Wear?) — Backend API

Node/Express API with MongoDB/Mongoose for users and clothing items.
Implements listing, creating, deleting items, liking/unliking items, and basic users CRUD.
Validates URLs with validator; shared error codes in utils/errors.js.
Tech Stack

Express 5, MongoDB/Mongoose 8
validator, ESLint (airbnb-base) + Prettier, Nodemon
Postman/VS Code Postman extension for testing
Scripts

npm run start — start server on http://localhost:3001
npm run dev — start with hot reload
npm run lint — run ESLint
Setup

npm install
Local DB (default): Mongo at mongodb://127.0.0.1:27017/wtwr_db
Atlas (optional):
PowerShell: $env:MONGODB_URI='mongodb+srv://.../wtwr_db?retryWrites=true&w=majority'; npm run dev
The app reads MONGODB_URI with a localhost fallback.
API Endpoints

Users: GET /users, GET /users/:userId, POST /users
Items: GET /items, POST /items (owner set from req.user.\_id), DELETE /items/:itemId
Likes: PUT /items/:itemId/likes, DELETE /items/:itemId/likes
Error Handling

400: validation or invalid id (CastError)
404: not found or unknown route { "message": "Requested resource not found" }
500: { "message": "An error has occurred on the server." }
Dev Notes

For testing, a simple req.user stub is added in app.js. Guard it with NODE_ENV for production.

## How it works
[link]