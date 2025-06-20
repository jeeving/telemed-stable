const express = require('express');
const router = express.Router();
const validations = require('./AuthValidations');
const AuthController = require('./AuthController');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.post('/request-otp',
    validate(validations.requestOtp),
    AuthController.requestOtp
);

router.post('/verify-otp',
    validate(validations.verifyOtp),
    AuthController.verifyOtp
);

router.post('/sign-up',
    validate(validations.signUp),
    AuthController.signUp
);

router.post('/log-in',
    validate(validations.logIn),
    AuthController.logIn
);

router.get('/log-out',
    verifyToken,
    AuthController.logout
);

router.post('/reset-password',
    validate(validations.resetPassword),
    AuthController.resetPassword
);

router.post('/generate-token',
    AuthController.generateToken
);
router.get('/enc-test',
    AuthController.encTest
);

router.post('/organization-request',
    AuthController.organizationRequest
);

router.get('/get-banner',
    AuthController.getBanner
);


router.get('/jsthemis',
    AuthController.jsthemis
);


module.exports = router;
