const {
    models: {
        Otp,
        User,
        Webinar,
        Speciality,
        AdminSettings,
        Notification,
        PaymentRequest,
        AgendaJob,
        WebinarRecord,
        Faq,
    },
} = require('../../../../lib/models');
const mongoose = require('mongoose');
//const { utcDateTime, randomString,parentage } = require('../../../../lib/util');
const { sendFCMPush, utcDateTime, parentage, getUserWalletBalance } = require('../../../../lib/util');
const { encryptMessage, decryptMessage } = require('../../../../lib/encryptions');
const uploader = require('../../../../lib/uploader');
const {
    downloadFileFromS3,
    uploadFromLocal,
    getDownloaddUrl,
    headS3Object,
    fixFrameRate,
    makeObjectPublicRead,
    getReadSignedUrl,
} = require('../../../../lib/uploader');
// const { signToken } = require('../../util/auth');
// const { getPlatform } = require('../../util/common');
const _ = require('lodash');
const mailer = require('../../../../lib/mailer');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const ObjectId = mongoose.Types.ObjectId;
const crypto = require('crypto');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const twilioClient = require('twilio')(process.env.TWILIO_API_KEY, process.env.TWILIO_API_SECRET, {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
});

const AccessToken = require('twilio').jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const axios = require('axios');
const Razorpay = require('razorpay');
const dailyCoService = require('./dailyCoService');

