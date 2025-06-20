const {
    models: { Payment, Speciality, Appointment,PaymentRequest,Webinar }
} = require('../../../../lib/models');

const {showDate,showDateTimeZone} = require('../../../../lib/util');
const { encryptMessage,decryptMessage } = require("../../../../lib/encryptions")
require("dotenv").config();

const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;

class PaymentController {


    async paymentRequestPage(req, res) {
        return res.render('payments/payment_request');
    }

    async updatePaymentRequestStatus(req, res) 
    {
        let {status,requestId} = req.query;

        if((!requestId) || (!status)){
            req.flash('error', req.__('Invalid Required Field.'));
            res.redirect('/payments/payment-request');
        }

        let data = await PaymentRequest.findOne({"_id":requestId});
        console.log("sdsdcdsdc"+data);
        if(!data)
        {
            req.flash('error', req.__('Invalid requestId.'));
            res.redirect('/payments/payment-request');
        }

        data.status = status;
        data.action_date = new Date();
        let result = await data.save();
        if(result){
            req.flash('success', req.__('Successfully update status.'));
            res.redirect('/payments/payment-request');
        }else{
            req.flash('error', req.__('Invalid requestId.'));
            res.redirect('/payments/payment-request');
        }
    }

    async paymentRequestlist(req, res) {
        try{
            let reqData = req.query;
            let columnNo = parseInt(reqData.order[0].column);
            let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
            let query = {};
            let filter = {};

            if (reqData.search.value) {
                const searchValue = new RegExp(
                    reqData.search.value
                        .split(' ')
                        .filter(val => val)
                        .map(value => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/i, '\\$&'))
                        .join('|'),
                    'i'
                );

                filter = { 'user.fullName': searchValue }

            }

            if (reqData.status) {
                filter.status = reqData.status
            }

            let sortCond = { created: sortOrder };
            let response = {};
            switch (columnNo) {
                case 1:
                    sortCond = {
                        name: sortOrder,
                    };
                    break;

                default:
                    sortCond = { created: sortOrder };
                    break;
            }

            let skip = parseInt(reqData.start);
            let limit = parseInt(reqData.length);
            //console.log("111111111111111111111111111111111111111111111111111111111111")
            let paymentRequest = await PaymentRequest.aggregate([
                {
                    $match: {
                        isShowOnList: true,
                        consultant_id: {
                            $exists: true,

                        }
                    }
                },
                {
                    '$lookup': {
                        from: 'users',
                        localField: "consultant_id",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                {
                    $match: filter
                },
                {
                    $sort: sortCond
                },
                {
                    $project: {
                        consultant_id: 1, amount: 1, action_date: 1, status: 1, created: 1, user: { $arrayElemAt: ["$user", 0] }

                    }
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

            //console.log("strd==================>=", paymentRequest)

            const count = paymentRequest.length ? paymentRequest[0].count : 0;

            response.draw = 0;
            if (reqData.draw) {
                response.draw = parseInt(reqData.draw) + 1;
            }
            response.recordsTotal = count;
            response.recordsFiltered = count;

            let reports = paymentRequest.length ? paymentRequest[0].items : [];

            if (reports) {
                reports = reports.map(paymentRequest => {
                    let status = '';

                    console.log("dddddddd" + paymentRequest.status)
                    let action = `<select id="changeStatus" requestId="${paymentRequest._id}"><option value="">Select Status</option><option value="APPROVED" >Approve</option><option value="REJECT">Reject</option>`;
                    if (paymentRequest.status == "APPROVED") {
                        status = `<span class="badge label-table badge-success">APPROVED</span>`;
                    } else
                        if (paymentRequest.status == "REJECT") {
                            status = `<span class="badge label-table badge-danger">REJECTED</span>`;
                        }
                        else {
                            status = `<span class="badge label-table badge-info">PENDING</span>`;
                        }
                    let action_column = (paymentRequest.action_date) ? showDateTimeZone(paymentRequest.action_date, req.session.timeZone) : action;

                    return {
                        0: (skip += 1),
                        1: paymentRequest.user.fullName || 'N/A',
                        2: paymentRequest.amount || 'N/A',
                        3: showDateTimeZone(paymentRequest.created, req.session.timeZone) || 'N/A',
                        4: status || 'N/A',
                        5: action_column,
                        6: `<a href="/payments/view-payment-request/${paymentRequest._id}"><i class="fa fa-eye"></i></a>`
                    };
                });
            }
            response.data = reports;
            return res.send(response);

        }catch(err){
            console.log(err)
        }

    }

    async viewPaymentRequest(req, res) {
        try{
            var request = await PaymentRequest.aggregate([
                {
                    $match: {
                        _id: ObjectId(req.params.id),

                    }
                },
                {
                    '$lookup': {
                        from: 'users',
                        localField: "consultant_id",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                {
                    $project: {
                        webinarId: 1, appointmentId: 1, consultant_id: 1, amount: 1, action_date: 1, status: 1, created: 1, bank_details: 1, user: { $arrayElemAt: ["$user", 0] }

                    }
                }

            ]);

            request = request[0]

            let newUser
            if (request.appointmentId) {
                let user = await Appointment.findOne({
                    _id: request.appointmentId
                })
                    .select("_id doctor")
                    .populate("doctor")

                    .lean()

                newUser = user.doctor
            } else if (request.webinarId) {
                let user = await Webinar.findOne({
                    _id: request.webinarId
                })
                    .select("_id userId")
                    .populate("userId")

                    .lean()

                newUser = user.userId
            }
        
            //console.dir(newUser)
            // if( newUser.email ){
            //     let {  encrypt } = await encryptMessage(email)
            //     newUser.email = encrypt
            // }

            if (newUser?._id) {
                request['user'] = newUser
            }

            //console.log("ddddddddddddddddddddddddddd")
            
            if( request.user.email ){
                 request.user.email = decryptMessage(request.user.email)
             }
             console.dir( request.user,{depth:4 }); //return

            if (!request) {
                req.flash('error', req.__('Request Data Not Found'));
                return res.redirect('/payments/payment-request');
            }
            request.action_date = (request.action_date) ? showDateTimeZone(request.action_date, req.session.timeZone) : "-";

            return res.render('payments/payment_request_view', {
                request
            });
        }catch(err){
            console.log(err)
        }
    }

    async listPage(req, res) {
        return res.render('payments/list');
    }
    
    async list(req, res) {
        let reqData = req.query;
        let columnNo = parseInt(reqData.order[0].column);
        let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        let query = {};
        let filter = {};

        if (reqData.search.value) {
            const searchValue = new RegExp(
                reqData.search.value
                    .split(' ')
                    .filter(val => val)
                    .map(value => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
                    .join('|'),
                'i'
            );

            if (ObjectId.isValid(reqData.search.value)) {
                query = {
                    '_id': ObjectId(reqData.search.value)
                }
            } else {
                filter = {                  
                    $or: [
                        {
                            'appointmentId': !isNaN(Number(reqData.search.value)) ? Number(reqData.search.value) : undefined 
                        },
                        {
                            'doctor.fullName': searchValue
                        },
                        {
                            'consultant.fullName': searchValue
                        }
                    ],
                };
            }
        }

        if(reqData.status != '')
        {
            if(reqData.status == 'true')
            {
                filter = {                  
                    $or: [
                        {
                            'isCanceled': false
                        }
                    ],
                };
            }
            else if(reqData.status == 'false')
            {
                filter = {                  
                    $or: [
                        {
                            'isCanceled': true
                        }
                    ],
                };
            }
        }

        let sortCond = {created: sortOrder};
        let response = {};
        switch (columnNo) {
            case 1:
                sortCond = {
                    name: sortOrder,
                };
                break;
            case 5:
                sortCond = {
                    created: sortOrder,
                };
                break;
            default:
                sortCond = {created: sortOrder};
                break;
        }

        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);

        let appointments = await Payment.aggregate([
            {
                '$match': query,
            },
            {
                '$lookup': {
                    from: 'appointments', let: { order_id: '$orderId' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$orderId', '$$order_id'] }
                        }
                    }, 
                   ], as: 'appointmentData'
                }
            },
            { '$unwind': { path: '$appointmentData', preserveNullAndEmptyArrays: true } },
            {
                '$lookup': {
                    from: 'users', let: { doct: '$appointmentData.doctor' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$_id', '$$doct'] }
                        }
                    }, 
                    {
                        $project : {
                            fullName : 1
                        }
                    },
                   ], as: 'appointmentData.doctor'
                }
            },
            {
                '$lookup': {
                    from: 'users', let: { constl: '$appointmentData.consultant' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$_id', '$$constl'] }
                        }
                    }, 
                    {
                        $project : {
                            fullName : 1
                        }
                    },
                   ], as: 'appointmentData.consultant'
                }
            },
            { '$unwind': { path: '$appointmentData.doctor', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$appointmentData.consultant', preserveNullAndEmptyArrays: true } },

            {
                '$match': filter,
            },
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

    // console.log("strd==================>",appointments[0].items[0].appointmentData.doctor)

    const count = appointments.length ? appointments[0].count : 0;

    response.draw = 0;
    if (reqData.draw) {
        response.draw = parseInt(reqData.draw) + 1;
    }
    response.recordsTotal = count;
    response.recordsFiltered = count;

    let reports = appointments.length ? appointments[0].items : [];

        if (reports) {
            reports = reports.map(appointment => {
                let actions = '';
                // actions = `<a href="/appointments/view/${appointment._id}" title="View"><i class="fa fa-eye"></i> </a>`;
                // actions = `${actions}<a href="/appointment/edit/${appointment._id}" title="Edit"> <i class="fas fa-edit"></i> </a>`;
                // actions = `${actions}<a href="/appointment/delete/${appointment._id}" title="Remove" class="deleteItem"> <i class="fas fa-trash"></i> </a>`;
                // if (appointment.isSuspended) {
                //     actions = `${actions}<a class="statusChange" href="/appointment/update-status?id=${appointment._id}&status=false" title="Activate"> <i class="fa fa-check"></i> </a>`;
                // }
                // else {
                //     actions = `${actions}<a class="statusChange" href="/appointment/update-status?id=${appointment._id}&status=true" title="Inactivate"> <i class="fa fa-ban"></i> </a>`;
                // }

                return {
                    0: (skip += 1),
                    1: appointment._id || 'N/A',
                    2: appointment.appointmentData.doctor.fullName || 'N/A',
                    3: appointment.appointmentData.consultant.fullName || 'N/A',
                    4: 'N/A',
                    5: 'N/A',
                    6: 'N/A',                 
                    7: '' ? `<span class="badge label-table badge-secondary">Cancelled</span>` : `<span class="badge label-table badge-success">Completed</span>`,
                    8: showDate(appointment.created),
                    9: actions ? actions : '<span class="badge label-table badge-secondary">N/A</span>',
                };
            });
        }
        response.data = reports;
        return res.send(response);
    }

    async view(req, res) {
        const appointment = await Appointment.findOne({
            _id: req.params.id,
            isDeleted: false,
        });

        if (!appointment) {
            req.flash('error', req.__('APPOINTMENT_NOT_EXIST'));
            return res.redirect('/appointments');
        }

        let shareAppData = await Appointment.aggregate([
            {
                '$match': { isDeleted : false, _id: ObjectId(req.params.id) },
            },
            {
                '$lookup': {
                    from: 'users', let: { doct: '$doctor' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$_id', '$$doct'] }
                        }
                    },
                    {
                        '$lookup': {
                            from: 'specialities', let: { spel: '$specality' },
                            pipeline: [{
                                '$match': {
                                    '$expr': { '$eq': ['$_id', '$$spel'] }
                                }
                            }, 
                            { 
                                $project : 
                                { 
                                    specialityName : 1,
                                    specialityIcon : 1,
                                 } 
                            },
                           ], as: 'specality'
                        },
                    }, 
                    { 
                        $project : 
                        { 
                            fullName : 1,
                            phone : 1,
                            email : 1, 
                            regNumber : 1,
                            experience : 1,
                            specality : { $arrayElemAt: [ "$specality", 0 ] }    
                         } 
                    },
                   ], as: 'doctor'
                }
            },
            {
                '$lookup': {
                    from: 'users', let: { constl: '$consultant' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$_id', '$$constl'] }
                        }
                    }, 
                    {
                        '$lookup': {
                            from: 'specialities', let: { spelt: '$specality' },
                            pipeline: [{
                                '$match': {
                                    '$expr': { '$eq': ['$_id', '$$spelt'] }
                                }
                            }, 
                            { 
                                $project : 
                                { 
                                    specialityName : 1,
                                    specialityIcon : 1,
                                 } 
                            },
                           ], as: 'specality'
                        },
                    }, 
                    { 
                        $project : 
                        { 
                            fullName : 1,
                            phone : 1,
                            email : 1, 
                            regNumber : 1,
                            experience : 1,
                            specality : { $arrayElemAt: [ "$specality", 0 ] }    
                         } 
                    },
                   ], as: 'consultant'
                }
            },
           
            { '$unwind': { path: '$doctor', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$consultant', preserveNullAndEmptyArrays: true } },
]); 

        shareAppData = shareAppData[0];
        console.log("sdf",shareAppData);
        let prviewUrl = process.env.AWS_S3_BASE
        return res.render('appointments/view', {
            shareAppData,
            prviewUrl
        });
    }

    async editPage(req, res) {
        const speciality = await Speciality.findOne({
            _id: req.params.id,
        });

        if (!speciality) {
            req.flash('error', req.__('SPECIALITY_NOT_EXIST'));
            return res.redirect('/speciality');
        }

        let prviewUrl = process.env.AWS_S3_BASE+''+process.env.AWS_S3_SPECIALITY

        return res.render('specialities/edit', {
            speciality,
            prviewUrl
        });
    }

    async edit(req, res) {
        const { speciality, s3Image } = req.body;
        const specialityFetch = await Speciality.findOne({
            _id: req.params.id,
        });
        if (!specialityFetch) {
            req.flash('error', req.__('SPECIALITY_NOT_EXIST'));
            return res.redirect('/speciality');
        }

        specialityFetch.specialityName = speciality;
        specialityFetch.specialityIcon = s3Image;
        await specialityFetch.save();

        req.flash('success', req.__('SPECIALITY_UPDATED'));
        return res.redirect('/speciality');
    }

    async addPage(req, res) {
        return res.render('specialities/add');
    }

    async add(req, res) {
       
        let { speciality, s3Image } = req.body;
        
        const specialityCount = await Speciality.countDocuments({
            specialityName: speciality,
            isDeleted: false,
        });

        if (specialityCount) {
            req.flash('error', req.__('SPECIALITY_ALREADY_EXISTS'));
            return res.redirect('/speciality');
        }

        const specialitySave = new Speciality({
            specialityName: speciality,
            specialityIcon : s3Image
        });
        await specialitySave.save();

        req.flash('success', req.__('SPECIALITY_ADDED'));
        return res.redirect('/speciality');
    }
  
    async updateStatus(req, res) {
        const {id, status} = req.query;
        let speciality = await Speciality.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!speciality) {
            req.flash('error', req.__('SPECIALITY_NOT_EXIST'));
            return res.redirect('/speciality');
        }

        speciality.isSuspended = status;
        await speciality.save();

        req.flash('success', req.__('SPECIALITY_STATUS_UPDATED'));
        return res.redirect('/speciality');
    }

    async delete(req, res) {
        const speciality = await Speciality.findOne({
            _id: req.params.id,
            isDeleted: false
        });

        if (!speciality) {
            req.flash('error', req.__('SPECIALITY_NOT_EXIST'));
            return res.redirect('/speciality');
        }

        speciality.isDeleted = true;
        await speciality.save();

        req.flash('success', req.__('SPECIALITY_DELETED'));
        return res.redirect('/speciality');
    }

    async isSpecialityExists(req, res) {
      
        const { key, value, type, id } = req.body;

        const matchCond = {
            [key]: new RegExp(`^${value}$`, 'i'),
            isDeleted: false,
        };

        var count;

        if(type == 'edit')
        {
            console.log("edit");
            count =  await Speciality.aggregate([
                { $match: {isDeleted: false,
                      _id: { $ne: ObjectId(id) },
                      [key] : new RegExp(`^${value}$`, 'i')
                     
                }}  
            ]);
        }
        else
        {
            count =  await Speciality.aggregate([
                { $match: {isDeleted: false,
                    [key] : new RegExp(`^${value}$`, 'i')
                }}  
            ]);
        }
        // const count = await Speciality.countDocuments(matchCond);
        return res.send(count.length === 0);
    }
   
    async uploadImage(req, res) {

        console.log("==================+++")
        const { location, type, count = 1 } = req.query;
            const extensions = { IMAGE: 'jpg', 'DOCUMENT.PDF': 'pdf' };
            const extension = extensions[type] || '';
            if (!extension) return res.warn('', req.__('INVALID_FILE_TYPE'));
    
            const uploader = require('../../../../lib/uploader');
            const promises = [];
            for (let i = 1; i <= count; i++) {
                promises.push(uploader.getSignedUrl(location.endsWith('/') ? location : `${location}/`, extension));
            }
            
            const urls = await Promise.all(promises);
            return res.success(urls);
    }
}

module.exports = new PaymentController();