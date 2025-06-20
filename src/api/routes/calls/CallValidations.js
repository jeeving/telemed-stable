const { Joi, common } = require('../../util/validations');

const requireToken = Joi.object().keys({
    token: Joi.string()
        .trim()
        .required()
});

const holdCharge = Joi.object().keys({
    stripeToken: Joi.string()
        .trim()
        .required()
});

const requireId = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
});
const createAccount = Joi.object().keys({
    deviceToken: Joi.string()
        .trim()
        .optional(),
    name: Joi.string()
        .trim()
        .required(),
    email: common.email,
    tnc_accepted: Joi.boolean()
        .required(),
    account_details: Joi.object({
        business_name: Joi.string()
            .trim()
            .required(),
        business_type: Joi.string().valid('individual')
            .trim()
            .required(),
    }),
    bank_account: Joi.object({
        ifsc_code: Joi.string()
            .trim()
            .required(),
        beneficiary_name: Joi.string()
            .trim()
            .required(),
        account_type: Joi.string().valid('current', 'saving')
            .trim()
            .optional(),
        account_number: Joi.string()
            .required(),
    }),
    audioSessionRate: Joi.number()
        .min(1)
        .required(),
    videoSessionRate: Joi.number()
        .min(1)
        .required(),
});
const reqToAccountUpdate = Joi.object().keys({
    deviceToken: Joi.string()
        .trim()
        .optional(),
    name: Joi.string()
        .trim()
        .required(),
    email: common.email,
    tnc_accepted: Joi.boolean()
        .required(),
    account_details: Joi.object({
        business_name: Joi.string()
            .trim()
            .required(),
        business_type: Joi.string().valid('individual')
            .trim()
            .required(),
    }),
    bank_account: Joi.object({
        ifsc_code: Joi.string()
            .trim()
            .required(),
        beneficiary_name: Joi.string()
            .trim()
            .required(),
        account_type: Joi.string().valid('current', 'saving')
            .trim()
            .optional(),
        account_number: Joi.string()
            .required(),
    })
});

const paymentRequest = Joi.object().keys({
    amount: Joi.number()
        .required(),
    bank_details: Joi.object({
        accountName: Joi.string()
            .trim()
            .optional(),
        country: Joi.string()
            .trim()
            .optional(),
        code: Joi.string()
            .trim()
            .optional().allow(""),
        iban: Joi.string().trim().optional().allow(""),
        account_number: Joi.string()
            .optional(),
        accountType: Joi.string().trim().optional(),
        bankName: Joi.string().trim().optional(),
        address: Joi.string().trim().optional(),
        routingNumber: Joi.string().trim().optional().allow(""),
        ifsc: Joi.string().trim().optional().allow(""),
    })
});

module.exports = {
    reqToAccountUpdate,
    requireToken,
    createAccount,
    holdCharge,
    requireId,
    paymentRequest
};
