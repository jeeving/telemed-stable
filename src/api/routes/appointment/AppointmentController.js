const {
    models: { User, Slot, Appointment, Notification, Payment , AdminSettings, PaymentRequest,Webinar,Call},
} = require('../../../../lib/models');
const { utcDate, showDate, sendFCMPush, utcDateTime,parentage, sendFCMPushForVideoCall, sendIosVoipPush, sendFCMPushSilent } = require('../../../../lib/util');
const { patientDBConnections, mongoObjectId } = require('../../../../lib/multi-db');


const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;

const moment = require('moment');
const axios = require('axios');
const { generateToken } = require('../../util/common');

const Razorpay = require('razorpay');

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
}); 
//sendFCMPush(['dzCD0kyvaEq5qFFdkC9Svc:APA91bHeV3LDy4clTXzFMDtYV90-rUcUfC9zpUN2Zb9BswZSzfdoQjHvQenQ0O4oFULe-p96A3kuGNBZjIX4CqvbriyaBzNZBKtNM-v2KzPh1zzfHyxidxMLmLmhWVluanPe0TKJYtF6'], 'appointment', 'check'); 
//sendIosVoipPush('2a5b612c00411d8db44953c1591f8b09147607a256ae21cc474519d0758ebbec', 'title', 'body');
const Twilio = require('twilio');
const AccessToken = Twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const VideoGrant = AccessToken.VideoGrant;
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioApiKey = process.env.TWILIO_API_KEY;
const twilioApiSecret = process.env.TWILIO_API_SECRET;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(twilioAccountSid, authToken);
const twilio_client = new Twilio(twilioApiKey, twilioApiSecret, {
    accountSid: twilioAccountSid
});
const builder = require('xmlbuilder');

//const uuidv4 = require('uuid/v4');
const { v4: uuidv4 } = require('uuid');
const _ = require("lodash");

const paymentBufferTime = 360000   //miliscond 6 min


class AppointmentController {

    async getConsultantSlots(req, res) {
        try{
            const { consultantId, date, offset,currentTimeStamp } = req.body;

            let momentUtc = moment().utc().unix()

            const dateString = getFormatDate(date)
            const localTime = momentUtc+  (+offset)*60;
            const localTimeString = getLocalTimeString( localTime );

            let startDate = moment(date).format("MMMM DD, YYYY");

            let isEmergency = false;
            const consultant = await User.findOne({ isDeleted: false, isSuspended: false, _id: consultantId }).select('isEmergency');
            let serverOffset = new Date().getTimezoneOffset();
            let addSubtractOffset = offset.indexOf("+")  === 0 ? offset.replace("+","-"): offset.replace("-","+");

            let startUtc = new Date(new Date(date).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset * 60  *1000));
            let endUtc = new Date(new Date(date).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset* 60  *1000) + (24 * 60 * 60 * 1000));

            let startTime = moment().format("HH:mm");
            let sTimeFormatted = moment(startTime, "hh:mm: A").format('LT');
            let endTime = moment(sTimeFormatted, "hh:mm: A").add(15, 'minutes').format('LT');

            let now = new Date();
            now.setMinutes(now.getMinutes() + 15);
            now = new Date(now);

            var currentDate = moment(date).format("YYYY-MM-DD");
            //var iscurrentDate = moment(currentDate).isSame(moment(), 'day');
            var iscurrentDate = dateString ===localTimeString

            if(iscurrentDate) {
                if(consultant.isEmergency == true){
                    isEmergency = true;
                }
                
                //startUtc = new Date( new Date(startDate +' '+ startTime).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset * 60  *1000));
                startUtc = new Date( new Date(startDate +' '+ startTime).getTime())

                var result = [];
                var nwDate = startUtc;
                result.push(new Date(nwDate));

                if (!result.length) {
                    return res.badRequest({}, 'Can not find days between given dates, try again with another days.');
                }

                let fromDateMatch = new Date(nwDate);
                
                //new Date(new Date(nwDate).getTime() + (parseInt(offset) * 60 * 1000) + (serverOffset* 60  *1000));
                
                let toDateMatch = new Date(new Date(showDate(new Date(new Date(nwDate).getTime() + (parseInt(offset) * 60 * 1000) + (serverOffset* 60  *1000)), "YYYY-MM-DD")+ ' '+endTime).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset* 60  *1000));

                let fetchSlots = await Slot.find({
                    doctorId: consultantId, 
                    "startDate" : { $lte: new Date()  }  ,
                    "endDate" : { $gte: new Date() },

                    /*$or: [
                        {
                            slotDate: {
                                $lt: (toDateMatch)
                            },
                            endDate: {
                                $gt: (fromDateMatch)
                            }
                        }
                    ]*/
                });

