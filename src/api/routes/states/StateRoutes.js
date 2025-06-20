const express = require('express');
const router = express.Router();
const StateController = require('./StateController')
const { verifyToken } = require('../../util/auth');
const { validate } = require('../../util/validations');
const validations = require('./StateValidations');

router.get('/:countryId',
    validate(validations.requireCountryId, 'params', {}, '/'),
    StateController.getStates
);

module.exports = router;
