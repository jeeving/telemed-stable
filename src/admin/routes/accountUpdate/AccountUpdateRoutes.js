const express = require("express");
const router = express.Router();
const validations = require("./AccountUpdateValidation");
const AccountUpdateController = require("./AccountUpdateController");
const {validate} = require("../../util/validations");
const {verifyToken} = require("../../util/auth");

router.get('/',
    verifyToken,
    AccountUpdateController.listPage
);

router.get('/list',
    verifyToken,
    AccountUpdateController.list
);

router.get('/view/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/accountUpdate'),
    AccountUpdateController.view
);

module.exports = router;