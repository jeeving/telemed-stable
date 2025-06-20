const { Joi, common } = require('../../util/validations');
const { languages } = require('../../../../lib/i18n');


const requireId = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
});

const add = Joi.object().keys({
    fullName: Joi.string()
        .trim()
        .min(3)
        .max(30)
        .required(),
    email: common.email,
    countryCode : common.countryCode,
    phoneNumber : common.contactNumber,
    password : common.password,
    confirmPassword: Joi.string()
        .required()
        .valid(Joi.ref('newPassword'))
        .error(([error]) => {
            const { locale } = error.options;
            const language = languages[locale];
            return {
                message: language.validation.custom.sameAs(error.context.key, 'password'),
            };
        }),
});

const updateStatus = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
    status: Joi.boolean().required()
});

module.exports = {
    requireId,
    add,
    updateStatus,
};