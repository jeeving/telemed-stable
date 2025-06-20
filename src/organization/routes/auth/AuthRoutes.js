const express = require('express');
const router = express.Router();
const validations = require('./AuthValidations');
const AuthController = require('./AuthController');
const { validate } = require('../../util/validations');

router.get('/log-in',
    AuthController.logInPage
);

router.post('/log-in',
    validate(validations.logIn),
    AuthController.logIn
);

router.get('/log-out',
    AuthController.logout
);

router.get('/forgot-password',
    AuthController.forgotPasswordPage
);

router.post('/forgot-password',
    validate(validations.forgotPassword),
    AuthController.forgotPassword
);

router.get('/reset-password',
    AuthController.resetPasswordPage
);

router.post('/reset-password',
    validate(validations.resetPassword),
    AuthController.resetPassword
);

module.exports = router;
