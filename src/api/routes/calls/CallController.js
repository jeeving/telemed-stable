const {
    models: { Appointment, User, AdminSettings, PaymentRequest, PreWallet, Call }
} = require('../../../../lib/models');
const { sendFCMPushForVideoCall, sendIosVoipPush } = require('../../../../lib/util');

const crypto = require("crypto");
const Razorpay = require('razorpay');
const axios = require('axios');
const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;
const Twilio = require('twilio');
const AccessToken = Twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const VideoGrant = AccessToken.VideoGrant;
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioApiKey = process.env.TWILIO_API_KEY;
const twilioApiSecret = process.env.TWILIO_API_SECRET;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const moment = require("moment");
const client = require('twilio')(twilioAccountSid, authToken);
const twilio_client = new Twilio(twilioApiKey, twilioApiSecret, {
    accountSid: twilioAccountSid
});
const builder = require('xmlbuilder');

const feePer = 2;
const gstPer = 18;

const { v4: uuidv4 } = require('uuid');
class CallController {

    async addWallet(req, res) {
        try{
            const { user } = req;
            let { amount } = req.body;

            let fee = amount * feePer * 0.01
            fee = +fee.toFixed(2);
            
            let gst = fee* gstPer * 0.01
            gst = +gst.toFixed(2);

            const netAmount = amount;
            amount = netAmount - ( fee+gst )

            let wallet = await PreWallet.create({
                userId: user._id,
                amount,
                gst,
                fee,
                netAmount
            })

            let url = `${process.env.SITE_URL}/api/calls/hold-charge/${wallet._id}`

            return res.success({
                wallet,url
            });
        }catch(err){
            console.log("err",err)
        }
        
    }

    async initHoldCharge(req, res) {
        try {
            const { preWalletId } = req.params;
            const instance = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET
            });

            let preWallet = await PreWallet.findOne({
                _id: preWalletId
            }).lean()
            //console.log({preWallet})

            let user = await User.findOne({
                _id: preWallet.userId
            })
            .populate({ path: 'countryId', select: '_id currency' })
            .lean()

            if (!preWallet) return res.render('payments/hold-charge', {
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

            const adminSettings = await AdminSettings.findOne({});
            let doctorId = user._id
            const doctorData = user
            let userCurrency = (user && user.countryId && user.countryId.currency) ? user.countryId.currency : "";


            let customerId
            if (!user.customerId) {
                let getCustomer = await instance.customers.create({
                    name: user.fullName,
                    email: user.email,
                    contact: user.phone, notes: {},
                    fail_existing: 0
                });

                await User.updateOne({
                    _id: user._id,
                }, {
                    $set: {
                        customerId: getCustomer.id,
                    }
                });
                customerId = getCustomer.id
            } else {
                customerId = user.customerId
            }

            let amount = preWallet.netAmount

            //let payableAmount = (userCurrency && userCurrency == "INR") ? Math.round(Number(amount || 1)) : Math.round(Number(amount / adminSettings.conversionRate || 1));
            let payableAmount = (userCurrency && userCurrency == "INR") ? Math.round(Number(amount || 1)) : Math.round(Number(amount  || 1));
            let orderId 


            const ID = preWalletId;
            let options = {
                amount: Number(payableAmount)*100,
                currency: (userCurrency && userCurrency == "INR") ? process.env.CURRENCY || "INR" : userCurrency,
                receipt: ID
            };
            // console.log({
            //     options
            // })
            // return
            let order = await instance.orders.create(options).catch((err) => console.log("err----->", err));
            console.log({
                order
            })
            orderId = order.id


            await PreWallet.updateOne({
                _id: preWallet._id
            },{
                $set: {
                    orderId: order.id,
                    orderReceipt: order.receipt,
                    currency: order.currency
                }
            })

            console.log({
                amount
            })
            return res.render('call/hold-charge', {
                command: 'holdCharge',
                successTitle: '',
                successMsg: req.__('REDIRECTING_TO_PAYMENTS'),
                errorCodeTitle: '',
                errorCode: '',
                errorTitle: '',
                errMsg: '',
                publicKey: process.env.RAZORPAY_KEY_ID,

                //orderId: appointment.orderId,
                amount: Math.ceil(Number(amount || 1) * 100), // this used for payment getaway
                //gst: Math.ceil(Number(appointment.bookingDetails.gst || 0) * 100),

                orderId: orderId,
                
                adminFlatFee: preWallet.fee,
                gst: preWallet.gst,

                finalAmount: preWallet.amount,

                email: user.email,
                name: user.fullName,
                contact: user.phone,
                currency: (userCurrency && userCurrency == "INR") ? process.env.CURRENCY || "INR" : userCurrency,
                customerId: customerId,
                payableAmount: Math.ceil(Number(amount || 1) * 100), // this used for display 

            });

        } catch (err) {
            console.log("🚀 ~ PaymentController ~ initHoldCharge ~ err:", err)
        }
    }

