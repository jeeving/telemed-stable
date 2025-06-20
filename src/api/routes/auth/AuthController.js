const {
    models: { Otp, User, Organization, OrganizationRequest, Banner, Message },
} = require('../../../../lib/models');
const { utcDateTime, randomString, } = require('../../../../lib/util');
const { signToken, } = require('../../util/auth');
const { getPlatform } = require('../../util/common');
const mailer = require('../../../../lib/mailer');
const moment = require('moment');

const { encryptMessage,decryptMessage } = require("../../../../lib/encryptions")

const mongoose = require('mongoose');
const {ObjectId} = mongoose.Types;

const Razorpay = require('razorpay');

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const cryptLib = require('@skavinvarnan/cryptlib');

const crypto = require('crypto');
const fs = require('fs');

class AuthController {

    async jsthemis(req, res, next) {
        try {
            /*let users = await User.find({
                //"_id" : ObjectId("66fcf83729af5b87bc03f3a2"),
            }).select("_id email dob").lean()
            console.dir({
                users
            })
            for( let user of users ){
                //console.dir(user)
                let email 
                let emailHash
                let dob
                if( user.email ){
                    const { encrypt,hash } = await encryptMessage(user.email);
                    email = encrypt
                    emailHash = hash
                }
                if( user.dob ){
                    const {encrypt} = await encryptMessage(user.dob)
                    dob = encrypt
                }

                if( email || dob ){
                    await User.updateOne({
                        _id: user._id
                    },{
                        $set: {
                            email,emailHash,dob
                        }
                    })
                }
                
            }*/
            return res.success({})
        } catch (err) {
            console.log(err)
            return next(err)
        }
    }

    async requestOtp(req, res) {
        let { type, email } = req.body;
        let realEmail = email
        let {  hash, encrypt } = await encryptMessage(email)

        let emailHash = hash
        email = encrypt
        console.log({
            emailHash,email
        })
        //return

        if (['SIGN_UP'].indexOf(type) !== -1) {
            const user = await User.findOne({
                //email,
                emailHash,
                isDeleted: false,
            });

            if (user) {
                return res.warn( {} ,req.__('EMAIL_ALREADY_FOUND'));
            }
        }

        if (type === 'FORGOT_PASSWORD') {
            const user = await User.findOne({
                //email,
                emailHash,
                isDeleted: false,
            });

            if (!user) {
                return res.warn({}, req.__('USER_NOT_FOUND'));
            }

            if (user.isSuspended) {
                return res.warn({}, req.__('YOUR_ACCOUNT_SUSPENDED'));
            }
        }

        let token =  randomString(4, '1234567890');//'1234';
        if( process.env.NODE_ENV ==='development' ){
            token = "1234"
        }
        const otp =
            (await Otp.findOne({
                email: realEmail,
            })) || new Otp({});

        otp.type = type;
        otp.email = realEmail; //email;
        otp.token = token;
        otp.validTill = utcDateTime(utcDateTime().valueOf() + parseInt(process.env.otpValidMinutes || 5) * 60000);
        otp.isVerified = false;
        await otp.save();

        if (process.env.NODE_ENV === 'production') {
            // TODO: update token in production environment 
        }
        email && (mailer
            .sendMail('request-otp', req.__('REQUEST_OTP'), realEmail, {
                otp: token
            })
            .catch(error => {
                console.log(`Failed to send verify otp email to ${realEmail}`);
                console.log(error);
            })
        );
        await otp.save();
        return res.success({}, req.__('OTP_SENT'));
    }

    async verifyOtp(req, res, err) {
        try{
            let { type, email, token } = req.body;
            console.log("req.body", req.body)

            let realEmail = email
            let {  hash, encrypt } = await encryptMessage(email)

            let emailHash = hash
            email = encrypt
            console.log({
                emailHash,email
            })

            if (['SIGN_UP'].indexOf(type) !== -1) {console.log("1111111")
                const user = await User.findOne({
                    emailHash,
                    isDeleted: false,
                    isEmailVerified: true,
                });

                if (user) {
                    return res.warn({}, req.__('EMAIL_ALREADY_FOUND'));
                }
            }

            if (type === 'FORGOT_PASSWORD') {
                const user = await User.findOne({
                    emailHash,
                    isDeleted: false,
                });

                if (!user) {
                    return res.warn({}, req.__('USER_NOT_FOUND'));
                }

                if (user.isSuspended) {
                    return res.warn({}, req.__('YOUR_ACCOUNT_SUSPENDED'));
                }
            }
            console.log("22222")
            const otp = await Otp.findOne({
                type,
                email: realEmail,
                validTill: {
                    $gte: utcDateTime(),
                },
                isVerified: false,
            });
            console.log("33333")

            if (!otp || otp.token !== token) {
                return res.warn({}, req.__('INVALID_OTP'));
            }
            console.log("44444")

            otp.isVerified = true;
            await otp.save();
            console.log("55555")

            return res.success({}, req.__('OTP_VERIFIED'));
            console.log("666666")
        }catch(err){
            console.log("err===>",err)
        }
    }

