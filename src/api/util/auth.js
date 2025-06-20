const jwt = require('jsonwebtoken');
const {
    models: { User,Organization },
} = require('./../../../lib/models');
const { getPlatform } = require('./common');
const { withLanguage } = require('./../../../lib/i18n');
const moment = require('moment');

const Razorpay = require('razorpay');

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

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

        //console.dir(user)
        if (!user) {
            return res.unauthorized('', req.__('UNAUTHORIZED'));
        }

        
        // if ( !user.authTokenIssuedAt || decoded.iat < user.authTokenIssuedAt) {
        //     return res.unauthorized('', req.__('TOKEN_EXPIRED'));
        // }

        if (user.isSuspended) {
            return res.unauthorized('', req.__('YOUR_ACCOUNT_SUSPENDED'));
        }

        user['isOrganization'] = false
        /*if( user.organizationId ){
            user['isOrganization'] = true

            let organization = await Organization.findOne({_id: user.organizationId, isSuspended: false,isDeleted: false }).lean()

            if( !organization ){
                return res.unauthorized( {}, 'Please contact your organization' );
            }

            let currentDate = moment().utc().unix();
            let tenureEndDate = organization.tenureStamp

            if( tenureEndDate < currentDate ){
                return res.warn( {}, 'Please contact your organization' );
            }

        }*/

        req.user = user;
        res.user = user;
        next();
    });
}



const verifyTokenOptional = (req, res, next) => {
    if (!(req.headers.authorization)) {
        req.user = null;
        res.user = null;
        next();
    }
    else {
        jwt.verify(req.headers.authorization, process.env.JWT_SECRET, async (err, decoded) => {
            const platform = getPlatform(req);
            if (err || !decoded || !decoded.sub || decoded.aud !== platform) {
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



module.exports = {
    signToken,
    verifyToken,
    verifyTokenOptional,
    verifyTokenSocket,
};
