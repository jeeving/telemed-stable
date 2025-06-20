const express = require('express');
const router = express.Router();
const validations = require('./PageValidations');
const PageController = require('./PageController');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.get('/',
    verifyToken,
    PageController.listPage
);

router.get('/list',
    verifyToken,
    PageController.list
);

router.get('/update-status',
    verifyToken,
    validate(validations.updateStatus, 'query', {}, '/pages'),
    PageController.updateStatus
);

router.get('/view/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/pages'),
    PageController.view
);

router.get('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/pages'),
    PageController.editPage
);

router.post('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/pages'),
    validate(validations.edit, 'body', {}),
    PageController.edit
);

module.exports = router;