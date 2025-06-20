const express = require('express');
const router = express.Router();
const FaqController = require('./FaqController');
const validations = require('./FaqValidations');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.get('/',
verifyToken,
FaqController.getFaqs
);

router.get('/get',

	FaqController.getFaqsAll
);
module.exports = router;
