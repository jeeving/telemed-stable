const express = require('express');
const router = express.Router();
const validations = require('./DocumentValidations');
const DocumentController = require('./DocumentController');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.get('/',
    verifyToken,
    DocumentController.listPage
);

router.get('/add',
    verifyToken,
    //validate(validations.requireId, 'params', {}, '/pages'),
    DocumentController.addPage
);

router.post('/add',
    verifyToken,
    //validate(validations.requireId, 'params', {}, '/pages'),
    //validate(validations.edit, 'body', {}),
    DocumentController.add
);

router.get('/list',
    verifyToken,
    DocumentController.list
);

router.get(
    '/uploadImage',
    DocumentController.uploadImage
);

router.get('/delete/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/blogs'),
    DocumentController.delete
);

module.exports = router;