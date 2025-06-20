const jwt = require('jsonwebtoken');
const {
    models: { User },
} = require('./../../../lib/models');
const { getPlatform } = require('./common');
const { withLanguage } = require('./../../../lib/i18n');

const signToken = (user, platform) => {
    const payload = {
        sub: user._id,
        iat: user.authTokenIssuedAt,
        aud: platform,
    };
    return jwt.sign(payload, process.env.JWT_SECRET);
};

const verifyToken = (req, res, next) =>{
    let authToken = ""
    if( req.headers?.authorization ){
        authToken = req.headers.authorization
    }else if( req.query?.identity ){
        authToken = req.query.identity
    }

    jwt.verify(authToken, process.env.JWT_SECRET, async (err, decoded) => {
        //const platform = getPlatform(req);
        /*if (err || !decoded || !decoded.sub || decoded.aud !== platform) {
            return res.unauthorized('', req.__('UNAUTHORIZED'));
        }*/

        if (err || !decoded || !decoded.sub ) {
            return res.unauthorized('', req.__('UNAUTHORIZED'));
        }

        const user = await User.findOne({
            _id: decoded.sub,
            isDeleted: false,
            //authTokenIssuedAt: decoded.iat,
        });
        //console.log({user})
        if (!user) {
            return res.unauthorized('', req.__('UNAUTHORIZED'));
        }

        if (!user.authTokenIssuedAt || decoded.iat < user.authTokenIssuedAt) {
            //return res.unauthorized('', req.__('TOKEN_EXPIRED'));
        }

        if (user.isSuspended) {
            return res.unauthorized('', req.__('YOUR_ACCOUNT_SUSPENDED'));
        }

        req.user = user;
        res.user = user;
        next();
    });
}

const verifyTokenOptional = (req, res, next) => {
    let authToken = ""
    if( req.headers?.authorization ){
        authToken = req.headers.authorization
    }else if( req.query?.identity ){
        authToken = req.query.identity
    }

    if (!(authToken)) {
        req.user = null;
        res.user = null;
        next();
    }
    else {
        jwt.verify(authToken, process.env.JWT_SECRET, async (err, decoded) => {
            const platform = getPlatform(req);
            if (err || !decoded || !decoded.sub ) {
                //req.user = null;res.user = null;return next();
                return res.unauthorized('', req.__('UNAUTHORIZED'));
            }

            const user = await User.findOne({
                _id: decoded.sub,
                isDeleted: false,
                authTokenIssuedAt: decoded.iat,
            });

            if (!user) {
                return res.unauthorized('', req.__('UNAUTHORIZED'));
            }

            if (user.isSuspended) {
                return res.unauthorized('', req.__('YOUR_ACCOUNT_SUSPENDED'));
            }

            req.user = user;
            res.user = user;
            next();
        });
    }
};

const verifyTokenSocket = (token, language = 'en') => jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    const __ = withLanguage(language);

    if (err || !decoded || !decoded.sub) {
        return {
            error: true,
            msg: __('UNAUTHORIZED'),
        };
    }

    const user = await User.findOne({
        _id: decoded.sub,
        isDeleted: false,
        authTokenIssuedAt: decoded.iat,
    });

    if (!user) {
        return {
            error: true,
            msg: __('UNAUTHORIZED'),
        };
    }

    if (user.isSuspended) {
        return {
            error: true,
            msg: __('YOUR_ACCOUNT_SUSPENDED'),
        };
    }

    return {
        error: false,
        data: {
            user,
        },
    };
});

const verifyTokenWeb = (req, res, next) =>
    jwt.verify(req.session.token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err || !decoded || !decoded.sub) {
            req.session.user = null;
            req.session.token = null;
            req.flash('error', req.__('UNAUTHORIZED'));
            return res.redirect('/webinar/log-in');
        }

        const user = await User.findOne({
            _id: decoded.sub,
            isDeleted: false,
            //authTokenIssuedAt: decoded.iat,
        });

        if (!user) {
            req.session.user = null;
            req.session.token = null;
            req.flash('error', req.__('UNAUTHORIZED'));
            return res.redirect('/webinar/log-in');
        }

        if (user.isSuspended) {
            req.session.user = null;
            req.session.token = null;
            req.flash('error', req.__('YOUR_ACCOUNT_SUSPENDED'));
            return res.redirect('/webinar/log-in');
        }

        /*if (decoded.iat < user.authTokenIssuedAt) {
            return res.unauthorized('', req.__('TOKEN_EXPIRED'));
        }*/


        const userJson = user.toJSON();
        ['password', 'authTokenIssuedAt', '__v'].forEach(key =>  userJson[key] && delete userJson[key]);
        req.user = user;
        res.user = userJson;
        req.session.user = userJson;
        next();
    });


module.exports = {
    signToken,
    verifyToken,
    verifyTokenOptional,
    verifyTokenSocket,
    verifyTokenWeb
};
