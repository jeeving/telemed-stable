const express = require('express');
const router = express.Router();
const fs = require('fs');
const routes = fs.readdirSync(__dirname);

routes.forEach(route => {
    if (route === 'index.js') return;
    router.use(`/${route}`, require(`./${route}`));
});

router.get('/health', (req, res) => {
    res.send('OK');
});

module.exports = router;
