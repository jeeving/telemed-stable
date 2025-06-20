const express = require('express');
const router = express.Router();
const TwilioController = require('./TwilioController');
const validations = require('./TwilioValidations');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');


router.get('/test',
    //verifyToken,
    //validate(validations.getSlot),
    TwilioController.test,
);



module.exports = router;
