const {
    models: { Appointment, User, Payment, Slot, Notification, AdminSettings ,PaymentRequest}
} = require('../../../../lib/models');
const jwt = require('jsonwebtoken');
const { logError, sendFCMPush, getUserWalletBalance, showDate } = require('../../../../lib/util');
const { percentage } = require('../../util/common');
const { generateToken } = require('../../util/common');
const crypto = require("crypto");
const Razorpay = require('razorpay');
const axios = require('axios');
const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;
const { sendMail } = require('../../../../lib/mailer');
const moment = require("moment")
const { encryptMessage,decryptMessage } = require("../../../../lib/encryptions")

var Agenda = require('agenda');
var agenda = new Agenda({ db: { address: process.env.MONGO_URI } });

class PaymentController {

    async aboutBlank(req, res) {
        return res.render('payments/about_blank')
    }

    async createAccount(req, res) {
        const { user } = req;

        const accountDetail = req.body;

        let data = {
            name: accountDetail.bank_account.beneficiary_name,
            email: user.bankEmail,
            tnc_accepted: accountDetail.tnc_accepted,
            account_details: {
                business_name: accountDetail.account_details.business_name,
                business_type: accountDetail.account_details.business_type
            },
            bank_account: {
                ifsc_code: accountDetail.bank_account.ifsc_code,
                beneficiary_name: accountDetail.bank_account.beneficiary_name,
                ...(accountDetail.bank_account.account_type && { account_type: accountDetail.bank_account.account_type }),
                account_number: accountDetail.bank_account.account_number,
            }
        }
        try {
            let token = await axios({
                method: 'post',
                url: 'https://api.razorpay.com/v1/beta/accounts',
                auth: {
                    username: process.env.RAZORPAY_KEY_ID,
                    password: process.env.RAZORPAY_KEY_SECRET
                },
                headers: {
                    'Content-Type': 'application/json',
                },
                withCredentials: true,
                data: data
            });

            if (token.status === 200 && token.data.id) {
                data.id = token.data.id;
                await User.findOneAndUpdate({ _id: user._id }, {
                    accountDetails: data,
                    step: 4,
                    isAccountComplete: true,
                    audioSessionRate: accountDetail.audioSessionRate,
                    videoSessionRate: accountDetail.videoSessionRate,
                    ...(accountDetail.deviceToken && { deviceToken: accountDetail.deviceToken })
                });
                return res.success({}, 'Account successfully created.')
            }

            return res.warn({}, token)

        } catch (err) {
            return res.warn({}, (err.response && err.response.data.error) ? err.response.data.error.description : 'Something went wrong.')
        }
    }

    async reqToAccountUpdate(req, res) {
        let { user } = req;

        if (!user) {
            return res.unauthorized('', req.__('USER_NOT_FOUND'));
        }

        const accountDetail = req.body;

        let {  hash, encrypt } = await encryptMessage(accountDetail.email)
        if( user.dob ){
            let { encrypt } = await encryptMessage(user.dob)
            user.dob = dob
        }

        let data = {

            name: accountDetail.name,
            email: accountDetail.email,
            emailHash: hash,
            tnc_accepted: accountDetail.tnc_accepted,
            account_details: {
                business_name: accountDetail.account_details.business_name,
                business_type: accountDetail.account_details.business_type
            },
            bank_account: {
                ifsc_code: accountDetail.bank_account.ifsc_code,
                beneficiary_name: accountDetail.bank_account.beneficiary_name,
                ...(accountDetail.bank_account.account_type && { account_type: accountDetail.bank_account.account_type }),
                account_number: accountDetail.bank_account.account_number,
            }
        }
        user.accountEmail= data;
        await User.updateOne({
            _id: user._id
        },{
            $set: {
                accountEmail: data
            }
        })
        //await user.save();
        res.success('', req.__('REQUEST_SENDED'));
       
    }

