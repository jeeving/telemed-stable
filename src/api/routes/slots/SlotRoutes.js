const express = require('express');
const router = express.Router();
const SlotController = require('./SlotController');
const validations = require('./SlotValidations');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');


router.post('/getSlot',
    verifyToken,
    validate(validations.getSlot),
    SlotController.getSlot,
);

router.post('/createSlot',
    verifyToken,
    validate(validations.createSlot),
    SlotController.createSlot,
);

router.get('/getSlotById',
    verifyToken,
    // validate(validations.requireId),
    SlotController.getSlotById,
);

router.post('/editSlot',
    verifyToken,
    validate(validations.editSlot),
    SlotController.editSlot,
);

// router.post('/editSlotTime',
//     verifyToken,
//     // validate(validations.createSlot),
//     SlotController.editSlotTime,
// );

router.get('/deleteSlot',
verifyToken,
// validate(validations.createSlot),
SlotController.deleteSlot,
);

module.exports = router;
