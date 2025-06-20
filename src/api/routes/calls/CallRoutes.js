const express = require('express');
const router = express.Router();
const CallController = require('./CallController');
const { verifyToken } = require('../../util/auth');


router.post(
    '/add-wallet',
    verifyToken,
    CallController.addWallet
);

router.get(
    '/hold-charge/:preWalletId',  
    ////validate(validations.requireToken, 'params'),
    CallController.initHoldCharge
);

router.post('/verify/:amount',
    CallController.verify
);

router.get('/success',
    CallController.success
);
router.get('/failed',
    CallController.failed
);


/*******Twilio */
router.get(
    '/get-voice-token', 
    verifyToken, 
    CallController.getVoiceToken
);
router.post('/voice-call', 
    CallController.voiceCall
);
router.post('/voice-events', 
    CallController.voiceEvents
);

router.get(
    '/get-video-token/twilio', 
    verifyToken, 
    CallController.videoCallToken
);

router.post('/video-events',
    CallController.videoEvents
);

router.get(
    '/reject-call/twilio/:room_sid', 
    verifyToken, 
    CallController.rejectCall
);

router.post('/voice-fallback', 
    CallController.voiceFallbackUrl    
)

router.post('/audio-received', 
    CallController.audioReceived    
)

module.exports = router;