                if (fetchSlots.length > 0) {
                    isEmergency = false;
                }



            }else{
                isEmergency = false;
            }


            console.dir([
                {
                    $match: {
                        doctorId: ObjectId(consultantId)
                    }
                },
                { $unwind: { path: "$slots" } },
                { $match : { 
                    "slots.utcTime": {
                        $gte: new Date(startUtc),
                        $lt: new Date(endUtc)
                    }
                } },
                { $group : { 
                    _id: "$_id" , 
                    slots : { $push : "$slots" },  
                    slotDuration : { $first : "$slotDuration" },  
                    slotDate : { $first : "$slotDate" },  
                    startDate : { $first : "$startDate" },  
                    endDate : { $first : "$endDate" },  
                    time : { $first : "$time" },  
                    weekDay : { $first : "$weekDay" },  
                    updated : { $first : "$updated" }, 
                    created : { $first : "$created" },
                    isEmergency : { $first : "$isEmergency" },
                }
                },
                {
                    $project: {
                        _id: 1,
                        slots: 1,
                        slotDuration : 1,
                        slotDate : 1,
                        startDate : 1,
                        endDate : 1,
                        time : 1,
                        weekDay : 1,
                        updated : 1,
                        created : 1,
                        isEmergency : 1,
                    },
                },
                {
                    $match: {
                        $or:[
                            {
                                isEmergency: false
                            },
                            {
                                isEmergency: { $exists: false, $ne: null },
                            }
                        ]
                    }
                },
                { $sort: { slotDate: 1 } }
            ],{depth:10})

            const slot = await Slot.aggregate([
                {
                    $match: {
                        doctorId: ObjectId(consultantId)
                    }
                },
                { $unwind: { path: "$slots" } },
                { $match : { 
                    "slots.utcTime": {
                        $gte:  new Date(startUtc),  //startUtc, //
                        $lt: new Date(endUtc)    //endUtc  //
                    }
                } },
                { $group : { 
                    _id: "$_id" , 
                    slots : { $push : "$slots" },  
                    slotDuration : { $first : "$slotDuration" },  
                    slotDate : { $first : "$slotDate" },  
                    startDate : { $first : "$startDate" },  
                    endDate : { $first : "$endDate" },  
                    time : { $first : "$time" },  
                    weekDay : { $first : "$weekDay" },  
                    updated : { $first : "$updated" }, 
                    created : { $first : "$created" },
                    isEmergency : { $first : "$isEmergency" },
                }
                },
                {
                    $project: {
                        _id: 1,
                        slots: 1,
                        slotDuration : 1,
                        slotDate : 1,
                        startDate : 1,
                        endDate : 1,
                        time : 1,
                        weekDay : 1,
                        updated : 1,
                        created : 1,
                        isEmergency : 1,
                    },
                },
                {
                    $match: {
                        $or:[
                            {
                                isEmergency: false
                            },
                            {
                                isEmergency: { $exists: false, $ne: null },
                            }
                        ]
                    }
                },
                { $sort: { slotDate: 1 } }
            ])
            console.log("aaa",{isEmergency,slot}); //return

            if (slot.length == 0) {
                //return res.notFound([{isEmergency}], req.__('Slots not found.'));
                if(isEmergency == true){
                    return res.success([{isEmergency}], req.__('Slots not found.'));
                }else{
                    return res.notFound([{isEmergency}], req.__('Slots not found.'));
                }
                
            }

            slot.forEach(x=>{
                x.isEmergency = isEmergency;
            });

            return res.success(slot, req.__('Slots found for ' + moment(date).format("YYYY-MM-DD")));
        }catch(err){
            console.log("err",err)
        }
    }

    async deleteDocument(req, res) {

        const { key } = req.body;
        const uploader = require('../../../../lib/uploader');

        const promises = [];

        promises.push(uploader.deleteObj(key));

        const url = await Promise.all(promises);
        if (!url[0]) {
            return res.badRequest({}, req.__('Something went wrong'));
        }

        return res.success({}, req.__('Deleted successfully'));

    }

    async bookAppointment(req, res, next) {
        try{
            console.dir(req.body,{depth:4});
            const { user } = req;
            const userId = user._id;
            let organizationId = req.user.organizationId ? req.user.organizationId : '';
            const adminSettings = await AdminSettings.findOne({});
            var { consultantId, appointmentDate, slotId, patientDetails, sessionMode, offset, isEmergency, startTime } = req.body;

            let serverOffset = new Date().getTimezoneOffset();

            let addSubtractOffset = offset.indexOf("+")  === 0 ? offset.replace("+","-"): offset.replace("-","+");

            let startUtc = new Date(new Date(appointmentDate).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset * 60  *1000));

            let endUtc = new Date(new Date(appointmentDate).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset* 60  *1000) + (24 * 60 * 60 * 1000));

            var beginningTime = moment(moment(appointmentDate).format("YYYY-MM-DD"));
            var currTime = moment().format("YYYY-MM-DD");

            /* if (beginningTime.isBefore(currTime) && !beginningTime.isSame(currTime)) {
                return res.badRequest({}, "You cannot select slot in past date.");
            } */

            if (consultantId == user._id) {
                return res.badRequest({}, "You are not able to choose your own slots.")
            }

            let slotSavedRecord = {};
            let slotSaved = false;

            if(isEmergency && isEmergency == true){
                let consultantDoc = await User.findOne({ isDeleted: false, isSuspended: false, _id: consultantId });
                if(consultantDoc.isEmergency){
                    slotId = [];
                    let startDate = moment(new Date()).format("MMMM DD, YYYY");
                    let endDate = moment(new Date()).format("MMMM DD, YYYY");

                    // let startTimeCurrent = moment().format("HH:mm");
                    // let sTimeCurFormatted = moment(startTimeCurrent, "hh:mm: A").format('LT');
                    // startTime = sTimeCurFormatted;

                    if( organizationId &&  organizationId !=''){
                        let currentTime = moment.unix(moment().utc().unix()+ (330*60) ).format("hh:mm A")
                        startTime = currentTime;
                    }
                    
                    let sTimeFormatted = moment(startTime, "hh:mm: A").format('LT');
                    let endTime = moment(sTimeFormatted, "hh:mm: A").add(15, 'minutes').format('LT');

                    let serverOffset = new Date().getTimezoneOffset();
                    let addSubtractOffset = offset.indexOf("+")  === 0 ? offset.replace("+","-"): offset.replace("-","+");

                    startUtc = new Date(new Date(startDate +' '+ startTime).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset * 60  *1000));

                    endUtc   = new Date(new Date(endDate+ ' '+endTime).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset* 60  *1000));

                    var start = moment(startDate).format("YYYY-MM-DD");
                    var end = moment(endDate);

                    var current = moment.utc()  //.add({"minutes":2});

                    if (moment(moment(startUtc).format("YYYY-MM-DD")).isSame(moment().format("YYYY-MM-DD"))) {

                        var beginningTime = moment(moment(startUtc, "HH:mm A").format('LT'), 'h:mm a');
                        var currTime = moment(moment(current).format('HH:mm A'), 'h:mm a');

                        if (beginningTime.isBefore(currTime) || beginningTime.isSame(currTime)) {
                            //return res.badRequest({}, 'Can not create slots in past time, try again with upcoming time.');
                        }
                    }

                    if (!moment(startUtc).isAfter(current) && !moment(moment(startUtc).format("YYYY-MM-DD")).isSame(moment(current).format("YYYY-MM-DD"))) {
                        return res.badRequest({}, 'Start date should be any future date.');
                    }

                    if (moment(endUtc).isBefore(current) && !moment(moment(endUtc).format("YYYY-MM-DD")).isSame(moment(current).format("YYYY-MM-DD"))) {
                        return res.badRequest({}, 'End date should be any future date.');
                    }

                    if (startTime.toUpperCase() === endTime.toUpperCase()) {
                        return res.badRequest({}, 'Can not create slots between given start and end time, Please choose another time.');
                    }

                    //Difference in number of days
                    var Difference_In_Time = endUtc.getTime() - startUtc.getTime();
                    var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
                    var duration = Difference_In_Days + 1;//moment.duration(endUtc.diff(startUtc)).asDays() + 1;
                    var result = [];

                    var nwDate = startUtc;
                    result.push(new Date(nwDate));

                    var localNowDate = new Date(new Date(startDate +' '+ startTime).getTime() + (serverOffset * 60  *1000));
                    // for (let i = 1; i <= parseInt(duration); i++) {
                    //     weekDays.map(day => {
                    //         if (localNowDate.getDay() === parseInt(day)) {
                    //             result.push(new Date(nwDate));
                    //         }
                    //     });

                    //     localNowDate.setDate(localNowDate.getDate() + 1 );
                    //     nwDate.setDate(nwDate.getDate() + 1 ); //  moment(nwDate).add(1, 'days');
                    // }

                    if (!result.length) {
                        return res.badRequest({}, 'Can not find days between given dates, try again with another days.');
                    }

                    var sTime = moment(startTime, "hh:mm: A");
                    // var sTimeFormatted = moment(startTime, "hh:mm: A").format('LT');
                    var eTimeFormatted = moment(endTime, "hh:mm: A").format('LT');
                    var eTime = moment(endTime, "hh:mm: A")
                    var time = sTimeFormatted + ' - ' + eTimeFormatted

                    var eDuration = moment.duration(eTime.diff(sTime))
                    var minutes = parseInt(eDuration.asMinutes());

                    // var totalSlots = minutes / 15;

                    // let canCreate = totalSlots % 1 === 0;

                    // if (!canCreate) {
                    //     return res.badRequest({}, 'cannot create 15 minutes slots with these time, please select another time')
                    // }
                    
                    let slots = [];
                    var slotObj = {};
                    slotObj = { 
                        bookingId: '', 
                        slotTime: sTimeFormatted + ' - ' + moment(sTimeFormatted, "hh:mm: A").add(15, 'minutes').format('LT'), 
                        isBooked: false 
                    }
                    slots.push(slotObj);
                    sTimeFormatted = moment(sTimeFormatted, "hh:mm: A").add(15, 'minutes').format('LT');

                    // for (let i = 1; i <= totalSlots; i++) {
                    //     slotObj = { 
                    //         bookingId: '', 
                    //         slotTime: sTimeFormatted + ' - ' + moment(sTimeFormatted, "hh:mm: A").add(15, 'minutes').format('LT'), 
                    //         isBooked: false 
                    //     }
                    //     slots.push(slotObj);
                    //     sTimeFormatted = moment(sTimeFormatted, "hh:mm: A").add(15, 'minutes').format('LT');
                    // }

                    if (slots.length == 0) {
                        return res.badRequest({}, 'Can not create slots between given start and end time, Please choose another time.');
                    }

                    var fetchSlots;
                    var slotSave;
                    var match = false;
                    let userId = user._id;

                    result.filter(async resDate => {
                        let fromDateMatch = new Date(resDate);
                        
                        new Date(new Date(resDate).getTime() + (parseInt(offset) * 60 * 1000) + (serverOffset* 60  *1000));

                        let toDateMatch = new Date(new Date(showDate(new Date(new Date(resDate).getTime() + (parseInt(offset) * 60 * 1000) + (serverOffset* 60  *1000)), "YYYY-MM-DD")+ ' '+endTime).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset* 60  *1000));
                        //let toDateMatch = new Date(new Date(endUtc).setDate(new Date(endUtc).getDate() + 1));

                        fetchSlots = await Slot.find({
                            doctorId: consultantId, 
                            $or: [
                                {
                                    slotDate: {
                                        $lt: (toDateMatch)
                                    },
                                    endDate: {
                                        $gt: (fromDateMatch)
                                    }
                                }
                            ]
                        });

                        if (fetchSlots.length > 0) {
                            //match = true;
                            fetchSlots.filter(slt => {

                                if (moment(slt.slotDate).format("YYYY-MM-DD 00:00:00") === moment(resDate).format("YYYY-MM-DD 00:00:00")) {
                                    var startReqTime = moment(moment.utc(fromDateMatch).format("LT"), "HH:mm")
                                    var endReqTime = moment(moment.utc(toDateMatch).format("LT"), "HH:mm")

                                    var startSavedTime = moment(moment.utc(slt.startDate).format("LT"), "HH:mm")
                                    var endSavedTime = moment(moment.utc(slt.endDate).format("LT"), "HH:mm")

                                    if (
                                        startReqTime.isBetween(startSavedTime, endSavedTime) || 
                                        endReqTime.isBetween(startSavedTime, endSavedTime) || 
                                        startSavedTime.isBetween(startReqTime, endReqTime) || 
                                        endSavedTime.isBetween(startReqTime, endReqTime) || 
                                        startReqTime.toString() == startSavedTime.toString() || 
                                        startReqTime.toString() == endSavedTime.toString() || 
                                        endReqTime.toString() == startSavedTime.toString() || 
                                        endReqTime.toString() == endSavedTime.toString()
                                    ) {
                                        match = true;
                                    }
                                }
                            });
                            
                        }
                        else {
                            console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
                            if(slotSaved == false){console.log("BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB")
                                slotSaved = true;

                                let utcTimeFormat = resDate;

                                slots.map(slotItem => {
                                    slotItem.utcTime = moment(utcTimeFormat);
                                    utcTimeFormat = moment(utcTimeFormat).add(15, 'minutes');
                                })
                                slotSave = new Slot({
                                    doctorId: consultantId,
                                    slotDate: resDate,
                                    startDate: fromDateMatch,
                                    endDate: toDateMatch,
                                    time: time,
                                    weekDay: moment(resDate).format('dddd'),
                                    slots,
                                    isEmergency
                                });
                                slotSavedRecord = await slotSave.save();
                                slotId.push(slotSavedRecord.slots[0]._id);

                                setTimeout( async function(){
                                    let slotDetails = await Slot.findOne({_id: slotSavedRecord._id}).lean();
                                    if( slotDetails && slotDetails.slots && slotDetails.slots[0] && slotDetails.slots[0].paymentStatus=='PENDING'){
                                        try{
                                            await Slot.deleteOne({
                                                _id: slotDetails._id
                                            })
                                        }catch(err){
                                            console.log("err",err)
                                        }
                                    }
                                },paymentBufferTime )

                                let appointmentBooking = await createAppointmentBooking({offset,consultantId, appointmentDate, slotId, patientDetails, sessionMode, startUtc, endUtc, adminSettings, userId, organizationId, isEmergency});
                                
                                    let agendaData = {
                                        "type": 'consultantFeeUpdate',
                                        "appointmentId": appointmentBooking.appointmentId.toString(),
                                        "data": { appointmentId: appointmentBooking.appointmentId },
                                    }
                                    let nextDate = moment().add({ "minutes": 2 });
                                    let nextDateTimeStamp = nextDate.valueOf();
                                    let cat = new Date(parseInt(nextDateTimeStamp));
                                    agenda.schedule(cat, 'consultantFeeUpdate',agendaData );
                                return res.success({ slots: appointmentBooking.slots, appointmentId: appointmentBooking.appointmentId }, appointmentBooking.MSG);
                            }
                        }

                        if (match && match == true) {
                            return res.badRequest({}, "Slots already exist for the given date and time, Please add another or update existing.")
                        }
                        else {
                            console.log('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
                            if(slotSaved == false){
                                console.log('yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy')
                                slotSaved = true;
                                let utcNewTimeFormat = resDate;

                                slots.map(slotItem => {
                                    slotItem.utcTime = moment(utcNewTimeFormat);
                                    utcNewTimeFormat = moment(utcNewTimeFormat).add(15, 'minutes');
                                });
                                slotSave = new Slot({
                                    doctorId: consultantId,
                                    slotDate: resDate,
                                    startDate: fromDateMatch,
                                    endDate: (toDateMatch),
                                    time: time,
                                    weekDay: moment(resDate).format('dddd'),
                                    slots,
                                    isEmergency
                                });

                                slotSavedRecord = await slotSave.save();
                                slotId.push(slotSavedRecord.slots[0]._id);

                                setTimeout( async function(){
                                
                                    let slotDetails = await Slot.findOne({_id: slotSavedRecord._id}).lean();
                                    if( slotDetails && slotDetails.slots && slotDetails.slots[0] && slotDetails.slots[0].paymentStatus=='PENDING'){
                                        try{
                                            await Slot.deleteOne({
                                                _id: slotDetails._id
                                            })
                                        }catch(err){
                                            console.log("err",err)
                                        }
                                    }
                                },paymentBufferTime )

                                let appointmentBooking = await createAppointmentBooking({ offset, consultantId, appointmentDate, slotId, patientDetails, sessionMode, startUtc, endUtc, adminSettings, userId, organizationId, isEmergency});

                                let agendaData = {
                                    "type": 'consultantFeeUpdate',
                                    "appointmentId": appointmentBooking.appointmentId.toString(),
                                    "data": { appointmentId: appointmentBooking.appointmentId },
                                }
                                let nextDate = moment().add({ "minutes": 2 });
                                let nextDateTimeStamp = nextDate.valueOf();
                                let cat = new Date(parseInt(nextDateTimeStamp));
                                agenda.schedule(cat, 'consultantFeeUpdate',agendaData );

                                return res.success({ slots: appointmentBooking.slots, appointmentId: appointmentBooking.appointmentId }, appointmentBooking.MSG);
                            }
                        }
                    });
                }else{
                    let resMsg = `You can't create slot, because Dr ${consultantDoc.fullName} is on off mode for emergency.`;
                    return res.badRequest({}, resMsg);
                }
            }
            else{
                let appointmentBooking = await createAppointmentBooking({offset,consultantId, appointmentDate, slotId, patientDetails, sessionMode, startUtc, endUtc, adminSettings, userId, organizationId, isEmergency});

                return res.success({ slots: appointmentBooking.slots, appointmentId: appointmentBooking.appointmentId }, appointmentBooking.MSG);
            }     
        }catch(err){
            console.log("err",err)
            return next(err)
        }
    }

    async appointmentList(req, res) {
        const { user } = req;
        const { type, pageIndex = 1, pageLimit = 5 } = req.query;

        if (!user) {
            return res.unauthorized('', req.__('USER_NOT_FOUND'));
        }
        const matchCond = {
            isDeleted: false,
            //isSuspended: false,
            $or: [{
                doctor: ObjectId(user._id)
            },
            {
                consultant: ObjectId(user._id)
            }],
            //paymentStatus:{$ne:'PENDING'}
        };

        if( req.user.organizationId ){
            matchCond = {
                "organizationId": req.user.organizationId ,
                ...matchCond
            }
        }else{
            matchCond = {
                "organizationId": {$exists: false}  ,
                ...matchCond
            }
        }

        let filterCond = {};
        let sortCond = { slotTime : 1 };
        if (type) {
            const startOfDay = utcDateTime();
            if (type === 'ACTIVE') {
                filterCond.$or = [
                    {
                        'slotTime': {
                            $gte: startOfDay,
                        },
                        isCanceled: false
                    }
                ]

                sortCond = { slotTime : 1 }
            }

            if (type === 'PAST') {
                filterCond.$or = [
                    {
                        'slotTime': {
                            $lte: startOfDay,
                        },
                    },
                    { isCanceled: true }
                ]
                sortCond = { slotTime : -1 }
            }
        }

        let appointmentList = await Appointment.aggregate([
            {
                '$match': matchCond
            },
            {
                '$project': {
                    doctor: 1,
                    consultant: 1,
                    bookingDetails: 1,
                    patient: 1,
                    isCanceled: 1,
                    appointment: {
                        '$switch': {
                            branches: [
                                { case: { '$eq': ['$doctor', ObjectId(user._id)] }, then: '$consultant' },
                                { case: { '$eq': ['$consultant', ObjectId(user._id)] }, then: '$doctor' }
                            ]
                        }
                    },
                    created:1
                }
            },
            {
                '$lookup': {
                    from: 'users', let: { appointment: '$appointment', doctorId: '$doctor', consultantId: '$consultant' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$_id', '$$appointment'] }
                        }
                    }, {
                        '$lookup': {
                            from: 'specialities', let: { speciality: '$specality' },
                            pipeline: [{ '$match': { '$expr': { '$eq': ['$_id', '$$speciality'] } } },
                            { '$project': { _id: 0, specialityName: 1, specialityIcon: 1 } }], as: 'speciality'
                        }
                    },
                    {
                        '$project': {
                            avatar: 1,
                            fullName: 1,
                            whatsapp: '$phone',
                            speciality: { '$arrayElemAt': ['$speciality', 0] },
                            asA: { '$cond': { if: { '$eq': ['$$consultantId', ObjectId(user._id)] }, then: 'Consultant', else: 'Doctor' } }
                        }
                    }], as: 'appointment'
                }
            },
            { '$unwind': { path: '$appointment', preserveNullAndEmptyArrays: true } },
            {
                '$project': {
                    appointment: 1,
                    bookingDetails: 1,
                    patient: 1,
                    isCanceled: 1,
                    lastSlot: { $arrayElemAt: ["$bookingDetails.slots", -1] },
                    created:1
                }
            },
            { $addFields: { slotTime: { $add: ["$lastSlot.utcTime", 15 * 60 * 1000] } } },
            { $match: filterCond },
            {
                '$project': {
                    appointment: 1,
                    bookingDetails: 1,
                    patient: 1,
                    isCanceled: 1,
                    created:1,
                    slotTime:1
                }
            },
            {
                "$addFields": {
                    "dataType": "appointment"
                }
            },
            { $sort : sortCond },
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

        //let appointmentData = appointmentList.length ? appointmentList[0].items : [];

        return res.status(200).send({
            success: true,
            data: appointmentList.length ? appointmentList[0].items : [],
            message: 'Appointment list get successfully.',
            totalRecords: appointmentList.length ? appointmentList[0].count : 0
        });
       
        
    }

    async appointmentListV2(req, res) {
        const { user } = req;
        const { type, pageIndex = 1, pageLimit = 5 } = req.query;

        if (!user) {
            return res.unauthorized('', req.__('USER_NOT_FOUND'));
        }
        const matchCond = {
            isDeleted: false,
            paymentStatus: 'SUCCESS',
            //isSuspended: false,
            $or: [{
                doctor: ObjectId(user._id)
            },
            {
                consultant: ObjectId(user._id)
            }],
            //paymentStatus:{$ne:'PENDING'}
        };

        let filterCond = {};
        let sortCond = { slotTime : 1 };
        if (type) {
            const startOfDay = utcDateTime();
            //const startOfDay = moment().add({hours:1}).toISOString()
            if (type === 'ACTIVE') {
                filterCond.$or = [
                    {
                        'slotTime': {
                            $gte: startOfDay,
                        },
                        isCanceled: false
                    }
                ]

                sortCond = { slotTime : 1 }
            }

            if (type === 'PAST') {
                filterCond.$or = [
                    {
                        'slotTime': {
                            $lte: startOfDay,
                        },
                    },
                    { isCanceled: true }
                ]
                sortCond = { slotTime : -1 }
            }
        }

        let appointmentList = await Appointment.aggregate([
            {
                '$match': matchCond
            },
            {
                '$project': {
                    doctor: 1,
                    consultant: 1,
                    bookingDetails: 1,
                    patient: 1,
                    isCanceled: 1,
                    appointment: {
                        '$switch': {
                            branches: [
                                { case: { '$eq': ['$doctor', ObjectId(user._id)] }, then: '$consultant' },
                                { case: { '$eq': ['$consultant', ObjectId(user._id)] }, then: '$doctor' }
                            ]
                        }
                    },
                    created:1,
                    isEmergency: 1
                }
            },
            {
                '$lookup': {
                    from: 'users', let: { appointment: '$appointment', doctorId: '$doctor', consultantId: '$consultant' },
                    pipeline: [{
                        '$match': {
                            '$expr': { '$eq': ['$_id', '$$appointment'] }
                        }
                    }, {
                        '$lookup': {
                            from: 'specialities', let: { speciality: '$specality' },
                            pipeline: [{ '$match': { '$expr': { '$eq': ['$_id', '$$speciality'] } } },
                            { '$project': { _id: 0, specialityName: 1, specialityIcon: 1 } }], as: 'speciality'
                        }
                    },
                    {
                        '$project': {
                            avatar: 1,
                            fullName: 1,
                            whatsapp: '$phone',
                            speciality: { '$arrayElemAt': ['$speciality', 0] },
                            asA: { '$cond': { if: { '$eq': ['$$consultantId', ObjectId(user._id)] }, then: 'Consultant', else: 'Doctor' } }
                        }
                    }], as: 'appointment'
                }
            },
            { '$unwind': { path: '$appointment', preserveNullAndEmptyArrays: true } },
            {
                '$project': {
                    appointment: 1,
                    bookingDetails: 1,
                    patient: 1,
                    isCanceled: 1,
                    lastSlot: { $arrayElemAt: ["$bookingDetails.slots", -1] },
                    created:1,
                    isEmergency: 1
                }
            },
            { $addFields: { slotTime: { $add: ["$lastSlot.utcTime", 15 * 60 * 1000] } } },
            { $match: filterCond },
            {
                '$project': {
                    appointment: 1,
                    bookingDetails: 1,
                    patient: 1,
                    isCanceled: 1,
                    created:1,
                    slotTime:1,
                    isEmergency: 1
                }
            },
            {
                "$addFields": {
                    "dataType": "appointment"
                }
            },
            { $sort : sortCond },
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

        let webinars = await getWebinar({
            user,type, pageIndex , pageLimit 
        });
        let appointmentData = appointmentList.length ? appointmentList[0].items : [];

        //let appWeb = [ ...webinars,...appointmentData ]
        //appWeb = _.sortBy(appWeb, (x)=> {return new Date(x.slotTime);}).reverse();

        let nextPage = false;
        /*if( appointmentData.length>0 || webinars.length>0 ){
            nextPage = true
        }*/

        if( appointmentData.length == pageLimit || webinars.length == pageLimit ){
            nextPage = true
        }

        return res.success({
            webinars,
            "appointments": appointmentData,
            totalRecords: appointmentList.length ? appointmentList[0].count : 0,
            nextPage
        }, "Appointment list get successfully.");
        
    }
    
    async appointmentDetail(req, res) {
        try{
            const { user } = req;
            const { id } = req.params;

            if (!user) {
                return res.unauthorized('', req.__('USER_NOT_FOUND'));
            }
            const userData          = await User.findOne({ _id: ObjectId(user._id) } ,{currency : 1 }).populate({ path: 'countryId', select: '_id currency' }).lean();
            const adminSettings     = await AdminSettings.findOne({});
            let userCurrency        = (userData && userData.countryId && userData.countryId.currency) ? userData.countryId.currency : "";
            const matchCond = {
                isDeleted: false,
                _id: ObjectId(id)
            };

            let isExist = await Appointment.countDocuments({
                isDeleted: false,
                _id: ObjectId(id),
                $or: [{
                    doctor: ObjectId(user._id)
                },
                {
                    consultant: ObjectId(user._id)
                }]
            });

            if (!isExist) {
                return res.unauthorized('', req.__('APPOINTMENT_NOT_FOUND'));
            }

            let getDetail = await Appointment.aggregate([
                {
                    '$match': matchCond
                },
                {
                    '$project': {
                        appointmentId: 1,
                        paymentStatus: 1,
                        doctor: 1,
                        paymentId: 1,
                        paymentMethod: 1,
                        orderId: 1,
                        isCanceled: 1,
                        consultant: 1,
                        bookingDetails: 1,
                        patient: 1,
                        countryName:1,
                        consultantFee:1,
                        isWallet: 1,
                        walletAmount: 1,
                        isWalletUpdate: 1,
                        appointment: {
                            '$switch': {
                                branches: [
                                    { case: { '$eq': ['$doctor', ObjectId(user._id)] }, then: '$consultant' },
                                    { case: { '$eq': ['$consultant', ObjectId(user._id)] }, then: '$doctor' }
                                ]
                            }
                        },
                        isEmergency: 1
                    }
                },
                {
                    '$lookup': {
                        from: 'users', let: { appointment: '$appointment', doctorId: '$doctor', consultantId: '$consultant' },
                        pipeline: [{
                            '$match': {
                                '$expr': { '$eq': ['$_id', '$$appointment'] }
                            }
                        }, {
                            '$lookup': {
                                from: 'specialities', let: { speciality: '$specality' },
                                pipeline: [{ '$match': { '$expr': { '$eq': ['$_id', '$$speciality'] } } },
                                { '$project': { _id: 0, specialityName: 1, specialityIcon: 1 } }],
                                as: 'specality'
                            }
                        },
                        {
                            '$project': {
                                avatar: 1, fullName: 1,
                                speciality: { '$arrayElemAt': ['$specality', 0] },
                                city: 1,
                                whatsapp: '$phone',
                                asA: { '$cond': { if: { '$eq': ['$$consultantId', ObjectId(user._id)] }, then: 'Consultant', else: 'Doctor' } }
                            }
                        }], as: 'appointment'
                    }
                },
                { '$unwind': { path: '$appointment', preserveNullAndEmptyArrays: true } },
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
                {
                    '$project': {
                        appointment: 1,
                        bookingDetails: 1,
                        patient: 1,
                        countryName:1,
                        isCanceled: 1,
                        paymentAt: '$payment.created',
                        signature: '$payment.signature',
                        appointmentId: 1,
                        consultantFee:1,
                        paymentStatus: 1,
                        orderId: 1,
                        refundId: '$payment.refundId',
                        paymentId: '$payment.paymentId',
                        isWallet: 1,
                        walletAmount: 1,
                        isWalletUpdate: 1,
                        paymentMethod: 1,
                        isEmergency: 1
                    }
                },
            ])

            if (!getDetail.length) {
                return res.warn('', req.__('APPOINTMENT_DETAIL_NOT_FOUND'));
                
            }

            if (!req.user.organizationId) {
                try {
                    let payment = await axios({
                        method: 'get',
                        url: `https://api.razorpay.com/v1/orders/${getDetail[0].orderId}/payments`,
                        auth: {
                            username: process.env.RAZORPAY_KEY_ID,
                            password: process.env.RAZORPAY_KEY_SECRET
                        },
                        withCredentials: true,
                    });

                    if (payment) {
                        getDetail[0].payment = payment.data;

                        getDetail[0]['transactionCharges'] = 0
                        getDetail[0]['adminFlatFee'] = 0
                        getDetail[0]['transactionChargesPercent'] = 0

                        if(getDetail[0].bookingDetails.adminFlatFee){
                            getDetail[0]['transactionCharges'] = (getDetail[0].bookingDetails.totalPayable / 100) - ( getDetail[0]['consultantFee'] + (getDetail[0].bookingDetails.adminFlatFee / 100))
                            getDetail[0]['transactionCharges'] = +getDetail[0]['transactionCharges'].toFixed(2);
                            getDetail[0]['transactionChargesPercent'] = (getDetail[0]['transactionCharges']*100)/(getDetail[0].bookingDetails.totalPayable /100)
                            getDetail[0]['transactionChargesPercent'] = +getDetail[0]['transactionChargesPercent'].toFixed(2)
                        }
                    }
                    if (getDetail[0].paymentId && getDetail[0].refundId) {
                        let refund = await axios({
                            method: 'get',
                            url: `https://api.razorpay.com/v1/payments/${getDetail[0].paymentId}/refunds/${getDetail[0].refundId}`,
                            auth: {
                                username: process.env.RAZORPAY_KEY_ID,
                                password: process.env.RAZORPAY_KEY_SECRET
                            },
                            withCredentials: true,
                        });
                        getDetail[0].refund = refund.data;
                    }
                }
                catch(err){
                    return res.warn('', 'Razor pay error occurred.');
                }
            }

            let bookingAmount       = getDetail[0].bookingDetails.amount;
            let totalPayable        = getDetail[0].bookingDetails.totalPayable;
            let transactionCharges  = getDetail[0].transactionCharges;
            let adminFlatFee        = getDetail[0].bookingDetails.adminFlatFee;
            let gst                 = getDetail[0].bookingDetails.gst;
            let consultantFee       = getDetail[0].consultantFee;

            getDetail[0].bookingDetails.amount          = (userCurrency && userCurrency == "INR") ? Number((bookingAmount / 100))         : Number(((bookingAmount / 100) / adminSettings.conversionRate).toFixed(2));
            getDetail[0].transactionCharges             = (userCurrency && userCurrency == "INR") ? Number((transactionCharges))          : Number(((transactionCharges) / adminSettings.conversionRate).toFixed(2));
            getDetail[0].bookingDetails.adminFlatFee    = (userCurrency && userCurrency == "INR") ? Number((adminFlatFee / 100))          : Number(((adminFlatFee / 100) / adminSettings.conversionRate).toFixed(2));
            getDetail[0].bookingDetails.gst             = (userCurrency && userCurrency == "INR") ? Number((gst / 100))                   : Number(((gst / 100) / adminSettings.conversionRate).toFixed(2)) ;
            getDetail[0].bookingDetails.totalPayable    = (userCurrency && userCurrency == "INR") ? Number((totalPayable / 100))          : Number((getDetail[0].bookingDetails.amount + getDetail[0].bookingDetails.gst).toFixed(2));
            getDetail[0].consultantFee                  = (userCurrency && userCurrency == "INR") ? Number((consultantFee))               : Number(((consultantFee) / adminSettings.conversionRate).toFixed(2));

            getDetail[0].paymentMethod = ""
            if( getDetail && getDetail[0] && getDetail[0]?.payment?.items[0]?.method ){
                getDetail[0].paymentMethod = `${getDetail[0]?.payment?.items[0]?.method}`
            }

            if( getDetail && getDetail[0] && getDetail[0]?.isWallet && getDetail[0]?.isWallet==true ){
                getDetail[0].paymentMethod = `${getDetail[0].paymentMethod} Telemed Wallet`
            }
            let paymentRequest = await PaymentRequest.findOne({
                appointmentId: ObjectId(id)
            }).lean()
            
            if( paymentRequest?._id && !getDetail[0].paymentId  ){
                getDetail[0].paymentId = paymentRequest._id
                getDetail[0].paymentAt =  moment(paymentRequest.created).unix() 
            }
            
            /*if(paymentRequest?.created && !isNaN( paymentRequest.created ) ){
                getDetail[0].paymentAt =  moment(paymentRequest.created).unix() 
            }*/

            
            if(
                getDetail[0]?.paymentAt && isNaN( getDetail[0].paymentAt.toString() ) 
            ){
                getDetail[0].paymentAt =  moment(getDetail[0].paymentAt).unix() 
            }

            if (getDetail && getDetail[0]._id && getDetail[0]?.countryName) {
                let patientDocuments
                try{
                    patientDocuments = await patientDBConnections[getDetail[0]?.countryName].getPatientData({ appointmentId: new mongoObjectId(getDetail[0]._id)});
                    
                    if(patientDocuments && patientDocuments.appointmentId){
                        delete patientDocuments.appointmentId;
                    }
                    if(patientDocuments){
                        getDetail[0].patient = {...getDetail[0].patient, ...patientDocuments};    
                    }
                }catch(err){
                    console.log("err",err)
                }
            }
            
            return res.success(getDetail, req.__('APPOINTMENT_DETAIL'));
        }catch(err){
            console.log("err" , err)
        }

    }

    async addDoc(req, res) {
        const { user } = req;
        const { id, fileName, documentName, type } = req.body;
        
        if (!user) {
            return res.unauthorized('', req.__('USER_NOT_FOUND'));
        }
        const appointment = await Appointment.findOne({ _id: id });
        if (!appointment) {
            res.warn('', req.__('APPOINTMENT_NOT_FOUND'));
        }

        
        if (appointment?.countryName && !!patientDBConnections[appointment?.countryName]) {
            const docTypes = {
                'PRESCRIPTION': 'prescriptions',
                'DOCVOICENOTE': 'doctorVoiceNote',
                'CONVOICENOTE': 'consultantVoiceNote',
                'REPORT': 'documents'
            }

            const docTypesResponse = {
                'PRESCRIPTION': req.__('PRESCRIPTIONS_ADDED'),
                'DOCVOICENOTE': req.__('VOICE_NOTE_ADDED'),
                'CONVOICENOTE': req.__('VOICE_NOTE_ADDED'),
                'REPORT': req.__('REPORT_ADDED')
            }

            let patientData = await patientDBConnections[appointment.countryName].getPatientData({ appointmentId: new mongoObjectId(id) });
            if (!patientData[docTypes[type]]) {
                patientData[docTypes[type]] = [];
            }
            patientData[docTypes[type]].push({
                _id: new mongoObjectId(),
                fileName,
                documentName,
                date: utcDateTime()
            })

            
            const encryptData = await patientDBConnections[appointment.countryName].encryptData({documents: patientData[docTypes[type]]});
            await patientDBConnections[appointment.countryName].updatePatientData({ appointmentId: new mongoObjectId(id) }, {
                $set: {[docTypes[type]]: encryptData.documents}
            })

            
            return res.success(patientData[docTypes[type]].reverse()[0], docTypesResponse[type]);

        }

        if (type === "REPORT") {
            await Appointment.updateOne({ _id: ObjectId(id) }, {
                $push: {
                    'patient.documents': {
                        fileName,
                        documentName,
                        date: utcDateTime()
                    }
                }
            }); 

            let getReport = await Appointment.aggregate([
                { $match: { _id: ObjectId(id) } },
                {
                    $project: {
                        _id: 0,
                        doc: '$patient.documents'
                    }
                },
                { '$unwind': { path: '$doc', preserveNullAndEmptyArrays: true } },
                { "$sort": { "doc._id": -1 } },
            ]);
            return res.success(getReport.length ? getReport[0].doc : {}, req.__('REPORT_ADDED'));
            
            
        } else if (type === "CONVOICENOTE") {
            await Appointment.updateOne({ _id: ObjectId(id) }, {
                $push: {
                    'patient.consultantVoiceNote': {
                        fileName,
                        documentName,
                        date: utcDateTime()
                    }
                }
            });

            let getVoiceNote = await Appointment.aggregate([
                { $match: { _id: ObjectId(id) } },
                {
                    $project: {
                        _id: 0,
                        doc: '$patient.consultantVoiceNote'
                    }
                },
                { '$unwind': { path: '$doc', preserveNullAndEmptyArrays: true } },
                { "$sort": { "doc._id": -1 } },
            ]);
            return res.success(getVoiceNote.length ? getVoiceNote[0].doc : {}, req.__('VOICE_NOTE_ADDED'));
            
        } else if (type === "DOCVOICENOTE") {
            await Appointment.updateOne({ _id: ObjectId(id) }, {
                $push: {
                    'patient.doctorVoiceNote': {
                        fileName,
                        documentName,
                        date: utcDateTime()
                    }
                }
            });
            let getVoiceNote = await Appointment.aggregate([
                { $match: { _id: ObjectId(id) } },
                {
                    $project: {
                        _id: 0,
                        doc: '$patient.doctorVoiceNote'
                    }
                },
                { '$unwind': { path: '$doc', preserveNullAndEmptyArrays: true } },
                { "$sort": { "doc._id": -1 } },
            ]);
            return res.success(getVoiceNote.length ? getVoiceNote[0].doc : {}, req.__('VOICE_NOTE_ADDED'));
            
        } else {
            await Appointment.updateOne({ _id: ObjectId(id) }, {
                $push: {
                    'patient.prescriptions': {
                        fileName,
                        documentName,
                        date: utcDateTime()
                    }
                }
            });
            let getPrescription = await Appointment.aggregate([
                { $match: { _id: ObjectId(id) } },
                {
                    $project: {
                        _id: 0,
                        doc: '$patient.prescriptions'
                    }
                },
                { '$unwind': { path: '$doc', preserveNullAndEmptyArrays: true } },
                { "$sort": { "doc._id": -1 } },
            ]);
            return res.success(getPrescription.length ? getPrescription[0].doc : {}, req.__('PRESCRIPTIONS_ADDED'));
            
        }
    }

    async cancelAppointment(req, res) {
        const { user } = req;
        const { id } = req.params;

        if (!user) {
            return res.unauthorized('', req.__('USER_NOT_FOUND'));
        }
        const appointment = await Appointment.aggregate([
            { $match: { _id: ObjectId(id) } },
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
                    isCanceled: 1,
                    slotDate: '$bookingDetails.date',
                    firstSlot: { $arrayElemAt: ["$firstSlot.slotTime", 0] },
                    lastSlot: { $arrayElemAt: ["$lastSlot.slotTime", 0] },
                    firstUtcTime: { $arrayElemAt: ["$firstSlot.utcTime", 0] },
                    lastUtcTime: { $arrayElemAt: ["$lastSlot.utcTime", 0] }
                }
            },
            {
                $project: {
                    isCanceled: 1,
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
                    isCanceled: 1,
                    utcTime: 1,
                    slotDate: 1,
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
            },
        ]);
        if (!appointment.length) {
            return res.warn({}, req.__('APPOINTMENT_NOT_FOUND'));
        }
        if (appointment[0].isCanceled) {
            return res.warn({}, 'Appointment already canceled.');
        }
        if (utcDateTime(utcDateTime(appointment[0].utcTime).getTime() - (15 * 60 * 1000)).getTime() < utcDateTime().getTime()) {
            return res.warn({}, 'Appointment cancellation time exceeded.');
        }
        let updateAppointment = await Appointment.findOneAndUpdate({ _id: ObjectId(id) }, {
            isCanceled: true
        }).populate({
            path: 'consultant',
            select: '_id fullName deviceToken pushNotificationAllowed appointmentReminder'
        }).populate({
            path: 'doctor',
            select: '_id fullName deviceToken pushNotificationAllowed appointmentReminder'
        }).populate({
            path: 'paymentId',
            select: 'paymentId'
        });


        let failedSlots = updateAppointment.bookingDetails.slots.map((e) => {
            return e._id;
        });

        async function processArray(slots) {
            for (let ids of slots) {
                await Slot.updateOne({ 'slots._id': ids }, { $set: { "slots.$.isBooked": false } });
            }
        }
        processArray(failedSlots);
        let fcmData = {
            appointment: appointment[0]._id,
            type: 'APPOINTMENT_STATUS',
            utcTime: appointment[0].utcTime
        }
        const notification = [
            {
                type: 'APPOINTMENT_STATUS',
                appointment: appointment[0]._id,
                title: 'Appointment canceled!',
                //message: `Appointment has been canceled for ${showDate(appointment[0].slotDate, 'MMM DD YYYY')} at ${appointment[0].slot.from}- ${appointment[0].slot.to} with Dr ${updateAppointment.consultant.fullName}.`,
                message:`Appointment has been cancelled with Dr ${updateAppointment.consultant.fullName}.`,
                user: updateAppointment.doctor._id,
            },
            {
                type: 'APPOINTMENT_STATUS',
                appointment: appointment[0]._id,
                title: 'Appointment canceled!',
                //message: `Appointment has been canceled for ${showDate(appointment[0].slotDate, 'MMM DD YYYY')} at ${appointment[0].slot.from}- ${appointment[0].slot.to} with Dr ${updateAppointment.doctor.fullName}.`,
                message:`Appointment has been cancelled with Dr ${updateAppointment.doctor.fullName}.`,
                user: updateAppointment.consultant._id,
            },
        ];
        if (updateAppointment.doctor.pushNotificationAllowed && updateAppointment.doctor.appointmentReminder) {
            sendFCMPush(updateAppointment.doctor.deviceToken, notification[0].title, notification[0].message, fcmData);
        }
        if (updateAppointment.consultant.pushNotificationAllowed && updateAppointment.consultant.appointmentReminder) {
            sendFCMPush(updateAppointment.consultant.deviceToken, notification[1].title, notification[1].message, fcmData);
        }
        notification.length && await Notification.insertMany(notification);

        if (updateAppointment.paymentId && updateAppointment.paymentId.paymentId) {
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
                    })
                }
            }
            catch(err){
                console.log("get refund", err);
            }
        }
        return res.success({}, req.__('APPOINTMENT_CANCELED'));
    }

    async deletePrescription(req, res) {
        const { user } = req;

        const { key, id, docId, type } = req.body;

        if (!user) {
            return res.unauthorized('', req.__('USER_NOT_FOUND'));
        }

        const appointment = await Appointment.findOne({ _id: id });

        if (!appointment) {
            return res.warn('', req.__('APPOINTMENT_NOT_FOUND'));
        }

        const uploader = require('../../../../lib/uploader');
        const promises = [];
        promises.push(uploader.deleteObj(key));
        const url = await Promise.all(promises);
        if (!url[0]) {
            return res.badRequest({}, req.__('Something went wrong'));
        }

        if (appointment?.countryName && !!patientDBConnections[appointment?.countryName]) {

            const docTypes = {
                'PRESCRIPTION': 'prescriptions',
                'DOCVOICENOTE': 'doctorVoiceNote',
                'CONVOICENOTE': 'consultantVoiceNote',
                'REPORT': 'documents'
            }

            let patientData = await patientDBConnections[appointment.countryName].getPatientData({ appointmentId: new mongoObjectId(id) });

            let patientDocumentArray = patientData[docTypes[type]];
            
            let documentArray = patientDocumentArray.filter((item) => {
                return item._id != docId
            });

            const encryptData = await patientDBConnections[appointment.countryName].encryptData({documents: documentArray});
            await patientDBConnections[appointment.countryName].updatePatientData({ appointmentId: new mongoObjectId(id) }, {
                $set: {[docTypes[type]]: encryptData.documents}
            })


            return res.success({}, req.__('Deleted successfully'));
        }
        if (type && type === 'PRESCRIPTION') {
            await Appointment.updateOne({ _id: ObjectId(id) }, {
                $pull: { 'patient.prescriptions': { _id: ObjectId(docId) } }
            });
            return res.success({}, req.__('Deleted successfully'));

        } else if(type && type === 'DOCVOICENOTE'){
            await Appointment.updateOne({ _id: ObjectId(id) }, {
                $pull: { 'patient.doctorVoiceNote': { _id: ObjectId(docId) } }
            });
            return res.success({}, req.__('Deleted successfully'));
        }else if(type && type === 'CONVOICENOTE'){
            await Appointment.updateOne({ _id: ObjectId(id) }, {
                $pull: { 'patient.consultantVoiceNote': { _id: ObjectId(docId) } }
            });
            return res.success({}, req.__('Deleted successfully'));
        }else {
            await Appointment.updateOne({ _id: ObjectId(id) }, {
                $pull: { 'patient.documents': { _id: ObjectId(docId) } }
            });
            return res.success({}, req.__('Deleted successfully'));
        }

    }

    async appointmentPaymentToken(req, res, next) {
        try {
            const { user } = req;

            let { id, isWallet } = req.query;

            if (!user) {
                return res.unauthorized('', req.__('USER_NOT_FOUND'));
            }
            const orderData = await Appointment.countDocuments({
                _id: id,
                paymentStatus: "PENDING"
            });
            if (!orderData) {
                return res.success({}, req.__('ORDER_TOKEN'));
            }
            const token = generateToken({ id: id });

            if (!(isWallet && isWallet == 'yes')) {
                isWallet = 'no'
            }
            return res.success({ token: `payments/hold-charge/${token}/${isWallet}` }, req.__('ORDER_TOKEN'));
        } catch (err) {
            console.log("appointment payment token",err)
        }
    }

    async earningReport(req, res, next) {
        try{
            const { user } = req;
            const { type, perPage, page } = req.query;
            const limit = parseInt(perPage);
            let skip = (page - 1) * limit;
            if (!user) {
                return res.unauthorized('', req.__('USER_NOT_FOUND'));
            }
            
            const adminSettings = await AdminSettings.findOne({}).lean();
            const UserData      = await User.findOne({ _id: ObjectId(user._id) } ,{currency : 1 }).populate({ path: 'countryId', select: '_id currency' }).lean();
            let UserCurrency    = (UserData && UserData.countryId && UserData.countryId.currency) ? UserData.countryId.currency : "";

            const matchCond = {
                isDeleted: false,
                isCanceled: false,
                paymentStatus: 'SUCCESS'
            };

            if (type) {
                if (type === 'EARNING') {
                    matchCond.isRefund = false;
                    matchCond.$or = [
                        {
                            consultant: ObjectId(user._id)
                        }]
                } else {
                    matchCond.$or = [
                        {
                            doctor: ObjectId(user._id)
                        }
                    ]
                }
            }

            
            let earningReportList = await Appointment.aggregate([
                {
                    '$match': matchCond
                },
                {
                    '$lookup': {
                        from: 'payments', let: { paymentId: '$paymentId' },
                        pipeline: [{
                            '$match': {
                                '$expr': { '$eq': ['$_id', '$$paymentId'] }
                            }
                        },
                        {
                            '$project': {
                                _id: 0,
                                created: 1,
                            }
                        }], as: 'payment'
                    }
                },
                { '$unwind': { path: '$payment', preserveNullAndEmptyArrays: true } },
                {
                    '$project': {
                        "created": 1,
                        payment: 1,
                        appointmentId: 1,
                        bookingDetails: 1,
                        consultantFee: 1,
                        appointment: (type === 'EARNING') ? '$doctor' : '$consultant',
                        type: (type === 'EARNING') ? 'EARNING' : 'PAYMENT',
                    }
                },
                { $sort: { 'payment.created': -1 } },
                {
                    '$lookup': {
                        from: 'users', let: { appointment: '$appointment' },
                        pipeline: [{
                            '$match': {
                                '$expr': { '$eq': ['$_id', '$$appointment'] }
                            }
                        },
                        {
                            '$project': {
                                fullName: 1,
                            }
                        }], as: 'appointment'
                    }
                },
                { '$unwind': { path: '$appointment', preserveNullAndEmptyArrays: true } },
                {
                    '$project': {
                        appointmentId: 1,
                        appointment: '$appointment.fullName',
                        "created": 1,
                        //date: '$payment.created',
                        amount: { '$cond': { if: { '$eq': ['$type', 'EARNING'] }, then: '$consultantFee', else: '$bookingDetails.totalPayable' } },
                        //"created": 1,
                    }
                },
                {
                    $addFields: {
                        "date": "$created"
                    }
                },
                {
                    $group: {
                        _id: null,
                        count: { $sum: '$amount' },
                        items: { $push: '$$ROOT' },
                    },
                },
                {
                    $project: {
                        count: 1,
                        items: 1
                        // items: {
                        //     $slice: ['$items', skip, limit],
                        // },
                    },
                },

            ]);

            

            // earningReportList.forEach( er=>{
            //     er.amount = er.amount/100
            // } )

            console.dir(earningReportList,{depth:3})
            //return

            if (type === 'EARNING') {
                // let wallettopup = await PaymentRequest.find({"userId":user._id}).sort({"created":-1}).lean();
                // let walletTopupTotal = 0;
                // if(wallettopup && wallettopup.length > 0){
                //     for(const ele of wallettopup){
                //         ele.date = ele.created;
                //         ele.created = undefined;
                //         ele.updated = undefined;
                //         walletTopupTotal = walletTopupTotal + ele.amount;
                //     }
                // }

                let wallettopup = []
                let walletTopupTotal = 0;
                


                if(earningReportList.length && earningReportList[0] && earningReportList[0].items){
                    earningReportList[0].items = earningReportList[0].items.concat(wallettopup)
                    earningReportList[0].count = earningReportList[0].count + walletTopupTotal;

                    //earningReportList[0].count = Number((earningReportList[0].count * 100).toFixed(2));
                    earningReportList[0].count = Number((earningReportList[0].count).toFixed(2));

                    // earningReportList[0].items.map(data => {
                    //     return data.amount = Number((data.amount * 100).toFixed(2));
                    // })

                    earningReportList[0].items.map(data => {
                        return data.amount = Number((data.amount).toFixed(2));
                    })
                }
                else{
                    if(earningReportList[0]){
                        earningReportList[0].items = wallettopup;
                        earningReportList[0].count = earningReportList[0].count || 0;
                        earningReportList[0].count = earningReportList[0].count + walletTopupTotal;
                    }
                    else{
                        earningReportList[0] = {};
                        earningReportList[0].items = wallettopup;
                        earningReportList[0].count = walletTopupTotal;
                    }
                }
            }
            let webinar;
            let call
            if( type == 'PAYMENT' ){
                webinar = await Webinar.find({ userId: user._id }).select("_id totalPayable created title").lean()

                webinar = webinar.map( function(x){
                    return {
                        "_id" : x._id,
                        "appointmentId" : 0,
                        "appointment" : "",
                        
                        "webinarId" : x._id,
                        "webinar" : x.title,
                        
                        "date": x.created,
                        "amount": x.totalPayable
                    }
                })    


                call = await Call.find({ callerId: user._id,amount: {$gt:0} })
                        .select("_id amount type created receiverId")
                        .populate({ path: 'receiverId', select: '_id fullName' })
                        .lean()


                call = call.map( function(x){
                    return {
                        "_id" : x._id,
                        "callId" : x._id,
                        "type": x.type,
                        "date": x.created,
                        //"amount": x.amount,
                        "amount": x.amount/100,
                        "receiver": x.receiverId?.fullName || ""
                    }
                })    

                //console.log("aaaaa",{call},earningReportList)
            }

            //console.dir(earningReportList,{depth:3})
            //return
            if( earningReportList.length<1 ){
                earningReportList = [{
                    items: [],
                    count: 0
                }]
            }
            if(earningReportList.length && earningReportList[0] && earningReportList[0].items){
                let wallettopup = await PaymentRequest.find({
                    "userId":user._id
                }).sort({"created":-1}).lean();
                //console.dir(wallettopup)
                //return

                

                let walletTopupTotal = 0;
                if(wallettopup && wallettopup.length > 0){
                    for(const ele of wallettopup){
                        //console.log({ele})
                        ele.date = ele.created;
                        ele.created = undefined;
                        ele.updated = undefined;
                        if( type === 'PAYMENT' ){
                            if( !ele.gst ){
                                ele['gst'] = 0
                            }
                            if( !ele.fee ){
                                ele['fee'] = 0
                            }
                            walletTopupTotal = walletTopupTotal + ele.gst + ele.fee;

                            //console.log({walletTopupTotal})
                        }
                        
                    }
                }

                // console.dir({
                //     walletTopupTotal
                // }); return

                //console.log({"A": earningReportList[0].count,walletTopupTotal}); return

                //if(earningReportList.length && earningReportList[0] && earningReportList[0].items){
                    earningReportList[0].items = earningReportList[0].items.concat(wallettopup)

                    console.log({
                        'c': earningReportList[0].count,
                        "walletTopupTotal": walletTopupTotal

                    })
                    //earningReportList[0].count = (earningReportList[0].count)/100 + walletTopupTotal;
                    //1111111
                    earningReportList[0].count = (earningReportList[0].count) + walletTopupTotal;

                    console.log({
                        'c2': earningReportList[0].count,
                        //"walletTopupTotal": walletTopupTotal

                    })

                    

                    //console.log({"A": earningReportList[0].count}); return


                    //console.log({walletTopupTotal: earningReportList[0].count }); return
                    

                    //console.log("earningReportList[0].count===>", earningReportList[0].count)
                    //return

                    //earningReportList[0].count = Number((earningReportList[0].count * 100).toFixed(2));

                    // earningReportList[0].items.map(data => {
                    //     return data.amount = Number((data.amount * 100).toFixed(2));
                    // })
                //}



                if(webinar?.length>0){
                    let count = 0;
                    webinar.map(records => {
                        return count += (records.amount * 100)
                    })
                    earningReportList[0].count = earningReportList[0].count+count
                    earningReportList[0].items = [...webinar,...earningReportList[0].items]

                    earningReportList[0].items.map(data => {
                        if(data.webinar) return data.amount = Number(data.amount * 100);
                    })
                }

                if(call?.length>0){
                    let count = 0;
                    call.map(records => {
                        //return count += (records.amount * 100)
                        return count += (records.amount )
                        
                    })

                    //console.log("zzzz",{count},call)
                    

                    earningReportList[0].count = earningReportList[0].count+count
                    earningReportList[0].items = [...call,...earningReportList[0].items]

                    console.log({
                        'c333': earningReportList[0].count,

                    })

                    earningReportList[0].items.map(data => {
                        if(data.callId) return data.amount = Number(data.amount * 100);
                    })
                }

                earningReportList[0].items.sort(function compare(a, b) {
                    var dateA = new Date(a.date);
                    var dateB = new Date(b.date);
                    return dateB - dateA;
                });
                const offset = limit * (page - 1);

                earningReportList[0].items = earningReportList[0].items.slice(offset, page * limit);

                // console.log("+======================")
                // console.dir(earningReportList[0].items)
                // console.log("+======================")
                // return


                earningReportList[0].items.forEach( x=>{
                    if( UserCurrency && UserCurrency == "USD"  ){
                        if( x.gst ){
                            x.gst =  (+x.gst) / (+adminSettings.conversionRate)
                        }

                        if( x.fee ){
                            x.fee =  (+x.fee) / (+adminSettings.conversionRate)
                        }

                        if( x.netAmount ){
                            x.netAmount =  (+x.netAmount) / (+adminSettings.conversionRate)
                        }
                    }
                })

                console.dir({
                    UserCurrency
                })
                // earningReportList[0].count =
                //  (UserCurrency && UserCurrency == "INR" ) ? 
                //  Number((earningReportList[0].count /100).toFixed(2))  : 
                //  Number((((earningReportList[0].count /100) + ( adminSettings.adminFlatFee / adminSettings.conversionRate )) / adminSettings.conversionRate).toFixed(2));

                earningReportList[0].count =
                 (UserCurrency && UserCurrency == "INR" ) ? 
                 Number((earningReportList[0].count ).toFixed(2))  : 
                 Number((((earningReportList[0].count ) + ( adminSettings.adminFlatFee / adminSettings.conversionRate )) / adminSettings.conversionRate).toFixed(2));

                
                
                //Number((  ( (earningReportList[0].count /100) ) / adminSettings.conversionRate).toFixed(2));
                if (type === 'PAYMENT') {
                    console.log("+======================")
                    console.dir(earningReportList[0].items)
                    console.log("+======================")
                }

                earningReportList[0].items.map(data => {
                    //return data.amount = (UserCurrency && UserCurrency == "INR") ? Number((data.amount / 100).toFixed(2)) : Number( ( ( (data.amount /100) + ( adminSettings.adminFlatFee / adminSettings.conversionRate ) ) / adminSettings.conversionRate ).toFixed(2) );

                    if (!data.appointmentId) {
                        console.log("-----", data)
                        if( data.webinarId ){
                            return data.amount = (UserCurrency && UserCurrency == "INR") ?
                            Number((data.amount/100).toFixed(2)) :
                            Number((((data.amount/100) + (adminSettings.adminFlatFee / adminSettings.conversionRate)) / adminSettings.conversionRate).toFixed(2));
                        }else{
                            return data.amount = (UserCurrency && UserCurrency == "INR") ?
                            Number((data.amount).toFixed(2)) :
                            Number((((data.amount) + (adminSettings.adminFlatFee / adminSettings.conversionRate)) / adminSettings.conversionRate).toFixed(2));
                        }


                        
                    } else {
                        // return data.amount = (UserCurrency && UserCurrency == "INR") ?
                        // Number((data.amount ).toFixed(2)) : 
                        // Number( ( ( (data.amount/100 ) + ( adminSettings.adminFlatFee / adminSettings.conversionRate ) ) / adminSettings.conversionRate ).toFixed(2) );

                        
                        console.log("------", data.appointmentId)
                        if (type === 'PAYMENT') {
                            return data.amount = (UserCurrency && UserCurrency == "INR") ?
                            Number((data.amount/100).toFixed(2)) :
                            Number((((data.amount/100) + (adminSettings.adminFlatFee / adminSettings.conversionRate)) / adminSettings.conversionRate).toFixed(2));
                        }else if(type === 'EARNING'){
                            return data.amount = (UserCurrency && UserCurrency == "INR") ?
                            Number((data.amount).toFixed(2)) :
                            Number((((data.amount) + (adminSettings.adminFlatFee / adminSettings.conversionRate)) / adminSettings.conversionRate).toFixed(2));
                        }
                        


                    }
                })
                // console.log("🚀 ~ AppointmentController ~ earningReport ~ earningReportList[0].items:", earningReportList[0].items)
            }

            //console.dir(earningReportList[0]?.items)
            if ( type === 'EARNING' && earningReportList[0]?.items?.length > 0) {
                const filteredItems = earningReportList[0].items.filter(x => x.type !== 'wallettopup');
                earningReportList[0].items = filteredItems;
            }
            console.log( {type },"222222222222");
            if ( type === 'PAYMENT' && earningReportList[0]?.items?.length > 0) {
                console.log( {type },"1111111111");
                //const filteredItems = earningReportList[0].items.filter(x => x.type !== 'wallettopup');
                const filteredItems = earningReportList[0].items.filter(item => !(item.type === 'wallettopup' && item.gst == 0));

                earningReportList[0].items = filteredItems;

                
            }
            if( type === 'PAYMENT' && UserCurrency && UserCurrency == "INR" ){
                earningReportList[0].count = +(earningReportList[0].count/100).toFixed(2);
                earningReportList[0].count = parseInt(earningReportList[0].count)
            }


            return res.success(earningReportList.length ? earningReportList[0] : {}, req.__('Earning & Payment Report list'));
        }catch(err){
            //console.log("earningReport", err)
            return next(err)
        }
    }

    async addConsultantDescription(req, res) {
        const { user } = req;
        const { consultDescription,appointmentId } = req.body;

        if (!user) {
            return res.unauthorized('', req.__('USER_NOT_FOUND'));
        }
        const appointment = await Appointment.findOne({ _id: ObjectId(appointmentId) });
        if (!appointment) {
            res.warn('', req.__('APPOINTMENT_NOT_FOUND'));
        }
        
        if (appointment?.countryName && !!patientDBConnections[appointment?.countryName]) { 

            let patientData = await patientDBConnections[appointment.countryName].getPatientData({ appointmentId: new mongoObjectId(appointmentId) });

            if (!patientData['consultDescription']) {
                patientData['consultDescription'] = [];
            }
            patientData['consultDescription'].push({
                _id: new mongoObjectId(),
                description:consultDescription,
                date: utcDateTime()
            })

            
            const encryptData = await patientDBConnections[appointment.countryName].encryptData({documents: patientData['consultDescription']});
            await patientDBConnections[appointment.countryName].updatePatientData({ appointmentId: new mongoObjectId(appointmentId) }, {
                $set: { 'consultDescription': encryptData.documents}
            });
            return res.success({}, req.__('DESCRIPTION_ADDED'));
        }

        await Appointment.updateOne({ _id: ObjectId(appointmentId) }, {
            $push: {
                'patient.consultDescription': {
                    description:consultDescription,
                    date: utcDateTime()
                }
            }
        })
        return res.success({}, req.__('DESCRIPTION_ADDED'));
    }

    async deleteConsultantDescription(req, res) {
        const { user } = req;

        const { id, docId } = req.body;

        if (!user) {
            return res.unauthorized('', req.__('USER_NOT_FOUND'));
        }

        const appointment = await Appointment.findOne({ _id: id });

        if (!appointment) {
            return res.warn('', req.__('APPOINTMENT_NOT_FOUND'));
        }

        if (appointment?.countryName && !!patientDBConnections[appointment?.countryName]) { 

            let patientData = await patientDBConnections[appointment.countryName].getPatientData({ appointmentId: new mongoObjectId(id) });

            let patientDocumentArray = patientData['consultDescription'];
            
            let documentArray = patientDocumentArray.filter((item) => {
                return item._id != docId
            });

            const encryptData = await patientDBConnections[appointment.countryName].encryptData({documents: documentArray});
            await patientDBConnections[appointment.countryName].updatePatientData({ appointmentId: new mongoObjectId(id) }, {
                $set: { 'consultDescription': encryptData.documents}
            })

            return res.success({}, req.__('Deleted successfully'));
        }
        await Appointment.updateOne({ _id: ObjectId(id) }, {
            $pull: { 'patient.consultDescription': { _id: ObjectId(docId) } }
        });
        return res.success({}, req.__('Deleted successfully'));
        
    }

    /******twilio work ******/
    
    async getVoiceToken(req, res) {
        
        const { _id } = req.user;
        const { appointmentId } = req.query;
        const identity = _id.toString();
        const outgoingApplicationSid = process.env.TWILIO_APP_SID;

        // don't allow professional to call before and after appointment time 
        if (appointmentId!=undefined) {
            /* const appointment = await Appointment.findOne({ _id: appointmentId });
            
            const currentDate = Date.now();
            const startDate = new Date(appointment.appointment_date).getTime();
            let endDate = new Date(appointment.appointment_date);
            endDate.setMinutes(endDate.getMinutes() + appointment.session_duration); */

            let timeLimit = 0;
            const lastSlot = await Appointment.findOne({_id: appointmentId}, {"bookingDetails.slots": {$slice:-1}});
            if(lastSlot){
                timeLimit = parseInt(((new Date(lastSlot.bookingDetails.slots[0].utcTime).getTime() + 15 * 60 * 1000) - new Date().getTime())/1000);
            }

            if (timeLimit <= 10 ) {
                return res.badRequest(null, req.__('CANNOT_CREATE_CALL_ERROR'));
            }
        }

        let pushCredentialSid = req.headers['x-telemedicine-platform'] == "android" ? process.env.ANDROID_PUSH_SID : process.env.IOS_PUSH_SID;
        //let pushCredentialSid = "CR913d95c1780b88bd42d76f12a507d1f6"
        // Create a "grant" which enables a client to use Voice as a given user
        const voiceGrant = new VoiceGrant({ 
            outgoingApplicationSid, 
            pushCredentialSid,
            incomingAllow: true
        });

        let token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret);
        token.addGrant(voiceGrant);
        token.identity = identity;
        console.log({ identity, token: "demo" })
        res.success({ identity, token: token.toJwt() });
    }

    async voiceCall(req, res) {
        try{
            const reqData = req.body;

             console.log("=========voiceCall===========")
             console.dir({
                 reqData
             })
            const userTo = await User.findOne({ _id: reqData.to }).select("_id fullName deviceToken os").lean();
            const twiml = new VoiceResponse();

            if (!(userTo)) {    //(!(userTo || userTo.online_status))
                const msg = !userTo ? req.__('TWILIO_CALL_ERROR_USER_NOT_FOUND') : req.__('TWILIO_CALL_ERROR_USER_OFFLINE');
                twiml.say({ voice: 'alice' }, msg);
                res.type('text/xml');
                return res.send(twiml.toString());
            }


            if (reqData.appointmentId) {
                await Appointment.updateOne({
                    _id: reqData.appointmentId
                },
                    {
                        $set: {
                            call_status: 0, // call status ringing
                            call_sid: reqData.CallSid // call serial id
                        },
                        $push: {
                            call_history: {
                                call_status: 0, // call status ringing
                                call_sid: reqData.CallSid // call serial id
                            }
                        }
                    });

                let timeLimit = 0;
                const lastSlot = await Appointment.findOne({ _id: reqData.appointmentId }, { "bookingDetails.slots": { $slice: -1 } });
                if (lastSlot) {
                    timeLimit = parseInt(((new Date(lastSlot.bookingDetails.slots[0].utcTime).getTime() + 15 * 60 * 1000) - new Date().getTime()) / 1000);
                }
                if (timeLimit <= 0) timeLimit = 1;
                const call_obj = { callerId: `client:${reqData.from}`, timeLimit };

                /*const dial = twiml.dial(call_obj);
                dial.client(reqData.to,
                    {
                        statusCallbackEvent: 'initiated ringing answered completed',
                        statusCallback: `${process.env.SITE_URL}/api/appointment/voice-events`,
                        statusCallbackMethod: "POST"
                    });
                res.type('text/xml');
                res.send(twiml.toString());*/


                if( userTo.os != 'ios' ){
                    const dial = twiml.dial(call_obj);
                    dial.client(reqData.to,
                        {
                            statusCallbackEvent: 'initiated ringing answered completed',
                            statusCallback: `${process.env.SITE_URL}/api/appointment/voice-events`,
                            statusCallbackMethod: "POST"
                        });
                    res.type('text/xml');
                    res.send(twiml.toString());
                }else{
                    let fromName = "Telemed"
                    if(reqData.from ){
                        let userFrom = await User.findOne({ _id: reqData.from }).select("_id fullName deviceToken os").lean();  
                        fromName  = userFrom.fullName
                    }


                    const dial = twiml.dial();
                    const client = dial.client({
                        statusCallbackEvent: 'initiated ringing answered completed',
                        statusCallback: `${process.env.SITE_URL}/api/appointment/voice-events`,
                        statusCallbackMethod: "POST"
                    });
                    client.identity(reqData.to);
                    client.parameter({
                        name: 'FirstName',
                        value: `${fromName}`
                    });
                    res.type('text/xml');
                    res.send(twiml.toString());
                }


            }else{
                /**
                 * Get call id
                 */
                let fromName = "Telemed"
                if(reqData.from ){
                    let userFrom = await User.findOne({ _id: reqData.from }).select("_id fullName deviceToken os").lean();  
                    fromName  = userFrom.fullName
                }
                



                let call =  await Call.findOne({
                    _id: reqData.callId
                    // "callerId" : reqData.from,
                    // "receiverId" : reqData.to,
                    // "call_status": 4
                }).sort({
                    _id: -1
                }).lean()

                if( call ){
                    let allSid = [reqData.CallSid]
                    if(reqData.ParentCallSid){
                        allSid.push(reqData.ParentCallSid)
                    }
                    await Call.updateOne({
                        _id: call._id
                    },
                        {
                            $set: {
                                call_status: 0, // call status ringing
                                CallSid: reqData.CallSid // call serial id
                            },

                            $addToSet: {
                                allSid
                            },
                            $push: {
                                call_history: {
                                    call_status: 0, // call status ringing
                                    CallSid: reqData.CallSid // call serial id
                                }
                            }
                        });
                    let timeLimit = 150;
                    const call_obj = { callerId: `client:${reqData.from}`, timeLimit };


                    /*const dial = twiml.dial(call_obj);
                        dial.client(reqData.to,
                            {
                                statusCallbackEvent: 'initiated ringing answered completed',
                                statusCallback: `${process.env.SITE_URL}/api/appointment/voice-events`,
                                statusCallbackMethod: "POST"
                            });
                        res.type('text/xml');
                        res.send(twiml.toString());*/



                    if( userTo.os != 'ios' ){
                        const dial = twiml.dial(call_obj);
                        dial.client(reqData.to,
                            {
                                statusCallbackEvent: 'initiated ringing answered completed',
                                statusCallback: `${process.env.SITE_URL}/api/appointment/voice-events`,
                                statusCallbackMethod: "POST"
                            });
                        res.type('text/xml');
                        res.send(twiml.toString());
                     }else{
                        console.log("ddhiiiiiiiiiiiiiiiiiiiiiiiiiiddddddddddddddddddddddddddd")
                        const customParameters = {
                            callerName: `${fromName}`  //
                        };

                       /* let xml = builder
                            .create("Response", { encoding: "utf-8" })
                            .ele("Dial", {
                                callerId: call_obj.callerId,
                                timeLimit: call_obj.timeLimit
                            })
                            .ele("Client", {
                                statusCallbackEvent: "initiated ringing answered completed",
                                statusCallback: `${process.env.SITE_URL}/api/appointment/voice-events`,
                                statusCallbackMethod: "POST"
                            })
                            .up()
                            .ele("Parameter", {
                                name: "caller_name",
                                value: `Dr. ${userTo.fullName} is calling`
                            }).up()
                            .end({ pretty: true });

                        console.dir(xml, { depth: 4 })

                        res.type("text/xml");
                        res.send(xml);*/

                        /*let xml2 = builder
                            .create('Response', { encoding: 'utf-8' }) 
                            .ele('Dial', { 
                                callerId: call_obj.callerId,
                                timeLimit: call_obj.timeLimit
                            })
                            .ele('Client', { 
                                statusCallbackEvent: 'initiated ringing answered completed',
                                statusCallback: `${process.env.SITE_URL}/api/appointment/voice-events`,
                                statusCallbackMethod: 'POST'
                            })
                            .up() 
                            .ele('Parameter', { 
                                name: 'caller_name',
                                value: `Dr. ${userTo.fullName} is calling`
                            })
                            .up() 
                            .end({ pretty: true }); 

                            console.dir(xml2, { depth: 4 });

                            res.type('text/xml');
                            res.send(xml2);*/


                            const dial = twiml.dial();
                            const client = dial.client({
                                statusCallbackEvent: 'initiated ringing answered completed',
                                statusCallback: `${process.env.SITE_URL}/api/appointment/voice-events`,
                                statusCallbackMethod: "POST"
                            });
                            client.identity(reqData.to);
                            client.parameter({
                                name: 'FirstName',
                                value: `${fromName}`
                            });
                            
                            
                            res.type('text/xml');
                            res.send(twiml.toString());

                        // res.type('text/xml');
                        // res.send(twiml.toString());
                     }

                    
                }
            }
        }catch(err){
            console.log("appointment voiceCall")
            console.log(err)
        }
        
    }

    async voiceEvents(req, res) {
        try{
            console.log("----------------------appointment voice events")
            const callData = req.body;
            console.dir(callData)
            const twiml = new VoiceResponse();
            let adminSettings =  await AdminSettings.findOne({});
            let {audioCallFee,videoCallFee,conversionRate} = adminSettings 
            console.log({
                audioCallFee,videoCallFee,conversionRate
            })

            let callQry = {}
            if( callData.callId ){
                callQry = {
                    _id: callData.callId
                }
            }else if(  callData.CallSid || callData.ParentCallSid ){
                callQry = {
                    $or: [
                        {
                            CallSid: callData.CallSid
                        },{
                            ParentCallSid: callData.CallSid
                        }
                    ]
                    
                }
                if(callData.ParentCallSid){
                    callQry.$or.push({
                        CallSid: callData.ParentCallSid
                    })
                    callQry.$or.push({
                        ParentCallSid: callData.ParentCallSid
                    })
                }
               

            }

            let chkCall = await Call.findOne(callQry).lean()
            console.log("chkCall 111",{chkCall})
            if( chkCall && chkCall._id ){
                //console.log("ppppppp")
                callData['callId'] = chkCall._id.toString()
            }
            console.log("callData 222 ===>",callData);
            if( callData.callId ){//todo cost work
                console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 333",callData.CallStatus)
                const call = await Call.findOne({
                    _id: callData.callId
                })

                let allSid = [callData.CallSid]
                if(callData.ParentCallSid){
                    allSid.push(callData.ParentCallSid)
                }
                await Call.updateOne({
                    _id: callData.callId
                },
                    {
                       $addToSet: {
                            allSid
                        },
                       
                    });

                    console.log({call})

                const currentTime = moment().utc().unix()
                const userFrom = await User.findOne({ 
                    _id: ObjectId(call.callerId) 
                }).select("fullName deviceToken avatar _id os voipToken walletBalance countryId")
                .populate({ path: 'countryId', select: '_id currency' })
                .lean();
                
                let UserCurrency    = (userFrom && userFrom.countryId && userFrom.countryId.currency) ? userFrom.countryId.currency : "";
                console.log( {userFrom} )
                if( !call.organizationId ){
                    // console.log({currentTime,"cs": call.start})
                    let callTime = currentTime - call.start;
                    //console.log({callTime})
                    let cost = (callTime/60)*(+audioCallFee)
                    cost = +cost.toFixed(2)
                    // console.log({cost,"uw": userFrom.walletBalance// })
                    if( call.start>0 && cost> userFrom.walletBalance ){
                        console.log("4777777777777777")
                        /*twilio_client.video.rooms(roomObj.RoomSid)
                        .update({status: 'completed'})
                        .then(room => console.log(room.uniqueName));*/
                    }
                }

                if (callData.CallStatus === 'in-progress') {
                    let uniqueName = uuidv4();
                    //call.callStatus = 1;
                    
                    if(callData && callData.ParentCallSid == 'undefined'){
                        callData.ParentCallSid = callData.CallSid;
                    }
                    await Call.findOneAndUpdate({
                        //"call_history.CallSid": { $in: [ callData.CallSid ] } 
                        _id: callData.callId
                    }, {
                        $set: {  
                            //"call_history.$.call_status":1
                            "CallDuration":callData.CallDuration, 
                            "callStatus":1
                        }
                    });
                    twiml.say({ voice: 'alice' }, req.__('TWILIO_CALL_BUSY_ERROR'));
                }

                if (callData.CallStatus == 'completed') {
                    //call.callStatus = 2;
                    if(callData && callData.ParentCallSid == 'undefined'){
                        callData.ParentCallSid = callData.CallSid;
                    }
                    /*await Call.findOneAndUpdate({
                        //"call_history.CallSid": { $in: [ callData.CallSid ] } 
                        _id: callData.callId
                    }, {
                        $set: { 
                            
                            "CallDuration":callData.CallDuration, 
                            "callStatus":2
                        }
                    });*/


                    if( call.isReceived ){
                        //let callTime = callData.CallDuration || currentTime - call.start;
                        let callTime = currentTime - call.receivedTime;
                        let cost = (callTime/60)*(+audioCallFee)
                        cost = +cost.toFixed(2)

                        await PaymentRequest.findOneAndUpdate(
                            { callId: call._id },
                            {
                                $set: {
                                    callId: call._id,
                                    consultant_id: call.callerId,
                                    "amount":  cost, //(UserCurrency && UserCurrency == "INR") ? cost : Math.ceil(cost * adminSettings.conversionRate),
                                    "status": "APPROVED",
                                    action_date: moment().utc(),
                                    isShowOnList: true
                                }
                            },
                            { new: true, upsert: true }
                        );

                        Call.updateOne({
                            _id: call._id
                        },{
                            $set: {
                                "CallDuration":callTime, 
                                //"CallDuration":callData.CallDuration, 
                                "callStatus":2,
                                "amount": cost, //(UserCurrency && UserCurrency == "INR") ? cost : Math.ceil(cost * adminSettings.conversionRate),
                            }
                        }).exec ()
                    }

                    

                    
                    twiml.say({ voice: 'alice' }, req.__('TWILIO_CALL_BUSY_ERROR'));
                }

                // call not recieved case
                if (callData.CallStatus == 'no-answer' || callData.CallStatus == 'busy') {
                    //call.call_status = 3; // flag for call busy
                    if(callData && callData.ParentCallSid == 'undefined'){
                        callData.ParentCallSid = callData.CallSid;
                    }
                    await Call.findOneAndUpdate({
                        //"call_history.CallSid": { $in: [ callData.CallSid ] } 
                        _id: callData.callId
                    }, {
                        $set: { 
                            "CallDuration":callData.CallDuration, 
                            "callStatus":3
                        }
                    });
                    twiml.say({ voice: 'alice' }, req.__('TWILIO_CALL_BUSY_ERROR'));
                }
                //await call.save();
                res.type('text/xml');
                res.send(twiml.toString());


            }else{
                const appointment = await Appointment.findOne({
                    $or: [
                        { call_sid: callData.CallSid },
                        { call_sid: callData.ParentCallSid }
                    ]
                })
                .populate({ path: 'doctor', model: 'User', select: 'charges deviceToken' })
                .populate({ path: 'consultant', model: 'User', select: 'charges deviceToken' });

                appointment.call_sid = callData.CallSid;
                appointment.parent_call_sid = callData.ParentCallSid;

                let deviceIds = [];

                if (callData.CallStatus === 'in-progress') {
                    let uniqueName = uuidv4();
                    appointment.call_status = 1;
                    //appointment.call_unique_name = uuidv4();
                    /* const value = {
                        deviceIds,
                        notification: { title: req.__('CALL_CONTINUE_TITLE'), body: req.__('CALL_CONTINUE_MSG') },
                        data: { key: req.__('CALL_CONTINUE_KEY') },
                        _id: "appointment._id",
                        uniqueName: uniqueName
                    }; */
                    //schedule call time increase notification
                    //AppointmentController.sendNotificationAgain(value);
                    if(callData && callData.ParentCallSid == 'undefined'){
                        callData.ParentCallSid = callData.CallSid;
                    }
                    await Appointment.findOneAndUpdate({"call_history.call_sid": { $in: [ callData.CallSid , callData.ParentCallSid] } }, {$set: {  "call_history.$.call_status":1}});
                    twiml.say({ voice: 'alice' }, req.__('TWILIO_CALL_BUSY_ERROR'));
                }

                if (callData.CallStatus == 'completed') {
                    appointment.call_status = 2;
                    if(callData && callData.ParentCallSid == 'undefined'){
                        callData.ParentCallSid = callData.CallSid;
                    }
                    await Appointment.findOneAndUpdate({"call_history.call_sid": { $in: [ callData.CallSid , callData.ParentCallSid] } }, {$set: { "call_history.$.CallDuration":callData.CallDuration, "call_history.$.call_status":2}});
                    /*appointment.call_total_duration += parseInt(callData.CallDuration);
                    appointment.amount += Math.round((parseInt(callData.CallDuration) / 60) * appointment.professional.charges);
                    appointment.call_status = 2;
                    await agenda.cancel({ 'data.uniqueName': appointment.call_unique_name });*/
                    twiml.say({ voice: 'alice' }, req.__('TWILIO_CALL_BUSY_ERROR'));
                }

                // call not recieved case
                if (callData.CallStatus == 'no-answer' || callData.CallStatus == 'busy') {
                    appointment.call_status = 3; // flag for call busy
                    if(callData && callData.ParentCallSid == 'undefined'){
                        callData.ParentCallSid = callData.CallSid;
                    }
                    await Appointment.findOneAndUpdate({"call_history.call_sid": { $in: [ callData.CallSid , callData.ParentCallSid] } }, {$set: { "call_history.$.CallDuration":callData.CallDuration, "call_history.$.call_status":3}});
                    twiml.say({ voice: 'alice' }, req.__('TWILIO_CALL_BUSY_ERROR'));
                }
                await appointment.save();
                res.type('text/xml');
                res.send(twiml.toString());
            }

        }catch(err){
            console.log("appointment voiceCall")
            console.log(err)
        }
    }

    /**    video */
    async videoCallToken(req, res) {

        const { _id } = req.user;
        const { appointmentId } = req.params;
        const identity = _id.toString();
        const date = Date.now();
        
        const appointment = await Appointment.findOne({ _id: appointmentId });

        let uniqueName = `${identity}_${date}`;
        
        /*
            const currentDate = Date.now();
            const startDate = new Date(appointment.appointment_date).getTime();
            let endDate = new Date(appointment.appointment_date);
            endDate.setMinutes(endDate.getMinutes() + appointment.session_duration);

            if (currentDate < startDate || currentDate > endDate.getTime()) {
                return res.badRequest(null, req.__('CANNOT_CREATE_CALL_ERROR'));
            }
        */

        let timeLimit = 0;
            const lastSlot = await Appointment.findOne({_id: appointment._id}, {"bookingDetails.slots": {$slice:-1}});
            if(lastSlot){
                timeLimit = (((new Date(lastSlot.bookingDetails.slots[0].utcTime).getTime()) + 15 * 60 * 1000) - new Date().getTime())/1000;
            }
            if(timeLimit <= 10){
                return res.badRequest(null, req.__('CANNOT_CREATE_CALL_ERROR'));
            }

        const room = await twilio_client.video.rooms.create({
            loginUser : _id.toString(),
            uniqueName,
            type: 'group',
            statusCallback: `${process.env.SITE_URL}/api/appointment/video-events`,
        });
        appointment.room_name = uniqueName;
        await appointment.save();

        // Create a "grant" which enables a client to use Video as a given user
        const videoGrant = new VideoGrant();
        let token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret, { ttl: 10800 });
        token.addGrant(videoGrant);
        token.identity = identity;
        //token.loginUser = _id.toString();
        res.success({ identity, token: token.toJwt(), room_name: uniqueName, room_sid: room.sid, timeLimit });
    }

    async videoEvents(req, res) {
        const videoGrant = new VideoGrant();
        const roomObj = req.body;
        const select = 'fullName deviceToken avatar _id os voipToken';

        const appointment = await Appointment.findOne({ room_name: roomObj.RoomName })
            .populate({ path: 'doctor', model: 'User', select })
            .populate({ path: 'consultant', model: 'User', select });

        if( appointment && appointment._id ){
            //code for call completed
            let timeLimit = 0;
            const lastSlot = await Appointment.findOne({_id: appointment._id}, {"bookingDetails.slots": {$slice:-1}});
            if(lastSlot){
                timeLimit = (((new Date(lastSlot.bookingDetails.slots[0].utcTime).getTime()) + 15 * 60 * 1000) - new Date().getTime())/1000;
            }
            if(timeLimit <= 0){
                twilio_client.video.rooms(roomObj.RoomSid)
                .update({status: 'completed'})
                .then(room => console.log(room.uniqueName));
            }
            
            let roomName = roomObj.RoomName;

            let doctorId = appointment.doctor._id.toString();
            let consultantId = appointment.consultant._id.toString();

            let caller = roomName.split("_")[0];
            let receiver = caller==doctorId?consultantId:doctorId;

            let callerUser;
            let receiverUser;
            let callerType;
            if( appointment.doctor._id.toString() == caller ){
                callerUser = appointment.doctor;
                callerType = 'doctor';
            }else{
                receiverUser = appointment.consultant;
                callerType = 'consultant';
            }

            //await Appointment.findOneAndUpdate({"call_history.call_sid": callData.CallSid }, {$set: { "call_history.$.CallDuration":callData.CallDuration, "call_history.$.call_status":3}});

            if (roomObj.StatusCallbackEvent != 'track-added') {
                if (roomObj.StatusCallbackEvent == 'participant-connected') {

                    appointment.participants_connected = roomObj.ParticipantIdentity;
                    appointment.room_sid = roomObj.RoomSid;
                    if (appointment.participants_connected.length == 2) {
                        appointment.call_status = 1;
                        appointment.call_unique_name = uuidv4();
                        const value = {
                            deviceIds: [appointment.consultant.deviceToken],
                            notification: { title: req.__('CALL_CONTINUE_TITLE'), body: req.__('CALL_CONTINUE_MSG') },
                            data: { key: req.__('VIDEO_CALL_CONTINUE_KEY') },
                            _id: appointment._id,
                            uniqueName: appointment.call_unique_name
                        };
                        //schedule call time increase notification
                        //AppointmentController.sendNotificationAgain(value);
                        await Appointment.findOneAndUpdate({"call_history.call_sid": roomObj.RoomSid }, {$set: { "call_history.$.call_status":1}});

                    } else {
                        if (roomObj.SequenceNumber == '1') {

                            await Appointment.updateOne({
                                _id: appointment._id
                            },
                                {
                                    $push: {
                                        call_history: {
                                            call_status: 0, // call status ringing
                                            call_sid: roomObj.RoomSid // call serial id
                                        }
                                    }
                                });




                            appointment.call_status = 0;

                            const call_to_token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret, { ttl: 10800 });
                            if( callerType != 'doctor' ){
                                call_to_token.identity = appointment.doctor._id.toString();
                                call_to_token.addGrant(videoGrant);
                                //send call notification to customer for connecting call
                                let title =  `Incoming Call`;
                                let body = `${appointment.consultant.fullName} is calling...`;
                                //sendIosVoipPush('a8fb66adb2cfc86bfc72d9bafffa1c3f9204078077ad1799cb171471d63db361', 'title', 'body');
                                if(appointment.doctor.os ==='android'){
                                    sendFCMPushForVideoCall(
                                        appointment.doctor.deviceToken, 
                                        title, 
                                        body, 
                                        {
                                            key: 'FOR_VIDEO_CALL',
                                            activity: "new_video_call",
                                            identity: appointment.doctor._id.toString(),
                                            token: call_to_token.toJwt(),
                                            appointmentId: appointment._id.toString(),
                                            caller_name: appointment.consultant.fullName,
                                            caller_image: appointment.consultant.avatar,
                                            room_name: roomObj.RoomName,
                                            room_sid:roomObj.RoomSid
                                        }
                                    );
                                }else{
                                    sendIosVoipPush(
                                        appointment.doctor.voipToken,
                                        title,
                                        body,
                                        {
                                            key: 'FOR_VIDEO_CALL',
                                            activity: "new_video_call",
                                            identity: appointment.doctor._id.toString(),
                                            token: call_to_token.toJwt(),
                                            appointmentId: appointment._id.toString(),
                                            caller_name: appointment.consultant.fullName,
                                            caller_image: appointment.consultant.avatar,
                                            room_name: roomObj.RoomName,
                                            room_sid:roomObj.RoomSid,
                                            "type": "video_call"
                                        }
                                    )
                                }                                
                            } else{
                                call_to_token.identity = appointment.consultant._id.toString();
                                call_to_token.addGrant(videoGrant);
                                //send call notification to customer for connecting call
                                let title =  `Incoming Call`;
                                let body = `${appointment.doctor.fullName} is calling...`;
                                //sendIosVoipPush('a8fb66adb2cfc86bfc72d9bafffa1c3f9204078077ad1799cb171471d63db361', 'title', 'body');
                                if(appointment.consultant.os==='android'){
                                    sendFCMPushForVideoCall(
                                        appointment.consultant.deviceToken, 
                                        title, 
                                        body, 
                                        {
                                            key: 'FOR_VIDEO_CALL',
                                            activity: "new_video_call",
                                            identity: appointment.consultant._id.toString(),
                                            token: call_to_token.toJwt(),
                                            appointmentId: appointment._id,
                                            caller_name: appointment.doctor.fullName,
                                            caller_image: appointment.doctor.avatar,
                                            room_name: roomObj.RoomName,
                                            room_sid:roomObj.RoomSid,
                                            "type": "video_call"
                                        }
                                    );
                                } else {
                                    sendIosVoipPush(appointment.consultant.voipToken,
                                        title,
                                        body, 
                                        {
                                            key: 'FOR_VIDEO_CALL',
                                            activity: "new_video_call",
                                            identity: appointment.consultant._id.toString(),
                                            token: call_to_token.toJwt(),
                                            appointmentId: appointment._id,
                                            caller_name: appointment.doctor.fullName,
                                            caller_image: appointment.doctor.avatar,
                                            room_name: roomObj.RoomName,
                                            room_sid:roomObj.RoomSid,
                                            "type": "video_call"
                                        }
                                    )
                                }
                            }
                        }
                    }
                } else if (roomObj.StatusCallbackEvent == 'participant-disconnected') {
                    appointment.participants_connected.filter(element => element != roomObj.ParticipantIdentity);
                    appointment.call_status = 2;

                    await Appointment.findOneAndUpdate({ "call_history": { $elemMatch: {"call_sid": roomObj.RoomSid, "CallDuration" : { $lt : roomObj.ParticipantDuration} } } }, {$set: { "call_history.$.CallDuration":roomObj.ParticipantDuration, "call_history.$.call_status":2}});


                    /*await agenda.cancel({ 'data.uniqueName': appointment.call_unique_name });
                    const callResponse = await client.video.rooms(roomObj.RoomSid).update({ status: 'completed' });
                    appointment.call_total_duration += parseInt(callResponse.duration);
                    appointment.amount += Math.round((parseInt(callResponse.duration) / 60) * appointment.professional.charges);*/
                   /*  if (appointment.participants_connected.length === 1) {
                        sendFCMPush(
                            [appointment.doctor.deviceToken, appointment.consultant.deviceToken], 
                            req.__('VIDEO_CALL_DISCONNECTED'), 
                            req.__('VIDEO_CALL_DISCONNECTED_MSG'), 
                            {
                                key: 'VIDEO_CALL_DISCONNECTED',
                                activity: "video_call_disconnected",
                                
                            }
                        );
                    } */
                }
            }
            await appointment.save();
            const twiml = new VoiceResponse();
            res.type('text/xml');
            res.send(twiml.toString());            
        }else{
            return res.success({});
        }


    }

    static async sendNotificationAgain(values) {
        const { _id } = values;
        const appointment = await Appointment.findOne({ _id });
        let nextAppointmentTime = new Date(appointment.appointment_date);
        nextAppointmentTime.setMinutes(nextAppointmentTime.getMinutes() + appointment.session_duration);

        // check is there is next appointment after 15 minutes
        const nextAppointment = await AppointmentController.checkAppointment(appointment, nextAppointmentTime);

        if (!nextAppointment) {
            nextAppointmentTime.setMinutes(nextAppointmentTime.getMinutes() - 1);
            await agenda.schedule(nextAppointmentTime, 'sendNotification', values);
        }
        nextAppointmentTime.setMinutes(nextAppointmentTime.getMinutes() + 1);
        let agendaMethod, agendaObj = null;
        if (!appointment.session_type) {
            agendaMethod = 'disconnectCall';
            agendaObj = { callSid: appointment.call_sid };
        } else {
            agendaMethod = 'disconnectVideoCall';
            agendaObj = { roomSid: appointment.room_sid };
        }
        await agenda.schedule(nextAppointmentTime, agendaMethod, agendaObj);
        // await agenda.schedule(nextAppointmentTime, appointment.session_type === 0 ? 'disconnectCall' : 'disconnectVideoCall', { [appointment.session_type === 0 ? 'callSid' : 'roomSid']: !call_sid ? appointment.session_type === 0 ? appointment.call_sid : appointment.room_sid : call_sid });
    }

    async rejectCall(req, res){
        const { user } = req; 
        const { appointmentId, room_sid } = req.params;
        
        const select = 'fullName deviceToken avatar _id os voipToken';
        try {
            const appointment = await Appointment.findOne({ _id: ObjectId(appointmentId) })
                .populate({ path: 'doctor', model: 'User', select })
                .populate({ path: 'consultant', model: 'User', select });


            if( !appointment ){
                const select = 'fullName deviceToken avatar _id os voipToken';
                try {
                    const callData = await Call.findOne({ roomSid: room_sid })
                        .populate({ path: 'receiverId', model: 'User', select })
                        .populate({ path: 'callerId', model: 'User', select })

                        console.log({
                            callData
                        })

                    const receiverData = callData && callData.receiverId ? callData.receiverId : {};
                    const callerData = callData && callData.callerId ? callData.callerId : {};



                    if (callerData && (callerData._id).toString() == (user._id).toString()) {//by caller end
                        let title = `${callerData.fullName} is rejected the call...`;
                        let body = `${callerData.fullName} is rejected the call...`;

                        if (callData.receiverId.os === 'android') {
                            sendFCMPushForVideoCall(
                                receiverData.deviceToken,
                                title,
                                body,
                                {
                                    key: 'FOR_VIDEO_CALL_REJECT',
                                    activity: "video_call_reject",
                                    caller_name: receiverData.fullName,
                                    caller_image: receiverData.avatar,
                                    room_sid
                                }
                            );
                        } else {
                            sendIosVoipPush(
                                receiverData.voipToken,
                                title,
                                body,
                                {
                                    key: 'FOR_VIDEO_CALL_REJECT',
                                    activity: "video_call_reject",
                                    caller_name: receiverData.fullName,
                                    caller_image: receiverData.avatar,
                                    "type": "video_call_reject",
                                    room_sid,
                                    appointmentId: callData._id.toString()
                                }
                            );
                        }

                    } else {  //by receiver end
                        let title = `${receiverData.fullName} is rejected the call...`;
                        let body = `${receiverData.fullName} is rejected the call...`;
                        if (callData.callerId.os === 'android') {
                            sendFCMPushForVideoCall(
                                callerData.deviceToken,
                                title,
                                body,
                                {
                                    key: 'FOR_VIDEO_CALL_REJECT',
                                    activity: "video_call_reject",
                                    caller_name: receiverData.fullName,
                                    caller_image: receiverData.avatar,
                                    room_sid
                                }
                            );
                        } else {
                            sendIosVoipPush(
                                callerData.voipToken,
                                title,
                                body,
                                {
                                    key: 'FOR_VIDEO_CALL_REJECT',
                                    activity: "video_call_reject",
                                    caller_name: receiverData.fullName,
                                    caller_image: receiverData.avatar,
                                    "type": "video_call_reject",
                                    room_sid,
                                    appointmentId: callData._id.toString()
                                }
                            );
                        }

                    }
                    return res.success({});
                } catch (e) {
                    console.log("err", e)
                    return res.badRequest({}, req.__('Something went wrong'));
                }
            }

                
            if(appointment && (appointment.doctor._id).toString() == (user._id).toString()){
                let title =  `${appointment.doctor.fullName} is rejected the call...`;
                let body = `${appointment.doctor.fullName} is rejected the call...`;
                if(appointment.consultant.os==='android'){
                    sendFCMPushForVideoCall(
                        appointment.consultant.deviceToken, 
                        title, 
                        body, 
                        {
                            key: 'FOR_VIDEO_CALL_REJECT',
                            activity: "video_call_reject",
                            caller_name: appointment.doctor.fullName,
                            caller_image: appointment.doctor.avatar,
                            room_sid
                        }
                    );
                }else{
                    sendIosVoipPush(
                        appointment.consultant.voipToken, 
                        title, 
                        body, 
                        {
                            key: 'FOR_VIDEO_CALL_REJECT',
                            activity: "video_call_reject",
                            caller_name: appointment.doctor.fullName,
                            caller_image: appointment.doctor.avatar,
                            "type": "video_call_reject",
                            room_sid
                        }
                    );
                }
                
            }else {
                let title =  `${appointment.consultant.fullName} is rejected the call...`;
                let body = `${appointment.consultant.fullName} is rejected the call...`;
                if(appointment.doctor.os==='android'){
                    sendFCMPushForVideoCall(
                        appointment.doctor.deviceToken, 
                        title, 
                        body, 
                        {
                            key: 'FOR_VIDEO_CALL_REJECT',
                            activity: "video_call_reject",
                            caller_name: appointment.consultant.fullName,
                            caller_image: appointment.consultant.avatar,
                            room_sid
                        }
                    );
                }else{
                    sendIosVoipPush(
                        appointment.doctor.voipToken,
                        title, 
                        body, 
                        {
                            key: 'FOR_VIDEO_CALL_REJECT',
                            activity: "video_call_reject",
                            caller_name: appointment.consultant.fullName,
                            caller_image: appointment.consultant.avatar,
                            "type": "video_call_reject",
                            room_sid
                        }
                    );
                }
                
            }
            return res.success({});
        } catch(e){
            console.log("err", e)
            return res.badRequest({}, req.__('Something went wrong'));
        }
    }

    async voiceFallbackUrl(req, res) {
        console.log("fallback url hit")
        const twiml = new VoiceResponse();
            res.type('text/xml');
            res.send(twiml.toString());
    }
}


