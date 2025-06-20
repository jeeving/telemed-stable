const express = require('express');
const router = express.Router();
const validations = require('./CallValidations');
const CallController = require('./CallController');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.get('/',
    verifyToken,
    CallController.listPage
);




module.exports = router;