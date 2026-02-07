import { validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const details = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
    }));
    const messages = details.map(d => `${d.field}: ${d.message}`).join('; ');
    return res.status(400).json({
      error: 'Validation failed',
      message: messages || 'Validation failed',
      details,
    });
  }
  
  next();
}
