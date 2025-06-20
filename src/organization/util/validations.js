require('joi-i18n');
let Joi = require('joi');
const { languages } = require('./../../../lib/i18n');
const { getLanguage } = require('./common');
const { isValidObjectId, logError } = require('./../../../lib/util');

const validate = (schema, field = 'body', options = {}, redirect = 'self', isAjax = false) => (req, res, next) => {
    const { error, value } = schema.validate(req[field], {
        locale: getLanguage(req),
        ...options,
    });

    if (!error) {
        req[field] = value;
        return next();
    }

    if (isAjax) {
        return res.status(400).send({
            success: false,
            data: '',
            message: error.details[0].message,
        });
    }
    else {
        if (process.env.NODE_ENV === 'development') {
            logError(`${req.method} ${req.originalUrl}`, '\x1b[33m', error.details[0].message, '\x1b[0m');
        }
        req.flash('error', error.details[0].message);
        return res.redirect(redirect === 'self' ? req.headers.referer || '/' : redirect);
    }
};

Object.keys(languages).forEach(language => Joi.addLocaleData(language, languages[language].validation));

const patterns = {
    password: /^(?=(.*[a-zA-Z])+)(?=(.*[0-9])+).{8,}$/,
    adminPassword: /^(?=.*?[A-Z])(?=(.*[a-z])+)(?=(.*[\d])+)(?=(.*[\W])+)(?!.*\s).{8,}$/,
    email: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    number: /^[\d]+$/,
    countryCode: /^\+[\d]+$/,
    contactNumber: /^[\d]{4,15}$/,
    timeIn24Hours: /^([01]\d|2[0-3]):([0-5]\d)$/,
    otp: /^[\d]{4}$/
};

Joi = Joi.extend(joi => ({
    base: joi.string(),
    name: 'objectId',
    rules: [
        {
            name: 'valid',
            validate(params, value, state, options) {
                if (!isValidObjectId(value)) {
                    return this.createError('objectId.valid', {}, state, options);
                }
                return value;
            },
        },
    ],
}));

const common = {
    password: Joi.string()
        .max(72)
        .regex(patterns.password, 'passwordPattern')
        .required()
        .error(([error]) => {
            const { locale } = error.options;
            const language = languages[locale];
            let message = '';
            switch (error.type) {
                case 'any.required':
                case 'any.empty':
                    message = language.validation.any.required(error);
                    break;
                case 'string.regex.name':
                    message = language.validation.string.regex.name(error);
                    break;
                case 'string.max':
                    message = language.validation.string.max(error);
                    break;
            }
            return { message };
        }),
    adminPassword: Joi.string()
        .max(72)
        .regex(patterns.adminPassword, 'adminPasswordPattern')
        .required()
        .error(([error]) => {
            const { locale } = error.options;
            const language = languages[locale];
            let message = '';
            switch (error.type) {
                case 'any.required':
                case 'any.empty':
                    message = language.validation.any.required(error);
                    break;
                case 'string.regex.name':
                    message = language.validation.string.regex.name(error);
                    break;
                case 'string.max':
                    message = language.validation.string.max(error);
                    break;
            }
            return { message };
        }),
    token: Joi.string()
        .trim()
        .hex()
        .required(),
    email: Joi.string()
        .trim()
        .lowercase()
        .regex(patterns.email, 'emailPattern')
        .required(),
    countryCode: Joi.string()
        .trim()
        .regex(patterns.countryCode, 'countryCodePattern')
        .required(),
    contactNumber: Joi.string()
        .trim()
        .regex(patterns.contactNumber, 'contactNumberPattern')
        .required(),
    timeIn24Hours: Joi.string()
        .trim()
        .regex(patterns.timeIn24Hours, 'timeIn24Hours')
        .required(),
    timeIn24HoursOptional: Joi.string()
        .trim()
        .regex(patterns.timeIn24Hours, 'timeIn24Hours')
        .optional()
        .allow(''),
    fileString: Joi.string()
        .trim()
        .required()
        .allow(''),
    address: Joi.string()
        .trim()
        .min(3)
        .max(200)
        .required(),
    otp: Joi.string()
        .trim()
        .regex(patterns.otp, 'otpPattern')
        .required(),
};

module.exports = { Joi, patterns, validate, common };
