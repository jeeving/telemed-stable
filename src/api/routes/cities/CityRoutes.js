const express = require('express');
const router = express.Router();
const CityController = require('./CityController')
const { verifyToken } = require('../../util/auth');

router.get('/',
verifyToken,
CityController.getCities
);

module.exports = router;
