const express = require('express');
const router = express.Router();
const validations = require('./FaqValidations');
const FaqController = require('./FaqController');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.get('/',
    verifyToken,
    FaqController.listPage
);

router.get('/list',
    verifyToken,
    FaqController.list
);

router.get("/add",
    verifyToken,
    FaqController.addPage
);

router.post("/add",
    verifyToken,
    validate(validations.add, 'body', {}),
    FaqController.add
);

router.get('/update-status',
    verifyToken,
    validate(validations.updateStatus, 'query', {}, '/faqs'),
    FaqController.updateStatus
);

router.get('/view/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/faqs'),
    FaqController.view
);

router.get('/delete/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/faqs'),
    FaqController.delete
);

router.get('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/faqs'),
    FaqController.editPage
);

router.post('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/faqs'),
    validate(validations.add, 'body', {}),
    FaqController.edit
);

router.post('/is-faq-exists',
FaqController.isFaqExists
)

module.exports = router;