    async signUp(req, res) {
        try{
            let { fullName, email, phone, password, deviceToken, voipToken } = req.body;
            console.dir({ fullName, email, phone, password, deviceToken, voipToken })

            let realEmail = email
            let {  hash, encrypt } = await encryptMessage(email)

            let emailHash = hash
            email = encrypt
            console.log({
                emailHash,email
            })

            const  os  = req.headers['x-telemedicine-platform'];
            const otp = await Otp.findOne({
                type: 'SIGN_UP',
                email:realEmail,
                validTill: {
                    $gte: utcDateTime(),
                },
                isVerified: true,
            });

            if (!otp) {
                return res.warn( {}, req.__('EMAIL_NOT_VERIFIED'));
            }

            const userMatchCond = {
                isDeleted: false,
                emailHash,
            };

            let user = await User.findOne(userMatchCond);

            if (user) {
                return res.warn('', req.__('USER_ALREADY_FOUND'));
            }

            const userData = {
                fullName,
                phone,
                password,
            };
            email && (userData.email = email);
            emailHash && (userData.emailHash = emailHash);
            deviceToken && (userData.deviceToken = deviceToken);
            voipToken && (userData.voipToken = voipToken);

            if( voipToken ){
                await User.updateMany({
                    voipToken
                },{
                    $set: {
                        voipToken: ""
                    }
                })
            }
            if( deviceToken ){
                await User.updateMany({
                    deviceToken
                },{
                    $set: {
                        deviceToken: ""
                    }
                })
            }


            os && (userData.os = os);
            user = new User(userData);
            user.authTokenIssuedAt = utcDateTime().valueOf();

            user.bankEmail = 'tele' + utcDateTime().valueOf()+ process.env.EMAIL_PREFIX;
            
            let getCustomer = {}
            try{
                getCustomer = await instance.customers.create({name:fullName, email:realEmail, contact:phone, notes:{fullName,email:realEmail,"note_key": "telemed"},  fail_existing: 0, });
            }catch(e){
                console.log("hi",e)
            }            
            
            console.log({getCustomer})
            getCustomer.id && (user.customerId = getCustomer.id    )
            let newUser = await user.save();

            console.log("newUser.email===>",newUser.email)

            otp.validTill = null;
            await otp.save();

            const platform = getPlatform(req);
            const token = signToken(user, platform);
            //const userJson = user.toJSON();
            let userJson = await User.findOne({_id: newUser._id}).populate("countryId").lean()
            {
                //userJson.email =  decryptMessage( userJson.email );

                if(userJson.countryId){
                    userJson['country'] = userJson.countryId
                    userJson['countryId'] = userJson['country']._id
                }

                ['password', 'authTokenIssuedAt', 'failedLoginAttempts', 'preventLoginTill', 'social', '__v'].forEach(
                    key => delete userJson[key]
                );

                return res.success(
                    {
                        token,
                        user: userJson,
                    },
                    req.__('LOGIN_SUCCESS')
                );
            }

        }catch(err){
            console.log(err)
        }
    }

