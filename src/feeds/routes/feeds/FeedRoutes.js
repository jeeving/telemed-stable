const express = require('express');
const router = express.Router();
const validations = require('./FeedValidations');
const FeedsController = require('./FeedController');
const { validate } = require('../../util/validations');
const { verifyToken } = require('../../util/auth');

router.post('/generate-token',
        FeedsController.generateToken
);

router.get(
    '/', verifyToken, validate(validations.listFeed, 'body'),  FeedsController.feeds
);

router.post(
    '/get-users',verifyToken, FeedsController.getUsers
)

router.post(
    "/create-feed", verifyToken,  validate(validations.createFeed, 'query'), FeedsController.createFeed
)

router.post(
    '/edit-feed', verifyToken,  validate(validations.editFeed, 'query'), FeedsController.editFeed
);

router.get(
    '/feed-details/:id', verifyToken, validate(validations.id, 'params'),  FeedsController.feedDetails
);

router.post('/delete-feed',
    verifyToken, validate(validations._id, 'query'),  FeedsController.deleteFeed
);

router.post('/feed-report',
    verifyToken, validate(validations.report, 'query'), FeedsController.feedReport
);

router.get('/like-list',
    verifyToken,
    FeedsController.likelist
);

router.post('/feed-Like',
    verifyToken, validate(validations.feedId, 'body'), FeedsController.feedLike
);

router.post('/add-Comment',
    verifyToken, validate(validations.comment, 'body'), FeedsController.addComment
);

router.post('/edit-Comment',
    verifyToken, validate(validations.comment, 'query'), FeedsController.editComment
);

router.get('/feed-Comment-list',
    verifyToken,
    FeedsController.feedCommentList
);

router.post('/delete-Comment',
    verifyToken,
    FeedsController.deleteComment
);

router.get('/get-top-feed',
    verifyToken,
    FeedsController.getTopFeed
);

/* ---upload photo/file-- */
router.post('/generate-signurl',
    verifyToken,
    validate(validations.generateSignUrl),
    FeedsController.generateSignUrl)

router.get('/generate-multi-signurl',
    verifyToken,
    validate(validations.generateMultiSignUrl, 'query'),
    FeedsController.generateMultiSignUrl)

router.get(
        '/user-feed-details/:id', validate(validations.id, 'params'), verifyToken, FeedsController.userfeedDetails
    );


module.exports = router;
