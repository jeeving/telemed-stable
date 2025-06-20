const { isValidObjectId } = require('mongoose');
const {
    models: { User, Speciality, Appointment,AdminSettings, Slot },
} = require('../../../../lib/models');

const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;

class ConsultantsController {
    
    async list(req, res) {
        const { user: userData } = req;
        let myBlockedUser = userData.blockedUser !== undefined ? userData.blockedUser : [];
        var page = (req.query.pageIndex ? parseInt(req.query.pageIndex) : 1)
        var limit = (req.query.pageLimit ? parseInt(req.query.pageLimit) : 5)
        var skipIndex = (page - 1) * limit;

        var count = await User.countDocuments({
            isDeleted: false,
            isSuspended: false,
            blockedUser: {$nin:[userData._id]}, _id: {$nin: myBlockedUser }
        });

        const user = await User.find({
            isDeleted: false,
            isSuspended: false,
            blockedUser: {$nin:[userData._id]}, _id: {$nin: myBlockedUser }
        }).skip(skipIndex).limit(limit);

        if (!user && user.length == 0) {
            return res.warn({}, req.__('CONSULTANT_NOT_FOUND'));
        }

        return res.status(200).send({
            success: true,
            data: user,
            message: 'CONSULTANT_FOUND.',
            totalRecords: count
        })
    }

