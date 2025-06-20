const {
    models: { Appointment, Speciality, Payment, Slot },
    enums: { Appointments }
} = require('../../../../lib/models');
const { percentage } = require('../../util/common');
const { showDate, utcDateTime, showDateAccordingTimezone, showDateTimeZone } = require('../../../../lib/util');
const { encryptMessage,decryptMessage } = require("../../../../lib/encryptions")
require("dotenv").config();
const moment = require('moment');
const axios = require('axios');

const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;

const Razorpay = require('razorpay');

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

class AppointmentController {
    async listPage(req, res) {
        return res.render('appointments/list');
    }

    async list(req, res) {
        let reqData = req.query;
        let columnNo = parseInt(reqData.order[0].column);
        let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        let query = { isDeleted: false,"organizationId": {$exists: false}, };
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

            filter.$or = [
                {
                    'appointmentId': !isNaN(Number(reqData.search.value)) ? Number(reqData.search.value) : ''
                },
                {
                    'doctor.fullName': searchValue
                },
                {
                    'consultant.fullName': searchValue
                }
            ]

        }

        if (reqData.status != '') {
            if (reqData.status == 'true') {
                filter.$and = [
                    {
                        'isCanceled': false
                    },
                    {
                        'bookingDetails.date': { $lt: utcDateTime() }
                    }
                ];
            }
            else if (reqData.status == 'false') {
                filter = {
                    'isCanceled': true
                };
            }
        }

