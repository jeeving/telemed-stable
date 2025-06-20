const express = require('express');
const router = express.Router();
const validations = require('./WebinarValidations');
const WebinarController = require('./WebinarController');
const { validate } = require('../../util/validations');
const { verifyToken, verifyTokenOptional } = require('../../util/auth');

router.get('/test',
    WebinarController.test
    //WebinarController.startCompositionNew
);

router.post('/generate-token',
    WebinarController.generateToken
);

router.get('/get-slots',
    verifyToken,
    WebinarController.getSlots
);

router.get(
    "/get-specialties",
    WebinarController.getSpecialties
)

router.post(
    '/get-user',
    verifyToken,
    WebinarController.getUsers
)

router.post(
    '/create-webinar',
    verifyToken,
    validate(validations.createWebinar),
    WebinarController.createWebinar
)

router.post(
    '/edit-webinar',
    verifyToken,
    validate(validations.editWebinar),
    WebinarController.editWebinar
)

router.post(
    '/add-user-webinar',
    verifyToken,
    WebinarController.addUserWebinar
)

router.post(
    '/webinar-invites',
    verifyToken,
    WebinarController.webinarInvites
)

router.post(
    '/recorded-cme',
    verifyToken,
    WebinarController.recordedCme
)

router.get(
    ['/recorded-cme-details/:_id','/recorded-cme-details/:id',],
    verifyToken,
    WebinarController.recordedCmeDetails
)

router.get(
    ['/recorded-cme-details-deep/:_id','/recorded-cme-details-deep/:_id/:platform'],
     WebinarController.recordedCmeDetailsDeep
);

router.post(
    '/details',
    verifyToken,
    WebinarController.details
)

router.post(
    '/accept-reject',
    verifyToken,
    WebinarController.acceptReject
)


router.get(
    '/join-token',
    verifyToken,
    WebinarController.join,
)
router.post(
    '/join-token',
    verifyToken,
    WebinarController.join,
)

router.post(
    '/join-room',
    verifyToken,
    WebinarController.joinRoom,
)

router.get('/paymentToken',
    verifyToken,
    WebinarController.paymentToken
);

router.get(
    ['/hold-charge/:token','/hold-charge/:token/:isWallet'],
    //validate(validations.requireToken, 'params'),
    WebinarController.initHoldCharge
);

router.post('/verify/:amount',
    WebinarController.verify
);

router.get('/failed',
    WebinarController.failed
);

router.get('/success',
    WebinarController.success
);

router.post(
    '/cancel-webinar',
    verifyToken,
    WebinarController.cancelWebinar
);

router.post(
    ['/mute-unmute-user','allow-unmute'],
    verifyToken,
    WebinarController.muteUnmuteUser
)

router.post(
    '/chk-can-unmute',
    verifyToken,
    WebinarController.chkCanUnmute
)

router.post(
    '/download-complete',
    verifyToken,
    WebinarController.downloadComplete
)

router.post(
    '/update-count',
    verifyToken,
    WebinarController.updateCount
);


router.get(
    '/share/:webinarId',
    WebinarController.share
)

router.get(
    '/member-info/:webinarId/:userId',
    WebinarController.memberInfo
    
)

router.get(
    '/demo-synch',
    WebinarController.demoSynch
)

router.get('/download-file',WebinarController.downloadFile)


router.get(
    '/test123',
    WebinarController.startCompositionNew
)

module.exports = router;
