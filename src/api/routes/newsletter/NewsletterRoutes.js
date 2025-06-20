const express = require('express');
const router = express.Router();
const NewsletterController = require('./NewsletterController')
const { verifyToken } = require('../../util/auth');

router.post('/',
NewsletterController.newsletters
);

module.exports = router;
