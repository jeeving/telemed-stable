const express = require('express');
const router = express.Router();
const SupportController = require('./SupportController');
const validations = require('./SupportValidation');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.get('/',
SupportController.support
);

module.exports = router;
