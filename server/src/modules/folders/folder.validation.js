const Joi = require('joi');

const createSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  parent: Joi.string().allow(null).default(null),
  parentId: Joi.string().allow(null).default(null),
});

const updateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120),
  parent: Joi.string().allow(null),
  parentId: Joi.string().allow(null),
}).min(1);

const addSetSchema = Joi.object({
  setId: Joi.string().required(),
});

module.exports = { createSchema, updateSchema, addSetSchema };
