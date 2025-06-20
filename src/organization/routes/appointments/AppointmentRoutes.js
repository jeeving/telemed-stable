const express = require("express");
const router = express.Router();
const validations = require("./AppointmentValidation");
const AppointmentController = require("./AppointmentController");
const { validate } = require("../../util/validations");
const { verifyToken } = require("../../util/auth");

router.get("/",
    verifyToken,
    AppointmentController.listPage
);

router.get("/list",
    verifyToken,
    AppointmentController.list
);

// router.get("/add",
//     verifyToken,
//     AppointmentController.addPage
// );

// router.post("/add",
//     verifyToken,
//     validate(validations.add, 'body', {}),
//     AppointmentController.add
// );

router.get('/view/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/appointments'),
    AppointmentController.view
);

router.get('/refund/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/appointments'),
    AppointmentController.refundAppointement
);

router.get('/callTwilio/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/appointments'),
    AppointmentController.callTwilio
);

router.get('/callTwilioList/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/appointments'),
    AppointmentController.callTwilioList
);

// router.get('/edit/:id',
//     verifyToken,
//     validate(validations.requireId, 'params', {}, '/speciality'),
//     AppointmentController.editPage
// );

// router.post('/edit/:id',
//     verifyToken,
//     validate(validations.requireId, 'params', {}, '/speciality'),
//     // validate(validations.add, 'body', {}),
//     AppointmentController.edit
// );

// router.get('/update-status',
//     verifyToken,
//     validate(validations.updateStatus, 'query', {}, '/speciality'),
//     AppointmentController.updateStatus
// );

// router.get('/delete/:id',
//     verifyToken,
//     validate(validations.requireId, 'params', {}, '/speciality'),
//     AppointmentController.delete
// );

// router.post('/is-speciality-exists',

// AppointmentController.isSpecialityExists
// )

// router.get('/speciality/uploadImage',
// AppointmentController.uploadImage
// );



module.exports = router;