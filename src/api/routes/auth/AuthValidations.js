const { Joi, common } = require('../../util/validations');
const {
    enums: {
        OtpType,
    },
} = require('../../../../lib/models');

const requestOtp = Joi.object().keys({
    type: Joi.string()
        .valid(...Object.keys(OtpType))
        .required(),
    email: common.email,
    
});

const verifyOtp = requestOtp.keys({
    token: common.otp,
});

const signUp = Joi.object().keys({
    fullName: Joi.string()
        .trim()
        .min(3)
        .max(30)
        .required(),
    email: common.email
        .required(),
    phone: common.phone,
    password: common.password,
    deviceToken: Joi.string()
        .trim()
        .optional(),
    voipToken: Joi.string()
        .trim()
        .optional(),
});

const logIn = Joi.object().keys({
    email: common.email
    .required(),
    password: Joi.string()
        .trim()
        .required(),
    deviceToken: Joi.string()
        .trim()
        .optional(),
    voipToken: Joi.string()
        .trim()
        .optional(),
});

const resetPassword = Joi.object().keys({
    email: common.email,
    password: common.password
});

module.exports = {
    requestOtp,
    verifyOtp,
    signUp,
    logIn,
    resetPassword,
};
