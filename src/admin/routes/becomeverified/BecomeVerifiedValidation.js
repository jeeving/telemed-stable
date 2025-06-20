const { Joi } = require('../../util/validations');

const requireId = Joi.object().keys({
    id: Joi.objectId()
        .valid()
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
    updateStatus,
    optionalId
};