    async search(req, res) {
        const { searchFor } = req.query;
        const { user } = req;

        let myBlockedUser = user.blockedUser !== undefined ? user.blockedUser : [];
        var page = (req.query.pageIndex ? parseInt(req.query.pageIndex) : 1)
        var limit = (req.query.pageLimit ? parseInt(req.query.pageLimit) : 5)
        var skipIndex = (page - 1) * limit;

        var data;
        var count;
        var isId;

        if (searchFor == '' || searchFor == undefined || searchFor == null) {
            data = await User.aggregate([{
                $lookup: {
                    from: "specialities",
                    localField: "specality",
                    foreignField: "_id",
                    as: "specality"
                }
            },
            {
                $match: { isDeleted: false, isSuspended: false, isAccountComplete: true, _id: { $ne: ObjectId(user._id) }, blockedUser: {$nin:[user._id]}, _id: {$nin: myBlockedUser } }
            },
            {
                $addFields: {
                    sortFee:
                        { $add: ["$audioSessionRate", "$videoSessionRate"] }
                }
            },
            {
                $addFields: {
                    doctorName: { $toLower: "$fullName" }
                }
            },
            { $sort: { doctorName: 1 } },
            { $skip: skipIndex },
            { $limit: limit }
            ]);

            count = await User.countDocuments({
                isDeleted: false,
                isSuspended: false,
                isAccountComplete: true,
                _id: { $ne: ObjectId(user._id) }
            });
        }
        else {
            if (searchFor.match(/^[0-9a-fA-F]{24}$/)) {
                isId = true;
            }
            else {
                isId = false;
            }

            data = await User.aggregate([{
                $lookup: {
                    from: "specialities",
                    localField: "specality",
                    foreignField: "_id",
                    as: "specality"
                }
            },
            {
                $match: {
                    isDeleted: false,
                    isSuspended: false,
                    isAccountComplete: true,
                    _id: { $ne: ObjectId(user._id) },
                    blockedUser: {$nin:[user._id]}, 
                    _id: {$nin: myBlockedUser },
                    $or: [
                        {
                            fullName: {
                                $regex: searchFor,
                                $options: 'i'
                            }
                        },
                        // {
                        //     email: {
                        //         $regex: searchFor,
                        //         $options: 'i'
                        //     }
                        // },
                        {
                            city: {
                                $regex: searchFor,
                                $options: 'i'
                            }
                        },
                        {
                            specality: {
                                $elemMatch: {
                                    _id: ObjectId.isValid(searchFor) && isId ? ObjectId(searchFor) : searchFor
                                }
                            }
                        },
                        {
                            specality: {
                                $elemMatch: {
                                    specialityName: {
                                        $regex: searchFor,
                                        $options: 'i'
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            // {$facet:{
            //     users: [{ $skip: skipIndex }, { $limit: limit}],
            //     totalCount: [
            //       {
            //         $count: 'count'
            //       }
            //     ]
            //   }}
            {
                $addFields: {
                    sortFee:
                        { $add: ["$audioSessionRate", "$videoSessionRate"] }
                }
            },
            {
                $addFields: {
                    doctorName: { $toLower: "$fullName" }
                }
            },
            { $sort: { doctorName: 1 } },
            { $skip: skipIndex },
            { $limit: limit }
            ]);

            count = await User.aggregate([{
                $lookup: {
                    from: "specialities",
                    localField: "specality",
                    foreignField: "_id",
                    as: "specality"
                }
            },
            {
                $match: {
                    isDeleted: false,
                    isSuspended: false,
                    isAccountComplete: true,
                    _id: { $ne: ObjectId(user._id) },
                    $or: [
                        {
                            fullName: {
                                $regex: searchFor,
                                $options: 'i'
                            }
                        },
                        {
                            email: {
                                $regex: searchFor,
                                $options: 'i'
                            }
                        },
                        {
                            city: {
                                $regex: searchFor,
                                $options: 'i'
                            }
                        },
                        {
                            specality: {
                                $elemMatch: {
                                    _id: ObjectId.isValid(searchFor) && isId ? ObjectId(searchFor) : searchFor
                                }
                            }
                        },
                        {
                            specality: {
                                $elemMatch: {
                                    specialityName: {
                                        $regex: searchFor,
                                        $options: 'i'
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            {
                $count: "totalRecords"
            }
            ]);
        }

        if (data.length == 0) {
            return res.notFound([], req.__('DATA_NOT_FOUND'));
        }

        return res.status(200).send({
            success: true,
            data,
            message: 'Consultants found successfully.',
            totalRecords: ((searchFor == '' || searchFor == undefined || searchFor == null) ? count : count[0].totalRecords)
        })
    }

    async getDetails(req, res) {
        const { id, offset = "+330" } = req.query;
        const adminSettings = await AdminSettings.findOne({});
        let userId = (req.user && req.user._id) ? req.user._id : "";
        const userCountry = await User.findOne({ _id: ObjectId(userId) }, {countryId:1}).populate({ path: 'countryId', select: '_id currency' }).lean(); 
        let currencyCode = (userCountry && userCountry.countryId && userCountry.countryId.currency) ? userCountry.countryId.currency : "INR";

        let date = new Date();
        date.setUTCHours(0,0,0,0);

        let serverOffset = new Date().getTimezoneOffset();
        let addSubtractOffset = offset.indexOf("+")  === 0 ? offset.replace("+","-"): offset.replace("-","+");

        let startUtc = new Date(new Date().getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset * 60  *1000));

        let endUtc = new Date(new Date(date).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset* 60  *1000) + (7 * 24 * 60 * 60 * 1000));


        var data = await User.aggregate([{
            $match: { _id: ObjectId(id), isDeleted: false, isSuspended: false, isAccountComplete: true },
        },
        {
            $lookup: {
                from: "specialities",
                localField: "specality",
                foreignField: "_id",
                as: "specality"
            }
        },
        {
            $lookup: {
                from: "countries",
                localField: "countryId",
                foreignField: "_id",
                as: "countryData"
            }
        },
        {
            $lookup: {
                from: "states",
                localField: "stateId",
                foreignField: "_id",
                as: "stateData"
            }
        },
        {
            '$lookup': {
                from: 'appointments', let: { userId: '$_id' },
                pipeline: [{
                    '$match': {
                        '$expr': { '$eq': ['$consultant', '$$userId'] },
                        isCanceled: false,
                        paymentStatus:'SUCCESS'
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
                        count: 1
                    }
                }
                ], as: 'consultationCompleted'
            }
        },
        //added by me
         // post
         {
            '$lookup': {
                from: 'feeds', let: { uId: '$_id' },
                as: 'feedData',
                pipeline: [{
                    '$match': {
                        '$expr': { '$eq': ['$userId', '$$uId'] },
                        isDeleted: false,
                        isSuspended: false
                    }
                },
                {
                    $sort : {_id:-1}
                }]
            }
        },
        {
            $project : {
                accountEmail : 1,
                pushNotificationAllowed : 1,
                isOnline : 1,
                isLogoutOnline : 1,
                appointmentReminder : 1,
                isAccountComplete : 1,
                isSuspended : 1,
                isDeleted : 1,
                failedLoginAttempts : 1,
                preventLoginTill : 1,
                isEmailVerified : 1,
                step : 1,
                audioSessionRate : 1,
                videoSessionRate : 1,
                charges : 1,
                os : 1,
                fullName : 1,
                phone : 1,
                password : 1,
                email : 1,
                deviceToken : 1,
                authTokenIssuedAt : 1,
                bankEmail : 1,
                customerId : 1,
                created : 1,
                updated : 1,
                __v : 1,
                avatar : 1,
                city : 1,
                dob : 1,
                regNumber : 1,
                specality : 1,
                countryData: 1,
                stateData: 1,
                voipToken : 1,
                blockedUser : 1,
                secondary_phone : 1,
                 experience : 1,
                countryId : 1,
                 hospitalName : 1,
                stateId : 1,
                 service : 1,
                about : 1,
                isVerified : 1,
                fileName : 1,
                requestId : 1,
                consultationCompleted : 1,
                feedData : { $arrayElemAt: [ "$feedData", 0 ] },
                isEmergency: 1,
                isCallAllowed:1
            }
        },
         {
            $project : {
                accountEmail : 1,
                pushNotificationAllowed : 1,
                isOnline : 1,
                isLogoutOnline : 1,
                appointmentReminder : 1,
                isAccountComplete : 1,
                isSuspended : 1,
                isDeleted : 1,
                failedLoginAttempts : 1,
                preventLoginTill : 1,
                isEmailVerified : 1,
                step : 1,
                audioSessionRate : 1,
                videoSessionRate : 1,
                charges : 1,
                os : 1,
                fullName : 1,
                phone : 1,
                password : 1,
                email : 1,
                deviceToken : 1,
                authTokenIssuedAt : 1,
                bankEmail : 1,
                customerId : 1,
                created : 1,
                updated : 1,
                __v : 1,
                avatar : 1,
                city : 1,
                dob : 1,
                regNumber : 1,
                specality : 1,
                countryData: 1,
                stateData: 1,
                voipToken : 1,
                blockedUser : 1,
                secondary_phone : 1,
                 experience : 1,
                countryId : 1,
                 hospitalName : 1,
                stateId : 1,
                 service : 1,
                about : 1,
                isVerified : 1,
                fileName : 1,
                requestId : 1,
                consultationCompleted : 1,
                postId : "$feedData._id",
                isEmergency: 1,
                isCallAllowed:1
            }
        }

        ]);
        let consultantsData = (data && data.length)     ?   data[0] : "";
        if (!consultantsData) {
            return res.notFound([], req.__("User doesn't exist"));
        }else{
            let availableSlot = await Slot.aggregate([
                { $match: {
                    "doctorId": ObjectId(id)
                }},
                {
                    "$unwind": { path: "$slots"}  
                },
                { "$match":{"slots.utcTime": {
                    $gte: new Date(startUtc),
                    $lte: new Date(endUtc)
                },
                "slots.isBooked" : false}},
            ]);
            consultantsData['availableSlot'] = availableSlot.length;
        }
        consultantsData['isVerified'] = (consultantsData['isVerified'] == true)     ?    true   : false;
        let conversionRate       = (adminSettings && adminSettings.conversionRate) ? adminSettings.conversionRate : "";
        let audioSessionRate     = (currencyCode == "INR") ? consultantsData.audioSessionRate : consultantsData.audioSessionRate / conversionRate;
        let videoSessionRate     = (currencyCode == "INR") ? consultantsData.videoSessionRate : consultantsData.videoSessionRate / conversionRate;
        consultantsData.audioSessionRate = audioSessionRate.toFixed(2);
        consultantsData.videoSessionRate = videoSessionRate.toFixed(2);

        let myBlockedUser = req.user.blockedUser !== undefined ? req.user.blockedUser : [];
        if( myBlockedUser.length>0 ){
            myBlockedUser = myBlockedUser.map( x=> x.toString() )
        }
        let isBlock = false;
        if( myBlockedUser.length>0 && myBlockedUser.indexOf( id.toString())!=-1  ){
            isBlock = true
        }
        
        //consultantsData['shareUrl']          = `${process.env.SITE_URL}/api/users/share/${id}`
        consultantsData['shareUrl']          = `http://localhost:4001/api/users/share/${id}`
        consultantsData['shareTitle']        = `TelemedReferral is a mobile app for online doctor-to-doctor e-consults & education.`;
        consultantsData['shareDescription']  = `Hi, you can connect with Dr.${consultantsData.fullName} on TelemedReferral.`;

        consultantsData['isBlock'] = isBlock;

        //data["conData"] = consultantsData

        return res.success(data, req.__('Consultant found successfully.'));
    }

    async getList(req, res) {
        let { searchFor, pageIndex = 1, pageLimit = 5, offset = "+330" } = req.query;
        const { user } = req;
        let myBlockedUser = user.blockedUser !== undefined ? user.blockedUser : [];
        //myBlockedUser.push( ObjectId(req.user._id.toString()) )
        let date = new Date();
        date.setUTCHours(0,0,0,0);

        let serverOffset = new Date().getTimezoneOffset();
        let addSubtractOffset = offset.indexOf("+")  === 0 ? offset.replace("+","-"): offset.replace("-","+");

        let startUtc = new Date(new Date().getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset * 60  *1000));

        let endUtc = new Date(new Date(date).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset* 60  *1000) + (7 * 24 * 60 * 60 * 1000));
        let matchCond = {};
        if (searchFor) {
             let searchValue = new RegExp(searchFor, "gi");

            if (ObjectId.isValid(searchFor)) {
                matchCond = {
                    'specality._id': ObjectId(searchFor)
                }
            } else {
                matchCond = {
                    $or: [
                        {
                            fullName: searchValue,
                        },
                        {
                            city: searchValue,
                        },
                        {
                            'specality.specialityName': searchValue
                        },
                    ],
                };
            }
        }

        let firstMatch = {
            isDeleted: false,
            isSuspended: false,
            isAccountComplete: true,
            blockedUser: {$nin:[user._id]}, 
            _id: {$nin: myBlockedUser }
        }

        if( req.user.organizationId ){
            firstMatch = {
                "organizationId": req.user.organizationId ,
                ...firstMatch
            }
        }else{
            firstMatch = {
                "organizationId": {$exists: false}  ,
                ...firstMatch
            }
        }

        const consultants = await User.aggregate([
            {
                $match: firstMatch,
            },
            {
                $lookup: {
                    from: 'specialities',
                    let: { specality: '$specality' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$_id', '$$specality'],
                                },
                            },
                        },
                        {
                            $project: {
                                specialityName: 1,
                                specialityIcon: 1
                            },
                        },
                    ],
                    as: 'specality',
                },
            },
            {
                $addFields: {
                    sortFee:
                        { $add: ["$audioSessionRate", "$videoSessionRate"] }
                }
            },
            {
                $project: {
                    sortFee:1,
                    specality: 1,
                    city: 1,
                    avatar: 1,
                    secondry_phone:1,
                    fullName: 1,
                    audioSessionRate: 1,
                    videoSessionRate: 1,
                    isOnline:1,
                    isVerified: { $ifNull: [ "$isVerified", false ] },
                    isEmergency: 1
                },
            },
            {
                $match: matchCond,
            },
            {
                $addFields: {
                    doctorName: { $toLower: "$fullName" }
                }
            },
            { $sort: { doctorName: 1 } },
            
            //{ $sort: { sortFee: 1 } },
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
                        $slice: ['$items', Number((pageIndex - 1) * pageLimit), Number(pageLimit)],
                    },
                },
            },
        ]);
        if (!consultants.length) {
            return res.notFound([], req.__('CONSULTANTS_NOT_EXIST'));
            //return res.success([], req.__('CONSULTANTS_NOT_EXIST'));
        }

        if((consultants[0].items).length > 0){
            for(let i = 0; (consultants[0].items).length > i; i++){
                let availableSlot = await Slot.aggregate([
                    { $match: {
                        "doctorId":consultants[0].items[i]._id
                    }},
                    {
                        "$unwind": { path: "$slots"}  
                    },
                    { "$match":{"slots.utcTime": {
                        $gte: new Date(startUtc),
                        $lte: new Date(endUtc)
                    },
                    "slots.isBooked" : false}},
                ]);
                consultants[0].items[i].availableSlot = availableSlot.length;
            }
        }
        return res.status(200).send({
            success: true,
            data:consultants[0].items,
            message: 'Consultants found successfully.',
            totalRecords: consultants[0].count
        });

    }

}

module.exports = new ConsultantsController();
