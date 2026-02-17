/**
 * Centralized error handler middleware.
 * All route handlers should use try/catch and call next(err).
 * This middleware sends a consistent JSON error response.
 */

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.statusCode ?? err.status ?? 500;
  const message = err.message ?? 'Internal Server Error';
  const details = err.details ?? undefined;

  res.status(status).json({
    error: message,
    ...(details && { details }),
  });
}

module.exports = { errorHandler };
