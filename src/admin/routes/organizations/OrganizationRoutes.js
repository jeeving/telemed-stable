const express = require('express');
const router = express.Router();
const validations = require('./OrganizationValidations');
const OrganizationController = require('./OrganizationController');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.get(
    [ '/', '/list'],
    verifyToken,
    OrganizationController.list
);

router.get('/requests',
    verifyToken,
    OrganizationController.requests
);

router.get(
    '/request-delete/:_id',
    verifyToken,
    OrganizationController.requestDelete
)

router.get(
    [  '/add/:reqId','/add' ],
    verifyToken,
    OrganizationController.add
)


router.post(
    [  '/add/:reqId','/add' ],
    verifyToken,
    OrganizationController.addOrganization
)

router.post(
    "/chk-email",
    OrganizationController.chkEmail
)

router.get(
    '/delete/:_id',
    verifyToken,
    OrganizationController.delete
)

router.get(
    [  '/edit/:_id' ],
    verifyToken,
    OrganizationController.edit
)


router.post(
    [  '/edit/:_id' ],
    verifyToken,
    OrganizationController.editOrganization
)


router.get(
    '/status/:_id',
    verifyToken,
    OrganizationController.status
)

router.post(
    "/amount-add",
    verifyToken,
    OrganizationController.amountAdd
)

router.get(
    '/payment-history/:organizationId', 
    verifyToken,
    OrganizationController.paymentHistory
)


module.exports = router;