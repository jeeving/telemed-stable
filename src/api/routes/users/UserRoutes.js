const express = require('express');
const router = express.Router();
const UserController = require('./UserController');
const validations = require('./UserValidations');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.get('/profile',
    verifyToken,
    validate(validations.optionalId, 'query'),
    UserController.profile,
);

router.put('/profile',
    verifyToken,
    validate(validations.updateProfile),
    UserController.updateProfile,
);

router.put('/password',
    verifyToken,
    validate(validations.updatePassword),
    UserController.updatePassword,
);

router.put('/email',
    verifyToken,
    validate(validations.updateEmail),
    UserController.updateEmail,
);

router.put('/phone',
    verifyToken,
    validate(validations.updatePhone),
    UserController.updatePhone,
);

router.get(
    '/notification-toggle',
    verifyToken,
    UserController.notificationToggle,
);

router.get('/personal-information',
    verifyToken,
    UserController.persolanInformation,
);
router.put('/personal-information',
    verifyToken,
    validate(validations.UpdatePersonalInformation),
    UserController.UpdatePersonalInformation,
);

router.get('/working-detail',
    verifyToken,
    UserController.workingDetail,
);
router.put('/working-detail',
    verifyToken,
    validate(validations.UpdateWorkingDetail),
    UserController.UpdateWorkingDetail,
);
router.get('/payment-detail',
    verifyToken,
    UserController.paymentDetail,
);
router.put('/payment-detail',
    verifyToken,
    validate(validations.UpdatePaymentDetail),
    UserController.UpdatePaymentDetail,
);

router.get(
    '/online-toggle',
    verifyToken,
    UserController.onlineToggle,
);

router.get(
    '/appointmentReminder',
    verifyToken,
    UserController.appointmentReminder,
);

router.get('/notifications',
    verifyToken,
    validate(validations.paginated, 'query'),
    UserController.notification,
);

router.post(
    '/notifications',
    verifyToken,
    validate(validations.readNotifications),
    UserController.readNotifications,
);

router.put(
    '/updateDeviceToken',
    verifyToken,
    validate(validations.UpdateDeviceToken),
    UserController.UpdateDeviceToken
);

router.get(
    '/blocklist',
    verifyToken,
    validate(validations.paginated, 'query'),
    UserController.blockUserList
);

router.post(
    '/blockToggle',
    verifyToken,
    validate(validations.unBlockUser),
    UserController.unBlockUser
);

router.put(
    '/updateUserProfile',
    verifyToken,
    validate(validations.updateUserProfile),
    UserController.updateUserProfile
)

router.get('/banner-payment',
    verifyToken,
    UserController.bannerPayment
);


router.get(
    '/emergency-toggle',
    verifyToken,
    UserController.emergencyToggle,
)

router.get(
    '/call-toggle',
    verifyToken,
    UserController.callToggle,
)

router.get(
    '/share/:id',
    UserController.share,
)

router.get(
    '/share-profile',
    verifyToken,
    UserController.sharedProfileDetails,
)


router.get(
    '/documents',
    verifyToken,
    UserController.documents
)


router.get(
    '/delete-request',
    verifyToken,
    UserController.deleteRequest
)
module.exports = router;
