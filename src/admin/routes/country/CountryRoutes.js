const express = require("express");
const router = express.Router();
const validations = require("./CountryValidation");
const CountryController = require("./CountryController");
const { validate } = require("../../util/validations");
const { verifyToken } = require("../../util/auth");

router.get("/",
    verifyToken,
    CountryController.listPage
);

router.get("/list",
    verifyToken,
    CountryController.list
);

router.get("/add",
    verifyToken,
    CountryController.addPage
);

router.post("/add",
    verifyToken,
    validate(validations.add, 'body', {}),
    CountryController.add
);

router.get('/view/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/country'),
    CountryController.view
);

router.get('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/country'),
    CountryController.editPage
);

router.post('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/country'),
    // validate(validations.add, 'body', {}),
    CountryController.edit
);

router.get('/update-status',
    verifyToken,
    validate(validations.updateStatus, 'query', {}, '/country'),
    CountryController.updateStatus
);

router.get('/delete/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/country'),
    CountryController.delete
);

router.post('/is-country-exists',

CountryController.isCountryExists
)

// router.get('/country/uploadImage',
// CountryController.uploadImage
// );



module.exports = router;
