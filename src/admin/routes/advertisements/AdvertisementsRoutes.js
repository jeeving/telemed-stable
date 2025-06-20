const express = require("express");
const router = express.Router();
const validations = require("./AdvertisementsValidation");
const AdvertisementsController = require("./AdvertisementsController");
const { validate } = require("../../util/validations");
const { verifyToken } = require("../../util/auth");

router.get("/",
    verifyToken,
    AdvertisementsController.listPage
);

router.get("/list",
    verifyToken,
    AdvertisementsController.list
);

router.get("/add",
    verifyToken,
    AdvertisementsController.addPage
);

router.post("/add",
    verifyToken,
    // validate(validations.add, 'body', {}),
    AdvertisementsController.add
);

router.get('/view/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/advertisements'),
    AdvertisementsController.view
);

router.get('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/advertisements'),
    AdvertisementsController.editPage
);

router.post('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/advertisements'),
    // validate(validations.add, 'body', {}),
    AdvertisementsController.edit
);

router.get('/update-status',
    verifyToken,
    validate(validations.updateStatus, 'query', {}, '/advertisements'),
    AdvertisementsController.updateStatus
);

router.get('/delete/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/advertisements'),
    AdvertisementsController.delete
);

router.get('/advertisements/uploadImage',
AdvertisementsController.uploadImage
);

router.post('/is-advertise-exists',
AdvertisementsController.isAdvertiseExists
)

module.exports = router;