const {
    enums: { UploadConfig }
} = require('../../../../lib/models');
const { Joi } = require('../../util/validations');

const upload = Joi.object().keys({
    type: Joi.string()
        .trim()
        .valid(Object.keys(UploadConfig))
        .required(),
});

const deleteFile = Joi.object().keys({
    key: Joi.string()
        .trim()
        .required(),
});

module.exports = {
    upload,
    deleteFile
};
