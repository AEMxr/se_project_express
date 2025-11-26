const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../utils/config");
const { UNAUTHORIZED } = require("../utils/errors");

module.exports = (req, res, next) => {
    if ((req.method === "POST" && (req.path === "/signin" || req.path === "/signup")) ||
        (req.method === "GET" && req.path === "/items") ) {
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