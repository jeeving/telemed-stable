const express = require("express");
const router = express.Router();
const validations = require("./SpecialityValidation");
const SpecialityController = require("./SpecialityController");
const { validate } = require("../../util/validations");
const { verifyToken } = require("../../util/auth");

router.get("/",
    verifyToken,
    SpecialityController.listPage
);

router.get("/list",
    verifyToken,
    SpecialityController.list
);

router.get("/add",
    verifyToken,
    SpecialityController.addPage
);

router.post("/add",
    verifyToken,
    validate(validations.add, 'body', {}),
    SpecialityController.add
);

router.get('/view/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/speciality'),
    SpecialityController.view
);

router.get('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/speciality'),
    SpecialityController.editPage
);

router.post('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/speciality'),
    // validate(validations.add, 'body', {}),
    SpecialityController.edit
);

router.get('/update-status',
    verifyToken,
    validate(validations.updateStatus, 'query', {}, '/speciality'),
    SpecialityController.updateStatus
);

router.get('/delete/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/speciality'),
    SpecialityController.delete
);

router.post('/is-speciality-exists',

SpecialityController.isSpecialityExists
)

router.get('/speciality/uploadImage',
SpecialityController.uploadImage
);



module.exports = router;