    async logIn(req, res) {
        try{
            const { email, password, deviceToken, voipToken } = req.body;
            

            const { encrypt,hash } = await encryptMessage(email);

            let emailHash = hash

            let  os  = req.headers['x-telemedicine-platform'];
            console.log("---------",os);
            let user = await User.findOne({
                //email,
                emailHash,
                isDeleted: false,
            }).populate("countryId");
            console.log(user._id,user.email)

            if (!user) {
                return res.warn({}, req.__('USER_NOT_FOUND'));
            }

            if (user.isSuspended) {
                return res.warn({}, req.__('YOUR_ACCOUNT_SUSPENDED'));
            }

            if (user.failedLoginAttempts >= parseInt(process.env.allowedFailedLoginAttempts || 3)) {
                let difference = user.preventLoginTill - utcDateTime().valueOf();
                if (difference > 0) {
                    let differenceInSec = Math.abs(difference) / 1000;
                    differenceInSec -= Math.floor(differenceInSec / 86400) * 86400;
                    differenceInSec -= (Math.floor(differenceInSec / 3600) % 24) * 3600;
                    const minutes = Math.floor(differenceInSec / 60) % 60;
                    differenceInSec -= minutes * 60;
                    const seconds = differenceInSec % 60;
                    return res.warn(
                        {},
                        req.__(
                            'LOGIN_DISABLED',
                            `${minutes ? `${minutes} ${req.__('KEY_MINUTES')} ` : ''}${seconds} ${req.__('KEY_SECONDS')}`
                        )
                    );
                }
            }

            const passwordMatched = await user.comparePassword(password);
            if (!passwordMatched) {
                let failedLoginAttempts = user.failedLoginAttempts + 1;
                let preventLoginTill = utcDateTime(
                    utcDateTime().valueOf() + parseInt(process.env.preventLoginOnFailedAttemptsTill || 5) * 60000
                ).valueOf();
                
                await User.updateOne({ 
                    _id: user._id 
                }, { 
                    $set: {
                        failedLoginAttempts,
                        preventLoginTill
                    } 
                });
                
                //await user.save();
                const chanceLeft = parseInt(process.env.allowedFailedLoginAttempts || 3) - failedLoginAttempts;
                return res.warn(
                    {},
                    req.__(
                        'INVALID_CREDENTIALS_LIMIT',
                        `${
                            chanceLeft <= 0
                                ? `${req.__('KEY_LOGIN_DISABLED')}`
                                : `${req.__('KEY_YOU_HAVE_ONLY')} ${chanceLeft} ${req.__('KEY_CHANCE_LEFT')}`
                        }`
                    )
                );
            }

            deviceToken && (user.deviceToken = deviceToken);
            voipToken && (user.voipToken = voipToken);

            if( voipToken ){
                await User.updateMany({
                    voipToken
                },{
                    $set: {
                        voipToken: ""
                    }
                })
            }
            if( deviceToken ){
                await User.updateMany({
                    deviceToken
                },{
                    $set: {
                        deviceToken: ""
                    }
                })
            }


             user.os = os;
             user.authTokenIssuedAt = utcDateTime().valueOf();
             user.failedLoginAttempts = 0;
             user.preventLoginTill = 0;
             user.isOnline = true;
             user.isLogoutOnline = false;
           
            const updateData = {
                ...(deviceToken && { deviceToken }), // Only include if deviceToken is truthy
                ...(voipToken && { voipToken }), // Only include if voipToken is truthy
                os,
                authTokenIssuedAt: utcDateTime().valueOf(),
                failedLoginAttempts: 0,
                preventLoginTill: 0,
                isOnline: true,
                isLogoutOnline: false,
                isDeleteRequest: false,
                deleteRequestDate: 0
            };
            await User.updateOne({ _id: user._id }, { $set: updateData });

            //await user.save();





            const platform = getPlatform(req);
            const token = signToken(user, platform);
            let userJson = user.toJSON();

            if(userJson.countryId) {
                userJson['country'] = userJson.countryId
                userJson['countryId'] = userJson['country']._id
            }
                

            userJson['isOrganization'] = false
            if( userJson.organizationId ){
                userJson['isOrganization'] = true

                let organization = await Organization.findOne({_id: userJson.organizationId }).lean()
                let currentDate = moment().utc().unix();
                let tenureEndDate = organization.tenureStamp

                if( tenureEndDate < currentDate ){
                    return res.warn( {}, 'Please contact your organization' );
                }

            }

            ['password', 'authTokenIssuedAt', 'failedLoginAttempts', 'preventLoginTill', 'social', '__v'].forEach(
                key => delete userJson[key]
            );


            return res.success(
                {
                    token,
                    user: userJson,
                },
                req.__('LOGIN_SUCCESS')
            );
        }catch(err){
            console.log(err)
        }
    }

    async logout(req, res) {
        const { user } = req;

        // user.authTokenIssuedAt = null;
        // user.deviceToken = null;
        // user.voipToken = null;
        // user.isLogoutOnline = user.isOnline;
        // user.isOnline = false;

        const updateData = {
            authTokenIssuedAt : null,
            deviceToken : null,
            voipToken : null,
            isLogoutOnline : user.isOnline,
            isOnline : false,
        };
        await User.updateOne({ _id: user._id }, { $set: updateData });

        //await user.save();
        return res.success({}, req.__('LOGOUT_SUCCESS'));
    }

