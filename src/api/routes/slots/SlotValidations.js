const { Joi } = require('../../util/validations');


const requireId = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
});

const getSlot = Joi.object().keys({
    date: Joi.date()
        .required(),
    offset : Joi.string()
        .required(),
});

const createSlot = Joi.object().keys({
    startDate: Joi.string()
        .required(),
    endDate: Joi.string()
        .required(),
    weekDays: Joi.array().items(Joi.string().required()).required(),
    startTime: Joi.string()
        .trim()
        .required(),
    endTime: Joi.string()
        .trim()
        .required(),
    offset : Joi.string()
        .required(),
});
const editSlot = Joi.object().keys({
    id: Joi.objectId()
    .valid()
    .required(),
    date: Joi.string()
        .required(),
    startTime: Joi.string()
        .trim()
        .required(),
    endTime: Joi.string()
        .trim()
        .required(),
    offset : Joi.string()
        .required(),
});
module.exports = {
    editSlot,
    requireId,
    getSlot,
    createSlot
};
