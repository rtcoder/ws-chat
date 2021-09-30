const {Joi} = require('express-validation');

const registerSchema = {
  body: Joi.object({
    email: Joi.string()
      .email()
      .required(),
    password: Joi.string()
      .regex(/[a-zA-Z0-9]{3,30}/)
      .required(),
    first_name: Joi.string()
      .required(),
    last_name: Joi.string()
      .required()
  })
};
const loginPasswordSchema = {
  body: Joi.object({
    email: Joi.string()
      .email()
      .required(),
    password: Joi.string()
      .regex(/[a-zA-Z0-9]{3,30}/)
      .required(),
  })
};


module.exports = {
  loginPasswordSchema,
  registerSchema,
};
