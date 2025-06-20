const express = require('express');
const router = express.Router();
const validations = require('./CmeValidations');
const CmeController = require('./CmeController');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.get('/',
    verifyToken,
    CmeController.listPage
);

router.get('/list', 
    verifyToken, 
    CmeController.list
);

router.get('/view/:id',
    verifyToken,
    //validate(validations.requireId, 'params', {}, '/pages'),
    CmeController.view
);

router.get(
    '/update-recording',
    verifyToken,
    CmeController.updateRecording

)

module.exports = router;