const { Joi } = require('../../util/validations');

const requireId = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
});



module.exports = {
    requireId
   
};
