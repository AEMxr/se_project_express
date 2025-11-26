const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../utils/config");
const { UNAUTHORIZED } = require("../utils/errors");

module.exports = (req, res, next) => {
  const url = req.originalUrl || req.path || "";
  const isSignin = url.includes("/signin");
  const isSignup = url.includes("/signup");
  const isPublicItems =
    req.method === "GET" && (url === "/items" || url.startsWith("/items?") || url === "/items/");

  if (isSignin || isSignup || isPublicItems) {
    return next();
  }

  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(UNAUTHORIZED).send({ message: "Authorization required" });
  }

  const token = authorization.replace("Bearer ", "");

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(UNAUTHORIZED).send({ message: "Authorization required" });
  }
};
