const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;;
const moment = require('moment');
const momentTz = require('moment-timezone');
const fcmNode = require('fcm-node');
const fcm = new fcmNode(process.env.FCM_KEY);

const firebaseAdmin = require('firebase-admin');
const serviceAccount = require('./telemedReferralFirebase.json');


const {
    models: { User },
} = require('../models');

const randomString = (length = 30, charSet = 'ABC5DEfF78G7I5JKL8MNO7PQR8ST5UVnaSdWXYZa5bjcFh6ijk123456789') => {
    let randomString = '';
    for (let i = 0; i < length; i++) {
        let randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz, randomPoz + 1);
    }
    return randomString;
};

const escapeRegex = text => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

// eslint-disable-next-line no-console
const logError = console.error;

const consoleInDevEnv = process.env.NODE_ENV === 'development' && console.log;

/**
 * @param {string} objectId
 * @return {boolean}
 */
const isValidObjectId = objectId => {
    if (mongoose.Types.ObjectId.isValid(objectId)) {
        const id = new mongoose.Types.ObjectId(objectId);
        return id.toString() === objectId;
    }
    return false;
};

const utcDate = (date = new Date()) => {
    date = new Date(date);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
};

const utcDateTime = (date = new Date()) => {
    date = new Date(date);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()));
};


const generateResetToken = (length = 4) => {
    return Math.floor(Math.pow(10, length - 1) + Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1));
};

const showDate = (date, format = 'MMM DD YYYY hh:mm A', toLocale = false) => {
    date = toLocale ? new Date(date).toLocaleString() : date;
    return utcDateTime(date).toString() !== 'Invalid Date' ? moment.utc(date).format(format) : 'N/A'
};

const showDateTimeZone = (date, timeZone = '', format = 'MMM DD YYYY hh:mm A') => {
    return utcDateTime(date).toString() !== 'Invalid Date' ? timeZone ? momentTz(date).tz(timeZone).format(format) : momentTz.utc(date).format(format)  : 'N/A'
};

const showDateAccordingTimezone = (date, format = 'MM/DD/YYYY hh:mm A') => date.toString() !== 'Invalid Date' ? moment(date).format(format) : 'N/A';

const showTime = seconds => new Date(seconds * 1000).toISOString().substr(11, 8);

const fromNow = date => moment(date).fromNow();


firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
});

const sendFCMPush = async (tokens, title, body, data = {}, priority = 'high', notificationOptions = {
    click_action: "FCM_PLUGIN_ACTIVITY",
    icon: "ic_stat_icon",
    sound: "default",
    //vibrate: true,
}) => {
    tokens = !Array.isArray(tokens) ? [tokens] : tokens;

    const stringifiedData = {};
    Object.keys(data).forEach(key => {
        stringifiedData[key] = String(data[key]);
    });

    const message = {
        tokens,
        notification: {
            title,
            body,
            //...notificationOptions
        },
        android: {
            priority,
            notification: notificationOptions
        },
        apns: {
            payload: {
                aps: {
                    sound: notificationOptions.sound,
                    category: notificationOptions.click_action,
                },
            },
        },
        data:stringifiedData,
    };

    //console.dir( message,{depth:5});

    try {
        const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
        //console.dir( response,{depth:5});
    } catch (error) {
        console.log('Error sending message:', error);
    }
};


const sendFCMPushForVideoCall = async (tokens, title, body, data = {}, priority = 'high', notificationOptions = {
    click_action: "FCM_PLUGIN_ACTIVITY",
    icon: "ic_video_icon",
    sound: "notification_sound",
    //vibrate: true,
    channelId : "call_channel_001"
}) => {
    tokens = !Array.isArray(tokens) ? [tokens] : tokens;

    // data = {
    //     ...data,
    //     vibrate: true
    // }

    const stringifiedData = {};
    Object.keys(data).forEach(key => {
        stringifiedData[key] = String(data[key]);
    });
    let token = tokens[0]
    const message = {
        token,
        
        android: {
            priority,
            fcmOptions: {
                analyticsLabel: 'video_call_notification',
            },
        },
 
        apns: {
            payload: {
                aps: {
                    sound: notificationOptions.sound,
                    category: notificationOptions.click_action,
                    "content-available":1
                },
            },
        },
        data:stringifiedData,
    };

    console.dir(message,{ depth:6 })

    try {
        //const response = await firebaseAdmin.messaging().sendMulticast(message);
        const response = await firebaseAdmin.messaging().send(message);
        console.dir(response,{ depth:5 })
        //console.log('Successfully sent message:', response);
    } catch (error) {
        console.log('Error sending message:', error);
    }
};

