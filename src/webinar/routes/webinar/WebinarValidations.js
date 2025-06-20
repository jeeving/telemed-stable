const { Joi, common } = require('../../util/validations');
const {
    enums: {
        OtpType
    },
} = require('../../../../lib/models');

const requestOtp = Joi.object().keys({
    type: Joi.string()
        .valid(...Object.keys(OtpType))
        .required(),
    email: common.email,
    
});

const requireToken = Joi.object().keys({
    token: Joi.string()
        .trim()
        .required(),
});

const createWebinar = Joi.object().keys({
    "accredited": Joi.boolean().required(),
    "image": Joi.optional(),
    "link": Joi.optional(),
    "title": Joi.string().trim().required(),
    "timeOffset": Joi.string().trim().required(),
    "presenter": Joi.string().trim().required(),
    "timeWebinar": Joi.string().trim().required(),
   "hrWebinar": Joi.number().required(),
    "dateWebinar": Joi.string().trim().required(),
    "endDateWebinar": Joi.string().trim().optional(),
    "members": Joi.array().items(Joi.string().trim().optional()),
    "cmePartner": Joi.optional(),
    "description": Joi.optional(),
    "bannerDescription": Joi.optional(),
    "recordingEnable": Joi.optional(),
    "lessthan50ppl": Joi.optional()
})

const editWebinar = Joi.object().keys({
    "_id": Joi.string().trim().required(),
    "accredited": Joi.boolean().required(),
    "image": Joi.optional(),
    "link": Joi.optional(),
    "title": Joi.string().trim().required(),
    "timeOffset": Joi.string().trim().required(),
    "presenter": Joi.string().trim().required(),
    "timeWebinar": Joi.string().trim().required(),
    "dateWebinar": Joi.string().trim().required(),
    "endDateWebinar": Joi.string().trim().optional(),
    "members": Joi.array().items(Joi.string().trim().optional()),
    "cmePartner": Joi.optional(),
    "description": Joi.optional(),
    "bannerDescription": Joi.optional(),
    "recordingEnable": Joi.optional(),
    "lessthan50ppl": Joi.optional()
})

module.exports = {
    requestOtp,
    requireToken,
    createWebinar,
    editWebinar,
};
