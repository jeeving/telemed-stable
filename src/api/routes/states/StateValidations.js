const { Joi } = require('../../util/validations');

const requireCountryId = Joi.object().keys({
    countryId: Joi.objectId()
        .required(),
});

module.exports = {
    requireCountryId,
};