const _sendFCMPush = (tokens, title, body, data = {}, priority = 'high', notificationOptions = {
    click_action: "FCM_PLUGIN_ACTIVITY",
    icon: "ic_stat_icon",
    sound: "default",
    vibrate: true,
}) => {
    tokens = !Array.isArray(tokens) ? [tokens] : tokens;
    const fcmMessage = {
        registration_ids: tokens,
        priority,
        notification: {
            title,
            body,
            ...notificationOptions
        },
        data: data
    };
    fcm.send(fcmMessage, function (err, resp) {
        if (err) {
            console.log("FCM ERROR: ", err);
        }
        console.log("success send push", resp);
    });
};
const _sendFCMPushForVideoCall = (tokens, title, body, data = {}, priority = 'high', notificationOptions = {
    click_action: "FCM_PLUGIN_ACTIVITY",
    icon: "ic_video_icon",
    sound: "notification_sound",
    vibrate: true,
    android_channel_id:"call_channel_001"
}) => {
    tokens = !Array.isArray(tokens) ? [tokens] : tokens;
    const fcmMessage = {
        registration_ids: tokens,
        priority,
        data: data
    };
    fcm.send(fcmMessage, function (err) {
        if (err) {
            logError("FCM ERROR: ", err);
        }
        console.log("success send push");
    });
};
const parentage =(p,amt)=> {
	return ((amt / 100) * p).toFixed(2);
}


var apn = require('apn');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
//console.log(path.join(__dirname, './AuthKey_6UB94H992Y.p8'))
const options = {
  token: {
    key: path.join(__dirname, './AuthKey_JSZRT2M3B6.p8'),
    keyId: process.env.KEYID,
    teamId: process.env.TEAMID
  },
  production: true
};
var apnProvider = new apn.Provider(options);

const sendIosVoipPush = (tokens, title, body, payload) => {
    console.log("2222222222222222222222222222222")
    console.dir({
        tokens,title,body,payload
    },{depth:6})
    console.log("333333333333333333333333333")

  // Sending the voip notification
  let notification = new apn.Notification();

  notification.body = body;
  notification.topic = "com.sai.telemed.voip";   // Make sure to append .voip here!
  notification.payload = {
    "aps": { "content-available": 1 , "apns-expiration" : 0},
    "uuid": uuidv4(),
    ...payload
  };

  apnProvider.send(notification, tokens).then((response) => {
      if(response){
        console.dir(response,{depth:4})
        if( response.failed && response.failed[0] ){
            console.log(response.failed)
        }
      }
  }).catch((error) => {
      console.error('Error sending notification:', error);
    });;
}

const sendFCMPushSilent = (tokens, title, body, data = {}, priority = 'high', notificationOptions = {
    click_action: "FCM_PLUGIN_ACTIVITY",
    icon: "ic_stat_icon",
    sound: "default",
    //vibrate: true,
}) => {
    tokens = !Array.isArray(tokens) ? [tokens] : tokens;
    const fcmMessage = {
        registration_ids: tokens,
        priority,
        notification: {
            title,
            body,
            ...notificationOptions
        },
        data: data,
        "content-available": true
    };
    fcm.send(fcmMessage, function (err, resp) {
        if (err) {
            logError("FCM ERROR: ", err);
        }
        console.log("success send push", resp);
    });
};

const getUserWalletBalance = async ({userId})=>{
    let current = new Date();

    let qry = [
        {
            $match: {
                _id: ObjectId(userId),
                isDeleted: false,
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
                        //"bookingDetails.date": { "$lt": new Date(current.getTime() + (300 * 2)) },
                        // "bookingDetails.date": { "$lt": new Date(current.getTime() - (259200*1000)) },//three days
                        
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
        { '$unwind': { path: '$pending_amount', preserveNullAndEmptyArrays: true } },
        { '$unwind': { path: '$paid_amount', preserveNullAndEmptyArrays: true } },
        { '$unwind': { path: '$wallettopup_amount', preserveNullAndEmptyArrays: true } },
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
                
            }
        }
    ]

    let user = await User.aggregate(qry);
    user = user[0]

    return ((user.pending_amount + user.wallettopup_amount) - user.paid_amount).toFixed(2) || 'N/A'
}

const convertInrToUsd = (amount , rate) => {
    let convertedAmount =  Number(amount / rate).toFixed(2);
    return Number(convertedAmount);
}

module.exports = {
    escapeRegex,
    logError,
    consoleInDevEnv,
    isValidObjectId,
    utcDate,
    utcDateTime,
    randomString,
    generateResetToken,
    showDate,
    showTime,
    fromNow,
    sendFCMPush,
    showDateAccordingTimezone,
    parentage,
    sendFCMPushForVideoCall,
    sendIosVoipPush,
    sendFCMPushSilent,
    showDateTimeZone,
    getUserWalletBalance,
    convertInrToUsd,
};
