const express = require('express');
const router = express.Router();
const ConsultantsController = require('./ConsultantsController');
const validations = require('./ConsultantsValidations');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');


router.get('/list',
    verifyToken,
    // validate(validations.requireSlug, 'params', {}, '/'),
    ConsultantsController.list
);

router.get('/search',
    verifyToken, 
    ConsultantsController.getList
);

router.get('/getDetails',
    verifyToken,
    //validate(validations.requireId, 'query', {}, '/consultants'),
    ConsultantsController.getDetails
);

module.exports = router;
