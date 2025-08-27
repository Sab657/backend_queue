const Joi = require('joi');

const queueSchema = Joi.object({
  customerName: Joi.string()
    .trim()
    .max(100)
    .allow('')
    .messages({
      'string.max': 'Customer name cannot exceed 100 characters'
    }),
  
  customerPhone: Joi.string()
    .trim()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  priority: Joi.string()
    .valid('normal', 'priority', 'urgent')
    .default('normal'),
  
  notes: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    }),
    
  reason: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Reason cannot exceed 500 characters'
    })
});

const validateQueue = (req, res, next) => {
  const { error } = queueSchema.validate(req.body, {
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

module.exports = validateQueue;