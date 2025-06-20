const express = require('express');
const router = express.Router();
const SocialLinkController = require('./SocialLinkController');

router.get('/',
SocialLinkController.getSocialLinks
);

module.exports = router;
