const express = require('express');
const router = express.Router();
const fs = require('fs');
const routes = fs.readdirSync(__dirname);

const WebinarController = require('./webinar/WebinarController');
const { verifyToken, verifyTokenOptional,verifyTokenWeb } = require('../util/auth');

routes.forEach(route => {
    if (route === 'index.js') return;
    router.use(`/${route}`, require(`./${route}`));
});


router.get('/health', (req, res) => {
    res.send('OK');
});

router.get(
    "/start",
    verifyToken,
    WebinarController.start
)

router.get('/payments/about_blank',
    WebinarController.aboutBlank
);


router.get([ '/', '/log-in'],
    WebinarController.logInPage
);

router.post('/log-in',
    //validate(validations.logIn),
    WebinarController.logIn
);

router.get('/log-out',
    WebinarController.logout
);

router.get('/cme',
    verifyTokenWeb,
    WebinarController.cmeList
);

router.get('/cme-details/:webinarId',
    verifyTokenWeb,
    WebinarController.cmeDetails
);

router.all(
    '/status-cb',
    WebinarController.statusCb
)

router.all(
    '/status-cb1',
    WebinarController.statusCb
)

router.get('/get',

    WebinarController.getFaqsAll
);

module.exports = router;
