const express = require("express");
const router = express.Router();
const validations = require("./PaymentValidation");
const PaymentController = require("./PaymentController");
const { validate } = require("../../util/validations");
const { verifyToken } = require("../../util/auth");

router.get("/",
    verifyToken,
    PaymentController.listPage
);

router.get("/list",
    verifyToken,
    PaymentController.list
);

router.get("/payment-request",
    verifyToken,
    PaymentController.paymentRequestPage
);

router.get("/payment-request-list", //(req,res,next)=> { console.log("1111"); return next() },
    verifyToken,  //(req,res,next)=> { console.log("2222"); return next() },
    PaymentController.paymentRequestlist
);
router.get("/update-payment-status",
    verifyToken,
    PaymentController.updatePaymentRequestStatus
);

router.get("/view-payment-request/:id",
    verifyToken,
    PaymentController.viewPaymentRequest
);



// router.get("/add",
//     verifyToken,
//     PaymentController.addPage
// );

// router.post("/add",
//     verifyToken,
//     validate(validations.add, 'body', {}),
//     PaymentController.add
// );

router.get('/view/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/appointments'),
    PaymentController.view
);

// router.get('/edit/:id',
//     verifyToken,
//     validate(validations.requireId, 'params', {}, '/speciality'),
//     PaymentController.editPage
// );

// router.post('/edit/:id',
//     verifyToken,
//     validate(validations.requireId, 'params', {}, '/speciality'),
//     // validate(validations.add, 'body', {}),
//     PaymentController.edit
// );

// router.get('/update-status',
//     verifyToken,
//     validate(validations.updateStatus, 'query', {}, '/speciality'),
//     PaymentController.updateStatus
// );

// router.get('/delete/:id',
//     verifyToken,
//     validate(validations.requireId, 'params', {}, '/speciality'),
//     PaymentController.delete
// );

// router.post('/is-speciality-exists',

// PaymentController.isSpecialityExists
// )

// router.get('/speciality/uploadImage',
// PaymentController.uploadImage
// );



module.exports = router;