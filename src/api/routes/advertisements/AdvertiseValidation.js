const { Joi } = require('../../util/validations');

const requireSlug = Joi.object().keys({
  
});

module.exports = {
    requireSlug,
};
