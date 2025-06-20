const express = require("express");
const router = express.Router();
const validations = require("./BecomeVerifiedValidation");
const BecomeVerifiedController = require("./BecomeVerifiedController");
const { validate } = require("../../util/validations");
const { verifyToken } = require("../../util/auth");

router.get("/",
    verifyToken,
    BecomeVerifiedController.listPage
);

router.get("/list",
    verifyToken,
    BecomeVerifiedController.list
);

router.get('/reject/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/becomeverified'),
    BecomeVerifiedController.reject
);

router.get('/approve/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/becomeverified'),
    BecomeVerifiedController.approve
);

module.exports = router;
