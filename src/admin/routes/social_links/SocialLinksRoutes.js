const express = require("express");
const router = express.Router();
const validations = require("./SocialLinksValidation");
const SocialLinksController = require("./SocialLinksController");
const { validate } = require("../../util/validations");
const { verifyToken } = require("../../util/auth");

router.get("/",
    verifyToken,
    SocialLinksController.listPage
);

router.get("/list",
    verifyToken,
    SocialLinksController.list
);

router.get("/add",
    verifyToken,
    SocialLinksController.addPage
);

router.post("/add",
    verifyToken,
    // validate(validations.add, 'body', {}),
    SocialLinksController.add
);

router.get('/view/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/social_links'),
    SocialLinksController.view
);

router.get('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/social_links'),
    SocialLinksController.editPage
);

router.post('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/social_links'),
    // validate(validations.add, 'body', {}),
    SocialLinksController.edit
);

// router.get('/update-status',
//     verifyToken,
//     validate(validations.updateStatus, 'query', {}, '/speciality'),
//     SocialLinksController.updateStatus
// );

router.get('/delete/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/speciality'),
    SocialLinksController.delete
);

router.post('/is-link-exists',
SocialLinksController.isLinkExists
)

router.get('/socialLinks/uploadImage',
SocialLinksController.uploadImage
);



module.exports = router;
