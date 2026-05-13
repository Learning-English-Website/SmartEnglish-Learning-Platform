const Joi = require('joi');

const createSchema = Joi.object({
  name: Joi.string().trim().min(1).max(64).required(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
});

const updateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(64),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
}).min(1);

module.exports = { createSchema, updateSchema };
