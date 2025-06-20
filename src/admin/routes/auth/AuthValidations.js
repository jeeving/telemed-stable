const { Joi, common } = require('../../util/validations');
const { languages } = require('../../../../lib/i18n');

const logIn = Joi.object().keys({
    email: common.email,
    password: Joi.string().required(),
    timeZone: Joi.string()
        .trim()
        .optional()
        .allow(''),
});

const forgotPassword = Joi.object().keys({
    email: common.email,
});

const resetPassword = Joi.object().keys({
    otp: Joi.string().required(),
    newPassword: common.adminPassword,
});

const verifyUser = Joi.object().keys({
    email: common.email,
    otp: Joi.number().required(),
    timeZone: Joi.string()
        .trim()
        .optional()
        .allow(''),
});

const profile = Joi.object().keys({
    firstName: Joi.string()
        .trim()
        .min(3)
        .max(30)
        .required(),
    lastName: Joi.string()
        .trim()
        .min(3)
        .max(30)
        .required(),
    email: common.email,
    countryCode: common.countryCode,
    contactNumber: common.contactNumber,
});

const updatePassword = Joi.object().keys({
    currentPassword: Joi.string().required(),
    newPassword: common.adminPassword,
    confirmPassword: Joi.string()
        .required()
        .valid(Joi.ref('newPassword'))
        .error(([error]) => {
            const { locale } = error.options;
            const language = languages[locale];
            return {
                message: language.validation.custom.sameAs(error.context.key, 'newPassword'),
            };
        }),
});

const isEmailExists = Joi.object().keys({
    email: common.email,
    id: Joi.objectId()
        .valid()
        .optional(),
});

const settings = Joi.object().keys({
    androidAppVersion: Joi.string()
        .regex(/^[\d]+\.[\d]+\.[\d]+$/, 'Semantic Version')
        .required(),
    androidForceUpdate: Joi.boolean().required(),
    iosAppVersion: Joi.string()
        .regex(/^[\d]+\.[\d]+\.[\d]+$/, 'Semantic Version')
        .required(),
    iosForceUpdate: Joi.boolean().required(),
    maintenance: Joi.boolean().required(),
    adminCommission: Joi.number().required(),
    gst: Joi.number().required(),
    webinarGst: Joi.number().required(),
    transactionFee: Joi.number().required(),
    newsLetterEmail: common.email,
    webinarPrice: Joi.optional(),
    adminFlatFee: Joi.number().required(),
    conversionRate: Joi.number().required(),

    audioCallFee: Joi.number().required(),
    videoCallFee: Joi.number().required(),
});

module.exports = {
    logIn,
    profile,
    verifyUser,
    updatePassword,
    forgotPassword,
    resetPassword,
    isEmailExists,
    settings,
};