const getWebinar = async ({user,type, pageIndex , pageLimit })=>{
    let page = pageIndex || 1; 
    page = +page
    let limit = pageLimit || 5;
    limit = +limit
    let skip = (page - 1) * limit;
    //const loginUser = user;
    let realCurrentTime = moment().utc().unix();
    //let currentTime = moment().add({hours:1}).utc().unix();
    
    const currentUserId = ObjectId(user._id.toString())
    let matchQuery = {
        "isDeleted": false,
        "isSuspended": false,
        "members.userId": currentUserId,
        "paymentStatus" : "SUCCESS",
    }

    if( user.organizationId ){
        matchQuery = {
            "organizationId": user.organizationId ,
            ...matchQuery
        }
    }else{
        matchQuery = {
            //"paymentStatus": "SUCCESS",
            "organizationId": {$exists: false}  ,
            ...matchQuery
        }
    }

    if( type == 'ACTIVE' ){
        matchQuery = {
            ...matchQuery,
            "timeEnd": { $gt: realCurrentTime }
        }
    }else{
        matchQuery = {
            ...matchQuery,
            "timeEnd": { $lt: realCurrentTime }
        }
    }

    let paymentMatch = {
        $or: [
            {
                paymentStatus: "SUCCESS",
            },{
                userId: currentUserId
            }
        ]
    }

    let query = [
        {
            $match: matchQuery
        },{
            $match: paymentMatch
        },
        {
            $addFields: {
                "currentMember": {
                    $arrayElemAt: [
                        "$members",
                        { "$indexOfArray": ["$members.userId", currentUserId] }
                    ]
                }
            }
        },
        {
            $addFields: {
                "presenter": {
                        $filter: {
                            input: '$members',
                            as: 'tag',
                            cond: {
                                $eq: [
                                    '$$tag.isPresenter',
                                    true
                                ]
                            }
                        }
                }
            }
        },
        {
            "$lookup": {
                from: "users",
                let: { "userMember": "$presenter", },
                pipeline: [
                    { $match: { $expr: { $and: [{ $in: ["$_id", "$$userMember.userId"] },] } } },
                    { $project: { _id: 1, fullName: 1, avatar: 1, specality: 1 } },
                    {
                        $lookup: {
                            from: 'specialities',
                            let: {
                                sID: '$specality',
                            },
                            as: 'specality',
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: ['$_id', '$$sID'],
                                        },
                                    }
                                }
                            ],
                        }
                    },
                    {
                        $unwind: { path: "$specality" }
                    },
                    { $addFields: { "specality": "$specality.specialityName" } }
                ],
                as: "userMembers"
            }
        },
        {
            $addFields: {
                "presenter": {
                    $arrayElemAt: [
                        "$userMembers",
                        0
                    ]
                }
            }
        },
        {
            $match: {
                "currentMember.status": { $ne: "reject" }
            }
        },
        {
            $project: {
                "_id": 1,
                "paymentStatus": 1,
                "title": 1,
                "description": 1,
                "cmePartner": 1,
                "dateWebinar": 1,
                "timeWebinar": 1,
                "accredited": 1,
                "image": 1,
                "link": 1,
                "timeOffset": 1,
                "timeStart": 1,
                "timeEnd": 1,
                "currentMember":1,
                "userId": 1,
                "presenter":1,

                "isHost": "$currentMember.isHost",
                "isPresenter": "$currentMember.isPresenter"
                

            }
        },
        {
            "$addFields": {
                "slotTime": { $toDate: { $multiply: ["$timeStart", 1000] } },
                "dataType": "webinar"
            }
        },
        {
            $project: {
                "currentMember":0
            }
        }
    ]

    query = [
        ...query,
        ...[{
            $sort: { _id: -1 }
        },
        {
            $skip: skip
        },
        {
            $limit: limit
        }]
    ]

    let webinars = await Webinar.aggregate(query)
    return webinars
}

