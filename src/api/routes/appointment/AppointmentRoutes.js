const express = require('express');
const router = express.Router();
const AppointmentController = require('./AppointmentController');
const validations = require('./AppointmentValidations');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');


router.post('/getConsultantSlots',
    verifyToken,
    validate(validations.getSlots),
    AppointmentController.getConsultantSlots
);

router.post('/deleteDocument',
    verifyToken,
    validate(validations.deleteDoc),
    AppointmentController.deleteDocument
);

router.post('/bookAppointment',
    verifyToken,
    validate(validations.bookingDetails),
    AppointmentController.bookAppointment
);
router.get('/list',
    verifyToken,
    // validate(validations.appointmentList),
    AppointmentController.appointmentList
);


router.get('/v2/list',
    verifyToken,
    // validate(validations.appointmentList),
    AppointmentController.appointmentListV2
);

router.post('/addDoc',
    verifyToken,
    validate(validations.addDoc),
    AppointmentController.addDoc
);

router.post('/deletePrescription',
    verifyToken,
    validate(validations.deletePrescription),
    AppointmentController.deletePrescription
);

router.get('/paymentToken',
    verifyToken,
    //validate(validations.requireId,'query'),
    AppointmentController.appointmentPaymentToken
);

router.get('/earningReport',
    verifyToken,
    // validate(validations.requireId,'query'),
    AppointmentController.earningReport
);

router.get('/detail/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/appointment'),
    AppointmentController.appointmentDetail
);

router.get('/cancel/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/appointment'),
    AppointmentController.cancelAppointment
);

router.put('/updateAppointement',
    verifyToken,
    validate(validations.addConsultantDescription),
    AppointmentController.addConsultantDescription
);

router.post('/deleteConsultantDescription',
    verifyToken,
    validate(validations.deleteConsultantDescription),
    AppointmentController.deleteConsultantDescription
);

/*******Twilio */
router.get(
    '/get-voice-token', 
    verifyToken, 
    validate(validations.appointmentIdOptional, 'query'), 
    AppointmentController.getVoiceToken
);
router.post('/voice-call', 
    AppointmentController.voiceCall
);
router.post('/voice-events', 
    AppointmentController.voiceEvents
);

router.get(
    '/get-video-token/twilio/:appointmentId', 
    verifyToken, 
    validate(validations.appointmentId, 'params'), 
    AppointmentController.videoCallToken
);

router.post('/video-events', 
    AppointmentController.videoEvents
);

router.get(
    '/reject-call/twilio/:appointmentId/:room_sid', 
    verifyToken, 
    validate(validations.appointmentReject, 'params'), 
    AppointmentController.rejectCall
);

router.post('/voice-fallback', 
    AppointmentController.voiceFallbackUrl    
)

module.exports = router;