        let sortCond = { created: sortOrder };
        let response = {};
        switch (columnNo) {
            case 1:
                sortCond = {
                    appointmentId: sortOrder,
                };
                break;
            case 5:
                sortCond = {
                    created: sortOrder,
                };
                break;
            default:
                sortCond = { created: sortOrder };
                break;
        }

        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);


        let appointments = await Appointment.aggregate([
            {
                '$match': query,
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
                        $project: {
                            fullName: 1
                        }
                    }
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
                        $project: {
                            fullName: 1
                        }
                    }
                    ], as: 'consultant'
                }
            },
            {
                '$lookup': {
                    from: 'payments',
                    localField: 'paymentId',
                    foreignField: '_id',
                    as: 'paymentId'
                }
            },
            { '$unwind': { path: '$paymentId', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$doctor', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$consultant', preserveNullAndEmptyArrays: true } },
            { $match: filter },
            { $sort: sortCond },
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
                console.log("-----appointments.paymentId", appointment.paymentId)
                let actions = '';
                actions = `<a href="/appointments/view/${appointment._id}" title="View"><i class="fa fa-eye"></i> </a>`;

                if (appointment.paymentId  && appointment.paymentId.paymentId && !appointment.paymentId.refundId) {
                    actions = `${actions}<a class="refundAmount" href="/appointments/refund/${appointment._id}" title="Refund"> <i class="fas fa-undo"></i> </a>`;
                    actions = `${actions}<a class="callSid" href="/appointments/callTwilio/${appointment._id}" title="Refund"> <i class="fas fa-list"></i> </a>`;
                }

                let totalPayable = "N/A"
                if( appointment?.bookingDetails?.totalPayable ){
                    totalPayable = appointment.bookingDetails.totalPayable  //.toFixed(2)
                    
                    if(appointment.appointmentId> 501){
                        totalPayable = (totalPayable/100).toFixed(2)
                    }else{
                        totalPayable = totalPayable.toFixed(2)
                    }
                    
                }
                

                let dateTime = moment(appointment.bookingDetails.date).format('MMMM D YYYY') + ' ' + moment(appointment.bookingDetails.slots[0].utcTime, "hh:mm: A").format('LT')

                //let adminCommission = appointment.consultantFee ? (parseInt(appointment.bookingDetails.totalPayable)  - appointment.consultantFee ):'N/A'
                let adminCommission;
                if (appointment.consultantFee) {
                    adminCommission = appointment.bookingDetails.totalPayable - appointment.consultantFee;
                    
                    if(appointment.appointmentId> 501){
                        adminCommission = (adminCommission/100).toFixed(2)
                    }else{
                        adminCommission = (adminCommission).toFixed(2)
                    }
                } else {
                    adminCommission = 'N/A';
                }


                let reason = "<div class='text-wrap width-200'>" + appointment.patient.reason || 'N/A' + "</div>";
                return {
                    0: (skip += 1),
                    1: appointment.appointmentId || 'N/A',
                    2: appointment.doctor.fullName || 'N/A',
                    3: appointment.consultant.fullName || 'N/A',
                    4: dateTime,
                    5: reason,
                    6: appointment.bookingDetails.mode || 'N/A',
                    7: totalPayable,  //appointment.bookingDetails.totalPayable || 'N/A',
                    8: adminCommission,
                    9: appointment.paymentId ? `<span class="badge label-table badge-primary"> ${appointment.paymentId.paymentStatus} </span>` : `<span class="badge label- badge-secondary">Not Initiated</span>`,
                    10: appointment.isCanceled ? `<span class="badge label-table badge-secondary">Cancelled</span>` : `<span class="badge label-table badge-success">Completed</span>`,
                    11: showDateTimeZone(appointment.created, req.session.timeZone),
                    12: actions ? actions : '<span class="badge label-table badge-secondary">N/A</span>',
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
                '$match': { isDeleted: false, _id: ObjectId(req.params.id) },
            },
            {
                '$lookup': {
                    from: 'users',
                    let: { doct: '$doctor' },
                    pipeline: [{
                        '$match': {
                            '$expr': {
                                '$eq': ['$_id', '$$doct']
                            }
                        }
                    },
                    {
                        '$lookup': {
                            from: 'specialities',
                            let: { spel: '$specality' },
                            pipeline: [{
                                '$match': {
                                    '$expr': { '$eq': ['$_id', '$$spel'] }
                                }
                            },
                            {
                                $project:
                                {
                                    specialityName: 1,
                                    specialityIcon: 1,
                                }
                            },
                            ], as: 'specality'
                        },
                    },
                    {
                        $project:
                        {
                            fullName: 1,
                            phone: 1,
                            email: 1,
                            regNumber: 1,
                            experience: 1,
                            specality: { $arrayElemAt: ["$specality", 0] }
                        }
                    },
                    ], as: 'doctor'
                }
            },
            {
                '$lookup': {
                    from: 'users',
                    let: { constl: '$consultant' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$_id', '$$constl'] }
                        }
                    },
                    {
                        '$lookup': {
                            from: 'specialities',
                            let: { spelt: '$specality' },
                            pipeline: [{
                                '$match': {
                                    '$expr': { '$eq': ['$_id', '$$spelt'] }
                                }
                            },
                            {
                                $project:
                                {
                                    specialityName: 1,
                                    specialityIcon: 1,
                                }
                            },
                            ], as: 'specality'
                        },
                    },
                    {
                        $project:
                        {
                            fullName: 1,
                            phone: 1,
                            email: 1,
                            regNumber: 1,
                            experience: 1,
                            specality: { $arrayElemAt: ["$specality", 0] }
                        }
                    },
                    ], as: 'consultant'
                }
            },
            {
                $lookup: {
                    from: 'payments',
                    let: { paymentId: '$paymentId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$paymentId'] }
                            }
                        },
                    ],
                    as: 'payment'
                }
            },
            { '$unwind': { path: '$payment', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$doctor', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$consultant', preserveNullAndEmptyArrays: true } },
        ]);

        shareAppData = shareAppData[0];
        console.log("sdf", shareAppData);

        //shareAppData.doctor.email
        //shareAppData.consultant.email
        if( shareAppData.doctor.email ){
            shareAppData.doctor.email = decryptMessage(shareAppData.doctor.email)
        }
        if( shareAppData.consultant.email ){
            shareAppData.consultant.email = decryptMessage(shareAppData.consultant.email)
        }


        if(shareAppData.payment && shareAppData.payment.paymentId){
            let payment = await axios({
                method: 'get',
                url: `https://api.razorpay.com/v1/payments/${shareAppData.payment.paymentId}`,
                auth: {
                    username: process.env.RAZORPAY_KEY_ID,
                    password: process.env.RAZORPAY_KEY_SECRET
                },
                withCredentials: true,
            });
            console.log(payment.data)
            if (payment) {
                shareAppData.paymentDetails = payment.data;
            }
        }
        
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

        let prviewUrl = process.env.AWS_S3_BASE + '' + process.env.AWS_S3_SPECIALITY

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
            specialityIcon: s3Image
        });
        await specialitySave.save();

        req.flash('success', req.__('SPECIALITY_ADDED'));
        return res.redirect('/speciality');
    }

    async updateStatus(req, res) {
        const { id, status } = req.query;
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

    async refundAppointement(req, res){
    console.log("REFUND----------------------")
        const { user } = req;
        const { id } = req.params;

        let updateAppointment = await Appointment.findOneAndUpdate({ _id: ObjectId(id) }, { 
            //isCanceled: true
        }).populate({
            path: 'consultant',
            select: '_id fullName deviceToken pushNotificationAllowed appointmentReminder'
        }).populate({
            path: 'doctor',
            select: '_id fullName deviceToken pushNotificationAllowed appointmentReminder'
        }).populate({
            path: 'paymentId',
            select: 'paymentId created'
        });

        console.log(updateAppointment.paymentId, new Date(updateAppointment.paymentId.created).getTime() + ( 3 * 24 * 60 * 60 * 1000) ,">", new Date().getTime())

        if (updateAppointment.paymentId && updateAppointment.paymentId.paymentId && new Date(updateAppointment.paymentId.created).getTime() + ( 3 * 24 * 60 * 60 * 1000) > new Date().getTime()) {
            try {
                let getRefund = await axios({
                    method: 'post',
                    url: `https://api.razorpay.com/v1/payments/${updateAppointment.paymentId.paymentId}/refund`,
                    auth: {
                        username: process.env.RAZORPAY_KEY_ID,
                        password: process.env.RAZORPAY_KEY_SECRET
                    },
                    withCredentials: true,
                });

                if (getRefund.data && getRefund.data.id) {
                    await Payment.findOneAndUpdate({ _id: updateAppointment.paymentId }, {
                        refundId: getRefund.data.id
                    });
                    await Appointment.findOneAndUpdate({ _id: ObjectId(id) }, {
                        isRefund: true
                    });    
                    /* let failedSlots = updateAppointment.bookingDetails.slots.map((e) => {
                        return e._id;
                    });
            
                    async function processArray(slots) {
                        for (let ids of slots) {
                            await Slot.updateOne({ 'slots._id': ids }, { $set: { "slots.$.isBooked": false } });
                        }
                    }
                    processArray(failedSlots); */

                }
                req.flash('success', req.__('Refund Done Successfully.'));
            }
            catch(err){
                console.log("getRefund", err);
                req.flash('error', req.__('Refund Not Done.'+ err));
            }
            
            return res.redirect('/appointments');
        }else{
            req.flash('error', req.__('Refund not allowed now.'));
            return res.redirect('/appointments');
            
        }
    }

    async isSpecialityExists(req, res) {

        const { key, value, type, id } = req.body;

        const matchCond = {
            [key]: new RegExp(`^${value}$`, 'i'),
            isDeleted: false,
        };

        var count;

        if (type == 'edit') {
            console.log("edit");
            count = await Speciality.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        _id: { $ne: ObjectId(id) },
                        [key]: new RegExp(`^${value}$`, 'i')

                    }
                }
            ]);
        }
        else {
            count = await Speciality.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        [key]: new RegExp(`^${value}$`, 'i')
                    }
                }
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

    async callTwilio(req, res) {
        const { id } = req.params; console.log("req.params", req.params)
        return res.render('appointments/callList', {id});
    }

    async callTwilioList(req, res) {
        let reqData = req.query;
        const { id } = req.params;
        let columnNo = parseInt(reqData.order[0].column);
        let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        let query = { isDeleted: false };
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

        }

        let response = {};
        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);
        let appointments = await Appointment.aggregate([
            {$match:{_id: ObjectId(id)}},
            {$unwind: { path: "$call_history"}},
            {$project: { appointmentId:1, call_history:1}},
            {$group: { _id: null, count: {$sum:1},  items: { $push: '$$ROOT' }}},
            {$project: {count:1, item: {$slice:["$items", skip, limit] } }}
        ]);
        
        const count = appointments.length ? appointments[0].count : 0;

        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        response.recordsTotal = count;
        response.recordsFiltered = count;

        let reports = appointments.length ? appointments[0].item : [];
        if (reports) {
            reports = reports.map(appointment => {

                let dateTime = showDateTimeZone(appointment.call_history.date, req.session.timeZone);
                return {
                    0: (skip += 1),
                    1: appointment.appointmentId || 'N/A',
                    2: Object.keys(Appointments.CallStatus).find(key => Appointments.CallStatus[key] ==(appointment.call_history.call_status)) || 'N/A',
                    3: appointment.call_history.call_sid || 'N/A',
                    4: dateTime,
                    5: appointment.call_history.CallDuration
                };
            });
        }
        response.data = reports;
        return res.send(response);
    }
}

module.exports = new AppointmentController();