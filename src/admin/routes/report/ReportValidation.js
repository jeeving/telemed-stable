const { Joi } = require('../../util/validations');


const updateStatus = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
    status: Joi.boolean().required()
});

const requireId = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
});

module.exports = {
    updateStatus,
    requireId
};