    async success(req, res) {
        try {
            let { name, allWallet } = req.query;
            let adminSetting = await AdminSettings.findOne({});
            let appointment;

            if( ObjectId.isValid(name) ){
                appointment = await Appointment.findOne({  _id: name }).populate({ path: 'doctor', select: '_id fullName' }).populate({ path: 'consultant', select: '_id fullName'}).lean();
            }

            let consultantId        = (appointment && appointment.consultant && appointment.consultant._id) ? appointment.consultant._id : ""; 
            let doctorId            = (appointment && appointment.doctor && appointment.doctor._id) ? appointment.doctor._id : "";
            const consultantData    = await User.findOne({ _id: ObjectId(consultantId) } ,{currency : 1 }).populate({ path: 'countryId', select: '_id currency' }).lean();
            const doctorData        = await User.findOne({ _id: ObjectId(doctorId) } ,{currency : 1 }).populate({ path: 'countryId', select: '_id currency' }).lean();
            let consultantCurrency  = (consultantData && consultantData.countryId && consultantData.countryId.currency) ? consultantData.countryId.currency : "";
            let doctorCurrency      = (doctorData && doctorData.countryId && doctorData.countryId.currency) ? doctorData.countryId.currency : "";
            
            if (appointment?.isWallet && !appointment?.isWalletUpdate && appointment.walletAmount) {
                await PaymentRequest.create({
                    appointmentId: appointment._id,
                    consultant_id: appointment.doctor._id,
                    "amount": appointment.walletAmount,
                    "status": "PENDING",
                    action_date: moment().utc(),
                    isShowOnList: false
                })

                let set = {
                    isWalletUpdate: true, "paymentStatus": "SUCCESS",
                }
                if (allWallet && allWallet == 'yes') {
                    set['paymentMethod'] = 'wallet'
        
                    let amount            = Number(appointment.bookingDetails.totalPayable / 100);
                    let consultantAmount  = amount;
                    let tax               = 100 + Number(adminSetting.gst)
                    consultantAmount = (Number(consultantAmount / tax) * 100);

                    if(consultantCurrency == "INR" && doctorCurrency == "INR"){
                        consultantAmount = (Number(consultantAmount / tax) * 100);
                    }else if(consultantCurrency != "INR" && doctorCurrency == "INR"){
                        consultantAmount = (Number(consultantAmount / tax) * 100);
                    }else if(consultantCurrency != "INR" && doctorCurrency != "INR"){
                        consultantAmount = amount;
                    }else if(consultantCurrency == "INR" && doctorCurrency != "INR"){
                        consultantAmount = amount;
                    }

                    let consultantFee       = percentage((100 - adminSetting.adminCommission), consultantAmount)
                    consultantFee           = consultantFee - adminSetting.adminFlatFee
                    set['consultantFee']    = consultantFee

                    sendNotificationAppointment({"appointmentId": appointment._id, "consultantFee": consultantFee});

                }

                await Appointment.updateOne({
                    _id: appointment._id
                }, {
                    $set: set
                })

                name = appointment.doctor.fullName

                let appointmentIdd = appointment._id
                if( appointment.isEmergency ){
                    //data change
                    let appointment = await Appointment.findOne({ 
                        _id: appointmentIdd
                    }).lean();
                    let bookingDetails = appointment.bookingDetails
                    let offset = appointment.offset || 330
                    offset = +offset;
                    
                    let currentTime = moment.unix(moment().utc().unix()+ (330*60) ).format("hh:mm A")
                    let currentTime15 = moment.unix(moment().utc().unix()+ (330*60) + (15*60) ).format("hh:mm A")

                    let bookingDate = moment().toISOString();

                    bookingDetails.slots[0].slotTime = `${currentTime} -  ${currentTime15}`
                    bookingDetails.slots[0].utcTime = bookingDate

                    await Appointment.updateOne({
                        _id: appointmentIdd
                    },{
                        $set: {
                            bookingDetails
                        }
                    })

                    let slots = await Slot.findOne({ _id: bookingDetails.slotId }).lean();

                    let startDate = bookingDate
                    let endDate = moment().add({'minutes': 15}).toISOString();
                    let time = `${currentTime} -  ${currentTime15}`;

                    let newSlots = slots.slots;
                    newSlots[0]['slotTime'] = time
                    newSlots[0]['utcTime'] = bookingDate

                    newSlots[0]["isBooked"] = false
			        newSlots[0]["paymentStatus"] = "SUCCESS"
                    console.log("aaaaaaaaaaaaaaaaaaaaaaaaa")
                    await Slot.updateOne({
                        _id: bookingDetails.slotId
                    },{
                        $set: {
                            startDate,endDate,time,
                            "slots":newSlots
                        }
                    })
                    console.log("bbbbbbbbbbbbbbbbbbbbbbbbb")
                }
            }

            //return
            let consultant = appointment?.consultant?.fullName
            if( !consultant ){
                consultant = ""
            }
            return res.render(`payments/success`, {
                title: "Payment successful.",
                name: consultant 
            })
        } catch (err) {
            console.log("Payment success err", err);
        }
    }

    async failed(req, res) {
        const { description } = req.query;
        return res.render('payments/failed', {
            title: "Payment verification failed",
            description: description || ''
        });
    }

    async initHoldCharge(req, res) {
        try{        
            const { token,isWallet } = req.params;
            const instance = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET
            });
            jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
                if (err || !decoded.id) return res.render('payments/hold-charge', {
                    command: 'showErrorMessage',
                    successTitle: '',
                    successMsg: '',
                    errorCodeTitle: req.__('ERROR_CODE'),
                    errorCode: 'TOKEN_DECODING_ERROR',
                    errorTitle: req.__('TOKEN_DECODING_ERROR'),
                    errMsg: req.__('FAILED_TO_INIT_PAYMENT'),
                    publicKey: process.env.RAZORPAY_KEY_ID,
                    appointmentId: '',
                    orderId: '',
                    amount: 0,
                    email: ''
                });

