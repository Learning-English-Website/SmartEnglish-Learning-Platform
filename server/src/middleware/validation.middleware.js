const { AppError } = require('../shared/errors/AppError');

/**
 * Middleware to validate request body using Joi schema.
 * Works with Express 5 – calls next(err) on validation failure.
 */
function validate(schema) {
  return function (req, res, next) {
    const body = req.body || {};
    const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map(d => d.message).join('; ');
      return next(new AppError(details, 400));
    }
    req.body = value;
    return next();
  };
}

module.exports = { validate };
