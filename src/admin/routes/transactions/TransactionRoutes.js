const express = require("express");
const router = express.Router();
const validations = require("./TransactionValidation");
const TransactionController = require("./TransactionController");
const { validate } = require("../../util/validations");
const { verifyToken } = require("../../util/auth");

router.get("/",
    verifyToken,
    TransactionController.listPage
);

router.get("/list",
    verifyToken,
    TransactionController.list
);

module.exports = router;
