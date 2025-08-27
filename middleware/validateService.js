const Joi = require('joi');

const serviceSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Service name is required',
      'string.max': 'Service name cannot exceed 100 characters'
    }),
  
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  
  isActive: Joi.boolean(),
  
  estimatedServiceTime: Joi.number()
    .integer()
    .min(1)
    .max(1440) // Max 24 hours
    .messages({
      'number.min': 'Service time must be at least 1 minute',
      'number.max': 'Service time cannot exceed 1440 minutes (24 hours)'
    })
});

const validateService = (req, res, next) => {
  const { error } = serviceSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

module.exports = validateService;