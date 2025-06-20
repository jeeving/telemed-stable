const express = require('express');
const router = express.Router();
const AdvertiseController = require('./AdvertiseController');
const validations = require('./AdvertiseValidation');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.get('/',
	verifyToken,
	AdvertiseController.advertisement
);

module.exports = router;
