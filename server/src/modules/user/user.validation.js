const Joi = require('joi');

const updateProfileSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9\s_\-À-ỹ]+$/)
    .optional(),
  avatar: Joi.string().trim().max(2048).allow('', null).optional(),
  emailReminderEnabled: Joi.boolean().optional(),
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one field to update' });

module.exports = { updateProfileSchema };
