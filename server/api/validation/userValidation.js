const {Joi} = require('express-validation');

const byIdSchema = {
  params: Joi.object({
    id: Joi.number().required()
  })
};


module.exports = {
  byIdSchema
};
