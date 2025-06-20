const { Joi } = require('../../util/validations');

const requireId = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
});
const add = Joi.object().keys({
    speciality: Joi.string()
        .trim()
        .min(3)
        .max(30)
        .required(),
    bannerImage : Joi.string()
        .trim()
        .required(),
    s3Image : Joi.string()
        .trim()
});
const updateStatus = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
    status: Joi.boolean().required()
});
const optionalId = Joi.object().keys({
    id: Joi.alternatives()
        .try(Joi.string().valid('main'),
            Joi.objectId()
                .valid())
        .required(),
});

module.exports = {
    requireId,
    add,
    updateStatus,
    optionalId
};