const { Joi } = require('../../util/validations');

const getSlots = Joi.object().keys({
    consultantId: Joi.objectId()
        .valid()
        .required(),
    date: Joi.date()
        .required(),
    currentTimeStamp: Joi.optional(),
    offset : Joi.string()
        .required(),
});

const deleteDoc = Joi.object().keys({
    key: Joi.objectId()
        .required(),
});

const bookingDetails = Joi.object().keys({
    consultantId: Joi.objectId()
        .valid()
        .required(),
    patientDetails: Joi.object().keys({
        fullName: Joi.string()
            .trim()
            .required(),
        dob: Joi.string()
            .trim()
            .required(),
        age: Joi.number(),
        gender: Joi.string()
            .trim(),
        reason: Joi.string()
            .trim(),
        documents: Joi.array(),
        doctorVoiceNote: Joi.array()
    }),
    appointmentDate: Joi.date()
        .required(),
    slotId: Joi.array().optional().allow(''),
    sessionMode: Joi.string()
        .trim()
        .required(),
    offset : Joi.string()
        .required(),
    isEmergency: Joi.boolean().optional().allow(''),
    startTime: Joi.string().trim().optional().allow(''),
});

const appointmentList = Joi.object().keys({
    type: Joi.string()
        .trim()
        .optional(),
});

const addDoc = Joi.object().keys({
    type: Joi.string()
        .trim()
        .valid('REPORT', 'PRESCRIPTION', 'DOCVOICENOTE', 'CONVOICENOTE')
        .required(),
    fileName: Joi.string()
        .trim()
        .required(),
    documentName: Joi.string()
        .trim()
        .required(),
    id: Joi.objectId()
        .valid()
        .required(),
});

const requireId = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
});

const deletePrescription = Joi.object().keys({
    id: Joi.objectId()
        .required(),
    docId: Joi.objectId()
        .required(),
    key: Joi.string()
        .trim()
        .required(),
    type: Joi.string()
        .trim()
        .valid('REPORT', 'PRESCRIPTION', 'DOCVOICENOTE', 'CONVOICENOTE')
        .required(),
});

const deleteConsultantDescription = Joi.object().keys({
    id: Joi.objectId()
        .required(),
    docId: Joi.objectId()
        .required()
})

const appointmentId = Joi.object().keys({
    appointmentId: Joi.objectId()
        .required()
});

const appointmentIdOptional = Joi.object().keys({
    appointmentId: Joi.objectId()
    .optional(),
});

const addConsultantDescription = Joi.object().keys({
    consultDescription: Joi.string()
        .required(),
    appointmentId: Joi.objectId()
        .required()
})

const appointmentReject = Joi.object().keys({
    appointmentId: Joi.objectId()
        .required(),
    room_sid: Joi.string()
        .optional(),
});

module.exports = {
    getSlots,
    deleteDoc,
    bookingDetails,
    appointmentList,
    requireId,
    addDoc,
    deletePrescription,
    appointmentId,
    appointmentIdOptional,
    addConsultantDescription,
    deleteConsultantDescription,
    appointmentReject
};
