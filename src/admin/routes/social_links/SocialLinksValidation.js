const { Joi } = require('../../util/validations');

const requireId = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
});
const add = Joi.object().keys({
    socialName: Joi.string()
        .trim()
        .min(3)
        .max(80)
        .required(),
    linkUrl : Joi.string()
        .trim(),
    socialIcon : Joi.string()
        .trim()
        .required(),
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