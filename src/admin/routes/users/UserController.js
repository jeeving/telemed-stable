const {
    models: { User, Speciality, PaymentRequest },
} = require('../../../../lib/models');
const { showDate, logError, showDateTimeZone,randomString } = require('../../../../lib/util');
const { utcDateTime } = require('../../../../lib/util');
const { sendMail } = require('../../../../lib/mailer');
const { encryptMessage,decryptMessage } = require("../../../../lib/encryptions")
const moment = require('moment');
const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;
    
class UserController {
    async listPage(req, res) {
        return res.render('users/list');
    }

    async list(req, res) {
        try {
            let reqData = req.query;
            let columnNo = parseInt(reqData.order[0].column);
            console.log({columnNo})
            let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
            let query = {
                isDeleted: false,"organizationId": {$exists: false},
            };

            if (reqData.search.value) {
                const searchValue = new RegExp(
                    reqData.search.value
                        .split(' ')
                        .filter(val => val)
                        .map(value => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
                        .join('|'),
                    'i',
                );

                query.$or = [
                    { userName: searchValue },
                    { fullName: searchValue },
                    { email: searchValue },
                    { phone: searchValue },
                    { 'specality.specialityName': new RegExp("\\b(" + reqData.search.value + ")\\b", "gi") }
                ];
            }

            let sortCond = { created: sortOrder };
            let response = {};
            switch (columnNo) {
                case 1:
                    sortCond = {
                        userName: sortOrder,
                    };
                    break;
                case 2:
                    sortCond = {
                        fullName: sortOrder,
                    };
                    break;
                case 5:
                    sortCond = {
                        isSuspended: sortOrder,
                    };
                    break;
                case 7:
                    sortCond = {
                        isDeleteRequest: sortOrder,
                    };
                    break;
                case 8:
                    sortCond = {
                        deleteRequestDate: sortOrder,
                    };
                    break;   

                default:
                    sortCond = { created: sortOrder };
                    break;
            }

            

            let skip = parseInt(reqData.start);
            let limit = parseInt(reqData.length);

            var data =  await User.aggregate([{
                $match :  query ,
            },
            { $lookup: {
                from: "specialities",
                localField: "specality",
                foreignField: "_id",    
                as: "specality"
            } },
                { '$unwind': { path: '$specality', preserveNullAndEmptyArrays: true } },
                {
                    $sort: sortCond,
                },
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
                            $slice: ['$items', skip, limit],
                        },
                    },
                },
            
            ]);   

            const count = data.length ? data[0].count : 0;

            response.draw = 0;
            if (reqData.draw) {
                response.draw = parseInt(reqData.draw) + 1;
            }
            response.recordsTotal = count;
            response.recordsFiltered = count;

            let users = data.length ? data[0].items : [];

            console.log({
                users
            })

