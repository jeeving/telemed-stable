const express = require("express");
const router = express.Router();
const validations = require("./UserValidation");
const UserController = require("./UserController");
const {validate} = require("../../util/validations");
const {verifyToken} = require("../../util/auth");

router.get("/",
    verifyToken,
    UserController.listPage
);

router.get("/list", 
    verifyToken,
    UserController.list
);

router.get("/add",
    verifyToken,
    UserController.addPage
);

router.post("/add",
    verifyToken,
    // validate(validations.add, 'body', {}),
    UserController.add
);

router.get('/update-status',
    verifyToken,
    validate(validations.updateStatus, 'query', {}, '/users'),
    UserController.updateStatus
);

router.get("/view/:id",
    verifyToken,
    validate(validations.requireId, 'params', {}, '/users'),
    UserController.view
);

router.get('/delete/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/users'),
    UserController.delete
);

router.get('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/users'),
    UserController.editPage
);

router.post('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/users'),
    // validate(validations.add, 'body', {}),
    UserController.edit
);

router.post('/topup-wallet/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/users'),
    // validate(validations.add, 'body', {}),
    UserController.topupWallet
);
module.exports = router;