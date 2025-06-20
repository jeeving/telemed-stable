const express = require('express');
const router = express.Router();
const SpecialitieController = require('./SpecialityController');
const validations = require('./SpecialityValidation');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.get('/',
verifyToken,
SpecialitieController.specialities
);

module.exports = router;
