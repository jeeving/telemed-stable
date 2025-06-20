const express = require('express');
const router = express.Router();
const PageController = require('./PageController');
const validations = require('./PageValidations');
const { validate } = require('../../util/validations');

router.get('/:slug',
    validate(validations.requireSlug, 'params', {}, '/'),
    PageController.page
);

module.exports = router;