const createAppointmentBooking = async ({offset,consultantId, appointmentDate, slotId, patientDetails, sessionMode, startUtc, endUtc, adminSettings, userId, organizationId, isEmergency}) => {
    
    // slotId = slotId.map(ids => ids.toString());
    slotId              = slotId.map(ids => ObjectId(ids));
    let MSG             = '';
    const doctorCountry = await User.findOne({ _id: ObjectId(userId) }, {countryId:1}).populate({ path: 'countryId', select: '_id name currency' }).lean();
    const countryName   = doctorCountry.countryId.name.replace(/\s+/g, '-').toLowerCase();
    const currencyCode  = (doctorCountry && doctorCountry.countryId && doctorCountry.countryId.currency) ? doctorCountry.countryId.currency : "";
    const consultant    = await User.findOne({_id: ObjectId(consultantId) , isDeleted: false, isSuspended: false});
    let fromAppmDate    = new Date(appointmentDate).setHours(0, 0, 0);
    let toAppmDate      = new Date(new Date(appointmentDate).setHours(0, 0, 0)).setDate(new Date(new Date(appointmentDate).setHours(0, 0, 0)).getDate() + 1);

    // console.log(consultant)
    // return

    let slot = await Slot.aggregate([
        {
            $match: {
                doctorId: ObjectId(consultantId),
            /* slotDate: {
                    $gte: new Date(startUtc),
                    $lt: new Date(endUtc)
                } */
            }
        },
        {
            $unwind: "$slots"
        },
        {
            $match: {
                'slots.utcTime': {
                    $gte: new Date(startUtc),
                    $lt: new Date(endUtc)
                },
                'slots._id': { $in: slotId },
                //'slots.utcTime': { $gt : new Date() },
                'slots.isBooked': false
            }
        }
    ]);

    //return res.badRequest({}, "Please select another consultant.");
    let bookingRecord = {};

    if (slot.length > 0 && slot[0]) {

        var pastTime = slot.filter(elm => elm.slots.utcTime <= utcDateTime())

        if (pastTime.length > 0) {
            MSG = "You cannot select slot for past time.";
            // return res.badRequest({}, "You cannot select slot for past time.");
        } 

        var slots = [];
        var available = false;

        slot.filter(slt => {
            let slotId2 = slotId.map(ids => ids.toString() );
            if (slotId2.includes(slt.slots._id.toString())) {
                if (slt.slots.isBooked) {
                    available = true;
                }
                slots.push(slt.slots);
            }
        });

        for (let i = 0; i < slots.length - 1; i++) {
            if (!moment(slots[i].utcTime).add(15, 'minutes').isSame(moment(slots[i + 1].utcTime))) {
                MSG = 'Slots are not consecutive, select consecutive slots and try again.';
                // return res.badRequest({}, req.__('Slots are not consecutive, select consecutive slots and try again.'));
            }
        }

        if (available) {
            MSG = "Not available, try again using another slot.";
            // return res.badRequest({}, "Not available, try again using another slot.");
        }

        available = false;
        let amount          = Number(sessionMode === 'audio' ? consultant.audioSessionRate * slots.length : ('video' ? consultant.videoSessionRate * slots.length : ''));
        let gst             = parentage(adminSettings.gst,amount) * 100;
        let adminFlatFee    = (Number(adminSettings.adminFlatFee) || 0) * 100;

        amount = Number(amount) * 100;
        
        const totalPayable = amount + Number(gst);
        let bookingDetails = {
            slotId: slot[0]._id,
            date: moment.utc(moment(appointmentDate).format("YYYY-MM-DD")).toISOString(),
            slots: slots,
            mode: sessionMode,
            amount,
            gst: Number(gst),
            adminFlatFee,
            totalPayable
        };

        const ID = `${parseInt(process.env.MIN_BOOKING_ID) + await Appointment.countDocuments({})}`;
    
        // let options = {
        //     amount: Number(bookingDetails.totalPayable) * 100,
        //     currency: process.env.CURRENCY || "INR",
        //     receipt: ID
        // };
        // let order = await instance.orders.create(options);


        let newAppointment = {
            offset,
            appointmentId: ID,
            doctor: ObjectId(userId),
            consultant: ObjectId(consultantId),
            //patient: process.env.NODE_ENV === 'production' ? {} : patientDetails,
            patient: patientDetails,
            bookingDetails: bookingDetails,
            isEmergency,
            countryName
        }

        if( organizationId ){
            newAppointment = {
                paymentStatus: 'SUCCESS',
                organizationId:  ObjectId( organizationId.toString() ) ,
                ...newAppointment
            }
        }else{

            let options = {
                amount      : bookingDetails.totalPayable,
                currency    : (currencyCode && currencyCode == "INR") ? process.env.CURRENCY || "INR" : currencyCode ,
                receipt     : ID
            };
            
            let order = await instance.orders.create(options).catch(err => console.log("err----->" ,err));

            newAppointment = {
                paymentStatus: 'PENDING',
                ...(order && { orderId: order.id }),
                ...newAppointment
            }
        }

        let appointmentSave = await (new Appointment(newAppointment)).save();
        let appointmentSavedId = appointmentSave._id;

        if (process.env.NODE_ENV === 'production' && countryName && !!patientDBConnections[countryName]) {
            ['documents', 'doctorVoiceNote', 'prescriptions', 'consultantVoiceNote', 'consultDescription'].map((recordtype) => {
                if (patientDetails[recordtype]) {
                    patientDetails[recordtype].map((d, index) => {
                      patientDetails[recordtype][index]["_id"] = new mongoObjectId();
                    })
                }
                return true
            })
            const encryptedData = await patientDBConnections[countryName].encryptData(patientDetails);
            await patientDBConnections[countryName].insertData({appointmentId: new mongoObjectId(appointmentSavedId), ...encryptedData});
        }

        if(isEmergency == true){
            setTimeout( async function(){
                let appointmentDetails = await Appointment.findOne({_id: appointmentSavedId, isEmergency: true}).lean();
                if( appointmentDetails && appointmentDetails.bookingDetails && appointmentDetails.bookingDetails.slots && appointmentDetails.bookingDetails.slots[0] && appointmentDetails.paymentStatus=='PENDING'){
                    try{
                        await Appointment.updateOne({
                            _id: appointmentDetails._id
                        },
                        {
                            $set: {isDeleted: true}
                        });
                    }catch(err){
                        console.log("err",err)
                    }
                }
            },paymentBufferTime )
        }
        //let xA = await appointmentSave.save();

        if (organizationId) {
            let appointment = await Appointment.findOne({ _id: appointmentSavedId })
                .populate({
                    path: 'consultant',
                    select: '_id fullName deviceToken pushNotificationAllowed'
                })
                .populate({
                    path: 'doctor',
                    select: '_id fullName deviceToken pushNotificationAllowed'
                }).lean();
                const getAppointment = await Appointment.aggregate([
                    { $match: { _id: ObjectId(appointment._id.toString()) } },
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
                            bookingDetails: 1,
                            slotDate: '$bookingDetails.date',
                            firstSlot: { $arrayElemAt: ["$firstSlot.slotTime", 0] },
                            lastSlot: { $arrayElemAt: ["$lastSlot.slotTime", 0] },
                            firstUtcTime: { $arrayElemAt: ["$firstSlot.utcTime", 0] },
                            lastUtcTime: { $arrayElemAt: ["$lastSlot.utcTime", 0] }
                        }
                    },
                    {
                        $project: {
                            bookingDetails: 1,
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
                            bookingDetails: 1,
                            utcTime: 1,
                            slotDate: 1,
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
                    },
                ]);

            const notification = [
                {
                    type: 'PAYMENT_SUCCESS',
                    appointment: appointment._id,
                    title: 'Appointment booked!',
                    message: `Appointment has been booked with Dr ${appointment.consultant.fullName}.`,
                    user: appointment.doctor._id,
                },
                {
                    type: 'PAYMENT_SUCCESS',
                    appointment: appointment._id,
                    title: 'Appointment booked!',
                    message: `Appointment has been booked with Dr ${appointment.doctor.fullName}.`,
                    user: appointment.consultant._id,
                },
            ];
            let fcmData = {
                appointment: appointment._id,
                type: 'PAYMENT_SUCCESS',
                utcTime: getAppointment[0].utcTime
            }
            if (appointment.doctor.pushNotificationAllowed) {
                sendFCMPush(appointment.doctor.deviceToken, notification[0].title, notification[0].message, fcmData);
            }
            if (appointment.consultant.pushNotificationAllowed) {
                sendFCMPush(appointment.consultant.deviceToken, notification[1].title, notification[1].message, fcmData);
            }
            notification.length && await Notification.insertMany(notification);
            
            let agendaData;
            let slotsEle = appointment.bookingDetails.slots[0];
            const scheduleNotificationTime = new Date(new Date(slotsEle.utcTime).setMinutes(new Date(slotsEle.utcTime).getMinutes() - 5))
            agendaData = { appointmentId: appointment._id, doctor: appointment.doctor._id, agenda_type: 'appointment_reminder_notification', consultant: appointment.consultant._id, slotTime: slotsEle.utcTime };
            agenda.schedule(scheduleNotificationTime, 'appointment_reminder_notification', agendaData);
            
            let saveSlot = await Slot.findOne({ _id: getAppointment[0].bookingDetails.slotId });

            saveSlot.slots.filter(slt => {
                getAppointment[0].bookingDetails.slots.some(apSlt => {
                    if (slt._id.toString() === apSlt._id.toString()) {
                        slt.isBooked = true;

                        if (organizationId) {
                            slt.paymentStatus = 'SUCCESS';
                        }
                    }
                });
            });
            await saveSlot.save();
        }
    
        if(appointmentSavedId && appointmentSavedId !=''){
            MSG = "Your appointment with Dr " + consultant.fullName + " has been booked successfully.";
            bookingRecord = {
                slots,
                appointmentId: appointmentSavedId
            }
        }

        bookingRecord = {
            MSG,
            ...bookingRecord
        }
        return bookingRecord;
    }
    else {
        return bookingRecord;
        // return res.notFound({}, "These slots are not available .");
    }
}

module.exports = new AppointmentController();

function getFormatDate(currentDate) {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const day = String(currentDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;

}

function getLocalTimeString(timestamp) {
    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}`
}
