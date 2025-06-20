const { Joi } = require('../../util/validations');

const requireId = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
});

const add = Joi.object().keys({
    question: Joi.string()
        .trim()
        .min(5)
        .max(70)
        .required(),
    answer: Joi.string()
        .trim()
        .min(5)
        .required(),
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
    updateStatus
};
