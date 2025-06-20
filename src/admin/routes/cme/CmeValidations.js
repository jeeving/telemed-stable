const { Joi } = require('../../util/validations');

const requireId = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
});

const edit = Joi.object().keys({
    title: Joi.string()
        .trim()
        .max(50)
        .required(),
    description: Joi.string()
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
    edit,
    updateStatus
};
