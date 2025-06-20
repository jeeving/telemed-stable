const express = require('express');
const router = express.Router();
const CountryController = require('./CountryController')
const { verifyToken } = require('../../util/auth');

router.get('/',
    CountryController.getCountries
);

module.exports = router;