                const appointment   = await Appointment.findOne({ _id: decoded.id })
                .populate({ path: 'doctor', select: '_id fullName email phone address customerId' })
                .populate({path: 'consultant', select: '_id accountDetails' })
                //.lean();
                const adminSettings = await AdminSettings.findOne({}); 
                let doctorId        = (appointment && appointment.doctor && appointment.doctor._id) ? appointment.doctor._id : ""; 
                const doctorData    = await User.findOne({ _id: ObjectId(doctorId) } ,{currency : 1 }).populate({ path: 'countryId', select: '_id currency' }).lean();
                let doctorCurrency  = (doctorData && doctorData.countryId && doctorData.countryId.currency) ? doctorData.countryId.currency : "";


                // console.dir(appointment,{depth:3})
                // return
                // console.dir(doctorData,{depth:2})
                // console.dir(doctorCurrency,{depth:2})
                

                if (!appointment) {

                    return res.render('payments/hold-charge', {
                        command: 'showErrorMessage',
                        successTitle: '',
                        successMsg: '',
                        errorCodeTitle: req.__('ERROR_CODE'),
                        errorCode: 'ORDER_NOT_EXISTS',
                        errorTitle: req.__('UNAUTHORIZED'),
                        errMsg: req.__('ORDER_NOT_EXISTS'),
                        publicKey: process.env.RAZORPAY_KEY_ID,
                        orderId: '',
                        appointmentId: '',
                        amount: 0,
                        payableAmount:0,
                        email: '',
                        name: '',
                        gst:'',
                    });
                }

                if (!appointment.doctor) {

                    return res.render('payments/hold-charge', {
                        command: 'showErrorMessage',
                        successTitle: '',
                        successMsg: '',
                        errorCodeTitle: req.__('ERROR_CODE'),
                        errorCode: 'USER_NOT_EXISTS',
                        errorTitle: req.__('UNAUTHORIZED'),
                        errMsg: req.__('USER_NOT_EXISTS'),
                        publicKey: process.env.RAZORPAY_KEY_ID,
                        orderId: '',
                        amount: 0,
                        email: '',
                        name: '',
                        gst:'',
                        payableAmount:0
                    });
                }

                let customerId
                if (!appointment.doctor.customerId) {
                    let getCustomer = await instance.customers.create({
                        name: appointment.doctor.fullName,
                        email: appointment.doctor.email,
                        contact: appointment.doctor.phone, notes: {},
                        fail_existing: 0
                    });

                    await User.updateOne({
                        _id: appointment.doctor,
                        isDeleted: false
                    }, {
                        $set: {
                            customerId: getCustomer.id,
                        }
                    });
                    customerId = getCustomer.id
                }else{
                    customerId = appointment.doctor.customerId
                }

                let amount              = (doctorCurrency && doctorCurrency == "INR") ? Math.round(Number(appointment.bookingDetails.amount || 1)) : Math.round(Number(appointment.bookingDetails.amount / adminSettings.conversionRate || 1));
                let gst                 = (doctorCurrency && doctorCurrency == "INR") ? Math.round(Number(appointment.bookingDetails.gst)) : 0;
                let adminFlatFee        = (doctorCurrency && doctorCurrency == "INR") ? Number(appointment.bookingDetails.adminFlatFee || 0) : Number((appointment.bookingDetails.adminFlatFee / adminSettings.conversionRate).toFixed(2) || 0);
                let payableAmount       = amount + gst;
                let realPayableAmount   = amount + gst;
                let fromWallet          = false;
                let walletAmount        = 0;
                let orderId             = appointment.orderId;

                

