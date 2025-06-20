const express = require('express');
const router = express.Router();
const fs = require('fs');
const routes = fs.readdirSync(__dirname);
const BlogController = require('./BlogController');

router.get('/health', (req, res) => {
    res.send('OK');
});
router.get( ["/", "/page/:page"],BlogController.home)
router.get( "/details/:slug",BlogController.details)


module.exports = router;
