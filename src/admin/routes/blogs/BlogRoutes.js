const express = require('express');
const router = express.Router();
const validations = require('./BlogValidations');
const BlogController = require('./BlogController');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.get('/',
    verifyToken,
    BlogController.listPage
);

router.get('/add',
    verifyToken,
    //validate(validations.requireId, 'params', {}, '/pages'),
    BlogController.addPage
);

router.post('/add',
    verifyToken,
    //validate(validations.requireId, 'params', {}, '/pages'),
    //validate(validations.edit, 'body', {}),
    BlogController.add
);

router.get('/list',
    verifyToken,
    BlogController.list
);

router.get('/update-status',
    verifyToken,
    validate(validations.updateStatus, 'query', {}, '/blogs'),
    BlogController.updateStatus
);

router.get('/view/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/blogs'),
    BlogController.view
);

router.get('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/blogs'),
    BlogController.editPage
);

router.post('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/blogs'),
    //validate(validations.edit, 'body', {}),
    BlogController.edit
);

router.get(
    '/uploadImage', 
    BlogController.uploadImage 
);

router.get('/delete/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/blogs'),
    BlogController.delete
);

module.exports = router;