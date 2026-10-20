const { handleAppError } = require("../utils/errors");

module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  return handleAppError(res, err);
};