                if (isWallet && isWallet == "yes") {
                    let walletBalance   = await getUserWalletBalance({ userId: appointment.doctor._id })
                    if ( !isNaN(walletBalance) &&   (+walletBalance>0)  ) {
                        amount          = (doctorCurrency && doctorCurrency == "INR") ? Math.round(Number(appointment.bookingDetails.amount || 1)) : Math.round(Number(appointment.bookingDetails.amount / adminSettings.conversionRate || 1));
                        gst             = (doctorCurrency && doctorCurrency == "INR") ? Math.round(Number(appointment.bookingDetails.gst)) : 0;
                        adminFlatFee    = (doctorCurrency && doctorCurrency == "INR") ? Number(appointment.bookingDetails.adminFlatFee|| 0) : Number(appointment.bookingDetails.adminFlatFee / adminSettings.conversionRate || 0);
                        walletBalance   = (doctorCurrency && doctorCurrency == "INR") ? walletBalance : Number((walletBalance / adminSettings.conversionRate).toFixed(2));
                        payableAmount   = amount + gst;
                        payableAmount   = payableAmount - (walletBalance * 100);
                        fromWallet      = true;
                        walletAmount    = walletBalance;

                        if( payableAmount>0 ){
                            const ID = `${parseInt(process.env.MIN_BOOKING_ID) + await Appointment.countDocuments({})}`;
                            let options = {
                                amount      : Number(payableAmount),
                                currency    : (doctorCurrency && doctorCurrency == "INR") ? process.env.CURRENCY || "INR" : doctorCurrency,
                                receipt     : ID
                            };
                            let order = await instance.orders.create(options).catch((err) => console.log("err----->",err));
                            orderId = order.id
                        }else{
                            //payableAmount = 0
                        }
                    }
                }else{
                    const ID = `${parseInt(process.env.MIN_BOOKING_ID || 1) + await Appointment.countDocuments({})}`;
                    let options = {
                        amount          : Number(payableAmount),
                        currency        : (doctorCurrency && doctorCurrency == "INR") ? process.env.CURRENCY || "INR" : doctorCurrency,
                        receipt         : ID
                    };
                    let order = await instance.orders.create(options).catch((err) => console.log("err----->",err));
                    orderId = order.id
                }

                if (fromWallet) {
                    if( payableAmount<=0 ){
                        walletAmount =  realPayableAmount/100;
                    }

                    let set = {
                        isWallet: true,
                        walletAmount : (doctorCurrency && doctorCurrency == "INR") ? walletAmount : Math.floor(Number(walletAmount * adminSettings.conversionRate)),
                        orderId
                    }

                    Appointment.updateOne({
                        _id: appointment._id
                    }, {
                        $set: set
                    }).exec((err)=> console.log("err------>",err))
                    //payableAmount = 0
                    if( payableAmount<=0 ){
                        payableAmount = 0
                    }
                } else {
                    Appointment.updateOne({
                        _id: appointment._id
                    }, {
                        $set: {
                            isWallet: false,
                            walletAmount: 0,
                            orderId
                        }
                    }).exec((err)=> console.log("err------>",err))
                }


                

