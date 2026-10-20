class AppError extends Error {
  constructor(statusCode, message, expose = true) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.expose = expose;
  }
}

module.exports = AppError;
