require('custom-env').env('blog');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const moment = require('moment');
require('express-async-errors');
const { Response } = require('../../lib/http-response');
const mongoose = require('mongoose');

// const { Joi, validate } = require('./util/validations');
 const { __, languages } = require('../../lib/i18n');
// const { enums: { Platform } ,models: { AdminSettings }} = require('../../lib/models');

let compareVersions = require('compare-versions');
//const semver = require('semver');
const flash = require('connect-flash');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false });
mongoose.set('debug', process.env.NODE_ENV === 'development');

app.use(require('compression')());
const path = require('path');
const engine = require('ejs-locals');
app.use(express.static(path.join(__dirname, 'static')));


app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', engine);
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

app.set('view engine', 'ejs');
app.use(flash());


/*app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, Referer, User-Agent, X-Requested-With, Content-Type, Accept, Authorization, Accept-Language, Pragma, Cache-Control, Expires, If-Modified-Since, X-TeleMedicine-Platform, X-TeleMedicine-Version'
    );
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
    if (req.method === 'OPTIONS') {
        return res.status(204).send('OK');
    }
    next();
});*/

app.use((req, res, next) => {
    req.__ = __;
    for (const method in Response) {
        if (Response.hasOwnProperty(method)) res[method] = Response[method];
    }
    next();
});

app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

/*const headerValidations = Joi.object()
    .keys({
        'x-telemedicine-platform': Joi.string()
            .valid(...Object.values(Platform))
            .required(),
        'x-telemedicine-version': Joi.string()
            .regex(/^[\d]+\.[\d]+\.[\d]+$/, 'Semantic Version')
            .required(),
        'accept-language': Joi.string()
            .valid(...Object.keys(languages))
            .required(),
    })
    .required();*/

    

    app.use(function (req, res, next) {
        res.locals.siteUrl = process.env.SITE_URL;
        res.locals.siteTitle = process.env.SITE_TITLE;
        // res.locals.currentYear = moment().format('YYYY');
         res.locals.s3Base = process.env.AWS_S3_BASE;
         res.locals.moment = moment;
        // res.locals.showDate = (date, format) => showDate(date, format);
        // res.locals.showDateTimeZone = (date, format) => showDateTimeZone(date, timeZone, format);
        // res.locals.DM = __;

        // res.locals.errorFlash = req.flash('error')[0];
        // res.locals.successFlash = req.flash('success')[0];
        // res.locals.infoFlash = req.flash('info')[0];
        // res.locals.currentUser = currentUser;

        // res.locals.localeStr = key => {
        //     key = key.split('.');
        // const obj = __(key[0]) || {};
        // return key.length === 2 ? obj[key[1]] || '' : obj;
        // };

        return next();
        
    });


app.use('/', require('./routes'));

app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    if (res.headersSent) {
        return next(err);
    }

    if (err.message === 'EntityNotFound') {
        return res.notFound('', __('NOT_FOUND'));
    }

    return res.status(err.status || 500).send({
        success: false,
        data: [],
        message: __('GENERAL_ERROR'),
    });
});

app.use(function (req, res) {
    return res.status(404).send({
        success: false,
        data: [],
        message: __('NOT_FOUND_ERR'),
    });
});

const port = process.env.PORT || 3000;
let server;
if (process.env.SERVER_MODE === 'https') {
    const https = require('https');
    const fs = require('fs');
    server = https.createServer(
        {
            key: fs.readFileSync(process.env.SSL_KEY_PATH, 'utf8'),
            cert: fs.readFileSync(process.env.SSL_CERT_PATH, 'utf8'),
            ca: fs.readFileSync(process.env.SSL_CA_PATH, 'utf8'),
        },
        app
    );
} else {
    const http = require('http');
    server = http.createServer(app);
}

server.listen(port, async function () {
    // eslint-disable-next-line no-console
    console.info(`Server Started on port ${port}`);
});