    async resetPassword(req, res) {
        let { email, password } = req.body;

        let realEmail = email
        let {  hash, encrypt } = await encryptMessage(email)

        let emailHash = hash
        email = encrypt
        console.log({
            emailHash,email
        })

        

        const otp = await Otp.findOne({
            type: 'FORGOT_PASSWORD',
            email: realEmail,
            validTill: {
                $gte: utcDateTime(),
            },
            isVerified: true,
        });

        if (!otp) {
            return res.warn({}, req.__('EMAIL_NOT_VERIFIED'));
        }

        let user = await User.findOne({
            emailHash,
            isDeleted: false,
        });

        if (!user) {
            return res.warn({}, req.__('USER_NOT_FOUND'));
        }

        if (user.isSuspended) {
            return res.warn({}, req.__('YOUR_ACCOUNT_SUSPENDED'));
        }

        {
            let {  hash, encrypt } = await encryptMessage(user.email)
            user.email = encrypt
            if( user.dob ){
                let { encrypt } = await encryptMessage(user.dob)
                user.dob = encrypt
            }
        }
        user.password = password;
        await user.save();

        otp.validTill = null;
        await otp.save();

        return res.success({}, req.__('PASSWORD_CHANGED'));
    }

    async generateToken(req, res) {
       
        //const localKey = crypto.randomBytes(96);
        // Step 2: Optionally, you can convert the 96-byte key to base64 to store it
        //const localKeyBase64 = localKey.toString('base64');
        // Step 3: Save the base64 key to a file (optional)
        //fs.writeFileSync('local-key.txt', localKeyBase64);
        // To use the key, decode the base64 string back to a buffer:
        //const localKeyFromBase64 = Buffer.from(localKeyBase64, 'base64');
        // Check that the buffer is exactly 96 bytes
        //console.log(localKeyFromBase64.length); // Should print 96


        let _id = req.body._id;
        //let user = await User.findOne({_id}).select("authTokenIssuedAt").lean();
        res.success({
            token: require('jsonwebtoken').sign(
                {
                    sub: _id,
                    iat: utcDateTime().valueOf()
                    //iat: user.authTokenIssuedAt
                },
                process.env.JWT_SECRET
            )
        })

        
    }


    async encTest(req,res,next){
        try{
            // let users = await User.find({
            //     _id: {
            //         $in: [
            //             ObjectId("66f2a60a37e015ea961af23d"),
            //             ObjectId("66f2a60737e015ea961af23a"),
            //         ]
            //     }
            // }).select("_id email emailHash").lean();

            // users.forEach(user => {
            //     user.email = decryptMessage(user.email)
            // });

            // console.dir(users)


            const { encrypt,hash } = await encryptMessage("testqwewqewqewq-1@yopmail.com");
            console.log({
                encrypt,hash
            })
            const userData = {
                fullName: "test 12",
                phone: "797979797",
                password: "6546464646",
                email: encrypt,
                emailHash: hash,
                deviceToken: "deviceToken"
            };
            console.log({userData})
            await new User(userData).save();

            let users = await User.find({
                    
                }).select("_id email emailHash")
                .sort({_id: -1})
                .limit(2)
                .lean();
    
                users.forEach(user => {
                    user.email = decryptMessage(user.email)
                });
    
                console.dir(users)
    


            res.success()
        }catch(err){
            console.log(err)
        }
        
    }

    async socketPush(req, res, next) {
        try {
            console.log(req.body)
            let {
                method,
                receiverIds,
                data
            } = req.body

            receiverIds.forEach(x => {
                console.log( { x,method,data } )
                io.to(x).emit(method, data);
            })

            res.success({
                "hi":1
            })
        } catch (err) {
            console.log(err)
            return next(err)
        }



    }

    async organizationRequest( req,res,next ){
        try{
            let x = await OrganizationRequest.findOne({
                isDeleted: false,
                "$or": [
                    { email: req.body['o-email'],  },
                    { phone: req.body['o-phone'],  }
                ]

            }).lean()
            

            if( x && x._id ){
                return res.json({
                    "success": false,
                    "message": "Request already pending to admin"
                })
            }else{
                let phone = `${req.body['o-countryCode']}${req.body['o-phone']}`

                await OrganizationRequest.create({
                    name : req.body['o-name'], 
                    numAccount: req.body['o-numAccount'], 
                    email: req.body['o-email'], 
                    phone, 
                })
                return res.json({
                    "success": true,
                    "message": "Request received. we will contact you."
                })
            }

           

        }catch(err){
            return next(err)
        }
    }

    async getBanner(req,res,next){
        try{
            let banner = await Banner.findOne({
                isDeleted: false
            }).lean()
            let previewUrl = process.env.AWS_S3_BASE
            let bannerImage = ""
            if( banner?.image ){
                bannerImage = `${previewUrl}/${banner.image}`  
            }
            
            return res.success({
                bannerImage
            })
            
        }catch(err){
            console.log(err)
            return next(err)
        }
    }
}

module.exports = new AuthController();