                return res.render('payments/hold-charge', {
                    command: 'holdCharge',
                    successTitle: '',
                    successMsg: req.__('REDIRECTING_TO_PAYMENTS'),
                    errorCodeTitle: '',
                    errorCode: '',
                    errorTitle: '',
                    errMsg: '',
                    publicKey: process.env.RAZORPAY_KEY_ID,
                    
                    //orderId: appointment.orderId,
                    appointmentId: appointment._id,
                    //amount: Math.ceil(Number(appointment.bookingDetails.totalPayable || 1) * 100), // this used for payment getaway
                    //gst: Math.ceil(Number(appointment.bookingDetails.gst || 0) * 100),

                    orderId: orderId,
                    adminFlatFee: (adminFlatFee),
                    amount,
                    gst,

                    email: appointment.doctor.email,
                    name: appointment.doctor.fullName,
                    contact: appointment.doctor.phone,
                    currency: (doctorCurrency && doctorCurrency == "INR") ? process.env.CURRENCY || "INR" : doctorCurrency,
                    customerId: customerId,
                    //payableAmount: Math.ceil(Number(appointment.bookingDetails.amount || 1) * 100), // this used for display 
                    
                    payableAmount,
                    walletAmount
                });
            });
        }catch(err){
            console.log("🚀 ~ PaymentController ~ initHoldCharge ~ err:", err)
        }
    }

    async verify(req, res, next) {
        if (req.body.error && req.body.error.code === 'BAD_REQUEST_ERROR') {
            return res.redirect(`/api/payments/failed?description=${req.body.error.description}`);
        }
        let adminSetting = await AdminSettings.findOne({});
        let { amount } = req.params;
        let appointmentId = req.body.razorpay_order_id;

        const appointmentData   = await Appointment.findOne({ orderId: appointmentId },{consultant:1,doctor:1}).lean();
        const adminFlatFee      = Number(adminSetting.adminFlatFee) || 0;
        const consultantData    = await User.findOne({ _id: ObjectId(appointmentData.consultant) } ,{currency : 1 }).populate({ path: 'countryId', select: '_id currency' }).lean();
        const doctorData        = await User.findOne({ _id: ObjectId(appointmentData.doctor) } ,{currency : 1 }).populate({ path: 'countryId', select: '_id currency' }).lean();
        let doctorCurrency      = (doctorData && doctorData.countryId && doctorData.countryId.currency) ? doctorData.countryId.currency : "";
        let consultantCurrency  = (consultantData && consultantData.countryId && consultantData.countryId.currency) ? consultantData.countryId.currency : "";

        let body = req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id;
        let expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === req.body.razorpay_signature) {
            if(consultantCurrency == "INR" && doctorCurrency == "INR"){
                amount  =  Number(amount);
            }else if(consultantCurrency != "INR" && doctorCurrency == "INR"){
                amount  =  Number(amount);
            }else if(consultantCurrency != "INR" && doctorCurrency != "INR"){
                amount  =  Number(Math.floor(amount * adminSetting.conversionRate));
            }else if(consultantCurrency == "INR" && doctorCurrency != "INR"){
                amount  =  Number(Math.floor(amount * adminSetting.conversionRate));
            }

            amount  =  Number(amount);
            let consultantAmount  = amount;
            let tax = 100 + Number(adminSetting.gst)

            consultantAmount = (Number(consultantAmount / tax) * 100);

            let consultantFee   = percentage((100 - adminSetting.adminCommission), consultantAmount)
            consultantFee       = consultantFee - adminFlatFee
            
            //todo
           /*  if (consultantId !== 'null') {
                let data = {
                    "transfers": [
                        {
                            "account": consultantId,
                            "amount": consultantFee * 100,
                            "currency": process.env.CURRENCY,
                            "on_hold": true,
                            "on_hold_until":Math.ceil(new Date().getTime()/1000) + (4 * 24 * 60 * 60 )
                        }
                    ]
                } */

              let paymentRes =  await Payment.findOneAndUpdate({ orderId: req.body.razorpay_order_id },
                    {
                        paymentId: req.body.razorpay_payment_id,
                        signature: req.body.razorpay_signature,
                        paymentStatus: "SUCCESS"
                    },
                    {returnOriginal: false, upsert: true, }
                );
                
                let appointment = await Appointment.findOneAndUpdate({ 
                    orderId: req.body.razorpay_order_id 
                },{ 
                    $set: {
                        paymentStatus: 'SUCCESS', consultantFee, isCanceled: false, paymentId: paymentRes._id 
                    }  
                },{ 
                    returnOriginal: false 
                })
                    .populate({
                        path: 'consultant',
                        select: '_id fullName deviceToken pushNotificationAllowed'
                    })
                    .populate({
                        path: 'doctor',
                        select: '_id fullName deviceToken pushNotificationAllowed'
                    });

                let appointmentIdd = appointment._id
                if( appointment.isEmergency ){
                    //data change
                    let appointment = await Appointment.findOne({ 
                        _id: appointmentIdd
                    }).lean();
                    let bookingDetails = appointment.bookingDetails
                    let offset = appointment.offset || 330
                    offset = +offset;
                    
                    let currentTime = moment.unix(moment().utc().unix()+ (330*60) ).format("hh:mm A")
                    let currentTime15 = moment.unix(moment().utc().unix()+ (330*60) + (15*60) ).format("hh:mm A")
                    let bookingDate = moment().toISOString() ;

                    bookingDetails.slots[0].slotTime = `${currentTime} -  ${currentTime15}`
				    bookingDetails.slots[0].utcTime = bookingDate

                    await Appointment.updateOne({
                        _id: appointmentIdd
                    },{
                        $set: {
                            bookingDetails
                        }
                    })

                    let slots = await Slot.findOne({ _id: bookingDetails.slotId }).lean();

                    let startDate = bookingDate
                    let endDate = moment().add({'minutes': 15}).toISOString();
                    let time = `${currentTime} -  ${currentTime15}`;

                    let newSlots = slots.slots;
                    newSlots[0]['slotTime'] = time
                    newSlots[0]['utcTime'] = bookingDate

                    newSlots[0]["isBooked"] = false
			        newSlots[0]["paymentStatus"] = "SUCCESS"

                    console.log("cccccccccccccccccccccccccccc")
                    await Slot.updateOne({
                        _id: bookingDetails.slotId
                    },{
                        $set: {
                            startDate,endDate,time,
                            "slots":newSlots
                        }
                    })
                    console.log("11111111111111111111")

                    /*let newSlots = [
                        {
                            "isBooked" : false,
                            "paymentStatus" : "PENDING",
                            "_id" : ObjectId("64e8ad40689a075060430d87"),
                            "bookingId" : "",
                            "slotTime" : "7:06 PM - 7:21 PM",
                            "utcTime" : ISODate("2023-08-25T19:06:00.000+05:30")
                        }
                    ],*/


                }

                const getAppointment = await Appointment.aggregate([
                    { $match: { _id: ObjectId(appointment._id) } },
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
                let agendaData;
                let slotsEle = appointment.bookingDetails.slots[0];
                const scheduleNotificationTime = new Date(new Date(slotsEle.utcTime).setMinutes(new Date(slotsEle.utcTime).getMinutes() - 5))
                agendaData = { appointmentId: appointment._id, doctor: appointment.doctor._id, agenda_type: 'appointment_reminder_notification', consultant: appointment.consultant._id, slotTime: slotsEle.utcTime };
                agenda.schedule(scheduleNotificationTime, 'appointment_reminder_notification', agendaData);
                
                let saveSlot = await Slot.findOne({ _id: getAppointment[0].bookingDetails.slotId });

                saveSlot.slots.filter(slt => {
                    getAppointment[0].bookingDetails.slots.some( apSlt => {
                       if(  slt._id.toString() === apSlt._id.toString()){
                        slt.isBooked = true;
                        slt.paymentStatus = 'SUCCESS';
                       }
                   });
                });
                console.log("11111111111111111111")
                await saveSlot.save();
                console.log("222222222222222222222")


                const notification = [
                    {
                        type: 'PAYMENT_SUCCESS',
                        appointment: appointment._id,
                        title: 'Appointment booked!',
                        //message: `Appointment has been booked for ${showDate(getAppointment[0].slotDate, 'MMM DD YYYY')} at ${getAppointment[0].slot.from}- ${getAppointment[0].slot.to} with Dr ${appointment.consultant.fullName}.`,
                        message:`Appointment has been booked with Dr ${appointment.consultant.fullName}.`,
                        user: appointment.doctor._id,
                    },
                    {
                        type: 'PAYMENT_SUCCESS',
                        appointment: appointment._id,
                        title: 'Appointment booked!',
                        //message: `Appointment has been booked for ${showDate(getAppointment[0].slotDate, 'MMM DD YYYY')} at ${getAppointment[0].slot.from}- ${getAppointment[0].slot.to} with Dr ${appointment.doctor.fullName}.`,
                        message:`Appointment has been booked with Dr ${appointment.doctor.fullName}.`,
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
               /*  let payoutRoute = await axios({
                    method: 'post',
                    url: `https://api.razorpay.com/v1/payments/${req.body.razorpay_payment_id}/transfers`,
                    auth: {
                        username: process.env.RAZORPAY_KEY_ID,
                        password: process.env.RAZORPAY_KEY_SECRET
                    },
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    withCredentials: true,
                    data: JSON.stringify(data)
                }
                );

                */
                //return res.redirect(`/api/payments/success?name=${appointment.consultant.fullName}`);
                
                return res.redirect(`/api/payments/success?name=${appointment._id}`);

           // }

        } else {

            let metaData = JSON.parse(req.body.error.metadata);
            if (Object.keys(metaData).length === 0 && appointmentId) {
                let token = generateToken({id:appointmentId});
                return res.success({ token: `payments/hold-charge/${token}` }, req.__('ORDER_TOKEN'));
            }

            let appointmentFailed = await Appointment.findOneAndUpdate({ orderId: metaData.order_id },
                { paymentStatus: 'FAILED', isCanceled: true },
                { returnOriginal: false })
                .populate({
                    path: 'doctor',
                    select: '_id fullName deviceToken pushNotificationAllowed'
                });
            const getAppointment = await Appointment.aggregate([
                { $match: { _id: ObjectId(appointmentFailed._id) } },
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
                        firstSlot: { $arrayElemAt: ["$firstSlot.slotTime", 0] },
                        lastSlot: { $arrayElemAt: ["$lastSlot.slotTime", 0] },
                        firstUtcTime: { $arrayElemAt: ["$firstSlot.utcTime", 0] },
                        lastUtcTime: { $arrayElemAt: ["$lastSlot.utcTime", 0] }
                    }
                },
                {
                    $project: {
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
            let fcmData = {
                appointment: getAppointment[0]._id,
                type: 'PAYMENT_FAILED',
                utcTime: getAppointment[0].utcTime
            }
            if (appointmentFailed.doctor.pushNotificationAllowed) {
                sendFCMPush(appointmentFailed.doctor.deviceToken, 'Payment Failed !', 'Payment Failed !', fcmData);
            }
            let failedNotification = new Notification({
                type: 'PAYMENT_FAILED',
                title: 'Payment Failed !',
                appointment: appointmentFailed._id,
                message: `Payment Failed !`,
                user: appointmentFailed.doctor._id,
            });
            await failedNotification.save();
            let failedSlots = appointmentFailed.bookingDetails.slots.map((e) => {
                return e._id;
            });

            async function processArray(slots) {
                for (let id of slots) {
                    await Slot.updateOne({ 'slots._id': id }, { $set: { "slots.$.isBooked": false } });
                }
            }
            processArray(failedSlots);
            return res.redirect(`/api/payments/failed`);
        }
    }

    async saveCards(req, res) {
        let { user } = req;
        if (!user) {
            return res.unauthorized('', req.__('USER_NOT_FOUND'));
        }
        if (!user.customerId) {
            try {

                let getCustomer = await instance.customers.create({
                    name: user.fullName,
                    email: user.email,
                    contact: user.phone, notes: {},fail_existing: 0
                });

                let updatedUser = await User.findOneAndUpdate({
                    _id: user._id,
                    isDeleted: false
                }, {
                    $set: {
                        customerId: getCustomer.id,
                    }
                });
                user = updatedUser;
            } catch (err) {
                logError(err);
            }
        }

        try {

            let getCards = await axios({
                method: 'get',
                url: `https://api.razorpay.com/v1/customers/${user.customerId}/tokens`,
                auth: {
                    username: process.env.RAZORPAY_KEY_ID,
                    password: process.env.RAZORPAY_KEY_SECRET
                },
                withCredentials: true,
            });

            return res.success(getCards.data, 'Your card details.')

        } catch (err) {
            console.log('save cards err', err)
            return res.warn({}, 'Unable to get a token.')
        }
    }

    async paymentDetail(req, res) {
        const { id } = req.params;
        const { user } = req;
        if (!user) {
            return res.unauthorized('', req.__('USER_NOT_FOUND'));
        }

        const paymentData = await Appointment.aggregate([
            { $match: { _id: ObjectId(id) } },
            {
                $lookup: {
                    from: 'payments',
                    let: { paymentId: '$paymentId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: ['$_id', '$$paymentId']
                            }
                        },
                    ],
                    as: 'payment'
                }
            },
            { '$unwind': { path: '$payment', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    paymentAt: '$payment.created',
                    signature: '$payment.signature',
                    appointmentId: 1,
                    paymentStatus: 1,
                    orderId: 1,
                    amount: '$bookingDetails.totalPayable'
                }
            }
        ]);

        if (!paymentData.length) {
            return res.warn({}, 'Payment not found!')
        }
        return res.success(paymentData[0], 'Payment details.')
    }

    async paymentRequest(req, res) {
        try{
            const { user } = req;
            let { amount,bank_details} = req.body;
            console.log("🚀 ~ PaymentController ~ paymentRequest ~ req.body:", req.body)
            if (!user) {
                return res.unauthorized('', req.__('USER_NOT_FOUND'));
            }
        
            let current = new Date();
            let conn = await Appointment.aggregate([
                {
                    '$match': {
                        '$expr': { '$eq': ['$consultant', user._id] },
                        isCanceled: false,
                        isRefund: false,
                        paymentStatus:'SUCCESS',
                        // "bookingDetails.date": { "$lt": new Date( new Date().getTime() - (86400 * 1000 * 3)) },
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
                        total:1,
                        pendingTotal:1,
                        approveTotal:1
                    }
                }
            ]);

        
            const pendingRequest = await PaymentRequest.aggregate([
                { $match: {
                    "consultant_id": user._id, "status":"PENDING"
                    }
                },
                {
                    $group:{
                        _id: null,
                        pendingTotal: { 
                            $sum: "$amount" 
                        }
                    }
                }
            ]);
            const ApprovedRequest = await PaymentRequest.aggregate([
                { $match: {
                    "consultant_id": user._id, "status":"APPROVED"
                    }
                },
                {
                    $group:{
                        _id: null,
                        approvedTotal: { 
                            $sum: "$amount" 
                        }
                    }
                }
            ]);

            const walletAmount = await PaymentRequest.aggregate([
                { $match: {
                    "userId": user._id, "type":"wallettopup"
                    }
                },
                {
                    $group:{
                        _id: null,
                        walletTotal: { 
                            $sum: "$amount" 
                        }
                    }
                }
            ]);

            let total = 0
            if( conn && conn[0] && conn[0].total ){
                total = conn[0].total
            }

            //let { total } = conn[0];
            


            if(conn.length > 0){
                if(amount > ((total + (walletAmount.length? walletAmount[0].walletTotal: 0)) - ((pendingRequest.length? pendingRequest[0].pendingTotal: 0) + (ApprovedRequest.length?ApprovedRequest[0].approvedTotal:0)))) {
                    return res.warn({}, 'You can`t request an amount exceeding the wallet amount.');
                }
            }
            else if(walletAmount.length > 0){
                if(amount > ((walletAmount.length? walletAmount[0].walletTotal: 0) - ((pendingRequest.length? pendingRequest[0].pendingTotal: 0) + (ApprovedRequest.length?ApprovedRequest[0].approvedTotal:0)))) {
                    //return res.warn({}, 'You can`t request an amount exceeding the wallet amount.');
                    return res.warn({}, 'Request amount is lower then minimum request limit');
                }
            }else{
                return res.warn({}, 'You can`t request an amount exceeding the wallet amount.');
            }

            const userData          = await User.findOne({ _id: ObjectId(user._id) } ,{currency : 1 }).populate({ path: 'countryId', select: '_id currency' }).lean();
            const adminSettings     = await AdminSettings.findOne({}).lean();
            let userCurrency        = (userData && userData.countryId && userData.countryId.currency) ? userData.countryId.currency : "";

            if(userCurrency && userCurrency != "INR" && ((amount * adminSettings.conversionRate) > ( total + (walletAmount.length? walletAmount[0].walletTotal: 0) - ((pendingRequest.length? pendingRequest[0].pendingTotal: 0) + (ApprovedRequest.length?ApprovedRequest[0].approvedTotal:0))))){
                return res.warn({}, 'You can`t request an amount exceeding the wallet amount.');
            }

            let model               = new PaymentRequest();
            model.consultant_id     = user._id;
            model.bank_details      = bank_details;
            model.amount            = (userCurrency && userCurrency == "INR") ? amount : Math.ceil(amount * adminSettings.conversionRate);
            model.status            = "PENDING";
            let data                 = await model.save();
            if(data){
                sendMail('new-payment-request', req.__('NEW_PAYMENT_REQUEST'), process.env.PAYMENT_EMAIL, {
                    fullname    : user.fullname,
                    email       : user.email,
                    amount      : model.amount,
                
                })
                .catch(error => {
                    logError(`Failed to send password reset link to ${process.env.PAYMENT_EMAIL}`);
                    logError(error);
                });
            }
        
            
            return res.success({}, 'Payment Request successfully')
        }catch(err){
            console.log("err", err);
            return res.error(err, 'Payment Request failed')
        }



    }

    async paymentRequestList(req, res) {
        const { user} = req;
        const { pageIndex = 1, pageLimit = 5} = req.query;
      
        let data            = await PaymentRequest.find({"consultant_id":user._id,isShowOnList: true}).sort({"created":-1}).skip((parseInt(pageIndex)-1)*parseInt(pageLimit)).limit(parseInt(pageLimit));
        const adminSettings = await AdminSettings.findOne({}); 
        const userData      = await User.findOne({ _id: ObjectId(user._id) } ,{currency : 1 }).populate({ path: 'countryId', select: '_id currency' }).lean();
        let userCurrency    = (userData && userData.countryId && userData.countryId.currency) ? userData.countryId.currency : "";

        if(data && data.length){
            data.map(records => {
                if(userCurrency && userCurrency !="INR") return records.amount = Number((records.amount / adminSettings.conversionRate).toFixed(2));
            })
        }
        return res.success(data, 'Payment Request successfully')
    }

    async currencyPrice(req, res) {
        let currencyRate = await AdminSettings.findOne({},{_id : 0,conversionRate : 1});
        return res.success(currencyRate, 'Currency price get successfully')
    }
}

async function sendNotificationAppointment({ appointmentId,consultantFee }) {
    let appointment = await Appointment.findOneAndUpdate({ _id: appointmentId },
        { paymentStatus: 'SUCCESS', consultantFee, isCanceled: false, },
        { returnOriginal: false })
        .populate({
            path: 'consultant',
            select: '_id fullName deviceToken pushNotificationAllowed'
        })
        .populate({
            path: 'doctor',
            select: '_id fullName deviceToken pushNotificationAllowed'
        });
    const getAppointment = await Appointment.aggregate([
        { $match: { _id: ObjectId(appointment._id) } },
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

    let agendaData;
    let slotsEle = appointment.bookingDetails.slots[0];
    const scheduleNotificationTime = new Date(new Date(slotsEle.utcTime).setMinutes(new Date(slotsEle.utcTime).getMinutes() - 5))
    agendaData = { appointmentId: appointment._id, doctor: appointment.doctor._id, agenda_type: 'appointment_reminder_notification', consultant: appointment.consultant._id, slotTime: slotsEle.utcTime };
    agenda.schedule(scheduleNotificationTime, 'appointment_reminder_notification', agendaData);


    let saveSlot = await Slot.findOne({ _id: getAppointment[0].bookingDetails.slotId });
    console.log("WWWWWW",{
        saveSlot
    })

    if(saveSlot && saveSlot.slots){    
        saveSlot.slots.filter(slt => {
            getAppointment[0].bookingDetails.slots.some(apSlt => {
                if (slt._id.toString() === apSlt._id.toString()) {
                    slt.isBooked = true;
                    slt.paymentStatus = "SUCCESS";
                }
            });
        });
        await saveSlot.save();
    }
    const notification = [
        {
            type: 'PAYMENT_SUCCESS',
            appointment: appointment._id,
            title: 'Appointment booked!',
            //message: `Appointment has been booked for ${showDate(getAppointment[0].slotDate, 'MMM DD YYYY')} at ${getAppointment[0].slot.from}- ${getAppointment[0].slot.to} with Dr ${appointment.consultant.fullName}.`,
            message: `Appointment has been booked with Dr ${appointment.consultant.fullName}.`,
            user: appointment.doctor._id,
        },
        {
            type: 'PAYMENT_SUCCESS',
            appointment: appointment._id,
            title: 'Appointment booked!',
            //message: `Appointment has been booked for ${showDate(getAppointment[0].slotDate, 'MMM DD YYYY')} at ${getAppointment[0].slot.from}- ${getAppointment[0].slot.to} with Dr ${appointment.doctor.fullName}.`,
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
    return
}

module.exports = new PaymentController();
