const express = require('express');
const router = express.Router();
const validations = require('./UtilValidations');
const UtilController = require('./UtilController');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.post('/upload/:type',
    verifyToken,
    validate(validations.upload, 'params', {}, 'self', true),
    UtilController.upload
);

router.post('/delete-file',
    verifyToken,
    validate(validations.deleteFile, 'body', {}, 'self', true),
    UtilController.deleteFile
);

module.exports = router;
