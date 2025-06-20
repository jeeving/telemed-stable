require('joi-i18n');
let Joi = require('joi');
const {languages} = require('./../../../lib/i18n');
const {getLanguage} = require('./common');
const {isValidObjectId, logError} = require('./../../../lib/util');

const validate = (schema, field = 'body', options = {}) => (req, res, next) => {
    const {error, value} = schema.validate(req[field], {
        locale: getLanguage(req),
        ...options,
    });

    if (!error) {
        req[field] = value;
        return next();
    }

    if (process.env.NODE_ENV === 'development') {
        logError(`${req.method} ${req.originalUrl}`, '\x1b[33m', error.details[0].message, '\x1b[0m');
    }
    return res.warn(null, error.details[0].message);
};


Object.keys(languages).forEach(language => Joi.addLocaleData(language, languages[language].validation));

const patterns = {
    password: /^(?=(.*[a-zA-Z])+)(?=(.*[0-9])+).{8,}$/,
    adminPassword: /^(?=.*?[A-Z])(?=(.*[a-z])+)(?=(.*[\d])+)(?=(.*[\W])+)(?!.*\s).{8,}$/,
    email: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    number: /^[\d]+$/,
    countryCode: /^\+[\d]+$/,
    phone: /^\+(?:[0-9] ?){6,12}[0-9]$/,
    whatsappPhone:/^\+[\d]{1,4}[\s]?[\d]{4,12}$/,
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
        .trim()
        .min(8)
        .max(72)
        .regex(patterns.password, 'passwordPattern')
        .required(),
    adminPassword: Joi.string()
        .max(72)
        .regex(patterns.adminPassword, 'adminPasswordPattern')
        .required()
        .error(([error]) => {
            const {locale} = error.options;
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
            return {message};
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
    age: Joi.string()
        .trim()
        .required(),
    otp: Joi.string()
        .trim()
        .regex(patterns.otp, 'otpPattern')
        .required(),
    countryCode: Joi.string()
        .trim()
        .regex(patterns.countryCode, 'countryCodePattern')
        .required(),
    phone: Joi.string()
        .trim()
        .regex(patterns.phone, 'phonePattern')
        .required(),
    whatsappPhone: Joi.string()
        .trim()
        .regex(patterns.whatsappPhone, 'whatsappPhone'),
    timeIn24Hours: Joi.string()
        .trim()
        .regex(patterns.timeIn24Hours, 'timeIn24Hours')
        .required(),
    fileString: Joi.string()
        .trim()
        .required()
        .allow(''),
    address: Joi.string()
        .trim()
        .min(3)
        .max(200)
        .required(),
    page: Joi.number()
        .min(1)
        .required(),
    perPage: Joi.number()
        .min(1)
        .required(),
};

const validateSocketData = (schema, language, data = {}, options = {}) =>  {
    const { error } = schema.validate(data, {
        locale: language || 'en',
        ...options,
    });

    if (error) {
        return {
            isError: true,
            msg: error.details[0].message
        };
    }

    return {
        isError: false,
    }
};


module.exports = {Joi, patterns, validate, common, validateSocketData};