            if (users) {
                users = users.map( user => {   
                    let actions = '';
                    actions = `<a href="/users/view/${user._id}" title="View"><i class="fa fa-eye"></i> </a>`;
                    actions = `${actions}<a href="/users/delete/${user._id}" title="Remove" class="deleteItem"> <i class="fas fa-trash"></i> </a>`;
                    actions = `${actions}<a href="/users/edit/${user._id}" title="Edit"> <i class="fas fa-edit"></i> </a>`;
                    if (user.isSuspended) {
                        actions = `${actions}<a class="statusChange" href="/users/update-status?id=${user._id}&status=false" title="Activate"> <i class="fa fa-check"></i> </a>`;
                    }
                    else {
                        actions = `${actions}<a class="statusChange" href="/users/update-status?id=${user._id}&status=true" title="In-activate"> <i class="fa fa-ban"></i> </a>`;
                    }

                    let email = "N/A"
                    if(user.email){
                        email = decryptMessage(user.email)
                    }

                    let deleteRequestDate = "N/A"
                    if(  user.isDeleteRequest && user.deleteRequestDate>0 ){
                        deleteRequestDate = moment.unix(user.deleteRequestDate).format('YYYY-MM-DD HH:mm');
                    }

                    return {
                        0: (skip += 1),
                        1: user.fullName || 'N/A',
                        2: email ,
                        3: showDateTimeZone(user.created, req.session.timeZone),
                        4: user.specality  && user.specality.specialityName || 'N/A',
                        5: user.isVerified ? '<span class="badge label-table badge-success">Yes</span>' : '<span class="badge label-table badge-secondary">No</span>',
                        6: user.isSuspended ? '<span class="badge label-table badge-secondary">In-active</span>' : '<span class="badge label-table badge-success">Active</span>',
                        
                        7: user.isDeleteRequest ? '<span class="badge label-table badge-danger">Yes</span>' : '<span class="badge label-table badge-success">No</span>',
                        8: deleteRequestDate,

                        9: actions ? actions : '<span class="badge label-table badge-secondary">N/A</span>',
                    };
                });
            }
            response.data = users;
            return res.send(response);
        }catch(err){
            console.log("err",err)
        }


    }

    async addPage(req, res) {
        return res.render('users/add');
    }

    async add(req, res) {

        //console.log(req.body);
        let { fullName, email, countryCode, phoneNumber, password } = req.body;
        let realEmail = email;
        
        let {  hash, encrypt } = await encryptMessage(email)
        let emailHash = hash
        email = encrypt
        //console.log({ emailHash,email })

        const userData = {
            fullName,
            email,
            emailHash,
            phone : countryCode+' '+phoneNumber,
            password,
        };

       let user = new User(userData);
        user.authTokenIssuedAt = utcDateTime().valueOf();
        await user.save();

        req.flash('success', req.__('User added successfully.'));
        res.redirect('/users');

        let fullnameCap = fullName.charAt(0).toUpperCase() + fullName.slice(1);

        sendMail('send-doctor-password', req.__('EMAIL_DOCTOR_PASSWORD'), realEmail, {
            fullnameCap,
            email: realEmail,
            // phoneNumber : countryCode+' '+phoneNumber,
            password
        })
            .catch(error => {
                logError(`Failed to send password to ${realEmail}`);
                logError(error);
            });    

    }

    async view(req, res) {

        let current = new Date();
        var user = await User.aggregate([
            {
                $match: {
                    _id: ObjectId(req.params.id),
                    isDeleted: false,
                }
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
                    as: "countries"
                }
            },
            {
                $lookup: {
                    from: "states",
                    localField: "stateId",
                    foreignField: "_id",
                    as: "states"
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
                            paymentStatus: 'SUCCESS',
                            "bookingDetails.date": { "$lt": new Date(current.getTime() + (300 * 2)) },
                            //created :{"$gt":new Date(process.env.RAZORPAY_KEY_ID)}
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
                                $and: [
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
                                $sum: { "$toDouble": "$amount" }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            total: 1
                        }
                    }
                    ], as: 'paid_amount'
                }
            },
            {
                '$lookup': {
                    from: 'paymentrequests', let: { userId: '$_id' },
                    pipeline: [{
                        '$match': {
                            '$expr': {
                                $and: [
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
                                $sum: { "$toDouble": "$amount" }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            total: 1
                        }
                    }
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
            { '$unwind': { path: '$totalEarning', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$pending_amount', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$paid_amount', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$wallettopup_amount', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$specality', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$countries', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$states', preserveNullAndEmptyArrays: true } },
            {
                '$project': {
                    totalEarning: {
                        $cond: {
                            if: { $ifNull: ["$totalEarning", false] },
                            then: '$totalEarning.amount',
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
                    userName: 1,
                    fullName: 1,
                    secondary_phone: 1,
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
                    unReadMessage: 1,
                    hospitalName: 1,
                    isSuspended: 1,
                    isVerified: 1,
                    fileName: 1,
                    countries: 1,
                    states: 1
                }
            }

        ]);

        //console.log("-------", user)
        user = user[0]

        if (!user) {
            req.flash('error', req.__('USER_NOT_EXIST'));
            return res.redirect('/users');
        }

        let topupHistoryCount = await PaymentRequest.count({ "userId": ObjectId(user._id) })

        return res.render('users/view', {
            user,
            s3Url: process.env.AWS_S3_BASE,
            topupHistoryCount
        });
    }

    async updateStatus(req, res) {
        const { id, status } = req.query;
        let user = await User.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!user) {
            req.flash('error', req.__('USER_NOT_EXIST'));
            return res.redirect('/users');
        }

        await User.updateOne(
            { _id: user._id }, 
            { $set: { "isSuspended": status } } 
        );

        // user.isSuspended = status;
        // await user.save();

        req.flash('success', req.__('USER_STATUS_UPDATED'));
        return res.redirect('/users');
    }

    async delete(req, res) {
        const user = await User.findOne({
            _id: req.params.id,
            isDeleted: false,
        });

        if (!user) {
            req.flash('error', req.__('USER_NOT_EXIST'));
            return res.redirect('/users');
        }

        // user.email = `${randomString(4)}-${user.email}`
        // user.phone = `${randomString(4,"1234567890")}-${user.phone}`
        // user.isDeleted = true;

        let { encrypt } = await encryptMessage(user.email)

        await User.updateOne(
            { _id: user._id }, 
            { 
                $set: { 
                    email : `${randomString(4)}-${encrypt}`,
                    emailHash: "",
                    phone : `${randomString(4,"1234567890")}-${user.phone}`,
                    isDeleted : true
                } 
            } 
        );
        
        //await user.save();

        req.flash('success', req.__('USER_DELETED'));
        return res.redirect('/users');
    }

    async editPage(req, res) {
        const userFetch = await User.findOne({
            _id: req.params.id,
        });

        if (!userFetch) {
            req.flash('error', req.__('USER_NOT_EXISTS'));
            return res.redirect('/users');
        }

        return res.render('users/edit', {
            userFetch,
        });
    }

    async edit(req, res) {
        const { fullName, email, phoneNumber } = req.body;

        const userFetch = await User.findOne({
            _id: req.params.id,
        });
        if (!userFetch) {
            req.flash('error', req.__('USER_NOT_EXISTS'));
            return res.redirect('/users');
        }

        let {  hash, encrypt } = await encryptMessage(email)

        // userFetch.fullName = fullName;
        // userFetch.email = email;
        // userFetch.phone = phoneNumber;
        // await userFetch.save();

        await User.updateOne(
            { _id: userFetch._id }, 
            { 
                $set: { 
                    fullName : fullName,
                    email : encrypt,
                    emailHash: hash,
                    phone : phoneNumber,
                } 
            } 
        );

        req.flash('success', req.__('USER_UPDATED'));
        return res.redirect('/users');
    }

    async topupWallet(req, res) {
        const { amount } = req.body;
        const userFetch = await User.findOne({
            _id: req.params.id,
        });
        if (!userFetch) {
            req.flash('error', req.__('USER_NOT_EXISTS'));
            return res.redirect('/users');
        }
        let model = new PaymentRequest();
        model.userId = req.params.id;
        model.amount = amount;
        model.status = "SUCCESS"; 
        model.type = "wallettopup";
        console.log("model", model)
        let data = await model.save();
        req.flash('success', req.__('USER_WALLET_TOPUP'));
        return res.redirect(`/users/view/${req.params.id}`);
    }

}

module.exports = new UserController();
