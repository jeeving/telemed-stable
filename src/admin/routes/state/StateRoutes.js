const express = require("express");
const router = express.Router();
const validations = require("./StateValidation");
const StateController = require("./StateController");
const { validate } = require("../../util/validations");
const { verifyToken } = require("../../util/auth");

router.get("/",
    verifyToken,
    StateController.listPage
);

router.get("/list",
    verifyToken,
    StateController.list
);

router.get("/add",
    verifyToken,
    StateController.addPage
);

router.post("/add",
    verifyToken,
    validate(validations.add, 'body', {}),
    StateController.add
);

router.get('/view/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/state'),
    StateController.view
);

router.get('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/state'),
    StateController.editPage
);

router.post('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/state'),
    // validate(validations.add, 'body', {}),
    StateController.edit
);

router.get('/update-status',
    verifyToken,
    validate(validations.updateStatus, 'query', {}, '/state'),
    StateController.updateStatus
);

router.get('/delete/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/state'),
    StateController.delete
);

router.post('/is-state-exists',

StateController.isStateExists
)

// router.get('/state/uploadImage',
// StateController.uploadImage
// );



module.exports = router;