    async success(req, res) {
        try {
            return res.render(`payments/success`, {
                title: "Payment successful.",
                name:  "add" 
            })
            //return res.success({},"Wallet top-up successfully")
        } catch (err) {
            console.log("Payment success err", err);
        }
    }

    async failed(req, res) {
        return res.warn({},"Payment can't proceed")
    }

    async verify(req, res, next) {
        try {
            if (req.body.error && req.body.error.code === 'BAD_REQUEST_ERROR') {
                return res.redirect(`/api/payments/failed?description=${req.body.error.description}`);
            }
            
            console.log("req.query", req.query)
            console.log("req.params", req.params)
            console.log("req.body", req.body)
            let adminSetting = await AdminSettings.findOne({});
            let amount = req.params?.amount
            console.log({
                amount
            })
            let body = req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id;
            let expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest('hex');
            console.log({ expectedSignature })
            if (expectedSignature === req.body.razorpay_signature) {

                let fee = 0
                let gst = 0
                let netAmount = 0

                let preWalletInfo = await PreWallet.findOne({
                    orderId: req.body.razorpay_order_id
                }).lean()
                const currency = preWalletInfo.currency

                if (currency === 'INR') {
                    amount = Number(preWalletInfo.amount);
                    fee = preWalletInfo.fee
                    gst = preWalletInfo.gst
                    netAmount = preWalletInfo.netAmount

                } else {
                    amount = Number(Math.floor(preWalletInfo.amount * adminSetting.conversionRate));

                    fee = Number(Math.floor(preWalletInfo.fee * adminSetting.conversionRate));
                    gst = Number(Math.floor(preWalletInfo.gst * adminSetting.conversionRate));
                    netAmount = Number(Math.floor(preWalletInfo.netAmount * adminSetting.conversionRate));

                }
                //amount = Number(amount);
                

                
                const userFetch = await User.findOne({
                    _id: preWalletInfo.userId,
                });
                if (!userFetch) {
                    req.flash('error', req.__('USER_NOT_EXISTS'));
                    return res.redirect('/users');
                }
                let model = new PaymentRequest();
                model.userId = userFetch._id;
                model.amount = amount;

                model.fee = fee;
                model.gst = gst;
                model.netAmount = netAmount;


                model.status = "SUCCESS";
                model.type = "wallettopup";
                console.log("model", model)
                await model.save();

                return res.redirect(`/api/calls/success`);

            } else {
                return res.redirect(`/api/calls/failed`);
            }
        } catch (err) {
            console.log(err)
        }

    }

    /************************* twilio work **************************/
    
