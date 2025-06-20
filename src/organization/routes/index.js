const express = require('express');
const router = express.Router();
const fs = require('fs');
const AuthController = require('./auth/AuthController');
const validations = require('./auth/AuthValidations');
const { validate } = require('../util/validations');
const { verifyToken } = require('../util/auth');

const routes = fs.readdirSync(__dirname);

routes.forEach(route => {
    if (route === 'index.js') return;
    router.use(`/${route}`, require(`./${route}`));
});

router.get('/health', (req, res) => {
    res.send('OK');
});

router.get('/',  
    verifyToken,
    AuthController.dashboard
);

router.get('/profile',
    verifyToken,
    AuthController.profilePage
);

router.post('/profile',
    verifyToken,
    validate(validations.profile),
    AuthController.profile
);

router.get('/change-password',
    verifyToken,
    AuthController.changePasswordPage
);

router.post('/change-password',
    verifyToken,
    validate(validations.updatePassword),
    AuthController.changePassword
);

router.post('/is-email-exists',
    verifyToken,
    validate(validations.isEmailExists, 'body', {stripUnknown: true}, 'self', true),
    AuthController.isEmailExists
);

router.get('/settings',
    verifyToken,
    AuthController.settingsPage
);

router.post('/settings',
    verifyToken,
    validate(validations.settings, 'body', {}, 'self'),
    AuthController.updateSettings
);

module.exports = router;