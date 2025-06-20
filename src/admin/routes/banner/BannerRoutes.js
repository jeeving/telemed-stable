const express = require('express');
const router = express.Router();
const validations = require('./BannerValidations');
const BannerController = require('./BannerController');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.get('/',
    verifyToken,
    BannerController.listPage
);

router.get('/uploadImage',
    BannerController.uploadImage
);

router.post(
    "/updateBanner",
    BannerController.updateBanner
)

router.post(
    "/deleteBanner",
    BannerController.deleteBanner
)


module.exports = router;