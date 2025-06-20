const express = require('express');
const router = express.Router();
const validations = require('./ReportValidation');
const ReportController = require('./ReportController');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.get('/',
    verifyToken,
    ReportController.listPage
);

router.get('/list',
    verifyToken,
    ReportController.list
);

router.get("/delete/:id",
    verifyToken,
    validate(validations.requireId, 'params'),
    ReportController.delete
);

router.get('/view/:id',
    verifyToken,
    ReportController.viewPage
);

router.get('/view-report/:id',
    verifyToken,
    ReportController.viewReportPage
);

router.get('/report-list/:id',
    verifyToken,
    ReportController.view
);

module.exports = router;