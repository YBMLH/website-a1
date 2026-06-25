'use strict';

/** Wrap async route handlers so thrown errors reach the error middleware. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** 404 for unmatched API routes. */
function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

/** Central error handler — never leaks stack traces in production. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: err.publicMessage || err.message || 'Server error',
  });
}

module.exports = { asyncHandler, notFound, errorHandler };
