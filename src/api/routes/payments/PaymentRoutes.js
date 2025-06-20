const express = require('express');
const router = express.Router();
const PaymentController = require('./PaymentController');
const validations = require('./PaymentValidations');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');


router.get('/about_blank',
    PaymentController.aboutBlank
);
router.get('/saveCards',
    verifyToken,
    PaymentController.saveCards
);
router.post('/createAccount',
    verifyToken,
    validate(validations.createAccount),
    PaymentController.createAccount
);
router.post('/reqToAccountUpdate',
    verifyToken,
    validate(validations.reqToAccountUpdate),
    PaymentController.reqToAccountUpdate
);
router.get('/failed',
    PaymentController.failed
);

router.get('/success',
    PaymentController.success
);

router.post('/verify/:amount',
    PaymentController.verify
);

router.post('/payment-request',
    verifyToken,
    validate(validations.paymentRequest),
    PaymentController.paymentRequest
);

router.get('/payment-request-list',
    verifyToken,
    PaymentController.paymentRequestList
);



router.get(
    ['/hold-charge/:token','/hold-charge/:token/:isWallet'],
    //validate(validations.requireToken, 'params'),
   
    PaymentController.initHoldCharge
);

router.get('/detail/:id',
    verifyToken,
    validate(validations.requireId, 'params'),
    PaymentController.paymentDetail
);

router.get('/currency-price',
    verifyToken,
    PaymentController.currencyPrice
);

module.exports = router;
