const express = require('express');
const router = express.Router();
const UtilController = require('./UtilController');
const validations = require('./UtilValidations');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.get('/upload-file',
    verifyToken,
    validate(validations.uploadFile, 'query'),
    UtilController.uploadFile
);

module.exports = router;
