const Joi = require('joi');

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),
  MONGODB_URI: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  SMTP_FROM: Joi.string().optional(),
  RESEND_API_KEY: Joi.string().optional(),
  CLIENT_URL: Joi.string().default('http://localhost:5173'),
  COOKIE_SECRET: Joi.string().when('NODE_ENV', {
    is: 'test',
    then: Joi.optional().default('test_cookie_secret_value_32_bytes_long'),
    otherwise: Joi.required()
  }),
  AI_KEY_ENCRYPTION_SECRET: Joi.string().when('NODE_ENV', {
    is: 'test',
    then: Joi.optional().default('test_ai_key_encryption_secret_value_32_bytes_long'),
    otherwise: Joi.required()
  }),
}).unknown();

const { value: env, error } = envSchema.validate(process.env);
if (error) throw new Error(`Config validation error: ${error.message}`);

module.exports = env;
