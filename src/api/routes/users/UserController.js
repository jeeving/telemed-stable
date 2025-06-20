const {
    models: { User, Otp, Slot, Notification, Country, State, BecomeVerifiedRequest, Banner, AdminSettings,Documents },
} = require('../../../../lib/models');
const { utcDateTime,getUserWalletBalance,convertInrToUsd } = require('../../../../lib/util');
const moment = require('moment');

const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;
    const { encryptMessage,decryptMessage } = require("../../../../lib/encryptions")

class UserController {

    async profile(req, res) {
        let { user } = req;
        let { id } = req.query;
        let current = new Date();
        const adminSettings = await AdminSettings.findOne({});

        var data = await User.aggregate([
            {
                $match: { _id: id ? ObjectId(id) : user._id, isDeleted: false }
            },
            {
                $lookup: {
                    from: "notifications",
                    let: { userId: '$_id' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$user', '$$userId'] },
                            isRead: false,
                            isDeleted: false
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 },
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            count: 1
                        }
                    }
                    ],
                    as: "notifications"
                }
            },
            {
                $lookup: {
                    from: "specialities",
                    let: { specality: '$specality' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$_id', '$$specality'] },
                        }
                    }, {
                        $project: {
                            specialityName: 1,
                            specialityIcon: 1
                        }
                    }
                    ],
                    as: "specality"
                }
            },
            {
                $lookup: {
                    from: "countries",
                    let: { countryId: '$countryId' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$_id', '$$countryId'] },
                        }
                    }, {
                        $project: {
                            name     : 1,
                            currency : 1
                        }
                    }
                    ],
                    as: "countryData"
                }
            },
            {
                $lookup: {
                    from: "states",
                    let: { stateId: '$stateId' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$_id', '$$stateId'] },
                        }
                    }, {
                        $project: {
                            name: 1
                        }
                    }
                    ],
                    as: "stateData"
                }
            },
            {
                $lookup: {
                    from: "becomeverifiedrequests",
                    let: { requestId: '$requestId' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$_id', '$$requestId'] },
                        }
                    }, {
                        $project: {
                            status: 1,
                            fileName: 1,
                            created: 1
                        }
                    }
                    ],
                    as: "requestData"
                }
            },
            {
                '$lookup': {
                    from: 'appointments', let: { userId: '$_id' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$doctor', '$$userId'] }, 
                            isCanceled: false,
                            paymentStatus: 'SUCCESS'
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 },
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            count: 1
                        }
                    }
                    ], as: 'asDoctorCount'
                }
            },
            {
                '$lookup': {
                    from: 'appointments', let: { userId: '$_id' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$consultant', '$$userId'] },
                             isCanceled: false,
                             paymentStatus:'SUCCESS',
                             isRefund: false
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 },
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            count: 1
                        }
                    }
                    ], as: 'asConsultantCount'
                }
            },
            {
                '$lookup': {
                    from: 'appointments', let: { userId: '$_id' },
                    pipeline: [{
                        '$match': {
                            '$expr': {
                                '$and' : [
                                { '$eq': ['$consultant', '$$userId'] },
                                { '$eq': ['$isCanceled', false] },
                                { '$eq': ['$isRefund', false] },
                                { '$eq': ['$paymentStatus', 'SUCCESS'] },
                                // { '$eq': ['$bookingDetails.date', { "$lt": new Date(new Date().getTime() - (86400 * 1000 * 3)) }] },
                                // { '$eq': ['$created', {"$gt":new Date(process.env.RAZORPAY_KEY_ID)}] },
                            ],
                        }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { 
                                $sum: "$consultantFee" 
                            } 
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            total: 1
                        }
                    } 
                    ], as: 'pending_amount'
                }
            },
            {
                '$lookup': {
                    from: 'paymentrequests', let: { userId: '$_id' },
                    pipeline: [{
                        '$match': {
                            '$expr': { 
                                $and:[
                                    {
                                        '$eq': ['$consultant_id', '$$userId']
                                    },
                                    {
                                        '$in': ['$status', ['APPROVED', 'PENDING', 'SUCCESS']]
                                    }
                                ]
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { 
                                $sum:{ "$toDouble": "$amount"} 
                            } 
                        }
                    },
                   
                    ], as: 'paid_amount'
                }
            },
            {
                '$lookup': {
                    from: 'paymentrequests', let: { userId: '$_id' },
                    pipeline: [{
                        '$match': {
                            '$expr': { 
                                $and:[
                                    {
                                        '$eq': ['$userId', '$$userId']
                                    },
                                    {
                                        '$eq': ['$type', 'wallettopup']
                                    }
                                ]
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { 
                                $sum:{ "$toDouble": "$amount"} 
                            } 
                        }
                    },
                   
                    ], as: 'wallettopup_amount'
                }
            },
            {
                '$lookup': {
                    from: 'appointments',
                    let: { userId: '$_id' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$consultant', '$$userId'] },
                            isDeleted: false,
                            isCanceled: false,
                            paymentStatus: 'SUCCESS',
                            isRefund: false
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            amount: { $sum: '$consultantFee' },
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            amount: 1,
                        }
                    }
                    ],
                    as: 'totalEarning'
                }
            },
            {
                '$lookup': {
                    from: 'messages',
                    let: { userId: '$_id' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$receiver_id', '$$userId'] },
                            isRead: false
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 },
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            count: 1,
                        }
                    }
                    ],
                    as: 'unReadMessage'
                }
            },
            { '$unwind': { path: '$totalEarning', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$notifications', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$pending_amount', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$paid_amount', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$wallettopup_amount', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    totalEarning: {
                        $cond: {
                            if: { $ifNull: ["$totalEarning", false] },
                            then: '$totalEarning.amount',
                            else: 0
                        }
                    },
                    notifications: {
                        $cond: {
                            if: { $ifNull: ["$notifications.count", false] },
                            then: '$notifications.count',
                            else: 0
                        }
                    },
                    pending_amount: {
                        $cond: {
                            if: { $ifNull: ["$pending_amount.total", false] },
                            then: '$pending_amount.total',
                            else: 0
                        }
                    },
                    paid_amount: {
                        $cond: {
                            if: { $ifNull: ["$paid_amount.total", false] },
                            then: '$paid_amount.total',
                            else: 0
                        }
                    },
                    wallettopup_amount: {
                        $cond: {
                            if: { $ifNull: ["$wallettopup_amount.total", false] },
                            then: '$wallettopup_amount.total',
                            else: 0
                        }
                    },
                    asConsultantCount: 1,
                    asDoctorCount: 1,
                    userName: 1,
                    fullName: 1,
                    secondary_phone:1,
                    age: 1,
                    phone: 1,
                    email: 1,
                    avatar: 1,
                    deviceToken: 1,
                    pushNotificationAllowed: 1,
                    isOnline: 1,
                    appointmentReminder: 1,
                    isAccountComplete: 1,
                    isEmailVerified: 1,
                    specality: 1,
                    dob: 1,
                    experience: 1,
                    regNumber: 1,
                    city: 1,
                    whatsapp: 1,
                    step: 1,
                    service: 1,
                    about: 1,
                    audioSessionRate: 1,
                    videoSessionRate: 1,
                    customerId: 1,
                    accountDetails: 1,
                    unReadMessage:1,
                    hospitalName:1,
                    countryData: 1,
                    stateData: 1,
                    isVerified: 1,
                    fileName: 1,
                    requestData: 1,
                    isEmergency: 1,
                    isCallAllowed: 1,
                }
            }
        ]);

        let result = (data && data.length)   ?  data[0]     :   "";

        if (data.length == 0) {
            return res.notFound({}, req.__('USER_NOT_EXIST'));
        }

        if (result.isSuspended) {
            return res.notFound({}, req.__('YOUR_ACCOUNT_SUSPENDED'));
        }

        let isComplete              = (result?.service && result?.about && result?.regNumber && result?.secondary_phone && result?.hospitalName && true);
        let currencyCode            = (result.countryData && result.countryData.length) ? result.countryData[0].currency : "";
        
        let wa = ((result.pending_amount + result.wallettopup_amount)-(result.paid_amount));
        console.log({wa})
        if(wa<1){
            wa  = 0
        }

        result.wallet_amount        = wa.toFixed(2);


        result.isProfileComplete    = isComplete == "" || isComplete == undefined ? false : isComplete;
        result.totalEarning         = (currencyCode && currencyCode == "INR") ? Number(result.totalEarning)     : convertInrToUsd(result.totalEarning,adminSettings.conversionRate); 
        result.wallet_amount        = (currencyCode && currencyCode == "INR") ? Number(result.wallet_amount)    : convertInrToUsd(result.wallet_amount,adminSettings.conversionRate);
        result.audioSessionRate     = (currencyCode && currencyCode == "INR") ? Number(result.audioSessionRate)     : convertInrToUsd(result.audioSessionRate,adminSettings.conversionRate); 
        result.videoSessionRate     = (currencyCode && currencyCode == "INR") ? Number(result.videoSessionRate)     : convertInrToUsd(result.videoSessionRate,adminSettings.conversionRate);

        let userId = user._id;
        if( id ){
            userId = id
        }
        result['shareUrl']          = `${process.env.SITE_URL}/api/users/share/${userId}`
        result['shareTitle']        = `TelemedReferral is a mobile app for online doctor-to-doctor interprofessional consultations`;
        result['shareDescription']  = `Hi I am Dr.${result.fullName}. You can book and appoint now on telemedreferral app`;


        delete result.pending_amount;
        delete result.paid_amount;
        delete result.wallettopup_amount;

        let chkRec = await BecomeVerifiedRequest.findOne({
            userId: ObjectId(user._id),
            status: 'PENDING'
        });
        result.isVerificationPending = (chkRec && chkRec._id)?true:false;

        
        if( data.email  ){
            data.email = decryptMessage(data.email) 
        }
        return res.success(data);
    }

    async updateProfile(req, res) {
        try{
            let { type, fullName, age, hospitalName, userName,secondary_phone, bio, description, avatar, specality, about,
             service, audioSessionRate, videoSessionRate, dob, experience, regNumber, city, phone, countryId, stateId, fileName } = req.body;
            let { user } = req;

            let realEmail = user.email
            let {  hash, encrypt } = await encryptMessage(user.email)
            user.email = encrypt
            user.emailHash = hash

            if( dob ){
                let { encrypt } = await encryptMessage(dob)
                dob = encrypt
            }

            const isUserNameExists = await User.findOne({
                _id: {
                    $ne: user._id,
                },
                userName: new RegExp(`^${userName}$`, 'i'),
                isDeleted: false,
            });
            const adminSettings = await AdminSettings.findOne({});

            if (isUserNameExists) {
                return res.warn({}, req.__('USERNAME_MATCHED'));
            }

            let chkCountry = await Country.findOne({
                _id: ObjectId(countryId),
                isDeleted: false
            });
            if(!chkCountry){
                return res.warn({}, req.__('COUNTRY_NOT_EXIST'));
            }
            if(chkCountry.isSuspended){
                return res.warn({}, req.__('SUSPENDED_COUNTRY'));
            }

            let chkState = await State.findOne({
                _id: ObjectId(stateId),
                isDeleted: false
            });
            if(!chkState){
                return res.warn({}, req.__('STATE_NOT_EXIST'));
            }
            if(chkState.isSuspended){
                return res.warn({}, req.__('SUSPENDED_STATE'));
            }

            type === 'PROFILE_UPDATE' && fullName && (user.fullName = fullName);
            type === 'PROFILE_UPDATE' && age && (user.age = age);
            type === 'ACCOUNT_COMPLETE' && (user.isAccountComplete = true);

            if(fileName && fileName != ''){
                let chkRec = await BecomeVerifiedRequest.findOne({
                    userId: ObjectId(user._id),
                    status: 'PENDING'
                });
                if(chkRec){
                    return res.warn({}, req.__('REQUEST_ALREADY_SENT'));
                }

                if( !user.organizationId ){
                    let x = await new BecomeVerifiedRequest({
                        userId: user._id,
                        fileName
                    }).save();
                    user.isVerified = false;

                    if( x?._id ){
                        user.requestId = x._id;
                    }
                    
                }
                    

                user.fileName = fileName;
                
            }

            //user.userName = userName;
            user.fullName = fullName;
            user.age = age;
            //user.service = service;
            //user.about = about;
            user.audioSessionRate = (chkCountry.currency == "INR") ? audioSessionRate : audioSessionRate * adminSettings.conversionRate;
            user.videoSessionRate = (chkCountry.currency == "INR") ? videoSessionRate : videoSessionRate * adminSettings.conversionRate;
            user.specality = specality;
            user.dob = dob;
            user.regNumber = regNumber;
            user.city = city;
            user.phone = phone;
            //user.experience = experience;
            user.bio = bio;
            user.description = description;
            user.secondary_phone = secondary_phone;
            user.hospitalName = hospitalName;
            user.countryId = countryId;
            user.stateId = stateId;
            
            avatar && (user.avatar = avatar);
            await user.save();
          
            let data = await User.aggregate([
                {
                    $match: { _id: ObjectId(user._id) , isDeleted: false }
                },
                {
                    $lookup: {
                        from: "notifications",
                        let: { userId: '$_id' },
                        pipeline: [{
                            '$match': {
                                '$expr': { '$eq': ['$user', '$$userId'] },
                                isRead: false,
                                isDeleted: false
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                count: { $sum: 1 },
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                count: 1
                            }
                        }
                        ],
                        as: "notifications"
                    }
                },
                {
                    $lookup: {
                        from: "specialities",
                        let: { specality: '$specality' },
                        pipeline: [{
                            '$match': {
                                '$expr': { '$eq': ['$_id', '$$specality'] },
                            }
                        }, {
                            $project: {
                                specialityName: 1,
                                specialityIcon: 1
                            }
                        }
                        ],
                        as: "specality"
                    }
                },
                {
                    $lookup: {
                        from: "countries",
                        let: { countryId: '$countryId' },
                        pipeline: [{
                            '$match': {
                                '$expr': { '$eq': ['$_id', '$$countryId'] },
                            }
                        }, {
                            $project: {
                                name: 1
                            }
                        }
                        ],
                        as: "countryData"
                    }
                },
                {
                    $lookup: {
                        from: "states",
                        let: { stateId: '$stateId' },
                        pipeline: [{
                            '$match': {
                                '$expr': { '$eq': ['$_id', '$$stateId'] },
                            }
                        }, {
                            $project: {
                                name: 1
                            }
                        }
                        ],
                        as: "stateData"
                    }
                },
                {
                    $lookup: {
                        from: "becomeverifiedrequests",
                        let: { requestId: '$requestId' },
                        pipeline: [{
                            '$match': {
                                '$expr': { '$eq': ['$_id', '$$requestId'] },
                            }
                        }, {
                            $project: {
                                status: 1,
                                fileName: 1,
                                created: 1
                            }
                        }
                        ],
                        as: "requestData"
                    }
                },
                {
                    '$lookup': {
                        from: 'appointments', let: { userId: '$_id' },
                        pipeline: [{
                            '$match': {
                                '$expr': { '$eq': ['$doctor', '$$userId'] },
                                paymentStatus: 'SUCCESS',
                                 isCanceled: false
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                count: { $sum: 1 },
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                count: 1
                            }
                        }
                        ], as: 'asDoctorCount'
                    }
                },
                {
                    '$lookup': {
                        from: 'appointments', let: { userId: '$_id' },
                        pipeline: [{
                            '$match': {
                                '$expr': { '$eq': ['$consultant', '$$userId'] },
                                 isCanceled: false,
                                 paymentStatus: 'SUCCESS'
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                count: { $sum: 1 },
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                count: 1
                            }
                        }
                        ], as: 'asConsultantCount'
                    }
                },
                {
                    '$lookup': {
                        from: 'appointments',
                        let: { userId: '$_id' },
                        pipeline: [{
                            '$match': {
                                '$expr': { '$eq': ['$consultant', '$$userId'] },
                                isDeleted: false,
                                isCanceled: false,
                                paymentStatus: 'SUCCESS',
                                isRefund: false
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                amount: { $sum: '$consultantFee' },
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                amount: 1,
                            }
                        }
                        ],
                        as: 'totalEarning'
                    }
                },
                {
                    '$lookup': {
                        from: 'appointments', let: { userId: '$_id' },
                        pipeline: [{
                            '$match': {
                                '$expr': { '$eq': ['$consultant', '$$userId'] },
                                 isCanceled: false,
                                 isRefund: false,
                                 paymentStatus:'SUCCESS',
                                 "bookingDetails.date": { "$lt": new Date(new Date().getTime() - (86400 * 1000 * 3)) },
                                //  created :{"$gt":new Date(process.env.RAZORPAY_KEY_ID)}
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                total: { 
                                    $sum: "$consultantFee" 
                                } 
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                total: 1
                            }
                        } 
                        ], as: 'pending_amount'
                    }
                },
                {
                    '$lookup': {
                        from: 'paymentrequests', let: { userId: '$_id' },
                        pipeline: [{
                            '$match': {
                                '$expr': { 
                                    $and:[
                                        {
                                            '$eq': ['$consultant_id', '$$userId']
                                        },
                                        {
                                            '$in': ['$status', ['APPROVED', 'PENDING', 'SUCCESS']]
                                        }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                total: { 
                                    $sum:{ "$toDouble": "$amount"} 
                                } 
                            }
                        },
                       
                        ], as: 'paid_amount'
                    }
                },
                {
                    '$lookup': {
                        from: 'paymentrequests', let: { userId: '$_id' },
                        pipeline: [{
                            '$match': {
                                '$expr': { 
                                    $and:[
                                        {
                                            '$eq': ['$userId', '$$userId']
                                        },
                                        {
                                            '$eq': ['$type', 'wallettopup']
                                        }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                total: { 
                                    $sum:{ "$toDouble": "$amount"} 
                                } 
                            }
                        },
                       
                        ], as: 'wallettopup_amount'
                    }
                },
                { '$unwind': { path: '$totalEarning', preserveNullAndEmptyArrays: true } },
                { '$unwind': { path: '$notifications', preserveNullAndEmptyArrays: true } },
                { '$unwind': { path: '$pending_amount', preserveNullAndEmptyArrays: true } },
                { '$unwind': { path: '$paid_amount', preserveNullAndEmptyArrays: true } },
                { '$unwind': { path: '$wallettopup_amount', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        totalEarning: {
                            $cond: {
                                if: { $ifNull: ["$totalEarning", false] },
                                then: '$totalEarning.amount',
                                else: 0
                            }
                        },
                        notifications: {
                            $cond: {
                                if: { $ifNull: ["$notifications.count", false] },
                                then: '$notifications.count',
                                else: 0
                            }
                        },
                        pending_amount: {
                            $cond: {
                                if: { $ifNull: ["$pending_amount.total", false] },
                                then: '$pending_amount.total',
                                else: 0
                            }
                        },
                        paid_amount: {
                            $cond: {
                                if: { $ifNull: ["$paid_amount.total", false] },
                                then: '$paid_amount.total',
                                else: 0
                            }
                        },
                        wallettopup_amount: {
                            $cond: {
                                if: { $ifNull: ["$wallettopup_amount.total", false] },
                                then: '$wallettopup_amount.total',
                                else: 0
                            }
                        },
                        asConsultantCount: 1,
                        asDoctorCount: 1,
                        userName: 1,
                        fullName: 1,
                        age: 1,
                        secondary_phone:1,
                        phone: 1,
                        email: 1,
                        avatar: 1,
                        deviceToken: 1,
                        pushNotificationAllowed: 1,
                        isOnline: 1,
                        appointmentReminder: 1,
                        isAccountComplete: 1,
                        isEmailVerified: 1,
                        specality: 1,
                        dob: 1,
                        experience: 1,
                        regNumber: 1,
                        city: 1,
                        whatsapp: 1,
                        step: 1,
                        service: 1,
                        about: 1,
                        audioSessionRate: 1,
                        videoSessionRate: 1,
                        customerId: 1,
                        accountDetails: 1,
                        hospitalName:1,
                        countryData: 1,
                        stateData: 1,
                        isVerified: 1,
                        fileName: 1,
                        requestData: 1
                    }
                }
            ]);  
              
            if(data.length > 0){
                data[0].wallet_amount = ((data[0].pending_amount + data[0].wallettopup_amount)-(data[0].paid_amount)).toFixed(2);
                data[0].wallet_amount = Math.round(data[0].wallet_amount * 100)/100;
            }
           delete data[0].pending_amount;
           delete data[0].paid_amount;
           delete data[0].wallettopup_amount;

           let chkRec = await BecomeVerifiedRequest.findOne({
                userId: ObjectId(user._id),
                status: 'PENDING'
            });
            data[0].isVerificationPending = (chkRec && chkRec._id)?true:false;

            return res.success(data.length ? data[0]:{}, req.__('PROFILE_UPDATED'));
        }catch(err){
            console.log(err)
            return next(err)
        }
    }

    async updatePassword(req, res) {
        let { user } = req;
        const { currentPassword, newPassword } = req.body;

        
        let {   encrypt } = await encryptMessage(user.email)
        user.email = encrypt
        if( user.dob ){
            let { encrypt } = await encryptMessage(user.dob)
            user.dob = encrypt
        }

        const matched = await user.comparePassword(currentPassword);
        if (!matched) {
            return res.warn({}, req.__('PASSWORD_MATCH_FAILURE'));
        }

        user.password = newPassword;
        await user.save();
        return res.success({}, req.__('PASSWORD_CHANGED'));
    }

    async updateEmail(req, res) {
        const { user } = req;
        let { currentPassword, email } = req.body;

        //let realEmail = email
        let {  hash, encrypt } = await encryptMessage(email)
        let emailHash = hash

        const matched = await user.comparePassword(currentPassword);
        if (!matched) {
            return res.warn({}, req.__('PASSWORD_MATCH_FAILURE'));
        }

        const isEmailExists = await User.findOne({
            _id: {
                $ne: user._id,
            },
            emailHash,
            isDeleted: false,
        });

        if (isEmailExists) {
            return res.warn({}, req.__('EMAIL_ALREADY_FOUND'));
        }

        await User.updateOne({
            _id: user._id
        },{
            $set: {
                email: encrypt,
                emailHash
            }
        })
        

        //user.email = email;
        //await user.save();
        return res.success({}, req.__('EMAIL_CHANGED'));
    }

    async updatePhone(req, res) {
        const { user } = req;
        const { currentPassword, countryCode, phone } = req.body;

        const matched = await user.comparePassword(currentPassword);
        if (!matched) {
            return res.warn({}, req.__('PASSWORD_MATCH_FAILURE'));
        }

        const isPhoneExists = await User.findOne({
            _id: {
                $ne: user._id,
            },
            countryCode,
            phone,
            isDeleted: false,
        });

        if (isPhoneExists) {
            return res.warn('', req.__('PHONE_ALREADY_FOUND'));
        }

        const otp = await Otp.findOne({
            type: 'CHANGE_PHONE',
            countryCode,
            phone,
            validTill: {
                $gte: utcDateTime(),
            },
            isVerified: true,
        });

        if (!otp) {
            return res.warn({}, req.__('PHONE_NOT_VERIFIED'));
        }

        await User.updateOne({
            _id: user._id
        },{
            $set: {
                countryCode,
                phone
            }
        })

        // user.countryCode = countryCode;
        // user.phone = phone;
        // await user.save();

        otp.validTill = null;
        await otp.save();

        return res.success({}, req.__('PHONE_CHANGED'));
    }

    async notificationToggle(req, res) {
        const { user } = req;
        //user.pushNotificationAllowed = !user.pushNotificationAllowed;
        let pushNotificationAllowed = !user.pushNotificationAllowed;

        await User.updateOne({
            _id: user._id
        },{
            $set: {
                pushNotificationAllowed
            }
        })

        //await user.save();

        return res.success(
            {
                pushNotificationAllowed: user.pushNotificationAllowed,
            },
            user.pushNotificationAllowed ? req.__('NOTIFICATION_TURNED_ON') : req.__('NOTIFICATION_TURNED_OFF')
        );
    }

    async onlineToggle(req, res) {
        const { user } = req;
        //user.isOnline = !user.isOnline;

        await User.updateOne({
            _id: user._id
        },{
            $set: {
                isOnline: !user.isOnline
            }
        })

        //await user.save();

        return res.success(
            {
                isOnline: !user.isOnline
            },
            user.isOnline ? req.__('USER_ONLINE') : req.__('USER_OFFLINE')
        );
    }

    async emergencyToggle(req, res) {
        const { user } = req;
        //user.isEmergency = !user.isEmergency;

        await User.updateOne({
            _id: user._id
        },{
            $set: {
                isEmergency: !user.isEmergency
            }
        })

        //await user.save();

        return res.success(
            {
                isEmergency: !user.isEmergency,
            },
            user.isEmergency ? req.__('USER_ONEMERGENCY') : req.__('USER_OFFEMERGENCY')
        )
    }

    async callToggle(req, res) {
        const { user } = req;
        //user.isCallAllowed = !user.isCallAllowed;
        await User.updateOne({
            _id: user._id
        },{
            $set: {
                isCallAllowed: !user.isCallAllowed
            }
        })
        //await user.save();

        return res.success(
            {
                isCallAllowed: !user.isCallAllowed,
            },
            !user.isCallAllowed ? req.__('USER_ON_CALL') : req.__('USER_OFF_CALL')
        )
    }

    async appointmentReminder(req, res) {
        const { user } = req;
        let appointmentReminder = !user.appointmentReminder;
        await User.updateOne({
            _id: user._id
        },{
            $set: {
                appointmentReminder
            }
        })

        //user.appointmentReminder = !user.appointmentReminder;
        //await user.save();

        return res.success(
            {
                appointmentReminder: appointmentReminder,
            },
            appointmentReminder ? req.__('APPOINTMENT_REMINDER_TURNED_ON') : req.__('APPOINTMENT_REMINDER_TURNED_OFF')
        );
    }

    async UpdatePersonalInformation(req, res) {
        try{
            let { specality, dob, experience, regNumber, city, whatsapp, avatar,audioSessionRate,videoSessionRate, countryId, stateId } = req.body;
            //,secondary_phone, hospitalName
            console.dir(req.body)
            let { user } = req;

            let {  hash, encrypt } = await encryptMessage(user.email)
            user.email = encrypt
            user.emailHash = hash

            if( dob ){
                let { encrypt } = await encryptMessage(dob)
                dob = encrypt
            }

            let chkCountry = await Country.findOne({
                _id: ObjectId(countryId),
                isDeleted: false
            });
            const adminSettings = await AdminSettings.findOne({});
            if(!chkCountry){
                return res.warn({}, req.__('COUNTRY_NOT_EXIST'));
            }
            if(chkCountry.isSuspended){
                return res.warn({}, req.__('SUSPENDED_COUNTRY'));
            }

            let chkState = await State.findOne({
                _id: ObjectId(stateId),
                isDeleted: false
            });
            if(!chkState){
                return res.warn({}, req.__('STATE_NOT_EXIST'));
            }
            if(chkState.isSuspended){
                return res.warn({}, req.__('SUSPENDED_STATE'));
            }

            user.specality = specality;
            user.dob = dob;
            user.experience = experience;
            // hospitalName && (user.hospitalName = hospitalName);
            user.regNumber = regNumber;
            user.city = city;
            user.whatsapp = whatsapp;
            user.step = 4;
            user.audioSessionRate = (chkCountry.currency == "INR") ? audioSessionRate : audioSessionRate * adminSettings.conversionRate;
            user.videoSessionRate = (chkCountry.currency == "INR") ? videoSessionRate : videoSessionRate * adminSettings.conversionRate;
            // user.secondary_phone = secondary_phone;
            avatar && (user.avatar = avatar);
            user.isAccountComplete = true;
            user.countryId = countryId;
            user.stateId = stateId;
            await user.save();

            user = JSON.parse(JSON.stringify(user));
            ['password', 'authTokenIssuedAt', 'failedLoginAttempts', 'preventLoginTill', 'social', '__v'].forEach(
                key => delete user[key]
            );

            user['country'] = chkCountry;
            
            user['isOrganization'] = false;
            if(user && user.organizationId)  user['isOrganization'] = true;

            return res.success(user, req.__('PERSONAL_INFO_UPDATED'));
        }catch(err){
            console.log("err",err)
        }
    }

    async persolanInformation(req, res) {
        let { user } = req;
        let { id } = req.query;

        id &&
            (user = await User.findOne({
                _id: id,
                isDeleted: false,
            }));

        if (!user) {
            return res.notFound({}, req.__('USER_NOT_EXIST'));
        }

        if (user.isSuspended) {
            return res.notFound({}, req.__('YOUR_ACCOUNT_SUSPENDED'));
        }

        user = JSON.parse(JSON.stringify(user));
        [
            'password',
            'authTokenIssuedAt',
            'failedLoginAttempts',
            'preventLoginTill',
            'social',
            '__v',
            'phone',
            'email',
        ].forEach(key => delete user[key]);

        user['isOrganization'] = false;
        if(user && user.organizationId)  user['isOrganization'] = true;

        return res.success(user);
    }

    async workingDetail(req, res) {
        let { user } = req;
        let { id } = req.query;

        id &&
            (user = await User.findOne({
                _id: id,
                isDeleted: false,
            }));

        if (!user) {
            return res.notFound({}, req.__('USER_NOT_EXIST'));
        }

        if (user.isSuspended) {
            return res.notFound({}, req.__('YOUR_ACCOUNT_SUSPENDED'));
        }
        if (user.step < 2) {
            return res.notFound({}, req.__('PLEASE_COMPLETE_PREVIOUS_PROCESS'));
        }

        user = JSON.parse(JSON.stringify(user));
        [
            'password',
            'authTokenIssuedAt',
            'failedLoginAttempts',
            'preventLoginTill',
            'social',
            '__v',
            'phone',
            'email',
            'specality',
            'dob',
            'experience',
            'regNumber',
            'city',
            'whatsapp',
            'avatar',
        ].forEach(key => delete user[key]);

        return res.success(user);
    }

    async UpdateWorkingDetail(req, res) {
        const { service, about } = req.body;
        let { user } = req;

        await User.updateOne({
            _id: user._id
        },{
            $set: {
                service : service,
                about : about,
                step : 3,
            }
        })

        // user.service = service;
        // user.about = about;
        // user.step = 3;
        // await user.save();

        user = JSON.parse(JSON.stringify(user));
        [
            'password',
            'authTokenIssuedAt',
            'failedLoginAttempts',
            'preventLoginTill',
            'social',
            '__v',
            'phone',
            'email',
            'specality',
            'dob',
            'experience',
            'regNumber',
            'city',
            'whatsapp',
            'avatar',
        ].forEach(key => delete user[key]);

        return res.success(user, req.__('WORKING_DETAIL_INFO_UPDATED'));
    }

    async paymentDetail(req, res) {
        let { user } = req;
        let { id } = req.query;

        id &&
            (user = await User.findOne({
                _id: id,
                isDeleted: false,
            }));

        if (!user) {
            return res.notFound({}, req.__('USER_NOT_EXIST'));
        }

        if (user.isSuspended) {
            return res.notFound({}, req.__('YOUR_ACCOUNT_SUSPENDED'));
        }
        if (user.step < 3) {
            return res.notFound({}, req.__('PLEASE_COMPLETE_PREVIOUS_PROCESS'));
        }

        user = JSON.parse(JSON.stringify(user));
        [
            'password',
            'authTokenIssuedAt',
            'failedLoginAttempts',
            'preventLoginTill',
            'social',
            '__v',
            'phone',
            'email',
            'specality',
            'dob',
            'experience',
            'regNumber',
            'city',
            'whatsapp',
            'avatar',
            'about',
            'service'
        ].forEach(key => delete user[key]);

        return res.success(user);
    }

    async UpdatePaymentDetail(req, res) {
        const { audioSessionRate, videoSessionRate } = req.body;
        let { user } = req;

        // user.audioSessionRate = audioSessionRate;
        // user.videoSessionRate = videoSessionRate;
        // user.step = 4;
        // user.isAccountComplete = true;
        // await user.save();

        await User.updateOne({
            _id: user._id
        },{
            $set: {
                audioSessionRate : audioSessionRate,
                videoSessionRate : videoSessionRate,
                step : 4,
                isAccountComplete : true,
            }
        })

        

        user = JSON.parse(JSON.stringify(user));
        [
            'password',
            'authTokenIssuedAt',
            'failedLoginAttempts',
            'preventLoginTill',
            'social',
            '__v',
            'phone',
            'email',
            'specality',
            'dob',
            'experience',
            'regNumber',
            'city',
            'whatsapp',
            'avatar',
        ].forEach(key => delete user[key]);

        return res.success(user, req.__('PAYMENT_DETAIL_UPDATED'));
    }

    async notification(req, res) {

        const { user } = req;
        const { page, perPage } = req.query;
        const viewedRecords = page * perPage;
        if (!user) {
            return res.unauthorized('', req.__('USER_NOT_FOUND'));
        }

        const notifications = await Notification.aggregate([
            { $match: { isDeleted: false, user: ObjectId(user._id) } },
            {
                '$lookup': {
                    from: 'appointments', let: { appointmentId: '$appointment' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$_id', '$$appointmentId'] },
                        }
                    },
                    {
                        '$addFields': {
                            firstSlot: { '$slice': ['$bookingDetails.slots', 1] },
                            lastSlot: {
                                $cond: {
                                    if: { $gt: [{ $size: "$bookingDetails.slots" }, 1] },
                                    then: { '$slice': ['$bookingDetails.slots', -1], },
                                    else: '$$REMOVE'
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            slotDate: '$bookingDetails.date',
                            bookedAt: '$updated',
                            firstSlot: { $arrayElemAt: ["$firstSlot.slotTime", 0] },
                            lastSlot: { $arrayElemAt: ["$lastSlot.slotTime", 0] },
                            firstUtcTime: { $arrayElemAt: ["$firstSlot.utcTime", 0] },
                            lastUtcTime: { $arrayElemAt: ["$lastSlot.utcTime", 0] }
                        }
                    },
                    {
                        $project: {
                            bookedAt: 1,
                            slotDate: 1,
                            firstSlot: { $split: ["$firstSlot", "-"] },
                            lastSlot: { $split: ["$lastSlot", "-"] },
                            utcTime: {
                                $cond: {
                                    if: { $ifNull: ["$lastUtcTime", false] },
                                    then: '$lastUtcTime',
                                    else: '$firstUtcTime'
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            utcTime: 1,
                            slotDate: 1,
                            bookedAt: 1,
                            slot: {
                                $cond: {
                                    if: { $ifNull: ["$lastSlot", false] },
                                    then: {
                                        from: { $arrayElemAt: ["$firstSlot", 0] },
                                        to: { $arrayElemAt: ["$lastSlot", -1] },
                                    },
                                    else: {
                                        from: { $arrayElemAt: ["$firstSlot", 0] },
                                        to: { $arrayElemAt: ["$firstSlot", -1] },
                                    },
                                }
                            }
                        }
                    }
                    ], as: 'appointment'
                }
            },
            { '$unwind': { path: '$appointment', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    appointmentType:{
                        $cond: {
                            if: { $gte:['$appointment.utcTime',utcDateTime()] },
                            then: 'ACTIVE',
                            else: 'PAST',
                        }
                    },
                    isRead: 1,
                    type: 1,
                    title: 1,
                    message: 1,
                    user: 1,
                    appointment: 1,
                    webinarId : 1
                }
            },
            { $sort: { _id: -1 } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    items: { $push: '$$ROOT' },
                },
            },
            {
                $project: {
                    count: 1,
                    items: {
                        $slice: ['$items', (page - 1) * perPage, perPage],
                    },
                },
            },
        ])

        if (!notifications.length) {
            return res.warn({}, req.__('NOTIFICATION_NOT_FOUND'));
        }

        return res.success({
            page,
            count: notifications[0].count,
            hasMore: notifications[0].count > viewedRecords,
            notifications: notifications[0].items,
        });

    }

    async readNotifications(req, res) {
        const { user } = req;
        await Notification.updateMany({
            user: user._id,
            isRead: false,
            isDeleted: false,
            _id: Array.isArray(req.body.id) ? {
                $in: req.body.id
            } : req.body.id
        }, {
            $set: {
                isRead: true
            }
        });

        return res.success({}, req.__('NOTIFICATION_MARKED_READ'));
    }

    async UpdateDeviceToken(req, res) {
        const { deviceToken } = req.body;
        let { user } = req;

        await User.updateOne({
            _id: user._id
        },{
            $set: {
                deviceToken
            }
        })
        // user.deviceToken = deviceToken;
        // await user.save();

        user = JSON.parse(JSON.stringify(user));
        ['password', 'authTokenIssuedAt', 'failedLoginAttempts', 'preventLoginTill', 'social', '__v'].forEach(
            key => delete user[key]
        );

        return res.success(user, req.__('DEVICE_TOKEN_UPDATED'));
    }

    async blockUserList(req, res) {
        let { user } = req;
        const blockUserList = await User.aggregate([
            {
                $match:{
                    _id: user._id
                }
            },
            {
                $lookup: {
                    from: 'users',
                    let: { blockedUser: '$blockedUser' },
                    pipeline:[
                        {"$match":{"$expr":{"$in":["$_id","$$blockedUser"]}}},
                        {
                            $project: {
                                fullName: 1,
                                avatar: 1
                            }
                        }
                    ],
                    as: "blockedUser"
                }
            },
            { 
                $unwind: { path: '$blockedUser', preserveNullAndEmptyArrays: true }
            },
            {
                $project:{
                    "_id":-1, "blockedUser":1
                }
            }
        ]);

        return res.success({blockUserList: blockUserList[0].blockedUser != undefined? blockUserList:[] }, req.__('BLOCK_LIST'));
    }

    async unBlockUser(req, res) {
        let { user } = req;
        const { receiver_id, is_blocked } = req.body;

        !!is_blocked && await User.findByIdAndUpdate(user._id, { $push : { "blockedUser":  receiver_id} });
        !is_blocked && await User.findByIdAndUpdate(user._id, { $pull : { "blockedUser":  receiver_id} });

        if (!!is_blocked) {
            return res.success(is_blocked, 'User Blocked Successfully');
        }else{
            return res.success(is_blocked, 'User Unblocked Successfully');
        }
        
    }

    async updateUserProfile(req, res) {
        const { user } = req;
        const { field, value } = req.body;
        console.dir(req.body)

        /*let {encrypt,hash} = await encryptMessage(user.email)
        user.email = encrypt
        {
            if( user.dob ){
                let {encrypt} = await encryptMessage(user.dob)
                user.dob = dob
            }
        }

        if( field ==='email' || field ==='dob' ){
            let {encrypt,hash} = await encryptMessage( value  )
            value = encrypt
        } */  

        try{
            //user[field] = value;
            //await user.save();
            await User.updateOne(
                { _id: user._id }, // Find the user by their ID
                { $set: { [field]: value } } // Dynamically update the field with the value
              );

            return res.success({}, req.__('PROFILE_UPDATE'));
        }catch(err) {
            console.log("err",err)
            return res.warn({}, req.__('PROFILE_UPDATE'));
        }
    }

    async bannerPayment(req,res,next){
        try{
            let banner = await Banner.findOne({
                isDeleted: false
            }).lean()
            let previewUrl = process.env.AWS_S3_BASE
            let bannerImage = ""
            if( banner?.image ){
                bannerImage = `${previewUrl}${banner.image}`  
            }
            
            let walletBalance   = await getUserWalletBalance({ "userId": req.user._id});
            console.log("🚀 ~ UserController ~ bannerPayment ~ walletBalance:", walletBalance)
            const userData      = await User.findOne({ _id: ObjectId(req.user._id) } ,{currency : 1 }).populate({ path: 'countryId', select: '_id currency' }).lean();
            const adminSettings = await AdminSettings.findOne({});
            let userCurrency    = (userData && userData.countryId && userData.countryId.currency) ? userData.countryId.currency : ""; 

            walletBalance   = (userCurrency && userCurrency == "INR") ? walletBalance : Number(walletBalance / adminSettings.conversionRate).toFixed(2);
            walletBalance   = (walletBalance > 0) ? walletBalance :"0";
            console.log("🚀 ~ UserController ~ bannerPayment ~ walletBalance:", walletBalance)

            return res.success({
                bannerImage,walletBalance
            })
        }catch( err ){
            console.log(err)
            return next(err);
        }
    }

    async share(req,res,next) {
        let {id} = req.params;
        return res.render('users/share', {userId : id});
    }

    async sharedProfileDetails(req,res,next){
        try{
            const {_id}            = req.user;
            const user             = await User.findOne({_id},{fullName:1}).lean();
            let shareUrl           = `${process.env.SITE_URL}/api/users/share/${_id}`
            shareUrl                = `http://localhost:4001/api/users/share/${_id}`
            let shareTitle         = `TelemedReferral is a mobile app for online doctor-to-doctor e-consults & education.`;
            let shareDescription   = `Hi, you can connect with Dr.${user.fullName} on TelemedReferral.`;

            /** send success response */
            return res.success({
                shareUrl,
                shareTitle,
                shareDescription,
            }, "Profile shared." );
        }catch(err){
            console.log(err)
        }
        
    }


    async documents(req,res,next){
        try{
            let qry = {
                isDeleted: false
            }

            if( req.user.organizationId ){
                qry['organizationId'] = req.user.organizationId
            }else{
                qry['organizationId'] = {$exists: false}
            }

            let documents = await Documents.find(qry).sort({
                _id: -1
            }).lean()
            return res.success({
                documents
            });
        }catch(err){
            console.log(err)
        }
        
    }

    async deleteRequest(req, res, next) {
        try {
            let { user } = req;

            let deleteRequestDate = moment().utc().unix();

            await User.updateOne({ 
                _id: user._id 
            }, { 
                $set: { 
                    deleteRequestDate, 
                    isDeleteRequest: true,
                    authTokenIssuedAt : null,
                    deviceToken : null,
                    isLogoutOnline : user.isOnline,
                    isOnline : false,
                } 
            });

            return res.success({}, "Your account deletion request has been successfully received. The account will be permanently deleted within 7 days.");
        } catch (err) {
            console.log("err", err)
        }


    }

}

module.exports = new UserController();
