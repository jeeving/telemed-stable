require('custom-env').env('api');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const moment = require('moment');
require('express-async-errors');
const { Response } = require('../../lib/http-response');
const mongoose = require('mongoose');
const { Joi, validate } = require('./util/validations');
const { __, languages } = require('../../lib/i18n');
const { enums: { Platform }, models: { AdminSettings } } = require('../../lib/models');
let compareVersions = require('compare-versions');
const semver = require('semver');

const path = require('path');
const fs = require('fs');


mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
});
mongoose.set('debug', true);  //process.env.NODE_ENV === 'development'



app.use(require('compression')());
const engine = require('ejs-locals');
app.use(express.static(path.join(__dirname, 'static')));
app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', engine);
app.set('view engine', 'ejs');

global.agenda = require('./agenda');
agenda.on('ready', function () {
    agenda.start();
});

app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && req.path !== '/socket.io/') {
        return res.sendFile(path.resolve(__dirname, 'static', 'html', 'index.html'));
    }
    next();
});

if (typeof globalThis.ReadableStream === 'undefined') {

    globalThis.ReadableStream = require('stream/web').ReadableStream;

  }



  if (typeof globalThis.DOMException === 'undefined') {

    globalThis.DOMException = require('domexception');

  }

if (process.env.NODE_ENV === 'development' || true) { {
    app.use(require('morgan')('dev'));
    const swaggerUi = require('swagger-ui-express');
    const YAML = require('yamljs');
    const swaggerDocument = YAML.load('./src/api/docs/swagger.yaml');
    const path = require('path');
    app.use(express.static(path.join(__dirname, 'static')));
    app.use(
        '/api/docs',
        swaggerUi.serve,
        swaggerUi.setup(swaggerDocument, {
            customfavIcon: '/logo.png',
            customSiteTitle: process.env.SITE_TITLE,
            authorizeBtn: false,
            swaggerOptions: {
                filter: true,
                displayRequestDuration: true,
            },
        })
    );
}

app.use((req, res, next) => {
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
});

app.use((req, res, next) => {
    req.__ = __;
    for (const method in Response) {
        if (Response.hasOwnProperty(method)) res[method] = Response[method];
    }
    next();
});

app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

const headerValidations = Joi.object().keys({
    'x-telemedicine-platform': Joi.string()
        .valid(...Object.values(Platform))
        .required(),
    'x-telemedicine-version': Joi.string()
        .regex(/^[\d]+\.[\d]+\.[\d]+$/, 'Semantic Version')
        .required(),
    'accept-language': Joi.string()
        .valid(...Object.keys(languages))
        .required(),
}).required();

app.use(function (req, res, next) {
    res.locals.siteUrl = process.env.SITE_URL; //`${req.protocol}://${req.get('host')}`;
    res.locals.siteTitle = process.env.SITE_TITLE;
    res.locals.currentYear = moment().format('YYYY');
    const route = `/${req.originalUrl.split('/').splice(1, 2).join('/')}/`;
    const routeAction = `/${req.originalUrl.split('/').splice(1, 3).join('/').split('?')[0]}`;

    const excludeHeaderUrls = [
        '/socket.io/',
        '/api/payments/',
        '/api/appointment/get-voice-token',
        '/api/appointment/voice-call',
        '/api/appointment/voice-events',
        '/api/appointment/video-events',
        "/api/socket-push",
        "/api/auth/jsthemis",
        "/api/auth/get-banner",
        "/api/users/share",
        "/api/users/share/:id",
        "/api/calls/hold-charge",
        "/api/calls/verify",
        "/api/calls/success", "/api/calls/failed",
        "/api/calls/video-events", 
        "/api/calls/voice-events",

        "/api/health",

    ];

    console.log({
        route, routeAction
    })

    const excludeHeaders = excludeHeaderUrls.indexOf(route) !== -1 || excludeHeaderUrls.indexOf(routeAction) !== -1;
    if (excludeHeaders) return next();
    validate(headerValidations, 'headers', { allowUnknown: true })(req, res, next);
});

app.use(async (req, res, next) => {
    const settings = await AdminSettings.findOne({}).lean();
    const route = `/${req.originalUrl.split('/').splice(1, 2).join('/')}/`;
    const routeAction = `/${req.originalUrl.split('/').splice(1, 3).join('/').split('?')[0]}`;
    const excludeHeaderUrls = [
        '/socket.io/',
        '/api/payments/',
        '/api/appointment/get-voice-token',
        '/api/appointment/voice-call',
        '/api/appointment/voice-events',
        '/api/appointment/video-events',
        '/api/socket-push',
        "/api/auth/jsthemis",
        "/api/auth/get-banner",
        "/api/users/share",
        "/api/users/share/:id",
        "/api/calls/hold-charge",
        "/api/calls/verify",
        "/api/calls/success", "/api/calls/failed",
        "/api/calls/video-events", "/api/calls/voice-events",

        "/api/health",
    ];
    const excludeHeaders = excludeHeaderUrls.indexOf(route) !== -1 || excludeHeaderUrls.indexOf(routeAction) !== -1;
    if (excludeHeaders) return next();
    let platformVersion = settings[`${req.headers['x-telemedicine-platform']}AppVersion`];
    let platformForce = settings[`${req.headers['x-telemedicine-platform']}ForceUpdate`];

    if (req.headers["x-telemedicine-version"] && semver.lt(req.headers["x-telemedicine-version"], platformVersion) === true) {
        res.setHeader("update_available", 1);
        res.setHeader("maintenance_mode", settings.maintenance);
        res.setHeader("force_update", platformForce);
    } else {
        res.setHeader("update_available", 0);
        res.setHeader("maintenance_mode", settings.maintenance);
        res.setHeader("force_update", platformForce);
    }
    validate(headerValidations, 'headers', { allowUnknown: true })(req, res, next);
});

const getMethods = (obj) => {
    let properties = new Set()
    let currentObj = obj
    do {
        Object.getOwnPropertyNames(currentObj).map(item => properties.add(item))
    } while ((currentObj = Object.getPrototypeOf(currentObj)))
    return [...properties.keys()].filter(item => typeof obj[item] === 'function')
    //return [...properties.keys()]
}

app.use(
    async (req, res, next) => {

        /*const cert = fs.readFileSync( process.env.SSL_CERT_PATH );
        const publicKey = forge.pki.certificateFromPem(cert).publicKey;
        const publicKeyInfo = forge.pki.publicKeyToAsn1(publicKey);
        const publicKeyDer = forge.asn1.toDer(publicKeyInfo).getBytes();
        const publicKeyHash = forge.md.sha256.create().update(publicKeyDer).digest().toHex();
        const presentedCert = req.socket.getPeerCertificate();
        try{
            const serverCert = req.socket.server.cert
            const serverPublicKey = forge.pki.certificateFromPem(serverCert).publicKey;
            const serverPKeyInfo = forge.pki.publicKeyToAsn1(serverPublicKey);
            const serverPKeyDer = forge.asn1.toDer(serverPKeyInfo).getBytes();
            const serverPKeyHash = forge.md.sha256.create().update(serverPKeyDer).digest().toHex();
            if (publicKeyHash !== serverPKeyHash) {
                return res.json({ "message" : 'Invalid SSL/TLS certificate'});
            }
        }catch(err){
            console.log(err)
            return res.json({ "message" : 'Invalid SSL/TLS certificate'});
        }*/

        next()
    }
)

app.use('/api', require('./routes'));
app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    //console.error(err);
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

global.io = require('socket.io')(server);
require('./util/ioController');

// multi-region database connections
if (process.env.NODE_ENV === 'production') {
    const { connectDBs } = require('../../lib/multi-db');
    connectDBs();
}
}