//const ffmpeg = require('fluent-ffmpeg');

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class WebinarController {
    async getFaqsAll(req, res) {
        const faq = await Faq.find({
            isDeleted: false,
            isSuspended: false,
        }).lean();

        return res.render('faq', { faq });
    }

    async test(req, res) {
        JC.startCompositionNew({
            webinarId: '67b48b75e73dffb8c555cdb9',
            RoomSid: 'RM6f7830f1c96130a55f422083fc849a98',
        });
    }

    async generateToken(req, res) {
        let _id = req.body._id;
        res.success({
            token: jwt.sign(
                {
                    sub: _id,
                    iat: utcDateTime().valueOf(),
                },
                process.env.JWT_SECRET
            ),
        });
    }

    /**
     * @param {*} req
     * @param {*} res
     * @param {*} next
     */
    async getSlots(req, res, next) {
        const { user } = req;
        const adminSettings = await AdminSettings.findOne({}).lean();
        const doctorData = await User.findOne({ _id: ObjectId(user._id) }, { currency: 1 })
            .populate({ path: 'countryId', select: '_id currency' })
            .lean();
        let price = parseInt(adminSettings.webinarPrice);
        let userCurrency =
            doctorData && doctorData.countryId && doctorData.countryId.currency ? doctorData.countryId.currency : '';

        if (userCurrency && userCurrency != 'INR') price = Number((price / adminSettings.conversionRate).toFixed(2));

        const slots = [
            { slotTime: '12:01 AM - 01:00 AM' },
            { slotTime: '01:00 AM - 02:00 AM' },
            { slotTime: '02:00 AM - 03:00 AM' },
            { slotTime: '03:00 AM - 04:00 AM' },
            { slotTime: '04:00 AM - 05:00 AM' },
            { slotTime: '05:00 AM - 06:00 AM' },
            { slotTime: '06:00 AM - 07:00 AM' },
            { slotTime: '07:00 AM - 08:00 AM' },
            { slotTime: '08:00 AM - 09:00 AM' },
            { slotTime: '09:00 AM - 10:00 AM' },
            { slotTime: '10:00 AM - 11:00 AM' },
            { slotTime: '11:00 AM - 12:00 PM' },
            { slotTime: '12:00 PM - 01:00 PM' },
            { slotTime: '01:00 PM - 02:00 PM' },
            { slotTime: '02:00 PM - 03:00 PM' },
            { slotTime: '03:00 PM - 04:00 PM' },
            { slotTime: '04:00 PM - 05:00 PM' },
            { slotTime: '05:00 PM - 06:00 PM' },
            { slotTime: '06:00 PM - 07:00 PM' },
            { slotTime: '07:00 PM - 08:00 PM' },
            { slotTime: '08:00 PM - 09:00 PM' },
            { slotTime: '09:00 PM - 10:00 PM' },
            { slotTime: '10:00 PM - 11:00 PM' },
            { slotTime: '11:00 PM - 11:59 PM' },
        ];
        //return res.success(data)

        return res.success({
            slots,
            price,
        });
    }

    /**
     * @param {*} req
     * @param {*} res
     * @param {*} next
     */
    async getSpecialties(req, res, next) {
        let specialties = await Speciality.find({
            isSuspended: false,
            isDeleted: false,
        })
            .select('specialityName specialityIcon')
            .lean();
        res.success({
            specialties,
        });
    }

    /**
     * @param {*} req
     * @param {*} res
     * @param {*} next
     * @returns
     */
    async getUsers(req, res, next) {
        try {
            let { search, page, limit, specality } = req.body;
            if (search.length < 3) {
                return res.success({ nextPage: false, users: [] });
            }
            page = page || 1;
            limit = limit || 20;
            const skip = (page - 1) * limit;
            const searchValue = new RegExp(
                search
                    .split(' ')
                    .filter(val => val)
                    .map(value => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
                    .join('|'),
                'i'
            );
            let query = {
                $and: [
                    { specality: { $exists: true } },
                    { _id: { $ne: req.user._id } },
                    {
                        $or: [{ userName: searchValue }, { fullName: searchValue }],
                    },
                    { isDeleted: false },
                    { isSuspended: false },
                ],
            };

            if (req?.user?.organizationId) {
                query['$and'].push({
                    organizationId: req.user.organizationId,
                });
            } else {
                query['$and'].push({
                    organizationId: { $exists: false },
                });
            }

            if (specality && specality.length > 0) {
                query['$and'].push({
                    specality: {
                        $in: specality,
                    },
                });
            }

            let users = await User.find(query)
                .select('fullName avatar specality isOnline')
                .populate('specality', 'specialityName specialityIcon')
                .sort({ fullName: 1 })
                .skip(skip)
                .limit(limit)
                .lean();
            const nextPage = users.length === limit;
            return res.success({ nextPage, users });
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    /**
     * @param {*} req
     * @param {*} res
     * @param {*} next
     * @returns
     */
    async createWebinar(req, res, next) {
        try {
            const adminSettings = await AdminSettings.findOne({}).lean();
            console.log('process.env. test', req.body);
            //await AdminSettings.findOne({}).lean();

            let {
                title,
                description,
                cmePartner,
                dateWebinar,
                endDateWebinar,
                timeWebinar,
                hrWebinar,
                accredited,
                image,
                link,
                bannerDescription,
                presenter,
                members,
                timeOffset,
                recordingEnable,
                lessthan50ppl,
            } = req.body;
            const loginUser = req.user;
            !timeOffset && (timeOffset = 0);
            timeOffset = +timeOffset;

            if (!recordingEnable) {
                recordingEnable = false;
            }

            if (link && link != '') {
                let chk = isValidURL(link);
                if (!chk) {
                    return res.warn({}, 'Please enter valid url');
                }
            }

            if (!members) {
                members = [];
            }
            //let isPresenterFind = false
            let hostId = req.user._id.toString();
            members = members.map(x => {
                return {
                    userId: x,
                    isHost: false,
                    isPresenter: false,
                    acceptTime: 0,
                    rejectTime: 0,
                    status: 'accept',
                };
            });

            members = members.filter(member => {
                return member.userId != hostId && member.userId != presenter;
            });

            let isHostPresenter = false;
            if (presenter.toString() === req.user._id.toString()) {
                isHostPresenter = true;
            }
            if (isHostPresenter) {
                members.push({
                    userId: req.user._id,
                    isHost: true,
                    isPresenter: true,
                    acceptTime: 0,
                    rejectTime: 0,
                    status: 'accept',
                });
            } else {
                members.push({
                    userId: req.user._id,
                    isHost: true,
                    isPresenter: false,
                    acceptTime: 0,
                    rejectTime: 0,
                    status: 'accept',
                });
                members.push({
                    userId: presenter,
                    isHost: false,
                    isPresenter: true,
                    acceptTime: 0,
                    rejectTime: 0,
                    status: 'accept',
                });
            }

            const dateFormat = 'DD MMM YYYY hh:mm A';
            timeWebinar = timeWebinar.split('-');
            const start = timeWebinar[0].trim();
            const end = timeWebinar[1].trim();
            const offset = timeOffset * 60;
            const timeStart = moment(`${dateWebinar} ${start}`, dateFormat).unix() - offset;
            let endTime = `${dateWebinar} ${end}`;

            if (endDateWebinar && endDateWebinar != '') {
                endTime = `${endDateWebinar} ${end}`;
            } else {
                endDateWebinar = dateWebinar;
            }

            const userData = await User.findOne({ _id: ObjectId(req.user._id) }, { currency: 1 })
                .populate({ path: 'countryId', select: '_id currency' })
                .lean();
            let userCurrency =
                userData && userData.countryId && userData.countryId.currency ? userData.countryId.currency : '';

            const timeEnd = moment(`${endTime}`, dateFormat).unix() - offset;
            // const paymentCharge     = (userCurrency && userCurrency == "INR") ? parseInt(adminSettings.webinarPrice) : Number((adminSettings.webinarPrice / adminSettings.conversionRate).toFixed(2));    //100  //f change
            let amount              = parseInt(adminSettings.webinarPrice) * Number(hrWebinar);
        //    let amount              = parseInt(adminSettings.webinarPrice);
            let gst = parentage(adminSettings.webinarGst, amount);
            let totalPayable = Number(amount) + Number(gst);
            const ID = `${parseInt(process.env.MIN_WEBINAR_ID || 1) + (await Webinar.countDocuments({}))}`;

            let options = {
                amount: Number(totalPayable) * 100,
                currency: userCurrency && userCurrency == 'INR' ? process.env.CURRENCY || 'INR' : userCurrency,
                receipt: ID,
            };

            let order = await instance.orders
                .create(options)
                .catch(err => console.log('Payment instance err---->', err));

            const webinarData = {
                userId: req.user._id,
                title,
                description,
                cmePartner,
                dateWebinar,
                endDateWebinar,
                timeWebinar: { start, end },
                accredited,
                image,
                link,
                members,
                timeOffset,
                timeStart,
                timeEnd,
                bannerDescription,
                gst,
                amount,
                totalPayable,
                recordingEnable,
                webinarId: ID,
                ...(order && { orderId: order.id }),
                paymentStatus: 'PENDING',
                lessthan50ppl: lessthan50ppl || false,
            };
            presenter && (webinarData['presenter'] = presenter);

            if (req?.user?.organizationId) {
                webinarData['organizationId'] = req.user.organizationId;
                webinarData['paymentStatus'] = 'SUCCESS';
            } else {
                webinarData['paymentStatus'] = 'PENDING';
            }

            let webinar = await Webinar.create(webinarData);

            webinar = await getWebinarDetails({ webinarId: webinar._id, loginUser });

            if (webinar.compositionIds && webinar.compositionIds[0]) {
                webinar.compositionIds = `${webinar.compositionIds[0]}.mp4`;
            } else {
                webinar.compositionIds = '';
            }

            if (req?.user?.organizationId) {
                const start = webinar.timeWebinar.start;
                const dateWebinar = webinar.dateWebinar;
                sendWebinarPush({ webinar, dateWebinar, timeWebinar: start }, err => {
                    err && console.log(err);
                });
            }

            return res.success({
                webinar,
            });
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async sendInform({ webinarId }) {
        let webinar = await Webinar.findOne({ _id: webinarId }).lean();
        if (webinar.isDeleted || webinar.isSuspended) {
            return;
        }
        let webinarName = webinar.title;
        let currentMember = webinar.members.filter(x => x.status != 'reject');
        currentMember = currentMember.map(x => x.userId);

        let users = await User.find({ _id: currentMember })
            .select('_id deviceToken')
            .lean();
        let notification = [];

        let fcmData = {
            webinarId,
            type: 'WEBINAR_REMINDER',
        };
        if (users) {
            users.forEach(user => {
                let title = 'Webinar starts in 5 min';
                let message = `Webinar ${webinarName} starts in 5 min`;
                notification.push({
                    type: 'WEBINAR_REMINDER',
                    user: user._id,
                    webinarId,
                    title,
                    message,
                });
                user.deviceToken && sendFCMPush(user.deviceToken, title, message, fcmData);
            });

            notification.length && (await Notification.insertMany(notification));
        }
        return;
    }

    /**
     * @param {*} req
     * @param {*} res
     * @param {*} next
     */
    async editWebinar(req, res, next) {
        try {
            let {
                _id,
                title,
                description,
                cmePartner,
                dateWebinar,
                endDateWebinar,
                timeWebinar,
                accredited,
                image,
                bannerDescription,
                link,
                presenter,
                members,
                timeOffset,
                recordingEnable,
                lessthan50ppl,
            } = req.body;
            console.log({ endDateWebinar });

            if (!recordingEnable) {
                recordingEnable = false;
            }

            if (link && link != '') {
                let chk = isValidURL(link);
                //console.log({chk})
                if (!chk) {
                    return res.warn({}, 'Please enter valid url');
                }
            }

            const loginUser = req.user;
            let webinar = await Webinar.findOne({ _id, userId: loginUser._id }).lean();
            if (!webinar) {
                return res.warn({}, req.__('INVALID_ID'));
            }
            !timeOffset && (timeOffset = 0);
            timeOffset = +timeOffset;
            const dateFormat = 'DD MMM YYYY hh:mm A';

            timeWebinar = timeWebinar.split('-');
            const start = timeWebinar[0].trim();
            const end = timeWebinar[1].trim();

            //console.log({start,end}); //return
            const offset = timeOffset * 60;

            //console.log({ offset }); //return

            //const tS = moment(`${dateWebinar} ${start}`, dateFormat) //.unix()
            //const tE = moment(`${dateWebinar} ${end}`, dateFormat)  //.unix()
            //console.log({ tS,tE});

            const timeStart = moment(`${dateWebinar} ${start}`, dateFormat).unix() - offset;

            let endTime = `${dateWebinar} ${end}`;
            if (endDateWebinar && endDateWebinar != '') {
                endTime = `${endDateWebinar} ${end}`;
            } else {
                endDateWebinar = dateWebinar;
            }
            const timeEnd = moment(`${endTime}`, dateFormat).unix() - offset;

            let currentMember = webinar.members;
            let currentMemberIds = webinar.members.map(x => x.userId.toString());
            if (!members) {
                members = [];
            }
            let chkAdmin = members.indexOf(loginUser._id.toString());
            if (chkAdmin == -1) {
                members.push(loginUser._id.toString());
            }

            let chkPresenter = members.indexOf(presenter.toString());
            if (chkPresenter == -1) {
                members.push(presenter.toString());
            }

            let newMembers = [];
            let oldMembers = [];
            let notificationUsers = [];
            _.each(members, member => {
                if (currentMemberIds.indexOf(member) != -1) {
                    let info = _.find(currentMember, cm => {
                        return cm.userId.toString() == member;
                    });
                    info.isPresenter = info.userId.toString() === presenter.toString();
                    newMembers.push(info);
                    oldMembers.push(info.userId);
                } else {
                    let info = {
                        isHost: false,
                        isPresenter: false,
                        status: 'accept',
                        isInvited: true,

                        userId: member,
                        acceptTime: 0,
                        rejectTime: 0,
                    };
                    info.isPresenter = info.userId.toString() === presenter.toString();
                    newMembers.push(info);
                    notificationUsers.push(info.userId);
                }
            });

            console.log({ newMembers, notificationUsers });
            //return

            const webinarData = {
                title,
                description,
                cmePartner,
                dateWebinar,
                endDateWebinar,
                timeWebinar: { start, end },
                accredited,
                image,
                link,
                members: newMembers,
                timeOffset,
                timeStart,
                timeEnd,
                bannerDescription,
                recordingEnable,
                lessthan50ppl: lessthan50ppl,
            };
            presenter && (webinarData['presenter'] = presenter);

            await Webinar.updateOne(
                {
                    _id,
                },
                {
                    $set: webinarData,
                }
            );

            webinar = await getWebinarDetails({ webinarId: webinar._id, loginUser });

            if (webinar.compositionIds && webinar.compositionIds[0]) {
                webinar.compositionIds = `${webinar.compositionIds[0]}.mp4`;
            } else {
                webinar.compositionIds = '';
            }

            console.log('webinar.paymentStatus===========>', webinar.paymentStatus);
            if (webinar.paymentStatus == 'SUCCESS') {
                console.log('fjdflkjsdfkljdsklfjsldfjldsjflsdjf');
                console.log({ oldMembers, newMembers: notificationUsers });
                Webinar.findOne({ _id: webinar._id }).exec((err, cmdData) => {
                    sendEditWebinarPush(
                        {
                            webinar: cmdData,
                            dateWebinar,
                            timeWebinar: start,
                            oldMembers,
                            newMembers: notificationUsers,
                            isEdit: true,
                        },
                        err => {
                            err && console.log(err);
                        }
                    );
                });
            }

            return res.success({
                webinar,
            });
        } catch (err) {
            return next(err);
        }
    }

    /**
     * @param {*} req
     * @param {*} res
     * @param {*} next
     * @returns
     */
    async addUserWebinar(req, res, next) {
        try {
            let { webinarId, userId } = req.body;
            const loginUser = req.user;

            let webinar = await Webinar.findOne({
                _id: webinarId,
                isDeleted: false,
                members: { $elemMatch: { userId: userId } },
            });

            if (webinar) {
                return res.warn({}, 'already invited');
            }

            await Webinar.updateOne(
                {
                    _id: webinarId,
                },
                {
                    $addToSet: {
                        members: {
                            userId,
                            isHost: false,
                            isPresenter: false,
                            acceptTime: 0,
                            rejectTime: 0,
                            status: 'accept',
                        },
                    },
                }
            );

            webinar = await getWebinarDetails({ webinarId: webinarId, loginUser });

            return res.success({
                webinar,
            });
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    /***
     * updateCount
     */
    async updateCount(req, res, next) {
        try {
            let { webinarId, type } = req.body;
            const loginUser = req.user;
            let webinar = await Webinar.findOne({
                _id: webinarId,
            })
                .select('shareCount viewCount')
                .lean();

            let updateQuery = {};
            if (type === 'view') {
                let viewCount = 1;
                if (webinar.viewCount) {
                    viewCount = webinar.viewCount + 1;
                }
                updateQuery = {
                    ...updateQuery,
                    viewCount,
                };
            } else {
                let shareCount = 1;
                if (webinar.shareCount) {
                    shareCount = webinar.shareCount + 1;
                }
                updateQuery = {
                    ...updateQuery,
                    shareCount,
                };
            }
            await Webinar.updateOne(
                {
                    _id: webinarId,
                },
                {
                    $set: updateQuery,
                }
            );

            webinar = await getWebinarDetails({ webinarId: webinarId, loginUser });

            return res.success({
                webinar,
            });
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    /**
     * @param { page, limit } req
     * @param {*} res
     * @param {*} next
     */
    async webinarInvites(req, res, next) {
        try {
            let { page, limit } = req.body;
            page = page || 1;
            limit = limit || 20;
            const skip = (page - 1) * limit;
            const loginUser = req.user;
            const currentUserId = ObjectId(loginUser._id.toString());
            let currentTime = moment()
                .utc()
                .unix();
            /**
             * todo
             * after accept or mark interested remove from this api
             *
             */

            let matchQuery = {
                isSuspended: false,
                isDeleted: false,
                timeStart: { $gt: currentTime },
            };
            if (req.user.organizationId) {
                matchQuery = {
                    organizationId: ObjectId(req.user.organizationId.toString()),
                    ...matchQuery,
                };
            } else {
                matchQuery = {
                    paymentStatus: 'SUCCESS',
                    organizationId: { $exists: false },
                    ...matchQuery,
                };
            }

            let query = [
                {
                    $match: matchQuery,
                },
                {
                    $facet: {
                        invited: [
                            { $match: { 'members.userId': { $eq: ObjectId(loginUser._id.toString()) } } },
                            {
                                $addFields: {
                                    currentMember: {
                                        $arrayElemAt: [
                                            '$members',
                                            { $indexOfArray: ['$members.userId', currentUserId] },
                                        ],
                                    },
                                },
                            },
                            {
                                $match: {
                                    'currentMember.status': { $eq: 'new' },
                                },
                            },
                        ],
                        notInvited: [{ $match: { 'members.userId': { $ne: ObjectId(loginUser._id.toString()) } } }],
                    },
                },
                {
                    $project: {
                        all: {
                            $concatArrays: ['$invited', '$notInvited'],
                        },
                    },
                },
                {
                    $unwind: { path: '$all', preserveNullAndEmptyArrays: true },
                },

                {
                    $replaceRoot: { newRoot: { $ifNull: ['$all', {}] } },
                },

                {
                    $project: {
                        currentMember: 1,
                        _id: 1,
                        paymentStatus: 1,
                        title: 1,
                        description: 1,
                        cmePartner: 1,
                        dateWebinar: 1,
                        timeWebinar: 1,
                        accredited: 1,
                        image: 1,
                        link: 1,
                    },
                },
            ];

            query = [
                ...query,
                ...[
                    {
                        $sort: { _id: -1 },
                    },
                    {
                        $skip: skip,
                    },
                    {
                        $limit: limit,
                    },
                ],
            ];

            let webinars = await Webinar.aggregate(query);

            if (!webinars[0]?._id) {
                webinars = [];
            }

            const nextPage = webinars.length === limit;
            return res.success({ nextPage, webinars });
        } catch (err) {
            return next(err);
        }
    }

    /**
     *
     */
    async recordedCme(req, res, next) {
        try {
            let { search, page, limit } = req.body;

            page = page || 1;
            limit = limit || 20;
            const skip = (page - 1) * limit;

            let currentTime =
                moment()
                    .utc()
                    .unix() + 600; //10min

            let matchQuery = {
                timeEnd: { $lt: currentTime },
                isSuspended: false,
                isDeleted: false,
                isCmeDelete: { $in: [null, false] },
                recordingEnable: true,
                'compositionIds.0': { $exists: true },
            };

            if (search) {
                const searchValue = new RegExp(
                    search
                        .split(' ')
                        .filter(val => val)
                        .map(value => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
                        .join(' '),
                    'i'
                );

                matchQuery.$or = [{ title: searchValue }, { description: searchValue }];
            }

            if (req.user.organizationId) {
                matchQuery = {
                    ...matchQuery,
                    organizationId: req.user.organizationId,
                };
            } else {
                matchQuery = {
                    ...matchQuery,
                    organizationId: { $exists: false },
                };
            }

            let query = [
                {
                    $match: matchQuery,
                },
                {
                    $project: {
                        host: '$userId',
                        compositionIds: 1,
                        compositionPermission: 1,
                        members: 1,
                        _id: 1,
                        title: 1,
                        description: 1,
                        cmePartner: 1,
                        dateWebinar: 1,
                        timeWebinar: 1,
                        accredited: 1,
                        image: 1,
                        link: 1,
                        shareCount: 1,
                        viewCount: 1,
                    },
                },

                {
                    $lookup: {
                        from: 'users',
                        let: { host: '$host' },
                        pipeline: [
                            { $match: { $expr: { $and: [{ $eq: ['$_id', '$$host'] }] } } },
                            { $project: { fullName: 1, avatar: 1, specality: 1 } },
                            {
                                $lookup: {
                                    from: 'specialities',
                                    localField: 'specality',
                                    foreignField: '_id',
                                    as: 'specality',
                                },
                            },
                            { $unwind: { path: '$specality', preserveNullAndEmptyArrays: true } },
                        ],
                        as: 'host',
                    },
                },
                { $unwind: { path: '$host', preserveNullAndEmptyArrays: true } },

                { $set: { compositionIds: { $arrayElemAt: ['$compositionIds', 0] } } },
                {
                    $set: {
                        presenter: {
                            $filter: { input: '$members', as: 'x', cond: { $eq: ['$$x.isPresenter', true] } },
                        },
                    },
                },
                { $unwind: { path: '$presenter', preserveNullAndEmptyArrays: true } },
                { $project: { members: 0 } },
                { $set: { presenter: '$presenter.userId' } },
                {
                    $lookup: {
                        from: 'users',
                        let: { userId: '$presenter' },
                        pipeline: [
                            { $match: { $expr: { $and: [{ $eq: ['$_id', '$$userId'] }] } } },
                            { $project: { fullName: 1, avatar: 1, specality: 1 } },
                            {
                                $lookup: {
                                    from: 'specialities',
                                    localField: 'specality',
                                    foreignField: '_id',
                                    as: 'specality',
                                },
                            },
                            { $unwind: { path: '$specality', preserveNullAndEmptyArrays: true } },
                        ],
                        as: 'presenter',
                    },
                },
                { $unwind: { path: '$presenter', preserveNullAndEmptyArrays: true } },
            ];

            query = [
                ...query,
                ...[
                    {
                        $sort: { _id: -1 },
                    },
                    {
                        $skip: skip,
                    },
                    {
                        $limit: limit,
                    },
                ],
            ];

            //console.dir(query,{depth:10})

            let webinars = await Webinar.aggregate(query);
            //webinars.forEach( x=> x.compositionIds = `${x.compositionIds}.mp4` )
            console.dir(webinars, { depth: 10 });
            webinars.forEach(async x => {
                if (!x.shareCount) {
                    x['shareCount'] = 0;
                }
                if (!x.viewCount) {
                    x['viewCount'] = 0;
                }
                x.compositionIds = `${x.compositionIds}.mp4`;
                x[
                    'shareUrl'
                ] = `${process.env.SITE_URL}/webinar/webinar/recorded-cme-details-deep/${x._id}/${req.headers['x-telemedicine-platform']}`;

                x[
                    'shareTitle'
                ] = `TelemedReferral is a mobile app for online doctor-to-doctor interprofessional consultations, CMEs & CDEs, and Asynchronous case discussions. You are invited to watch the recording of ${x.title}`;
                x['shareDescription'] = '';

                if (!x.compositionPermission) {
                    //await makeObjectPublicRead( `voice-recordings/${x.compositionIds}` )
                    Webinar.updateOne(
                        {
                            _id: x._id,
                        },
                        {
                            $set: {
                                compositionPermission: true,
                            },
                        }
                    ).exec();
                }
            });

            const nextPage = webinars.length == limit ? true : false;
            res.success({
                nextPage,
                s3VideoUrl: `${process.env.AWS_S3_BASE}voice-recordings/`,
                webinars,
            });
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    /**
     *
     */
    async recordedCmeDetails(req, res, next) {
        let { _id, id } = req.params;
        console.log('111', req.params);

        if (!_id && id) {
            _id = id;
        }
        const loginUser = req.user;

        let matchQuery = {
            _id: ObjectId(_id),
            isSuspended: false,
            isDeleted: false,
            isCmeDelete: { $in: [null, false] },
            recordingEnable: true,
            'compositionIds.0': { $exists: true },
        };

        let query = [
            {
                $match: matchQuery,
            },
            {
                $project: {
                    host: '$userId',
                    compositionIds: 1,
                    compositionPermission: 1,
                    members: 1,
                    _id: 1,
                    title: 1,
                    description: 1,
                    cmePartner: 1,
                    dateWebinar: 1,
                    timeWebinar: 1,
                    bannerDescription: 1,
                    accredited: 1,
                    image: 1,
                    link: 1,
                    organizationId: 1,
                },
            },

            {
                $lookup: {
                    from: 'users',
                    let: { host: '$host' },
                    pipeline: [
                        { $match: { $expr: { $and: [{ $eq: ['$_id', '$$host'] }] } } },
                        { $project: { fullName: 1, avatar: 1, specality: 1 } },
                        {
                            $lookup: {
                                from: 'specialities',
                                localField: 'specality',
                                foreignField: '_id',
                                as: 'specality',
                            },
                        },
                        { $unwind: { path: '$specality', preserveNullAndEmptyArrays: true } },
                    ],
                    as: 'host',
                },
            },
            { $unwind: { path: '$host', preserveNullAndEmptyArrays: true } },

            { $set: { compositionIds: { $arrayElemAt: ['$compositionIds', 0] } } },
            {
                $set: {
                    presenter: { $filter: { input: '$members', as: 'x', cond: { $eq: ['$$x.isPresenter', true] } } },
                },
            },
            { $unwind: { path: '$presenter', preserveNullAndEmptyArrays: true } },
            { $project: { members: 0 } },
            { $set: { presenter: '$presenter.userId' } },
            {
                $lookup: {
                    from: 'users',
                    let: { userId: '$presenter' },
                    pipeline: [
                        { $match: { $expr: { $and: [{ $eq: ['$_id', '$$userId'] }] } } },
                        { $project: { fullName: 1, avatar: 1, specality: 1 } },
                        {
                            $lookup: {
                                from: 'specialities',
                                localField: 'specality',
                                foreignField: '_id',
                                as: 'specality',
                            },
                        },
                        { $unwind: { path: '$specality', preserveNullAndEmptyArrays: true } },
                    ],
                    as: 'presenter',
                },
            },
            { $unwind: { path: '$presenter', preserveNullAndEmptyArrays: true } },
        ];

        //console.dir(query,{depth:10})

        let send = true;

        let webinars = await Webinar.aggregate(query);
        webinars.forEach(async x => {
            console.log({
                a: x.organizationId,
                b: loginUser.organizationId,
            });
            if ((!x.organizationId && loginUser.organizationId) || (x.organizationId && !loginUser.organizationId)) {
                //return res.warn({}, 'This CME is not for you');
                send = false;
            } else if (
                x.organizationId &&
                loginUser.organizationId &&
                x.organizationId.toString() !== loginUser.organizationId.toString()
            ) {
                //return res.warn({}, 'This CME is not for you');
                send = false;
            }

            if (!x.link) {
                x['link'] = '';
            }

            x.compositionIds = `${x.compositionIds}.mp4`;
            x[
                'shareUrl'
            ] = `${process.env.SITE_URL}/webinar/webinar/recorded-cme-details-deep/${x._id}/${req.headers['x-telemedicine-platform']}`;
            x[
                'shareTitle'
            ] = `TelemedReferral is a mobile app for online doctor-to-doctor interprofessional consultations, CMEs & CDEs, and Asynchronous case discussions. You are invited to watch the recording of ${x.title}`;
            x['shareDescription'] = '';

            if (!x.compositionPermission) {
                //await makeObjectPublicRead( `voice-recordings/${x.compositionIds}` )
                Webinar.updateOne(
                    {
                        _id: x._id,
                    },
                    {
                        $set: {
                            compositionPermission: true,
                        },
                    }
                ).exec();
            }
        });

        if (!send) {
            return res.warn({}, 'This CME is not for you');
        }

        let webinar = webinars[0] || {};

        //todo remove after video encryption enable
        let videoUrl = await getReadSignedUrl(`voice-recordings/${webinar.compositionIds}`);
        videoUrl = videoUrl.replace('http://', 'https://');
        webinar.compositionIds = videoUrl;

        //await makeObjectPublicRead( `voice-recordings/${webinar.compositionIds}` )

        res.success({
            s3VideoUrl: '', //`${process.env.AWS_S3_BASE}voice-recordings/`,
            webinar,
        });
    }

    async recordedCmeDetailsDeep(req, res, next) {
        let { _id, platform } = req.params;
        console.log(_id);

        let webUrl = `${process.env.SITE_URL}webinar/webinar/${_id}`;

        return res.render('webinar/cme-details-deep', {
            webUrl,
            _id,
            platform,
        });
    }

    /**
     * @param {*} req
     * @param {*} res
     * @param {*} next
     */
    async details(req, res, next) {
        try {
            let { webinarId } = req.body;
            const loginUser = req.user;
            let currentTime = moment()
                .utc()
                .unix();

            let webinar = await getWebinarDetails({ webinarId, loginUser });

            let canSee = false;
            if (
                (!webinar.organizationId && !loginUser.organizationId) ||
                (webinar.organizationId &&
                    loginUser.organizationId &&
                    webinar.organizationId.toString() === loginUser.organizationId.toString())
            ) {
                canSee = true;
            }

            if (!canSee) {
                return res.warn({}, 'Invalid webinar');
            }

            const userData = await User.findOne({ _id: ObjectId(loginUser._id) }, { currency: 1 })
                .populate({ path: 'countryId', select: '_id currency' })
                .lean();
            const adminSettings = await AdminSettings.findOne({}).lean();
            let userCurrency =
                userData && userData.countryId && userData.countryId.currency ? userData.countryId.currency : '';

            //console.log({webinar})
            const identity = req.headers.authorization;
            let amount = webinar && webinar.amount ? Number(webinar.amount) : '';
            let gst = webinar && webinar.gst ? Number(webinar.gst) : '';
            let totalAmount = webinar && webinar.totalPayable ? Number(webinar.totalPayable) : '';

            if (amount && userCurrency && userCurrency != 'INR')
                webinar.amount = Number((amount / adminSettings.conversionRate).toFixed(2));
            if (gst && userCurrency && userCurrency != 'INR')
                webinar.gst = Number((gst / adminSettings.conversionRate).toFixed(2));
            if (totalAmount && userCurrency && userCurrency != 'INR')
                webinar.totalPayable = Number((totalAmount / adminSettings.conversionRate).toFixed(2));

            let currentMember = webinar.members.find(
                x => x.userId.toString() === loginUser._id.toString() && x.status !== 'reject'
            );

            let frontURl = `${process.env.SITE_URL}`;
            let inGroup = false;
            if (currentMember?._id) {
                inGroup = true;
            }
            let tUrl = `${process.env.SITE_URL}/webinar/start/?identity=${identity}&vdr=${webinarId}`;
            if (currentMember?.isPresenter === true) {
                tUrl = `${process.env.SITE_URL}/webinar/start/?identity=${identity}&vdr=${webinarId}`;
            }

            let isPast = false;
            if (webinar.timeEnd > currentTime) {
                isPast = true;
            }

            //try {

            if (!req.user.organizationId && webinar.paymentMethod != 'wallet') {
                //try {
                //if( webinar.userId.toString()==loginUser._id.toString() && webinar.orderId ){
                let payment = await axios({
                    method: 'get',
                    url: `https://api.razorpay.com/v1/orders/${webinar.orderId}/payments`,
                    auth: {
                        username: process.env.RAZORPAY_KEY_ID,
                        password: process.env.RAZORPAY_KEY_SECRET,
                    },
                    withCredentials: true,
                });
                //console.log(payment.data)
                if (payment) {
                    webinar.payment = payment.data;
                }
                if (webinar.paymentId && webinar.refundId) {
                    let refund = await axios({
                        method: 'get',
                        url: `https://api.razorpay.com/v1/payments/${webinar.paymentId}/refunds/${webinar.refundId}`,
                        auth: {
                            username: process.env.RAZORPAY_KEY_ID,
                            password: process.env.RAZORPAY_KEY_SECRET,
                        },
                        withCredentials: true,
                    });
                    webinar.refund = refund.data;
                }
                //}
                /*}
                catch(err){
                    return res.warn({}, 'Razor pay error occurred.');
                }*/
            }

            webinar.paymentMethod = '';
            if (webinar && webinar?.payment?.items[0]?.method) {
                webinar.paymentMethod = `${webinar?.payment?.items[0]?.method}`;
                webinar.paymentAt = webinar?.payment?.items[0]?.created_at;
            }

            if (webinar && webinar?.isWallet && webinar?.isWallet == true) {
                webinar.paymentMethod = `${webinar.paymentMethod} Telemed Wallet`;
            }

            let paymentRequest = await PaymentRequest.findOne({
                webinarId: webinarId,
            }).lean();
            console.log({ paymentRequest, '2': webinar.paymentId });

            if (paymentRequest?._id && !webinar.paymentId) {
                webinar.paymentId = paymentRequest._id;
                webinar.paymentAt = moment(paymentRequest.created).unix();
            }

            if (webinar?.paymentAt && isNaN(webinar.paymentAt.toString())) {
                webinar.paymentAt = moment(webinar.paymentAt).unix();
            }

            webinar['share'] = `${process.env.SITE_URL}/webinar/webinar/share/${webinarId}`;
            webinar[
                'shareText'
            ] = `TelemedReferral is an online platform for doctor to doctor inter-professional consultations; attend online CME / CDE and earn credits. You are invited to attend a webinar "${webinar.title}"`;
            webinar['isActive'] = webinar.timeEnd > currentTime;
            if (webinar.isSuspended == true) {
                webinar['isActive'] = false;
            }
            webinar['inGroup'] = inGroup;
            webinar['isPast'] = isPast;

            console.log('webinar.compositionIds', webinar.compositionIds);
            if (webinar.compositionIds && webinar.compositionIds[0]) {
                webinar.compositionIds = `${webinar.compositionIds[0]}.mp4`;
            } else {
                webinar.compositionIds = '';
            }
            //console.dir(webinar,{depth:3})
            return res.success({
                frontURl,
                tUrl,
                s3VideoUrl: `${process.env.AWS_S3_BASE}voice-recordings/`,
                webinar,
            });
        } catch (err) {
            return next(err);
        }
    }

    /**
     * @param {*} req
     * @param {*} res
     * @param {*} next
     * @returns
     */
    async acceptReject(req, res, next) {
        try {
            let { webinarId, status } = req.body;
            console.log('🚀 ~ acceptReject ~ status:', status);

            if (['accept', 'reject'].indexOf(status) == -1) {
                return res.warn({}, req.__('INVALID_STATUS'));
            }
            const loginUserId = req.user._id;
            const loginUser = req.user;

            let webinar = await Webinar.findOne({
                _id: webinarId,
                //"members.userId": loginUserId
            }).lean();
            //console.log("wwww", webinar.members  )
            let currentUserInfo = _.find(webinar.members, x => {
                return x.userId.toString() == loginUserId.toString();
            });
            //console.log( currentUserInfo  )

            if (
                (loginUser.organizationId || webinar.organizationId) &&
                webinar.organizationId.toString() !== loginUser.organizationId.toString()
            ) {
                return res.warn({ status: false }, 'You are not Invited to this webinar.');
            }

            if (status == 'accept') {
                //accept
                if (currentUserInfo?.userId) {
                    //current member  non exiting condition
                    await Webinar.updateOne(
                        {
                            _id: webinarId,
                            members: { $elemMatch: { userId: loginUser._id } },
                        },
                        {
                            $set: {
                                'members.$[m].status': status,
                            },
                        },
                        {
                            arrayFilters: [
                                {
                                    'm.userId': loginUser._id,
                                },
                            ],
                        }
                    );
                } else {
                    //not invited member
                    await Webinar.updateOne(
                        {
                            _id: webinarId,
                        },
                        {
                            $addToSet: {
                                members: {
                                    isHost: false,
                                    isPresenter: false,
                                    status: status,
                                    isInvited: false,
                                    userId: ObjectId(loginUserId.toString()),
                                    acceptTime: moment()
                                        .utc()
                                        .unix(),
                                    rejectTime: moment()
                                        .utc()
                                        .unix(),
                                },
                            },
                        }
                    );

                    if (status == 'accept') {
                        sendShowInterest({ webinar, loginUser }, err => {
                            err && console.log(err);
                        });
                    }
                }
            } else {
                //reject
                //console.log({currentUserInfo})
                if (currentUserInfo?.userId) {
                    //current member
                    if (currentUserInfo.isInvited == true) {
                        await Webinar.updateOne(
                            {
                                _id: webinarId,
                                members: { $elemMatch: { userId: loginUser._id } },
                            },
                            {
                                $set: {
                                    'members.$[m].status': status,
                                    'members.$[m].acceptTime': moment()
                                        .utc()
                                        .unix(),
                                    'members.$[m].rejectTime': moment()
                                        .utc()
                                        .unix(),
                                },
                            },
                            {
                                arrayFilters: [
                                    {
                                        'm.userId': loginUser._id,
                                    },
                                ],
                            }
                        );
                    } else {
                        await Webinar.updateOne(
                            {
                                _id: webinarId,
                            },
                            {
                                $pull: {
                                    members: {
                                        userId: ObjectId(loginUserId.toString()),
                                    },
                                },
                            }
                        );
                    }
                } else {
                    //do nothing
                }
            }

            return res.success({});
        } catch (err) {
            return next(err);
        }
    }
    // ...existing code...

    async join(req, res, next) {
        try {
            let { webinarId, lessthan50ppl } = req.body;
            const roomName = webinarId;
            let loginUser = req.user;
            console.log('join webinar', loginUser._id);

            let webinar = await Webinar.findOne({
                _id: roomName,
                isDeleted: false,
                members: { $elemMatch: { userId: loginUser._id, status: { $ne: 'reject' } } },
            }).lean();

            if (!webinar) {
                return res.warn({ status: false }, req.__('INVALID_STATUS'));
            }

            if (!webinar.isStart) {
                return res.warn({ status: false }, 'Webinar is not started. please wait');
            }

            if (
                (loginUser.organizationId || webinar.organizationId) &&
                webinar.organizationId?.toString() !== loginUser.organizationId?.toString()
            ) {
                return res.warn({ status: false }, 'You are not Invited to this webinar.');
            }

            let currentTime = moment()
                .utc()
                .unix();
            if (currentTime > webinar.timeEnd) {
                return res.warn({ status: false }, 'Webinar time is over please contact to host');
            }

            webinar = await getWebinarDetails({ webinarId: webinar._id, loginUser });

            let currentMember = webinar.members.find(x => x.userId.toString() == loginUser._id.toString());
            let identity = JSON.stringify({
                _id: currentMember.userId,
                n: currentMember.fullName,
                h: currentMember.isHost ? 'y' : 'n',
                p: currentMember.isPresenter ? 'y' : 'n',
            });

            if (lessthan50ppl) {
                // Use Twilio
                await findOrCreateRoom({
                    roomName,
                    timeEnd: webinar.timeEnd,
                    recordingEnable: webinar.recordingEnable,
                });
            } else {
                //Daily.co
                await findOrCreateRoomDailyCo({
                    roomName,
                    timeEnd: webinar.timeEnd,
                    recordingEnable: webinar.recordingEnable,
                });
            }
            const username = req.user.fullName;
            const token = await getAccessToken({ roomName: roomName, identity: identity, ppl });
            await updateMemberToken({ userId: loginUser._id, token, webinarId: webinar._id });

            return res.success({
                token: token,
                username,
                currentMember,
            });
        } catch (err) {
            return next(err);
        }
    }

    async joinRoom(req, res, next) {
        try {
            let { roomName, username, lessthan50ppl } = req.body;
            let loginUser = req.user;

            let webinar = await getWebinarDetails({ webinarId: roomName, loginUser });

            if (!webinar) {
                return res.warn({ status: false }, req.__('INVALID_STATUS'));
            }
            if (
                (loginUser.organizationId || webinar.organizationId) &&
                webinar.organizationId?.toString() !== loginUser.organizationId?.toString()
            ) {
                return res.warn({ status: false }, req.__('INVALID_STATUS'));
            }
            if (webinar.paymentStatus == 'PENDING') {
                return res.warn({ status: false }, "Can't start webinar now please contact to host");
            }
            let currentTime = moment()
                .utc()
                .unix();
            if (currentTime > webinar.timeEnd) {
                return res.warn({ status: false }, 'Webinar time is over please contact to host');
            }

            let currentMember = webinar.members.find(x => x.userId.toString() == loginUser._id.toString());

            if (currentMember?.userId) {
                let memberName =
                    currentMember.fullName.length > 15
                        ? currentMember.fullName.substring(0, 15)
                        : currentMember.fullName;
                let identity = JSON.stringify({
                    _id: currentMember.userId,
                    n: memberName,
                    h: currentMember.isHost ? 'y' : 'n',
                    p: currentMember.isPresenter ? 'y' : 'n',
                });
                let recordingEnable = webinar.recordingEnable;
                if (lessthan50ppl) {
                    //twillio
                    await findOrCreateRoom({ roomName, timeEnd: webinar.timeEnd, recordingEnable: recordingEnable });
                } else {
                    await findOrCreateRoomDailyCo({
                        roomName,
                        timeEnd: webinar.timeEnd,
                        recordingEnable: recordingEnable,
                    });
                }
                const token = await getAccessToken({ roomName, identity, currentMember });
                await updateMemberToken({ userId: loginUser._id, token, webinarId: webinar._id });

                return res.send({
                    token: token,
                    webinar,
                    currentMember,
                });
            } else {
                return res.warn({ status: false }, 'You are not part of this webinar.');
            }
        } catch (err) {
            return next(err);
        }
    }
    async memberInfo(req, res, next) {
        try {
            let { webinarId, userId } = req.params;
            let webinar = await Webinar.findOne({ _id: webinarId }).lean();
            let userInfo = webinar.members.find(x => x.userId.toString() === userId.toString());
            res.success({ userInfo });
        } catch (err) {
            return next(err);
        }
    }

    async paymentToken(req, res) {
        const { user } = req;
        let { id, isWallet } = req.query;

        if (!user) {
            return res.unauthorized('', req.__('USER_NOT_FOUND'));
        }
        const orderData = await Webinar.countDocuments({
            _id: id,
            paymentStatus: 'PENDING',
        });
        if (!orderData) {
            return res.success({}, req.__('ORDER_TOKEN'));
        }
        const token = generateWebinarToken({ id: id });
        console.log('--------------', token);

        if (!(isWallet && isWallet == 'yes')) {
            isWallet = 'no';
        }

        return res.success({ token: `webinar/hold-charge/${token}/${isWallet}` }, req.__('ORDER_TOKEN'));
    }

    async initHoldCharge(req, res, next) {
        try {
            //const { user } = req;
            const { token, isWallet } = req.params;

            jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
                console.log('err', { err, decoded });
                if (err || !decoded.id)
                    return res.render('payments/hold-charge', {
                        command: 'showErrorMessage',
                        successTitle: '',
                        successMsg: '',
                        errorCodeTitle: req.__('ERROR_CODE'),
                        errorCode: 'TOKEN_DECODING_ERROR',
                        errorTitle: req.__('TOKEN_DECODING_ERROR'),
                        errMsg: req.__('FAILED_TO_INIT_PAYMENT'),
                        publicKey: process.env.RAZORPAY_KEY_ID,
                        webinarId: '',
                        orderId: '',
                        amount: 0,
                        email: '',
                    });

                const webinar = await Webinar.findOne({ _id: decoded.id })
                    .populate('userId')
                    .lean();
                const adminSettings = await AdminSettings.findOne({});
                const doctorData = await User.findOne({ _id: ObjectId(webinar.userId._id) }, { currency: 1 })
                    .populate({ path: 'countryId', select: '_id currency' })
                    .lean();
                let doctorCurrency =
                    doctorData && doctorData.countryId && doctorData.countryId.currency
                        ? doctorData.countryId.currency
                        : '';

                if (!webinar) {
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
                        webinarId: '',
                        amount: 0,
                        payableAmount: 0,
                        email: '',
                        name: '',
                        gst: '',
                    });
                }

                let customerId;
                if (webinar.userId.customerId) {
                    customerId = webinar.userId.customerId;
                } else {
                    let getCustomer = await instance.customers.create({
                        name: webinar.userId.fullName,
                        email: webinar.userId.email,
                        contact: webinar.userId.phone,
                        notes: {},
                        fail_existing: 0,
                    });

                    customerId = getCustomer.id;
                    await User.updateOne(
                        {
                            _id: webinar.userId._id,
                        },
                        {
                            $set: {
                                customerId,
                            },
                        }
                    );
                }

                // let amount              = Math.ceil(Number(webinar.amount || 1) * 100)
                // let gst                 = Math.ceil(Number(webinar.gst ) * 100)

                let amount =
                    doctorCurrency && doctorCurrency == 'INR'
                        ? Math.ceil(Number(webinar.amount || 1) * 100)
                        : Math.ceil(Number((webinar.amount / adminSettings.conversionRate).toFixed(2) * 100 || 1));
                let gst = doctorCurrency && doctorCurrency == 'INR' ? Math.ceil(Number(webinar.gst) * 100) : 0;
                let payableAmount = amount + gst;
                let realPayableAmount = amount + gst;
                let fromWallet = false;
                let walletAmount = 0;
                let orderId = webinar.orderId;

                if (isWallet && isWallet == 'yes') {
                    let walletBalance = await getUserWalletBalance({ userId: webinar.userId._id });
                    //return
                    if (!isNaN(walletBalance)) {
                        walletBalance = +walletBalance;
                        amount =
                            doctorCurrency && doctorCurrency == 'INR'
                                ? Math.ceil(Number(webinar.amount || 1) * 100)
                                : Math.ceil(
                                      Number((webinar.amount / adminSettings.conversionRate).toFixed(2) * 100 || 1)
                                  );
                        gst = doctorCurrency && doctorCurrency == 'INR' ? Math.ceil(Number(webinar.gst) * 100) : 0;
                        walletBalance =
                            doctorCurrency && doctorCurrency == 'INR'
                                ? walletBalance
                                : Number((walletBalance / adminSettings.conversionRate).toFixed(2));
                        payableAmount = amount + gst;
                        payableAmount = payableAmount - walletBalance * 100;
                        fromWallet = true;
                        walletAmount = walletBalance;

                        if (payableAmount > 0) {
                            const ID = `${parseInt(process.env.MIN_WEBINAR_ID || 1) +
                                (await Webinar.countDocuments({}))}`;
                            let options = {
                                amount: Number(payableAmount),
                                currency:
                                    doctorCurrency && doctorCurrency == 'INR'
                                        ? process.env.CURRENCY || 'INR'
                                        : doctorCurrency,
                                receipt: ID,
                            };
                            let order = await instance.orders
                                .create(options)
                                .catch(err => console.log('razorpay err', err));
                            orderId = order.id;
                        } else {
                            //payableAmount = 0
                        }
                    }
                } else {
                    const ID = `${parseInt(process.env.MIN_WEBINAR_ID || 1) + (await Webinar.countDocuments({}))}`;
                    let options = {
                        amount: Number(payableAmount),
                        currency:
                            doctorCurrency && doctorCurrency == 'INR' ? process.env.CURRENCY || 'INR' : doctorCurrency,
                        receipt: ID,
                    };
                    let order = await instance.orders.create(options).catch(err => console.log('razorpay err', err));
                    orderId = order.id;
                }

                if (fromWallet) {
                    if (payableAmount <= 0) {
                        walletAmount = realPayableAmount / 100;
                    }
                    let set = {
                        isWallet: true,
                        walletAmount,
                        orderId,
                    };

                    Webinar.updateOne(
                        {
                            _id: webinar._id,
                        },
                        {
                            $set: set,
                        }
                    ).exec();
                    if (payableAmount <= 0) {
                        payableAmount = 0;
                    }
                    //payableAmount = 0
                } else {
                    Webinar.updateOne(
                        {
                            _id: webinar._id,
                        },
                        {
                            $set: {
                                isWallet: false,
                                walletAmount: 0,
                                orderId,
                            },
                        }
                    ).exec();
                }

                //await Webinar.findOne

                return res.render('payments/hold-charge', {
                    command: 'holdCharge',
                    successTitle: '',
                    successMsg: req.__('REDIRECTING_TO_PAYMENTS'),
                    errorCodeTitle: '',
                    errorCode: '',
                    errorTitle: '',
                    errMsg: '',
                    publicKey: process.env.RAZORPAY_KEY_ID,
                    orderId: orderId,
                    webinarId: webinar._id,
                    amount,
                    gst,
                    email: webinar.userId.email,
                    name: webinar.userId.fullName,
                    contact: webinar.userId.phone,
                    currency:
                        doctorCurrency && doctorCurrency == 'INR' ? process.env.CURRENCY || 'INR' : doctorCurrency,
                    //customerId: webinar.userId.customerId,
                    customerId,
                    payableAmount,
                    walletAmount,
                });
            });
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async verify(req, res, next) {
        if (req.body.error && req.body.error.code === 'BAD_REQUEST_ERROR') {
            return res.redirect(`/webinar/webinar/failed?description=${req.body.error.description}`);
        }
        let adminSetting = await AdminSettings.findOne({});
        let { amount } = req.params;

        let webinar = await Webinar.findOne({ orderId: req.body.razorpay_order_id }).lean();
        let webinarId = webinar._id;

        let body = req.body.razorpay_order_id + '|' + req.body.razorpay_payment_id;
        let expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === req.body.razorpay_signature) {
            let consultantFee = parentage(100 - adminSetting.adminCommission, amount);

            let currentTime = moment()
                .utc()
                .unix();
            let paymentRes = await Webinar.findOneAndUpdate(
                { orderId: req.body.razorpay_order_id },
                {
                    $set: {
                        paymentId: req.body.razorpay_payment_id,
                        signature: req.body.razorpay_signature,
                        paymentStatus: 'SUCCESS',
                        paymentTime: currentTime,
                        paymentMethod: 'Razorpay',
                    },
                },
                { returnOriginal: false, upsert: true }
            );

            const loginUser = await User.findOne({ _id: webinar.userId }).lean(); //todonot

            webinar = await getWebinarDetails({ webinarId, loginUser });

            const start = webinar.timeWebinar.start;
            const dateWebinar = webinar.dateWebinar;

            sendWebinarPush({ webinar, dateWebinar, timeWebinar: start }, err => {
                err && console.log(err);
            });

            return res.redirect(`/webinar/webinar/success?name=${webinarId}`);
            // }
        } else {
            return res.redirect(`/webinar/webinar/failed`);
        }
    }

    async success(req, res) {
        const { name, allWallet } = req.query;
        let webinar = await Webinar.findOne({ _id: name }).lean();
        const UserData = await User.findOne({ _id: ObjectId(webinar.userId._id) }, { currency: 1 })
            .populate({ path: 'countryId', select: '_id currency' })
            .lean();
        const adminSettings = await AdminSettings.findOne({}).lean();
        let UserCurrency =
            UserData && UserData.countryId && UserData.countryId.currency ? UserData.countryId.currency : '';

        if (webinar?.isWallet && !webinar?.isWalletUpdate && webinar.walletAmount) {
            await PaymentRequest.create({
                webinarId: webinar._id,
                consultant_id: webinar.userId,
                amount:
                    UserCurrency && UserCurrency == 'INR'
                        ? webinar.walletAmount
                        : Math.ceil(webinar.walletAmount * adminSettings.conversionRate),
                status: 'APPROVED',
                action_date: moment().utc(),
                isShowOnList: false,
            });

            let set = {
                isWalletUpdate: true,
                paymentStatus: 'SUCCESS',
            };
            if (allWallet && allWallet == 'yes') {
                set['paymentMethod'] = 'wallet';

                webinar = await getWebinarDetails({ webinarId: webinar._id });

                const start = webinar.timeWebinar.start;
                const dateWebinar = webinar.dateWebinar;

                sendWebinarPush({ webinar, dateWebinar, timeWebinar: start }, err => {
                    err && console.log(err);
                });
            }

            await Webinar.updateOne(
                {
                    _id: webinar._id,
                },
                {
                    $set: set,
                }
            );
        }
        return res.render(`payments/success`, {
            title: 'Payment successful.',
            name: name ? name : '',
        });
    }

    async failed(req, res) {
        const { description } = req.query;
        return res.render('payments/failed', {
            title: 'Payment verification failed',
            description: description || '',
        });
    }

    async aboutBlank(req, res) {
        return res.render('payments/about_blank');
    }

    async start(req, res, next) {
        try {
            let { identity, vdr } = req.query;
            //console.log({ identity,vdr } )
            let webinarId = vdr;
            const loginUser = req.user;
            let webinar = await getWebinarDetails({ webinarId, loginUser });
            //console.log({ webinar } )
            //return res.json(webinar)

            let share = `${process.env.SITE_URL}/webinar/webinar/share/${webinarId}`;
            let shareText = `TelemedReferral is an online platform for doctor to doctor inter-professional consultations; attend online CME / CDE and earn credits. You are invited to attend a webinar "${webinar.title}"`;

            //console.log(webinar.members)
            //console.log({ loginUser } )
            let currentMember = webinar.members.find(x => x.userId.toString() === loginUser._id.toString());

            let currentTime = moment()
                .utc()
                .unix();
            let startTime = webinar.timeStart;

            console.log({
                currentTime,
                startTime,
            });
            const offset = webinar.timeOffset * 60;
            //currentTime = currentTime - offset
            console.log(currentTime, startTime);
            let diff = startTime - currentTime;
            //diff = diff/3600

            console.log({ diff });
            if (diff > 300) {
                req.flash('error', req.__('Webinar is not started. please wait'));
                //return res.redirect('/webinar/cme');
                return res.redirect(`/webinar/cme-details/${webinar._id}`);
                ///webinar/cme-details/643e2a000a27ae5d91e1ace3
            }

            console.log({
                tE: webinar.timeEnd,
                cT: currentTime,
            });
            if (currentTime > webinar.timeEnd) {
                req.flash('error', req.__('Webinar time is over'));
                //return res.redirect('/webinar/cme');
                return res.redirect(`/webinar/cme-details/${webinar._id}`);
                ///webinar/cme-details/643e2a000a27ae5d91e1ace3
            }

            //return;

            let diffTimeToEnd = webinar.timeEnd - currentTime;
            diffTimeToEnd = diffTimeToEnd * 1000;

            let isOrganization = false;
            if (webinar.organizationId) {
                isOrganization = true;
            }

            if (currentMember?.isPresenter === true) {
                Webinar.updateOne(
                    {
                        _id: webinarId,
                    },
                    {
                        $set: {
                            isStart: true,
                        },
                    }
                ).exec();

                return res.render('webinar/index2', { identity, vdr, share, shareText, diffTimeToEnd, isOrganization });
            } else {
                return res.warn({}, 'Invalid Url');
            }
        } catch (err) {
            console.log(err);
        }
    }

    async cancelWebinar(req, res, next) {
        try {
            let { webinarId } = req.body;
            const loginUser = req.user;
            let webinar = await Webinar.findOne({ _id: webinarId, userId: loginUser._id }).lean();
            if (!webinar) {
                return res.warn({}, req.__('INVALID_ID'));
            }

            await Webinar.updateOne(
                {
                    _id: webinarId,
                },
                {
                    $set: {
                        isSuspended: true,
                    },
                }
            );

            let webinarName = webinar.title;
            let currentMember = webinar.members.filter(x => x.status != 'reject');
            currentMember = currentMember.map(x => x.userId);
            let users = await User.find({ _id: currentMember })
                .select('_id deviceToken')
                .lean();
            let notification = [];
            let fcmData = {
                webinarId,
                type: 'WEBINAR_CANCEL',
            };
            if (users) {
                users.forEach(user => {
                    let title = `Webinar canceled`;
                    let message = `Webinar ${webinarName} is canceled by host`;
                    notification.push({
                        type: 'WEBINAR_CANCEL',
                        user: user._id,
                        webinarId,
                        title,
                        message,
                    });
                    user.deviceToken && sendFCMPush(user.deviceToken, title, message, fcmData);
                });

                notification.length && (await Notification.insertMany(notification));
            }

            res.success({}, req.__('CANCEL_SUCCESS'));
        } catch (err) {
            return next(err);
        }
    }

    async muteUnmuteUser(req, res, next) {
        try {
            let { webinarId, memberId } = req.body;

            let webinar = await Webinar.findOne({
                _id: webinarId,
            }).lean();

            let currentMember = webinar.members.find(x => x.userId.toString() == memberId.toString());
            //console.log({currentMember})
            let canTalk = true;
            if (currentMember.canTalk && currentMember.canTalk == true) {
                canTalk = false;
            }

            await Webinar.updateOne(
                {
                    _id: webinarId,
                    members: { $elemMatch: { userId: memberId } },
                },
                {
                    $set: {
                        'members.$[m].canTalk': canTalk,
                    },
                },
                {
                    arrayFilters: [
                        {
                            'm.userId': memberId,
                        },
                    ],
                }
            );

            let method = canTalk == true ? 'unmute' : 'mute';
            let receiverIds = [memberId.toString()];

            let socketResponse = await axios({
                method: 'post',
                url: `${process.env.SOCKET_URL}/api/socket-push`,
                data: {
                    method,
                    receiverIds,
                    data: {
                        webinarId,
                    },
                },
            });
            //console.log({socketResponse})

            return res.success({
                canTalk,
            });
        } catch (err) {
            return next(err);
        }
    }

    async chkCanUnmute(req, res, next) {
        try {
            let { webinarId } = req.body;

            let webinar = await Webinar.findOne({
                _id: webinarId,
            }).lean();

            let currentMember = webinar.members.find(x => x.userId.toString() == req.user._id.toString());

            let canUnmute = false;
            let message = "You can't unmute yourself";
            if (
                (currentMember.canTalk && currentMember.canTalk == true) ||
                currentMember.isHost ||
                currentMember.isPresenter
            ) {
                canUnmute = true;
                message = '';
            }

            return res.success(
                {
                    canUnmute,
                },
                message
            );
        } catch (err) {
            return next(err);
        }
    }

    async share(req, res, next) {
        let { webinarId } = req.params;
        console.log({ webinarId });
        return res.render('webinar/share', { webinarId });
    }

    /***
     * Login
     */
    async logInPage(req, res) {
        try {
            if (req.session.user) {
                return res.redirect('/webinar/cme');
            }
            return res.render('login');
        } catch (err) {
            console.log(err);
        }
    }

    async logIn(req, res) {
        if (req.session.user) {
            return res.redirect('/webinar/cme');
        }
        //console.log( {"rrr": req.body} )
        const { email, password, timeZone } = req.body;

        let { hash, encrypt } = await encryptMessage(email);

        let user = await User.findOne({
            emailHash: hash,
            isDeleted: false,
        });
        //return;

        if (!user) {
            req.flash('error', req.__('INVALID_CREDENTIALS'));
            return res.redirect('/webinar/log-in');
        }
        if (user.isSuspended) {
            req.flash('error', req.__('YOUR_ACCOUNT_SUSPENDED'));
            return res.redirect('/webinar/log-in');
        }

        const passwordMatched = await user.comparePassword(password);

        if (!passwordMatched) {
            req.flash('error', req.__('INVALID_CREDENTIALS'));
            return res.redirect('/webinar/log-in');
        }

        const platform = 'web';
        const token = jwt.sign(
            {
                sub: user._id,
                iat: utcDateTime().valueOf(),
            },
            process.env.JWT_SECRET
        );

        const userJson = user.toJSON();

        ['password', 'authTokenIssuedAt', '__v'].forEach(key => delete userJson[key]);

        req.session.user = userJson;
        req.session.token = token;
        req.session.timeZone = timeZone;
        req.flash('success', req.__('LOGIN_SUCCESS'));
        return res.redirect('/webinar/cme');
    }

    async logout(req, res) {
        req.session.user = null;
        req.session.token = null;
        req.flash('success', req.__('LOGOUT_SUCCESS'));
        return res.redirect('/webinar/log-in');
    }

    async cmeList(req, res, next) {
        try {
            let loginUser = req.session.user;
            let token = req.session.token;
            //console.log({loginUser});
            let webinars = await Webinar.aggregate([
                {
                    $match: {
                        paymentStatus: 'SUCCESS',
                        'members.userId': ObjectId(loginUser._id.toString()),
                        isDeleted: false,
                        isSuspended: false,
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        let: { userMember: '$members' },
                        pipeline: [
                            { $match: { $expr: { $and: [{ $in: ['$_id', '$$userMember.userId'] }] } } },
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
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                $unwind: { path: '$specality' },
                            },
                            { $addFields: { specality: '$specality.specialityName' } },
                        ],
                        as: 'userMembers',
                    },
                },
                {
                    $addFields: {
                        members: {
                            $map: {
                                input: '$members',
                                in: {
                                    $mergeObjects: [
                                        '$$this',
                                        {
                                            $arrayElemAt: [
                                                '$userMembers',
                                                { $indexOfArray: ['$userMembers._id', '$$this.userId'] },
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
                { $project: { userMembers: 0 } },
                { $unwind: '$members' },
                { $match: { 'members.userId': ObjectId(loginUser._id.toString()) } },
                { $match: { 'members.isPresenter': true } }, //"paymentStatus" : "PENDING",
                { $sort: { timeStart: 1 } },
            ]);

            let currentTime = moment()
                .utc()
                .unix();

            webinars.forEach(webinar => {
                webinar['isEnd'] = false;
                if (currentTime > webinar.timeEnd) {
                    webinar['isEnd'] = true;
                }
            });

            //console.log({webinars});return

            webinars = webinars.filter(x => !x.isEnd);

            let share = `${process.env.SITE_URL}/webinar/webinar/share/`;
            let shareText = `TelemedReferral is an online platform for doctor to doctor inter-professional consultations; attend online CME / CDE and earn credits. You are invited to attend a webinar`;
            let s3Base = process.env.AWS_S3_BASE;
            res.render('list', { token, webinars, share, shareText, s3Base });
        } catch (err) {
            return next(err);
        }
    }

    async cmeDetails(req, res, next) {
        try {
            let { webinarId } = req.params;

            //const loginUser = req.user;
            let loginUser = req.session.user;
            let token = req.session.token;

            let currentTime = moment()
                .utc()
                .unix();

            let webinar = await getWebinarDetails({ webinarId, loginUser });

            /*if( (!webinar.organizationId && loginUser.organizationId) || (webinar.organizationId && !loginUser.organizationId) ){
                return res.warn({}, 'This CME is not for you');
            }

            else if( webinar.organizationId && loginUser.organizationId && (webinar.organizationId.toString() !== loginUser.organizationId.toString()) ){
                return res.warn({}, 'This CME is not for you');
            }*/

            //console.log({webinar: webinar.members}); return;
            const identity = req.headers.authorization;

            let currentMember = webinar.members.find(
                x => x.userId.toString() === loginUser._id.toString() && x.status !== 'reject'
            );

            let frontURl = `${process.env.SITE_URL}`;
            let inGroup = false;
            if (currentMember?._id) {
                inGroup = true;
            }
            let tUrl = `${process.env.SITE_URL}/webinar/start/?identity=${identity}&vdr=${webinarId}`;
            if (currentMember?.isPresenter === true) {
                tUrl = `${process.env.SITE_URL}/webinar/start/?identity=${identity}&vdr=${webinarId}`;
            }

            let isPast = false;
            if (webinar.timeEnd > currentTime) {
                isPast = true;
            }

            webinar['isActive'] = webinar.timeEnd > currentTime;
            webinar['inGroup'] = inGroup;
            webinar['isPast'] = isPast;

            let share = `${process.env.SITE_URL}/webinar/webinar/share/`;
            let shareText = `TelemedReferral is an online platform for doctor to doctor inter-professional consultations; attend online CME / CDE and earn credits. You are invited to attend a webinar "${webinar.title}"`;
            let s3Base = process.env.AWS_S3_BASE;

            let host = webinar.members.find(x => x.isHost == true);
            let presenter = webinar.members.find(x => x.isPresenter == true);
            let members = webinar.members.filter(x => {
                if (x.isHost == false && x.isPresenter == false) {
                    return true;
                }
            });

            if (!webinar.organizationId && webinar.paymentMethod != 'wallet') {
                //try {
                //if( webinar.userId.toString()==loginUser._id.toString() && webinar.orderId ){
                let payment = await axios({
                    method: 'get',
                    url: `https://api.razorpay.com/v1/orders/${webinar.orderId}/payments`,
                    auth: {
                        username: process.env.RAZORPAY_KEY_ID,
                        password: process.env.RAZORPAY_KEY_SECRET,
                    },
                    withCredentials: true,
                });
                //console.log(payment.data)
                if (payment) {
                    webinar.payment = payment.data;
                }
                if (webinar.paymentId && webinar.refundId) {
                    let refund = await axios({
                        method: 'get',
                        url: `https://api.razorpay.com/v1/payments/${webinar.paymentId}/refunds/${webinar.refundId}`,
                        auth: {
                            username: process.env.RAZORPAY_KEY_ID,
                            password: process.env.RAZORPAY_KEY_SECRET,
                        },
                        withCredentials: true,
                    });
                    webinar.refund = refund.data;
                }
                //}
                /*}
                catch(err){
                    return res.warn({}, 'Razor pay error occurred.');
                }*/
            }

            webinar.paymentMethod = '';
            if (webinar && webinar?.payment?.items[0]?.method) {
                webinar.paymentMethod = `${webinar?.payment?.items[0]?.method}`;
                webinar.paymentAt = webinar?.payment?.items[0]?.created_at;
            }

            if (webinar && webinar?.isWallet && webinar?.isWallet == true) {
                webinar.paymentMethod = `${webinar.paymentMethod} Telemed Wallet`;
            }

            let paymentRequest = await PaymentRequest.findOne({
                webinarId: webinarId,
            }).lean();
            console.log({ paymentRequest, '2': webinar.paymentId });

            if (paymentRequest?._id && !webinar.paymentId) {
                webinar.paymentId = paymentRequest._id;
                webinar.paymentAt = moment(paymentRequest.created).unix();
            }

            if (webinar?.paymentAt && isNaN(webinar.paymentAt.toString())) {
                //console.log("222233333333", isNaN( webinar.paymentAt), webinar?.paymentAt)
                webinar.paymentAt = moment(webinar.paymentAt).unix();
            }

            webinar['isEnd'] = false;
            if (currentTime > webinar.timeEnd) {
                webinar['isEnd'] = true;
            }

            res.render('details', { webinar, share, shareText, s3Base, host, presenter, members, moment, token });
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async statusCb(req, res, next) {
        let {
            RoomStatus,
            RoomSid,
            RoomName,
            RecordingSid,
            ParticipantStatus,
            ParticipantIdentity,
            StatusCallbackEvent, //----
            Timestamp,
            AccountSid,
            TrackKind,
            RoomType,
            TrackSid,
            SequenceNumber,
            TrackName,
            ParticipantSid,
            CompositionSid, //----

            MediaUri,
            SourceSid,
            RecordingUri,
            MediaExternalLocation,
            Type,
            OffsetFromTwilioVideoEpoch,
            lessthan50ppl,
        } = req.body;

        console.log({
            body: req.body,
        });

        if (StatusCallbackEvent == 'room-ended') {
            JC.startCompositionNew({ webinarId: RoomName, RoomSid });
        }

        if (StatusCallbackEvent == '___composition-available') {
            let currentTime = moment()
                .utc()
                .unix();
            let webinar = await Webinar.findOne({
                recordingSid: RoomSid,
            })
                .select('recordingSid compositionIds timeEnd')
                .lean();

            if (webinar.recordingSid.length > 1) {
                let allUrls = [];
                webinar.compositionIds.forEach(u => {
                    allUrls.push(`voice-recordings/${u}`);
                });

                //allUrls.push( `voice-recordings/${composition.sid}` )
                let lastRmId = webinar.recordingSid[webinar.recordingSid.length - 1];
                console.log({ lastRmId, RoomSid });
                if (lastRmId == RoomSid) {
                    makeJoin({ allUrls, webinarId: webinar._id, numTry: 1 });
                }
            }
        }

        if (['connected', 'disconnected'].indexOf(ParticipantStatus) != -1) {
            let user = JSON.parse(ParticipantIdentity);
            let userId = user._id;
            let webinarId = RoomName;

            let webinar = await Webinar.findOne({ _id: webinarId }).lean();
            let presenter = webinar.members.find(x => x.isPresenter == true);
            let presenterId = presenter.userId;
            console.log({ presenterId });

            let inRoom = false;
            if (ParticipantStatus == 'connected') {
                inRoom = true;
            }

            let recordingRules = {
                roomSid: RoomSid,
                RecordingSid: RecordingSid,
                participantSid: ParticipantSid,
                trackSid: TrackSid,
                userType: user.p == 'y' ? 'presenter' : 'user', //presenter or user
                trackType: TrackName == 'share_screen' ? 'share' : 'normal', // share or normal
                trackKind: TrackKind,
            };
            console.log({
                recordingRules,
            });

            await Webinar.updateOne(
                {
                    _id: webinarId,
                    members: { $elemMatch: { userId: userId } },
                },
                {
                    $set: {
                        roomSid: RoomSid,
                        'members.$[m].inRoom': inRoom,
                        'members.$[m].RoomSid': RoomSid,
                        'members.$[m].ParticipantSid': ParticipantSid,
                    },
                    $addToSet: {
                        recordingSid: RoomSid,
                        recordingRules: recordingRules,
                    },
                },
                {
                    arrayFilters: [
                        {
                            'm.userId': userId,
                        },
                    ],
                }
            );

            console.log({ ParticipantStatus, presenterId, userId });
            if (ParticipantStatus == 'disconnected' && presenterId.toString() == userId.toString()) {
                twilioClient.video.v1
                    .rooms(RoomSid)
                    .update({ status: 'completed' })
                    .then(room => {
                        console.log(room.uniqueName);

                        Webinar.findOneAndUpdate(
                            {
                                _id: webinarId,
                            },
                            {
                                $set: {
                                    isStart: false,
                                },
                            },
                            {
                                new: true,
                            }
                        ).exec(async (err, webinarInfo) => {
                            if (err) {
                                console.log(err);
                            } else {
                                let method = 'webinarEnd';
                                let receiverIds = webinarInfo.members.map(x => x.userId.toString());

                                let socketResponse = await axios({
                                    method: 'post',
                                    url: `${process.env.SOCKET_URL}/api/socket-push`,
                                    data: {
                                        method,
                                        receiverIds,
                                        data: {
                                            webinarId,
                                        },
                                    },
                                });
                                //console.log({socketResponse})
                            }
                        });
                    });
            }
        }

        res.success({});
    }

    async demoSynch(req, res, next) {
        try {
            let { id } = req.query;

            let allUrls = [
                'voice-recordings/CJ0ad483776b44ee5217337f5a44de9a94',
                'voice-recordings/CJ085d45f958fc5b3d3878e58378d714e2',
            ];
            await makeJoinNew({ allUrls, webinarId: '6579572aa6ef0c74db150c3e' });

            //JC.startCompositionNew( {"webinarId": id} )

            return res.success({});
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async downloadFile(req, res, next) {
        try {
            let { id } = req.query;

            let webinar = await Webinar.findOne({
                _id: id,
            }).lean();

            let file = webinar.compositionIds[0];

            let fileLocation = `voice-recordings/${webinar.compositionIds[0]}.mp4`;
            let fileName = `${webinar.compositionIds[0]}.mp4`;
            let url = await getDownloaddUrl(fileLocation, fileName);
            res.success(url);
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async startCompositionNew({ webinarId, RoomSid }) {
        let webinar = await Webinar.findOne({
            _id: webinarId,
        }).lean();

        if (!webinar.recordingEnable) {
            return;
        }

        let allSids = webinar.recordingSid;

        let recordingRules = webinar.recordingRules;

        //console.log({recordingRules})
        //console.log({allSids}); //return;

        if (allSids.length > 0) {
            let allUrls = [];
            allSids.forEach((roomSid, index) => {
                console.log({ roomSid, RoomSid });
                if (roomSid == RoomSid || !RoomSid) {
                    let videoLayout = { grid: { video_sources: ['*'] } };

                    let recordingRule;
                    if (recordingRules.length > 0) {
                        recordingRule = recordingRules.filter(x => x.roomSid === roomSid);
                    }
                    //console.log("1===>",{recordingRule})
                    let resolution = '640x480';
                    /**
                     * chk if share is exist or not
                     */
                    let shareRules = recordingRule.filter(x => x.trackType == 'share');
                    //console.log("2===>",{recordingRule})
                    if (shareRules.length > 0) {
                        //6571638e9b8a1d3c73fd9f7c
                        resolution = '1280x720';
                        //resolution = '1920x1080'
                        //resolution = '640x480'
                        console.log('xxxxxxxxxxxxxxxxxxx', { shareRules });
                        let mainSource = [];
                        let pipSource = [];
                        let columnSource = [];

                        recordingRule.forEach(x => {
                            if (x.trackType == 'share') {
                                mainSource.push(x.trackSid);
                            } else if (x.trackType != 'share' && x.userType == 'presenter' && x.trackKind == 'video') {
                                pipSource.push(x.trackSid);
                            } else if (x.userType == 'user' && x.trackKind == 'video') {
                                columnSource.push(x.trackSid);
                            }
                        });
                        mainSource = [...new Set(mainSource)];
                        pipSource = [...new Set(pipSource)];
                        columnSource = [...new Set(columnSource)];

                        if (columnSource.length > 10) columnSource = columnSource.slice(0, 10);

                        let main = {
                            z_pos: 0,
                            x_pos: 95, //1280x720
                            //z_pos: 0,x_pos: 115,     //1920x1080

                            video_sources: mainSource,
                        };
                        let pip = {
                            //z_pos: 0,x_pos: 540,y_pos: 0,width: 100,height: 90,
                            z_pos: 0,
                            x_pos: 1150,
                            y_pos: 0,
                            width: 100,
                            height: 90, //1280x720
                            //z_pos: 0,x_pos: 1750,y_pos: 0,width: 150,height: 110,   //1920x1080

                            video_sources: pipSource,
                        };
                        let column = {
                            z_pos: 0,
                            x_pos: 0,
                            y_pos: 0,
                            width: 95,
                            height: 300, //1280x720
                            //z_pos: 0,x_pos: 0,y_pos: 0,width: 114,height: 300,   //1920x1080

                            max_rows: 5,
                            max_columns: 1,
                            reuse: 'show_newest',
                            video_sources: columnSource,
                        };

                        videoLayout = {
                            //main,pip,column
                        };

                        if (mainSource.length > 0) {
                            videoLayout = {
                                ...videoLayout,
                                main,
                            };
                        }
                        if (pipSource.length > 0) {
                            videoLayout = {
                                ...videoLayout,
                                pip,
                            };
                        }
                        if (columnSource.length > 0) {
                            videoLayout = {
                                ...videoLayout,
                                column,
                            };
                        }
                    } else {
                        resolution = '1280x720';
                        //resolution = '1920x1080'
                        let videoSource = '';
                        recordingRule.forEach(x => {
                            if (x.userType == 'presenter') {
                                videoSource = x.participantSid;
                            }
                        });

                        videoLayout = {
                            main: {
                                z_pos: 0,
                                video_sources: [videoSource],
                                //height: 400,
                                height: 720, //'1280x720';
                                //height: 1080,  //'1920x1080';
                            },
                            row: {
                                //z_pos: 0,x_pos: 0,y_pos: 400,width: 630,height: 80,max_rows: 1,

                                z_pos: 1,
                                x_pos: 0,
                                y_pos: 0,
                                width: 95,
                                height: 300,
                                max_rows: 1, //1280x720

                                video_sources: ['*'],
                                video_sources_excluded: [videoSource],
                            },
                        };
                    }

                    console.log('xxyyy', videoLayout);
                    //return

                    new WebinarRecord({ roomSid: roomSid }).save((err, x) => {
                        if (err) {
                            console.log('err1', err);
                        } else {
                            twilioClient.video.v1.compositions
                                .create({
                                    audioSources: ['*'],
                                    videoLayout,
                                    resolution,
                                    format: 'mp4',
                                    statusCallback: `${process.env.SITE_URL}/webinar/status-cb`,
                                    roomSid: roomSid,
                                })
                                .then(composition => {
                                    console.log('composition', composition.sid, composition);
                                    Webinar.updateOne(
                                        {
                                            _id: webinarId,
                                        },
                                        {
                                            $addToSet: {
                                                compositionIds: composition.sid,
                                            },
                                        }
                                    ).exec();
                                })
                                .catch(err => console.log('err', err));
                        }
                    });
                }
            });
        }
    }

    async startComposition({ webinarId }) {
        let webinar = await Webinar.findOne({
            _id: webinarId,
        }).lean();

        if (!webinar.recordingEnable) {
            return;
        }

        //let allSids = webinar.compositionIds;

        //let recordingRules = webinar.recordingRules;

        if (webinar.compositionIds.length > 1) {
            let allUrls = [];
            let allFiles = [];
            webinar.compositionIds.forEach(u => {
                allFiles.push(`${u}`);
                allUrls.push(`voice-recordings/${u}`);
            });
            makeJoin({ allUrls, allFiles, webinarId: webinar._id, numTry: 1 });
        }
    }

    async webinarAutoComplete({ webinarId }) {
        let webinar = await Webinar.findOne({
            _id: webinarId,
        }).lean();

        let method = 'webinarEnd';
        let receiverIds = webinar.members.map(x => x.userId.toString());

        let socketResponse = await axios({
            method: 'post',
            url: `${process.env.SOCKET_URL}/api/socket-push`,
            data: {
                method,
                receiverIds,
                data: {
                    webinarId: webinar._id.toString(),
                },
            },
        });

        if (webinar?.roomSid) {
            let roomSid = webinar?.roomSid;
            twilioClient.video
                .rooms(roomSid)
                .participants.list()
                .then(participants => {
                    participants.forEach(p => {
                        twilioClient.video
                            .rooms(roomSid)
                            .participants(p.sid)
                            .update({ status: 'disconnected' })
                            .then(() => console.log(`Participant ${p.sid} disconnected.`));
                    });
                });
        }
        return;
    }

    async downloadComplete(req, res, next) {
        let { webinarId } = req.body;
        let webinar = await Webinar.findOne({
            _id: webinarId,
        })
            .select('title')
            .lean();
        const loginUser = req.user;

        const notification = [
            {
                type: 'DOWNLOAD_COMPLETE',
                user: loginUser._id,
                title: 'Telemed Referral',
                message: `Download has been completed for ${webinar.title} `,
            },
        ];

        // let fcmDataPresenter = {
        //     type: 'DOWNLOAD_COMPLETE'
        // }
        let fcmDataPresenter = {
            webinarId,
            type: 'DOWNLOAD_COMPLETE',
        };

        let users = await User.findOne({ _id: loginUser._id })
            .select('_id deviceToken')
            .lean();

        users.deviceToken &&
            sendFCMPush(users.deviceToken, notification[0].title, notification[0].message, fcmDataPresenter);
        notification.length && (await Notification.insertMany(notification));

        return res.success();
    }
}

const makeJoinNew = async ({ allUrls, webinarId, numTry }) => {
    if (!numTry) {
        numTry = 1;
    }
    let dFiles = [
        '/var/nodeapps/telemedreferral/dev/src/webinar/static/videoAudio/CJ0ad483776b44ee5217337f5a44de9a94.mp4',
        '/var/nodeapps/telemedreferral/dev/src/webinar/static/videoAudio/CJ085d45f958fc5b3d3878e58378d714e2.mp4',
    ];

    /*for( let i = 0; i<= allUrls.length-1; i++ ){
        try{
            console.log("----------------------",{i},allUrls[i]);
            let url = `${process.env.AWS_S3_BASE}${allUrls[i]}.mp4`;
            console.log("----------------------",{url})
            
            let x =  await downloadFileFromS3(url, videoRecord)    
            x = path.join( videoRecord,x )
            dFiles.push(x)
            
        }catch(err){
            console.log(err)
        }
    }*/

    //let allPath = `-i ${video1Path} -i ${video2Path} -i ${video3Path} -i ${video4Path}`;
    let allPath = ``;
    dFiles.forEach(x => {
        allPath = `${allPath} -i ${x}`;
    });

    let n = dFiles.length;
    let outputPath = path.join(videoRecord, `${webinarId}.mp4`);

    let ffmpegCommand = `ffmpeg -f concat ${allPath} -c:v copy ${outputPath}`;

    exec(ffmpegCommand, async error => {
        if (error) {
            console.error('Error:', error);
            /*if( numTry<100 ){  
                setTimeout(function(){
                    makeJoin({allUrls,webinarId,numTry: numTry+1})
                },30000)
          }*/
            //res.status(500).json({ error: 'Video merging failed' });
        } else {
            dFiles.push(outputPath);
            // Optionally, you can send the merged video as a response
            //res.sendFile(outputPath);
            try {
                return;

                await uploadFromLocal({
                    key: `voice-recordings/${webinarId}.mp4`,
                    localPath: outputPath,
                });

                //let compositionIds = [ `${webinarId}.mp4`, ...webinar.compositionIds ]

                await Webinar.updateOne(
                    {
                        _id: webinarId,
                    },
                    {
                        $push: {
                            compositionIds: {
                                $each: [`${webinarId}`],
                                $position: 0,
                            },
                        },
                    }
                );

                dFiles.map(file =>
                    fs.unlink(file, x => {
                        console.log(x);
                    })
                );

                return;
            } catch (e) {
                console.log('err', e);
            }
        }
    });

    //let ffmpegCommand = `ffmpeg ${allPath} -filter_complex "concat=n=${n}:v=1:a=1" ${outputPath}`
    //let ffmpegCommand = `ffmpeg -f concat -safe 0 ${allPath}  -c copy ${outputPath}`

    /*
        const command = ffmpeg(dFiles[0]);
        for (let i = 1; i < dFiles.length; i++) {
            command.input(dFiles[i]);
        }
        command
        .on('error', function(err) {
        })
        .on('end', function() {
        })
        .mergeToFile(outputPath, videoRecord);
    */
};

const makeJoin = async ({ allUrls, allFiles, webinarId, numTry }) => {
    if (!numTry) {
        numTry = 1;
    }
    let dFiles = [];
    for (let i = 0; i <= allUrls.length - 1; i++) {
        try {
            let url = `${process.env.AWS_S3_BASE}${allUrls[i]}.mp4`;

            await downloadFileFromS3(url, videoRecord);
            //x = path.join( videoRecord,x )

            let fileName = `${allFiles[i]}.mp4`;
            let newFileName = `${allFiles[i]}-2.mp4`;

            let x = await fixFrameRate({
                localPath: videoRecord,
                fileName,
                newFileName,
            });
            if (x) {
                dFiles.push(path.join(videoRecord, newFileName));
            }
        } catch (err) {
            console.log('err', err);
        }
    }

    //let allPath = `-i ${video1Path} -i ${video2Path} -i ${video3Path} -i ${video4Path}`;
    let allPath = ``;
    dFiles.forEach(x => {
        allPath = `${allPath} -i ${x}`;
    });

    let n = dFiles.length;
    let outputPath = path.join(videoRecord, `${webinarId}.mp4`);

    let ffmpegCommand = `ffmpeg ${allPath} -filter_complex "concat=n=${n}:v=1:a=1" ${outputPath}`;
    //let ffmpegCommand = `ffmpeg -f concat -safe 0 ${allPath}  -c copy ${outputPath}`
    //let ffmpegCommand = `ffmpeg ${allPath} -filter_complex "concat=n=${n}" ${outputPath}`
    //let ffmpegCommand = `ffmpeg ${allPath} -vsync 2 ${outputPath}`

    exec(ffmpegCommand, async error => {
        if (error) {
            console.error('Error:', error);
            /*if( numTry<100 ){  
                setTimeout(function(){
                    makeJoin({allUrls,webinarId,numTry: numTry+1})
                },30000)
          }*/
            //res.status(500).json({ error: 'Video merging failed' });
        } else {
            dFiles.push(outputPath);
            // Optionally, you can send the merged video as a response
            //res.sendFile(outputPath);
            try {
                await uploadFromLocal({
                    key: `voice-recordings/${webinarId}.mp4`,
                    localPath: outputPath,
                });

                //let compositionIds = [ `${webinarId}.mp4`, ...webinar.compositionIds ]

                await Webinar.updateOne(
                    {
                        _id: webinarId,
                    },
                    {
                        $push: {
                            compositionIds: {
                                $each: [`${webinarId}`],
                                $position: 0,
                            },
                        },
                    }
                );

                dFiles.map(file =>
                    fs.unlink(file, x => {
                        console.log(x);
                    })
                );

                return;
            } catch (e) {
                console.log(e);
            }
        }
    });
};

const getS3Key = s3ObjectUrl => {
    const urlParts = s3ObjectUrl.split('/');
    const bucket = urlParts[3];
    return urlParts.slice(4).join('/');
};

const updateMemberToken = async ({ userId, token, webinarId }) => {
    await Webinar.updateOne(
        {
            _id: webinarId,
            members: { $elemMatch: { userId } },
        },
        {
            $set: {
                'members.$[m].token': token,
            },
        },
        {
            arrayFilters: [
                {
                    'm.userId': userId,
                },
            ],
        }
    );
    return;
};

const isValidURL = url => {
    try {
        let x = new URL(url);
        return true;
    } catch (err) {
        return false;
    }
};

const sendShowInterest = async ({ webinar, loginUser }, callback) => {
    try {
        let webinarName = webinar.title;
        const notification = [
            {
                type: 'WEBINAR_GLOBAL_SHOW_INTEREST',
                user: webinar.userId,
                webinarId: webinar._id,
                title: 'Webinar',
                message: `Dr. ${loginUser.fullName} is interested in webinar ${webinarName}`,
            },
        ];

        let fcmDataPresenter = {
            webinarId: webinar._id,
            type: 'WEBINAR_INVITE_PRESENTER',
        };

        let users = await User.findOne({ _id: webinar.userId })
            .select('_id deviceToken')
            .lean();

        users.deviceToken &&
            sendFCMPush(users.deviceToken, notification[0].title, notification[0].message, fcmDataPresenter);
        notification.length && (await Notification.insertMany(notification));

        callback(null);
    } catch (err) {
        callback(err);
    }
};

const sendEditWebinarPush = async ({ webinar, dateWebinar, timeWebinar, newMembers, oldMembers, isEdit }, callback) => {
    try {
        let webinarId = webinar._id;
        //let host =  webinar.members.find( x=> x.isHost==true )
        let webinarName = webinar.title;
        let presenter = webinar.members.find(x => x.isPresenter == true);

        if (oldMembers && oldMembers.length > 0) {
            let users = await User.find({ _id: { $in: oldMembers } })
                .select('_id deviceToken')
                .lean();
            let fcmDataPresenter = {
                webinarId: webinarId,
                type: 'WEBINAR_INVITE_PRESENTER',
            };

            let notification = [];
            if (users) {
                users.forEach(user => {
                    let title = 'Webinar Invitation';
                    //let message = `You are invited to attend a webinar  ${webinarName}`
                    let message = `Webinar ${webinarName} details have been updated`;
                    notification.push({
                        type: 'WEBINAR_INVITE',
                        user: user._id,
                        webinarId,
                        title: 'Webinar Invitation',
                        message: `Webinar ${webinarName} details have been updated`,
                    });
                    user.deviceToken && sendFCMPush(user.deviceToken, title, message, fcmDataPresenter);
                });

                notification.length && (await Notification.insertMany(notification));
            }
        }

        if (newMembers.indexOf(presenter.userId.toString()) != -1 && presenter.isHost == false) {
            //host and presenter same
            const notification = [
                {
                    type: 'WEBINAR_INVITE_PRESENTER',
                    user: presenter.userId,
                    webinarId,
                    title: 'Webinar Invitation',
                    message: `You are invited to present a webinar ${webinarName}`,
                },
            ];

            let fcmDataPresenter = {
                webinarId: webinarId,
                type: 'WEBINAR_INVITE_PRESENTER',
            };

            let users = await User.findOne({ _id: presenter.userId })
                .select('_id deviceToken')
                .lean();

            users.deviceToken &&
                sendFCMPush(users.deviceToken, notification[0].title, notification[0].message, fcmDataPresenter);
            notification.length && (await Notification.insertMany(notification));
        }

        //let otherUsers = webinar.members.filter( x => !x.isHost && !x.isPresenter )
        //otherUsers = otherUsers.map( x=> x.userId )

        let users = await User.find({ _id: { $in: newMembers } })
            .select('_id deviceToken')
            .lean();
        let notification = [];

        let fcmData = {
            webinarId,
            type: 'WEBINAR_INVITE',
        };
        if (users) {
            users.forEach(user => {
                let title = 'Webinar Invitation';
                let message = `You are invited to attend a webinar  ${webinarName}`;
                notification.push({
                    type: 'WEBINAR_INVITE',
                    user: user._id,
                    webinarId,
                    title,
                    message,
                });
                user.deviceToken && sendFCMPush(user.deviceToken, title, message, fcmData);
            });

            notification.length && (await Notification.insertMany(notification));
        }

        await AgendaJob.deleteOne({
            name: 'scheduleUserInform',
            'data.webinarId': webinarId.toString(),
        });

        let agendaData = {
            type: 'scheduleUserInform',
            webinarId: webinarId.toString(),
            data: { webinarId },
        };
        const dateFormat = 'DD MMM YYYY hh:mm A';
        //timeWebinar = timeWebinar.split("-")
        //const start = timeWebinar[0].trim();
        const start = timeWebinar;
        let offsetTime = -1 * webinar.timeOffset - 5;

        //let nextDate = moment(`${dateWebinar} ${start}`, dateFormat).add({ "minutes": -5 });
        let nextDate = moment(`${dateWebinar} ${start}`, dateFormat).add({ minutes: offsetTime });
        let nextDateTimeStamp = nextDate.valueOf();
        let cat = new Date(parseInt(nextDateTimeStamp));
        agenda.schedule(cat, 'scheduleUserInform', agendaData);

        callback(null);
    } catch (err) {
        callback(err);
    }
};
const sendWebinarPush = async ({ webinar, dateWebinar, timeWebinar, isEdit }, callback) => {
    try {
        let webinarId = webinar._id;
        //let host =  webinar.members.find( x=> x.isHost==true )
        let webinarName = webinar.title;
        let presenter = webinar.members.find(x => x.isPresenter == true);

        //if( presenter.isHost == false ){//host and presenter same
        {
            const notification = [
                {
                    type: 'WEBINAR_INVITE_PRESENTER',
                    user: presenter.userId,
                    webinarId,
                    title: 'Webinar Invitation',
                    message: `You are invited to present a webinar ${webinarName}`,
                },
            ];

            let fcmDataPresenter = {
                webinarId: webinarId,
                type: 'WEBINAR_INVITE_PRESENTER',
            };

            let users = await User.findOne({ _id: presenter.userId })
                .select('_id deviceToken')
                .lean();

            users.deviceToken &&
                sendFCMPush(users.deviceToken, notification[0].title, notification[0].message, fcmDataPresenter);
            notification.length && (await Notification.insertMany(notification));
        }

        let otherUsers = webinar.members.filter(x => !x.isHost && !x.isPresenter);
        otherUsers = otherUsers.map(x => x.userId);
        let users = await User.find({ _id: otherUsers })
            .select('_id deviceToken')
            .lean();
        let notification = [];

        let fcmData = {
            webinarId,
            type: 'WEBINAR_INVITE',
        };
        if (users) {
            users.forEach(user => {
                let title = 'Webinar Invitation';
                let message = `You are invited to attend a webinar  ${webinarName}`;
                notification.push({
                    type: 'WEBINAR_INVITE',
                    user: user._id,
                    webinarId,
                    title,
                    message,
                });
                user.deviceToken && sendFCMPush(user.deviceToken, title, message, fcmData);
            });

            notification.length && (await Notification.insertMany(notification));
        }

        if (isEdit && isEdit === true) {
            await AgendaJob.deleteOne({
                name: 'scheduleUserInform',
                'data.webinarId': webinarId.toString(),
            });
        }

        let agendaData = {
            type: 'scheduleUserInform',
            webinarId: webinarId.toString(),
            data: { webinarId },
        };
        const dateFormat = 'DD MMM YYYY hh:mm A';
        //timeWebinar = timeWebinar.split("-")
        //const start = timeWebinar[0].trim();
        const start = timeWebinar;
        let offsetTime = -1 * webinar.timeOffset - 5;

        //let nextDate = moment(`${dateWebinar} ${start}`, dateFormat).add({ "minutes": -5 });
        let nextDate = moment(`${dateWebinar} ${start}`, dateFormat).add({ minutes: offsetTime });
        let nextDateTimeStamp = nextDate.valueOf();
        let cat = new Date(parseInt(nextDateTimeStamp));
        agenda.schedule(cat, 'scheduleUserInform', agendaData);
        callback(null);
    } catch (err) {
        callback(err);
    }
};

const generateWebinarToken = payload => jwt.sign(payload, process.env.JWT_SECRET);

const findOrCreateRoom = async ({ roomName, timeEnd, recordingEnable }) => {
    let endTimeWebinar = timeEnd;
    let startComposition = endTimeWebinar + 600 + Math.floor(Math.random() * 100) + 50;
    try {
        // see if the room exists already. If it doesn't, this will throw
        // error 20404.
        let x = await twilioClient.video.rooms(roomName).fetch();
    } catch (error) {
        // the room was not found, so create it
        if (error.code == 20404) {
            //endTime
            let endTime = moment()
                .add({ hours: 1 })
                .toISOString();
            if (endTimeWebinar) {
                endTime = moment.unix(endTimeWebinar).toISOString();
            }
            //let compositionTime =  endTimeWebinar + 300
            {
                //cancel booking agenda
                let agendaData = {
                    type: 'webinarAutoComplete',
                    webinarId: roomName,
                    data: { webinarId: roomName },
                };
                //date = date + 180 //3 min
                //let cancelTime = date*1000
                //let cat = new Date(parseInt(cancelTime));
                let cat = endTime;
                agenda.schedule(cat, 'webinarAutoComplete', agendaData);
            }

            let chkAgenda = await AgendaJob.findOne({
                name: 'startComposition',
                'data.webinarId': roomName,
            }).lean();
            if (!chkAgenda) {
                let agendaData = {
                    type: 'startComposition',
                    webinarId: roomName,
                    data: { webinarId: roomName },
                };
                let cat = moment.unix(startComposition).toISOString();
                agenda.schedule(cat, 'startComposition', agendaData);
            }

            console.log({ endTime });
            let twilioCreate = {
                statusCallback: `${process.env.SITE_URL}/webinar/status-cb`,
                uniqueName: roomName,
                type: 'group',
                endTime,
            };

            if (recordingEnable && recordingEnable == true) {
                twilioCreate = {
                    ...twilioCreate,
                    recordParticipantsOnConnect: true,
                };
            }

            let info = await twilioClient.video.rooms.create(twilioCreate);

            Webinar.updateOne(
                {
                    _id: roomName,
                },
                {
                    $set: {
                        roomSid: info.sid,
                    },
                }
            ).exec();

            console.log({ info });
        } else {
            // let other errors bubble up
            throw error;
        }
    }
};

/**
 * Find or create a Daily.co room for webinars with more than 50 participants.
 * @param {Object} params
 * @param {string} params.roomName
 * @param {number} params.timeEnd
 * @param {boolean} params.recordingEnable
 * @returns {Promise<Object>} Room info
 */
const findOrCreateRoomDailyCo = async ({ roomName, timeEnd, recordingEnable }) => {
    try {
        const roomOptions = {
            name: roomName,
            properties: {
                enable_prejoin_ui: true,
                max_participants: 200, //default maximum
                exp: timeEnd,
            },
        };
        let room = await dailyCoService.findOrCreateRoom(roomOptions);

        // Optionally update your Webinar DB with the Daily.co room info
        await Webinar.updateOne(
            { _id: roomName },
            { $set: { dailyCoRoomUrl: room.url, dailyCoRoomId: room.id } }
        ).exec();

        return room;
    } catch (error) {
        throw error;
    }
};

const getAccessToken = async ({ roomName, identity, currentMember, lessthan50ppl = true }) => {
    // create an access token
    if (lessthan50ppl) {
        const token = new AccessToken(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_API_KEY,
            process.env.TWILIO_API_SECRET,
            { identity, currentMember }
        );
        // create a video grant for this specific room
        const videoGrant = new VideoGrant({
            room: roomName,
        });

        if (currentMember?.isHost === true) {
        }

        // add the video grant
        token.addGrant(videoGrant);
        // serialize the token and return it
        return token.toJwt();
    } else {
        return dailyCoService.generateToken({ roomName });
    }
};

const getWebinarDetails = async ({ webinarId, loginUser }) => {
    let query = [
        {
            $match: {
                _id: ObjectId(webinarId.toString()),
                isDeleted: false,
                //"members.userId": ObjectId(loginUser._id.toString())
            },
        },
        {
            $lookup: {
                from: 'users',
                let: { userMember: '$members' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [{ $in: ['$_id', '$$userMember.userId'] }],
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            avatar: 1,
                            specality: 1,
                        },
                    },
                    {
                        $lookup: {
                            from: 'specialities',
                            let: { sID: '$specality' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: ['$_id', '$$sID'],
                                        },
                                    },
                                },
                            ],
                            as: 'specality',
                        },
                    },
                    { $unwind: { path: '$specality', preserveNullAndEmptyArrays: true } },
                    {
                        $addFields: {
                            specality: '$specality.specialityName',
                        },
                    },
                ],
                as: 'userMembers',
            },
        },
        {
            $addFields: {
                members: {
                    $map: {
                        input: '$members',
                        as: 'member',
                        in: {
                            $mergeObjects: [
                                '$$member',
                                {
                                    $arrayElemAt: [
                                        '$userMembers',
                                        { $indexOfArray: ['$userMembers._id', '$$member.userId'] },
                                    ],
                                },
                            ],
                        },
                    },
                },
            },
        },
        {
            $project: {
                userMembers: 0,
            },
        },
    ];

    console.log('xxx===>', JSON.stringify(query));

    let webinars = await Webinar.aggregate(query);

    console.dir(webinars[0].members);

    return webinars[0];
};

//module.exports = new WebinarController();

const JC = new WebinarController();
module.exports = JC;