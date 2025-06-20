const express = require('express');
const router = express.Router();
const ReferralController = require('./ReferralController');
const { verifyToken } = require('../../util/auth');

router.get('/',
    verifyToken,
    ReferralController.listPage
);




module.exports = router;