    async getVoiceToken(req, res, next) {
        try {
            const { _id } = req.user;
            const identity = _id.toString();
            const { to } = req.query;
            if( !to ){
                return res.badRequest({},"Please send receiver id")
            }

            const outgoingApplicationSid = process.env.TWILIO_APP_SID;
            let pushCredentialSid = req.headers['x-telemedicine-platform'] == "android" ? process.env.ANDROID_PUSH_SID : process.env.IOS_PUSH_SID;
            

            let info = {
                callerId: ObjectId(req.user._id),
                receiverId: ObjectId(to),
                callStatus: 0,
                type: "audio"
            }
            if( req.user.organizationId ){
                info = {
                    ...info,
                    organizationId: req.user.organizationId
                }
            }
            let newCall =  await new Call(info).save();

            // Create a "grant" which enables a client to use Voice as a given user
            const voiceGrant = new VoiceGrant({ 
                outgoingApplicationSid, 
                pushCredentialSid,
                incomingAllow: true
            });

            let token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret);
            token.addGrant(voiceGrant);
            token.identity = identity;


            // {
            //     const userTo = await User.findOne({ 
            //         _id: ObjectId(to) 
            //     }).select("fullName deviceToken avatar _id os voipToken walletBalance")
            //     .lean();

            //     console.dir(userTo)

            //      if(userTo.os ==='ios'){   
            //             sendFCMPushForVideoCall(
            //                 userTo.deviceToken, 
            //                 "", 
            //                 "", 
            //                 {
            //                                     key: 'FOR_VIDEO_CALL',
            //                                     activity: "new_video_call",
            //                                     identity: userTo._id.toString(),
            //                                     "type": "video_call"
            //                 }
            //             );
            //         }
            // }
            console.log({ callId: newCall._id, identity, token:"demo" })

            return res.success({  callId: newCall._id, identity, token: token.toJwt() });
        }catch(err) {
            console.log("err --->",err)
            return next(err)
        }
    }

    async voiceCall(req, res) {
        try {
            const reqData = req.body;
            const userTo = await User.findOne({ _id: ObjectId(reqData.to) }).select("_id fullName deviceToken os").lean();
            const twiMl = new VoiceResponse();

            if (!(userTo)) {    //(!(userTo || userTo.online_status))
                const msg = !userTo ? req.__('TWILIO_CALL_ERROR_USER_NOT_FOUND') : req.__('TWILIO_CALL_ERROR_USER_OFFLINE');
                twiMl.say({ voice: 'alice' }, msg);
                res.type('text/xml');
                return res.send(twiMl.toString());
            }
            
            let newCall =  await new Call({
                callerId: ObjectId(reqData.from),
                receiverId: ObjectId(reqData.to),
                callStatus: 0,
            }).save();

            let timeLimit = 10;

            const call_obj = { callerId: `client:${reqData.from}`, timeLimit,    };//callId: newCall._id//caller_name: `Dr. ${userTo.fullName} is calling`
            console.dir({
                call_obj
            })
            

            /*const dial = twiMl.dial(call_obj);
            dial.client(reqData.to,{
                statusCallbackEvent: 'initiated ringing answered completed',
                statusCallback: `${process.env.SITE_URL}/api/appointment/voice-events`,
                statusCallbackMethod: "POST"
            });
            res.type('text/xml');
            res.send(twiMl.toString());*/

                

            if( userTo.os != 'ios' ){
                const dial = twiMl.dial(call_obj);
                dial.client(reqData.to,{
                    statusCallbackEvent: 'initiated ringing answered completed',
                    statusCallback: `${process.env.SITE_URL}/api/appointment/voice-events`,
                    statusCallbackMethod: "POST"
                });
                res.type('text/xml');
                res.send(twiMl.toString());
            }else{
                console.log("hiiiiiiiiiiiiiiiiiiiiiiiiiiddddddddddddddddddddddddddd")
                const customParameters = {
                    callerName: `Dr. ${userTo.fullName} is calling`
                };

                const dial = twiMl.dial(call_obj);

                dial.client(
                    {
                        identity: reqData.to, // Identity of the receiving client
                        // Adding custom parameters
                        parameters: {
                            ...customParameters
                        },
                        statusCallbackEvent: 'initiated ringing answered completed',
                        statusCallback: `${process.env.SITE_URL}/api/appointment/voice-events`,
                        statusCallbackMethod: "POST"
                    }
                );

                res.type('text/xml');
                res.send(twiMl.toString());

                /*let xml = builder
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
                        value:  `Dr. ${userTo.fullName} is calling`  
                    }).up()
                    .end({ pretty: true });

                    console.dir( xml,{depth:4} )

                res.type("text/xml");
                res.send(xml);*/
                
            }
            
        }catch(err) {
            console.log("err --->",err)
        }
    }

    async voiceEvents(req, res) {
        console.log("----------------------call voice events")
        const callData = req.body;
        console.log({callData})
        const twiMl = new VoiceResponse();

        const Call = await Call.findOne({ 
            callerId: callData.CallSid 
        }).populate({ path: 'callerId', model: 'User', select: 'charges deviceToken' })
        
        Call.callerId = callData.CallSid;

        if (callData.CallStatus === 'in-progress') {
            Call.callStatus = 1;
            if(callData && callData.CallSid == 'undefined'){
                callData.callerId = callData.CallSid;
            }

            await Call.findOneAndUpdate({
                "callerId": callData.callerId 
            }, { 
                $set: { 
                    callStatus : 1
                } 
            });

            twiMl.say({ voice: 'alice' }, req.__('TWILIO_CALL_BUSY_ERROR'));
        }

        if (callData.CallStatus == 'completed') {
            Call.call_status = 2;
            if(callData && callData.CallSid == 'undefined'){
                callData.callerId = callData.CallSid;
            }
            
            await Call.findOneAndUpdate({
                callerId : callData.CallSid 
            }, { $set: { 
                    CallDuration :callData.CallDuration, callStatus : 2
                }
            });

            twiMl.say({ voice: 'alice' }, req.__('TWILIO_CALL_BUSY_ERROR'));
        }

        // call not received case
        if (callData.CallStatus == 'no-answer' || callData.CallStatus == 'busy') {
            Call.CallStatus = 3; // flag for call busy
            if(callData && callData.CallSid == 'undefined'){
                callData.callerId = callData.CallSid;
            }

            await Call.findOneAndUpdate({ 
                callerId : callData.callerId 
                }, { $set: {
                    CallDuration :callData.CallDuration, callStatus : 3
                }
            });

            twiMl.say({ voice: 'alice' }, req.__('TWILIO_CALL_BUSY_ERROR'));
        }
        await Call.save();
        res.type('text/xml');
        res.send(twiMl.toString());
    }

    /**    video */
    async videoCallToken(req, res) {
        try{
            console.log("videoCallToken===>")
            const { _id } = req.user;
            const identity = _id.toString();
            const { to } = req.query;
            if( !to ){
                return res.badRequest({},"Please send receiver id")
            }
            const date = Date.now();
            let uniqueName = `${identity}_${date}`;
            let timeLimit = 1;

            console.log({
                loginUser : _id.toString(),
                uniqueName,
                type: 'group',
                statusCallback: `${process.env.SITE_URL}/api/calls/video-events`,
            })
            const room = await twilio_client.video.rooms.create({
                loginUser : _id.toString(),
                uniqueName,
                type: 'group',
                statusCallback: `${process.env.SITE_URL}/api/calls/video-events`,
            });

            // Create a "grant" which enables a client to use Video as a given user
            const videoGrant = new VideoGrant();
            let token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret, { ttl: 10800 });
            token.addGrant(videoGrant);
            token.identity = identity;
            //token.loginUser = _id.toString();

            let info = {
                callerId: _id,
                receiverId: to,
                roomSid: room.sid,
                roomName: uniqueName,
                callStatus: 0,
                type: "video"
            }
            if( req.user.organizationId ){
                info = {
                    ...info,
                    organizationId: req.user.organizationId
                }
            }
            console.log("info===>",info)
            let newCall =  await new Call(info).save();

            res.success({ identity, token: token.toJwt(), room_name: uniqueName, room_sid: room.sid, timeLimit, callId: newCall._id });
        }catch(err){
            console.log("🚀 ~ CallController ~ videoCallToken ~ err:", err)
        }
    }

    async audioReceived(req, res, next) {
        let {
            callSid,from,to
        } = req.body


        if( from ){
            from = from.split(":");
            from = from[1]
        }
        if( to ){
            to = to.split(":");
            to = to[1]
        }

        console.log("req.body====>", req.body)
        const currentTime = moment().utc().unix()
        let call = await Call.findOne({ allSid: callSid }).lean()

        if( !call ){
            call = await Call.findOne({
                callerId : from,
                receiverId: to,
                isReceived: false
            }).sort({
                _id: -1
            }).lean()

            if( call ){
                let creted =  moment(call.created).unix();
                let current = moment().unix();
                console.log({creted,current})
                let diff = current - creted
                if( diff> 45 ){
                    return
                }

            }
        }


        console.log("xxxx", call)
        // console.log("yyyy==>", !call.isReceived)
        if ( !call.isReceived ) {
            //console.log("zzzz==>")

            try{
               await Call.updateOne({
                    _id: call._id
                }, {
                    $set: {
                        isReceived: true,
                        receivedTime: currentTime
                    }
                })
            }catch(err){
                console.log(err)
            }
            
        }
        res.success({})

    }

    async videoEvents(req, res) {
        try {
            //const { user } = req;
            const adminSettings = await AdminSettings.findOne({});
            const {audioCallFee,videoCallFee,conversionRate} = adminSettings //await AdminSettings.findOne({});
            const currentTime = moment().utc().unix()
            const videoGrant = new VideoGrant();
            const roomObj = req.body;
            // console.log({
            //     roomObj
            // })
            
            
            const call = await Call.findOne({ roomSid: roomObj.RoomSid })
            //console.log("xxxx",call)

            //console.log( "yyyy==>", roomObj.RoomStatus,!call.isReceived )
            if( 
                roomObj.RoomStatus ==='in-progress' && 
                roomObj.ParticipantStatus ==='connected' && 
                roomObj.ParticipantIdentity === call.receiverId.toString()  && 
                !call.isReceived  
            ){
                //console.log( "zzzz==>", roomObj.RoomStatus,!call.isReceived )
                
                Call.updateOne({
                    _id: call._id
                },{
                    $set: {
                        isReceived: true,
                        receivedTime: currentTime
                    }
                }).exec()
            }

            const userFrom = await User.findOne({ 
                _id: ObjectId(call.callerId) 
            }).select("fullName deviceToken avatar _id os voipToken walletBalance countryId")
            .populate({ path: 'countryId', select: '_id currency' })
            .lean();
            let UserCurrency    = (userFrom && userFrom.countryId && userFrom.countryId.currency) ? userFrom.countryId.currency : "";

            


            if( !call.organizationId ){
                // console.log({
                //     currentTime,"cs": call.start
                // })
                let callTime = currentTime - call.start;
                // console.log({
                //     callTime
                // })
                let cost = (callTime/60)*(+videoCallFee)
                cost = +cost.toFixed(2)
                // console.log({
                //     cost,"uw": userFrom.walletBalance
                // })
                if( call.start>0 && cost> userFrom.walletBalance ){
                    //console.log("4777777777777777")
                    twilio_client.video.rooms(roomObj.RoomSid)
                    .update({status: 'completed'})
                    .then(room => console.log(room.uniqueName));
                }
                

            }



            if( roomObj.StatusCallbackEvent === 'room-created' || roomObj.StatusCallbackEvent === 'participant-disconnected' ){
                let key = roomObj.StatusCallbackEvent === 'room-created'?"start":"end"
                await Call.updateOne({
                    _id: call._id
                },{
                    $set: {
                        [key]: currentTime
                    }
                })

                if( !call.organizationId && roomObj.StatusCallbackEvent === 'participant-disconnected' ){


                    let thisCall = await Call.findOne({
                        _id: call._id 
                    }).lean()

                    if( thisCall.isReceived ){
                        console.dir({currentTime, "receivedTime":thisCall.receivedTime })
                        let callTime = currentTime - thisCall.receivedTime;  //call.start;
                        console.dir({callTime,videoCallFee })
                        let cost = (callTime/60)*(+videoCallFee)
                        cost = +cost.toFixed(2)

                        console.dir({callTime })


                        await PaymentRequest.findOneAndUpdate(
                            { callId: call._id },
                            {
                                $set: {
                                    callId: call._id,
                                    consultant_id: call.callerId,
                                    //"amount": (UserCurrency && UserCurrency == "INR") ? cost : Math.ceil(cost * adminSettings.conversionRate),
                                    "amount":   cost, //(UserCurrency && UserCurrency == "INR") ? cost : Math.ceil(cost * adminSettings.conversionRate),
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
                                CallDuration: callTime,
                                "amount": cost  //(UserCurrency && UserCurrency == "INR") ? cost : Math.ceil(cost * adminSettings.conversionRate),
                            }
                        }).exec ()
                    }

                    // await PaymentRequest.create({
                    //     callId: call._id,
                    //     consultant_id: call.callerId,
                    //     "amount" : (UserCurrency && UserCurrency == "INR") ? cost : Math.ceil(cost * adminSettings.conversionRate),
                    //     "status" : "APPROVED",
                    //     action_date: moment().utc(),
                    //     isShowOnList: true
                    // })

                }

            }


            const userTo = await User.findOne({ 
                _id: ObjectId(call.receiverId) 
            }).select("fullName deviceToken avatar _id os voipToken walletBalance")
            .lean();


            console.dir( {userFrom,userTo},{depth:1})

            if(userTo){
                //code for call completed
                let timeLimit = 100;
                
                if(timeLimit <= 0){
                    console.log("52777777777777777777777")
                    twilio_client.video.rooms(roomObj.RoomSid)
                    .update({status: 'completed'})
                    .then(room => console.log(room.uniqueName));
                }
                
                let roomName = roomObj.RoomName;
                
                let caller =   roomName.split("_")[0];
                //let callerType = (user && user._id) ? 'caller' : 'receiver';

                
                if (roomObj.StatusCallbackEvent != 'track-added') {
                    if (roomObj.StatusCallbackEvent == 'participant-connected') {

                        roomObj.participants_connected = roomObj.ParticipantIdentity;
                        roomObj.room_sid = roomObj.RoomSid;
                        if (roomObj.participants_connected.length==2) {

                            const value = {
                                deviceIds: [userTo.deviceToken],
                                notification: { title: req.__('CALL_CONTINUE_TITLE'), body: req.__('CALL_CONTINUE_MSG') },
                                data: { key: req.__('VIDEO_CALL_CONTINUE_KEY') },
                                _id: caller,
                                uniqueName: uuidv4()
                            };

                            await Call.findOneAndUpdate({
                                "callerId": call.callerId 
                            }, { 
                                $set: { 
                                    callStatus : 1
                                } 
                            });

                        } else {
                            console.log("here=================================================================>",roomObj.SequenceNumber)
                            if (roomObj.SequenceNumber == '1') {

                                call.callStatus = 0;
                                const call_to_token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret, { ttl: 10800 });

                                console.log( "xxxxx", {userTo})
                                if( true ){
                                    call_to_token.identity = userTo._id.toString();
                                    call_to_token.addGrant(videoGrant);
                                    let title =  `Incoming Call.`;
                                    let body = `${userFrom.fullName} is calling....`;
                                    console.log({
                                        title,body
                                    })
                                    if(userTo.os ==='android'){   console.log( "xxxxx1", userTo.os)
                                        sendFCMPushForVideoCall(
                                            userTo.deviceToken, 
                                            title, 
                                            body, 
                                            {
                                                key: 'FOR_VIDEO_CALL',
                                                activity: "new_video_call",
                                                identity: userTo._id.toString(),
                                                token: call_to_token.toJwt(),
                                                caller_name: userFrom.fullName,
                                                caller_image: userFrom.avatar,
                                                room_name: roomObj.RoomName,
                                                room_sid:roomObj.RoomSid,
                                                "type": "video_call"
                                            }
                                        );
                                    }else{   console.log( "xxxxx2", userTo.os)
                                        sendIosVoipPush(
                                            userTo.voipToken,
                                            title,
                                            body,
                                            {
                                                key: 'FOR_VIDEO_CALL',
                                                activity: "new_video_call",
                                                identity: userTo._id.toString(),
                                                token: call_to_token.toJwt(),
                                                caller_name: userFrom.fullName,
                                                caller_image: userFrom.avatar,
                                                room_name: roomObj.RoomName,
                                                room_sid:roomObj.RoomSid,
                                                appointmentId: call._id.toString(),
                                                "type": "video_call"
                                            }
                                        )

                                        // sendFCMPushForVideoCall(
                                        //     userTo.deviceToken, 
                                        //     title, 
                                        //     body, 
                                        //     {
                                        //         key: 'FOR_VIDEO_CALL',
                                        //         activity: "new_video_call",
                                        //         identity: userTo._id.toString(),
                                        //         token: call_to_token.toJwt(),
                                        //         caller_name: userTo.fullName,
                                        //         caller_image: userTo.avatar,
                                        //         room_name: roomObj.RoomName,
                                        //         room_sid:roomObj.RoomSid,
                                        //         "type": "video_call"
                                        //     }
                                        // );

                                    }                                
                                } 
                            }
                        }
                    } else if (roomObj.StatusCallbackEvent == 'participant-disconnected') {
                        await Call.findOneAndUpdate({ roomSid : roomObj.RoomSid }, {$set: { CallDuration :roomObj.ParticipantDuration, callStatus:2}});
                    }
                }
                await call.save();
                const twiMl = new VoiceResponse();
                res.type('text/xml');
                res.send(twiMl.toString());            
            }else{
                return res.success({});
            }
        } catch (err) {
            console.log("🚀 ~ CallController ~ videoEvents ~ err:", err)
        }
    }

    async rejectCall(req, res) {
        const { user } = req;
        const { room_sid } = req.params;

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

    async voiceFallbackUrl(req, res) {
        console.log("fallback url hit")
        const twiMl = new VoiceResponse();
        res.type('text/xml');
        res.send(twiMl.toString());
    }
}



module.exports = new CallController();
