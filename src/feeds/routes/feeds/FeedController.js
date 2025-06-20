const {
    models: { User, Feed, FeedComment, FeedLike, FeedReport, Notification },
} = require('../../../../lib/models');
const { utcDateTime, randomString, sendFCMPush } = require('../../../../lib/util');
const { signToken, getFeedByQuery } = require('../../util/auth');
const { getPlatform } = require('../../util/common');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const mailer = require('../../../../lib/mailer');

const paginationLimit = 10;

class FeedController {

    async updateWallet(){
        let users = await User.aggregate([
            {
                $match: { isSuspended:false, organizationId: {$exists: false}, isDeleted: false }
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
            
            { '$unwind': { path: '$pending_amount', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$paid_amount', preserveNullAndEmptyArrays: true } },
            { '$unwind': { path: '$wallettopup_amount', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                   _id: 1,
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
        ]);

        //( (user.pending_amount + user.wallettopup_amount) - user.paid_amount).toFixed(2) || 'N/A'
        
        users.forEach( user=>{
            let walletBalance = (user.pending_amount + user.wallettopup_amount)- user.paid_amount
            walletBalance = +walletBalance.toFixed(2)
            User.updateOne({
                _id: user._id
            },{
                $set: {
                    walletBalance
                }
            }).exec()
        })

    }

    async generateToken(req, res) {
        let _id = req.body._id;
        res.success({
            token: require('jsonwebtoken').sign(
                {
                    sub: _id,
                    iat: utcDateTime().valueOf()
                },
                process.env.JWT_SECRET
            )
        })
    }

    async getUsers(req, res, next) {

        try {
            let { search } = req.body
            
            const { user } = req;
            let myBlockedUser = user.blockedUser !== undefined ? user.blockedUser : [];

            let blockByUser = await User.find({
                blockedUser: user._id
            }).select("_id").lean()
            blockByUser = blockByUser.map( x=> x._id )

            let allBlockUsers = [...blockByUser,...myBlockedUser]



            if (search.length < 1) {
                return res.success({ "users": [] })
            }

            const searchValue = new RegExp(
                search
                    .split(' ')
                    .filter(val => val)
                    .map(value => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
                    .join('|'),
                'i',
            );

            let query = {
                $and: [
                    { _id: {$ne: req.user._id  }   },
                    {_id: {$nin: allBlockUsers }},
                    {  "$or": [
                        {  "userName":  searchValue },
                        {  "fullName":  searchValue },
                    ]},
                    { isDeleted: false },
                    { isSuspended: false },
                    //{ step: 4 },
                    //{isVerified: true},

                    {
                        $or: [
                            {
                                "organizationId":  { $exists: false },
                                "specality" : { $exists: true },
                            },
                            {
                                "organizationId":  { $exists: true },
                               
                            }
                        ]
                    }
                ]
            }

            if( req.user.organizationId ){
                query['$and'].push({
                    organizationId:  ObjectId( req.user.organizationId.toString() ) 
                })
            }else{
                query['$and'].push({
                    organizationId:  { $exists: false }
                })
            }


            let users = await User.find( query ).select("fullName userName avatar").sort( { userName: 1, fullName:1, avatar : 1  } ).limit(20).lean()
            
            return res.status(200).send({
                success: true,
                data: users ? users : [],
                message: req.__("users")
            });

        } catch (err) {
            console.log(err)
            return next(err)
        }

    }

    async feeds(req, res, next) {
        let user = req.user
        //console.log('==>>', user);
        try {
            let { page = 1, perPage = paginationLimit } = req.query;
            const limit = parseInt(perPage) ? parseInt(perPage) : 0;

            let blockByUser = await User.find({
                blockedUser: user._id
            }).select("_id").lean()
            blockByUser = blockByUser.map( x=> x._id )

            let allBlockUsers = [...blockByUser,...user.blockedUser]

            let skip = (page - 1) * limit;
            console.log('limit==>>', skip);
            let query = {
                "isDeleted": false,
                "isSuspended": false,
                "userId": { $nin: allBlockUsers }
                //"userId": {$nin: user.blockedUser  } //for blocked users
                
            };

            if( req.user.organizationId ){
                query = {
                    "organizationId": req.user.organizationId ,
                    ...query
                }
            }else{
                query = {
                    "organizationId": {$exists: false}  ,
                    ...query
                }
            }

            const feedQuery = [
                {
                    $match: query
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userData'
                    }
                },
                {
                    $lookup: {
                        from: 'specialities',
                        localField: 'userData.specality',
                        foreignField: '_id',
                        as: 'professionData'
                    }
                },
                {
                    $unwind: { path: '$professionData', preserveNullAndEmptyArrays: true }
                },
                {
                    $unwind: { path: '$userData', preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: 'feedcomments',
                        let: {
                            feedID: '$_id',
                        },
                        as: 'cmntData',
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ['$feedId', '$$feedID'],
                                    },
                                }
                            },

                            //  {
                            //      $project : {
                            //          _id : 0,
                            //          message : 1,
                            //          created : 1,
                            //          //taggedUser : 1,
                            //          userId : 1,
                            //          feedId : 1
                            //      }
                            //  },

                            //    {
                            //          $lookup: {
                            //              from: 'users',
                            //              let: {
                            //                  userID: '$userId',
                            //              },
                            //              as: 'cmntUsers',
                            //              pipeline: [
                            //                  {
                            //                      $match: { 
                            //                          $expr: {
                            //                              $eq: ['$_id', '$$userID'],
                            //                          },
                            //                      },
                            //                  },

                            //                  {
                            //                          $project : {
                            //                              fullName : 1,
                            //                              created : 1
                            //                          }
                            //                  },
                            //              ]
                            //          },
                            //  },

                        ]
                    }
                },
                {
                    $lookup: {
                        from: 'feedlikes',
                        let: {
                            ufID: '$_id',
                        },
                        as: 'feedData',
                        pipeline: [
                            {
                                $match: {
                                    userId: ObjectId(user._id),
                                    isSelfLiked: true,
                                    $expr: {

                                        $eq: ["$feedId", "$$ufID"]
                                    },
                                }
                            }

                        ]
                    }
                },
                {
                    $unwind: {
                        path: "$feedData", preserveNullAndEmptyArrays: true
                    }
                },

                {
                    $project: {
                        // cmntData : 1,
                        feedType: 1,
                        files: 1,
                        totalLikes: 1,
                        totalComments: { $size: "$cmntData" },
                        created: 1,
                        profession: "$professionData.specialityName",
                        userId: "$userData._id",
                        name: "$userData.fullName",
                        avatar: "$userData.avatar",
                        isOnline: "$userData.isOnline",
                        isVerified: "$userData.isVerified",
                        updated: 1,
                        description: 1,
                        likes: 1,
                        blockedUser: "$userData.blockedUser",
                        uid: "$userId",
                        taggedUser : 1
                        // isSelfLiked: {
                        //     $cond: { if: { $eq: ["$feedData.isSelfLiked", true] }, then: true, else: false }
                        // }
                    }
                },

                {
                    $project: {
                        feedType: 1,
                        files: 1,
                        totalLikes: 1,
                        totalComments: 1,
                        created: 1,
                        profession: 1,
                        userId: 1,
                        name: 1,
                        avatar: 1,
                        isOnline: 1,
                        isVerified: 1,
                        blockedUser: 1,
                        uid: 1,
                        updated: 1,
                        description: 1,
                        isSelfLiked: 1,
                        likes: 1,
                        taggedUser : 1
                    }
                },
                {
                    $addFields: {
                        isSelfLiked: {
                            $in: [req.user._id, "$likes"]
                        }
                    }
                },

                {
                    $sort: { _id: -1 }
                },
                {
                    $skip: skip
                }, {
                    $limit: limit
                }

            ]

            console.log( JSON.stringify(feedQuery) )
            let feed = await getFeedByQuery({
                "query": feedQuery
            });

            //console.log("-->", feed.length);
            //console.log("session id->", user._id);

            let nextPage = feed.length == limit


            return res.status(200).send({
                success: true,
                data: feed.length ? feed : [],
                message: req.__("FEED_LIST"),
                nextPage: nextPage ? nextPage : false
            });

        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async createFeed(req, res, next) {
        const user = req.user;
        
        let {
            files,
            feedType,
            description,
            tagUser
        } = req.body;
        try {
            
            if(req.body.feedType == 'image' && req.body.files.length > 10){
                return res.status(200).send({
                    success: true,
                    data: [],
                    message: req.__("Limit exceeded maximum 10 image required")
                });
            }
            if (!user) {
                return res.unauthorized(null, req.__('UNAUTHORIZED'));
            }

            let newFeed = {
                userId: user._id,
                files,
                feedType: feedType,
                description: description,
            }
            if( req.user.organizationId ){
                newFeed = {
                    organizationId:  ObjectId( req.user.organizationId.toString() ) ,
                    ...newFeed
                }
            }
            const feed = await Feed.create(newFeed);

            /* tag user in post */
            const notify = [];
            let taggedUsers = [];
            let tagUsersIdNotify = [];
            if (tagUser?.length > 0) {
                let fcmData = {
                    feedId: ObjectId(feed._id),
                    type: 'FEED_TAG'
                }
                const notification = [
                    {
                        type: 'FEED_TAG',
                        user: user._id,
                        feedId: ObjectId(feed._id),
                        title: 'You have a new tag!',
                        message: `${user.fullName} tagged you in a post.`
                    }
                ];
                for (let i = 0; i < tagUser.length; i++) {
                    tagUsersIdNotify.push({ _id: tagUser[i]._id });
                    taggedUsers.push({
                        _id: tagUser[i]._id,
                        name: tagUser[i].name,
                        location: tagUser[i].location,
                        length: tagUser[i].length
                    });

                    notify.push({
                        user: tagUser[i]._id,
                        type: 'FEED_TAG',
                        feedId: ObjectId(feed._id),
                        title: 'You have a new tag!',
                        message: `${user.fullName} tagged you in a post.`
                    });
                }

                /* -- push for tagged user */
                let usersc = await User.find({ _id: { $in: tagUsersIdNotify }, isDeleted: false }).select("deviceToken").lean();
                if (usersc) {
                    for (let n = 0; n < usersc.length; n++) {
                        sendFCMPush(usersc[n].deviceToken, notification[0].title, notification[0].message, fcmData);
                    }
                    notify.length && await Notification.insertMany(notify);
                }
            }
           // feed.tagUser = taggedUsers;
            feed.taggedUser = taggedUsers;
            await feed.save();
            /* eof */

            return res.status(200).send({
                success: true,
                data: feed ? feed : [],
                message: req.__("FEED_CREATED")
            });

        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async editFeed(req, res, next) {
        const { _id } = req.user;
        
        const user = req.user;
        let {
            feedId,
            //files,
            //feedType,
            tagUser,
            description
        } = req.body;
        try {
            let updateFeed;
            let feed = await Feed.findOne({
                userId: ObjectId(_id),
                _id: ObjectId(feedId),
                isDeleted: false
            });
            //lean() removed for tag in post

            if (!feed && feed == null) {
                return res.status(200).send({
                    success: true,
                    data: [],
                    message: req.__("FEEDS_NOT_FOUND")
                });

            } else {
                updateFeed = await Feed.findOneAndUpdate(
                    {
                        userId: ObjectId(_id),
                        _id: ObjectId(feedId)
                    },
                    {
                        $set: {
                            description: description
                        }
                    },
                    {
                        //upsert:true, 
                        new: true
                    }
                )
            }

            /* tag user in post */
            const notify = [];
            let taggedUsers = [];
            let tagUsersIdNotify = [];
            if (tagUser?.length > 0 && tagUser != undefined) {
                let fcmData = {
                    feedId: ObjectId(feed._id),
                    type: 'FEED_TAG'
                }
                const notification = [
                    {
                        type: 'FEED_TAG',
                        user: user._id,
                        feedId: ObjectId(feed._id),
                        title: 'You have a new tag!',
                        message: `${user.fullName} tagged you in a post.`
                    }
                ];
                for (let i = 0; i < tagUser.length; i++) {
                    tagUsersIdNotify.push({ _id: tagUser[i]._id });
                    taggedUsers.push({
                        _id: tagUser[i]._id,
                        name: tagUser[i].name,
                        location: tagUser[i].location,
                        length: tagUser[i].length
                    });

                    notify.push({
                        user: tagUser[i]._id,
                        type: 'FEED_TAG',
                        feedId: ObjectId(feed._id),
                        title: 'You have a new tag!',
                        message: `${user.fullName} tagged you in a post.`
                    });
                }

                /* -- push for tagged user */
                let usersc = await User.find({ _id: { $in: tagUsersIdNotify }, isDeleted: false }).select("deviceToken").lean();
                if (usersc) {
                    for (let n = 0; n < usersc.length; n++) {
                        sendFCMPush(usersc[n].deviceToken, notification[0].title, notification[0].message, fcmData);
                    }
                    notify.length && await Notification.insertMany(notify);
                }

                
            }
            //feed.tagUser = taggedUsers;
            feed.taggedUser = taggedUsers;
            await feed.save();
            /* eof */
            updateFeed = await Feed.findOne({ _id: ObjectId(feed._id) }).lean();

            return res.status(200).send({
                success: true,
                data: updateFeed ? updateFeed : [],
                message: req.__("FEEDS_UPDATED")
            });

        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async feedDetails(req, res, next) {
        let user = req.user
        let { id } = req.params;
        let { page = 1 } = req.query;
        
        try {
            if (!user) {
                return res.unauthorized(null, req.__('UNAUTHORIZED'));
            }
            /*let myBlockedUser = user.blockedUser !== undefined ? user.blockedUser : [];
            if( myBlockedUser.length>0 ){
                myBlockedUser = myBlockedUser.map( x=> x.toString() )
            }*/

            let myBlockedUser = user.blockedUser !== undefined ? user.blockedUser : [];

            let blockByUser = await User.find({
                blockedUser: user._id
            }).select("_id").lean()
            blockByUser = blockByUser.map( x=> x._id )

            let allBlockUsers = [...blockByUser,...myBlockedUser]


            let query = {
                _id: ObjectId(id),
                isSuspended: false,
                isDeleted: false,
                "userId": { $nin: allBlockUsers }
            }

            const feedQuery = [
                {
                    $match: query
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userData'
                    }
                },
                {
                    $unwind: { path: '$userData', preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: 'specialities',
                        localField: 'userData.specality',
                        foreignField: '_id',
                        as: 'professionData'
                    }
                },
                {
                    $unwind: { path: '$professionData', preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: 'feedcomments',
                        let: {
                            feedID: '$_id',
                        },
                        as: 'cmntData',
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ['$feedId', '$$feedID'],
                                    },
                                }
                            },

                            {
                                $project: {
                                    _id: 0,
                                    message: 1,
                                    created: 1,
                                    //taggedUser : 1,
                                    userId: 1,
                                    feedId: 1
                                }
                            },

                            {
                                $lookup: {
                                    from: 'users',
                                    let: {
                                        userID: '$userId',
                                    },
                                    as: 'cmntUsers',
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ['$_id', '$$userID'],
                                                },
                                            },
                                        },

                                        {
                                            $project: {
                                                _id: 1,
                                                fullName: 1,
                                                created: 1,
                                                isSelfLiked: 1,
                                                avatar: 1,
                                                isOnline: 1,
                                                isVerified: 1

                                            }
                                        },
                                    ]
                                },
                            },

                        ]
                    }
                },

                /*{
                    $lookup : {
                        from: 'feedlikes',
                                    let: {
                                        uID: '$_id',
                                        ssid : ObjectId(user._id)
                                    },
                                    as: 'feedData',
                                    pipeline: [
                                                {
                                                    $match: {
                                                         "isSelfLiked" : true,
                                                        $expr: {
                                                               
                                                            $and : [
                                                                  {
                                                                      $eq: [ "$feedId", "$$uID" ]
                                                                  },
                                                                     { 
                                                                         $eq: [ "$userId", "$$ssid" ]  
                                                                     }
                                                                 ] 
                                                        },
                                                    }
                                                }
                                                
                                            ]
                            }
                },*/

                {
                    $project: {
                        feedType: 1,
                        files: 1,
                        totalLikes: 1,
                        totalComments: { $size: "$cmntData" },
                        created: 1,
                        name: "$userData.fullName",
                        profession: "$professionData.specialityName",

                        userId: "$userData._id",
                        avatar: "$userData.avatar",
                        isOnline: "$userData.isOnline",
                        isVerified: "$userData.isVerified",
                        //isVerified : 1,

                        //cmntData: 1,
                        description: 1,
                        isOnline: "$userData.isOnline",
                        updated: 1,
                        likes: 1,
                        taggedUser : "$tagUser",
                        taggedUser : 1



                    }
                },

                {
                    $addFields: {
                        isSelfLiked: {
                            $in: [req.user._id, "$likes"]
                        }
                    }
                },

                {
                    $sort: {
                        _id: -1
                    }
                },
                // {
                //     $skip: skip
                // }, {
                //     $limit: limit
                // }

            ]

            let feed = await getFeedByQuery({
                "query": feedQuery
            });

            console.log('feed==>>', feed);
            //return 0;

            if (feed.length == 0) {
                return res.status(200).send({
                    success: true,
                    data: {},
                    message: req.__("FEEDS_NOT_FOUND")
                });

            }
            let dataFeed = feed[0];

            /*let isBlock = false;
            if( myBlockedUser.length>0 && myBlockedUser.indexOf( dataFeed.userId.toString()!=-1 ) ){
                isBlock = true
            }*/

            return res.status(200).send({
                success: true,
                //myBlockedUser,
                //isBlock,
                data: feed.length ? dataFeed : {},
                message: req.__("FEEDS_DETAILS")
            });

        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async deleteFeed(req, res, next) {
        let user = req.user;
        let { _id } = req.body;
        try {
            if (!user) {
                return res.unauthorized(null, req.__('UNAUTHORIZED'));
            }
            let query = {
                _id: ObjectId(_id),
                isDeleted: false,
                isSuspended: false
            };

            let feed = await Feed.findOneAndUpdate(
                query,
                {
                    $set: {
                        isDeleted: true
                    }
                });
            if (!feed) {
                return res.status(200).send({
                    success: true,
                    data: feed ? feed : [],
                    message: req.__("FEEDS_NOT_FOUND")
                });
            }

            return res.status(200).send({
                success: true,
                data: feed ? feed : [],
                message: req.__("FEED_DELETED")
            });
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async feedReport(req, res, next) {
        console.log("xxx=>", req.body)
        let user = req.user;
        let { messege, feedId } = req.body;



        try {
            if (!user) {
                return res.unauthorized(null, req.__('UNAUTHORIZED'));
            }
            let flagData = [];
            let flagDataInfo = {
                userId: user._id,
                reason: messege,
                timestamp: new Date().valueOf()
            };
            flagData.push(flagDataInfo);

            let feeddata = await Feed.findOne({
                _id: feedId,
                isSuspended: false,
                isDeleted: false

            });
            console.log('feeddata>>', feeddata);
            if (feeddata != null && feeddata.userId.toString() == user._id.toString()) {
                return res.status(200).send({
                    success: true,
                    data: [],
                    message: req.__("You can't report own post")
                });
            }

            const feed = await Feed.findOneAndUpdate(
                {
                    _id: feedId,
                    isDeleted: false,
                    isSuspended: false
                },
                {
                    $addToSet: { flag: flagData }
                }

            );

            console.log('feed==>>', feed);
            return res.status(200).send({
                success: true,
                data: feed ? feed : [],
                message: req.__("REPORT_SUBMIT_SUCCESSFULLY")
            });
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async feedLike(req, res, next) {
        let user = req.user;
        let { id, type } = req.body;

        try {
            let feed = await Feed.findOne({
                _id: id,
                isDeleted: false
            }).lean();
            if (!feed) {
                return res.status(200).send({
                    success: true,
                    data: [],
                    message: req.__("Feeds not found")
                });
            } else {
                let feedLike = await FeedLike.findOne({
                    feedId: id,
                    userId: user._id,
                    isDeleted: false
                }).lean()

                if (type == 'like') {
                    if (feedLike?._id) {
                        return res.warn({}, "Already liked")
                    }


                    let isSelfLiked = req.user._id.toString() === feed.userId.toString()

                    feedLike = new FeedLike();
                    feedLike.feedUserId = feed.userId;
                    feedLike.isSelfLiked = isSelfLiked;
                    feedLike.feedId = id;
                    feedLike.userId = user._id;
                    await feedLike.save();


                    feed = await Feed.findOneAndUpdate(
                        { _id: ObjectId(id) },
                        {
                            $inc: { totalLikes: 1 },
                            $addToSet: {
                                "likes": user._id
                            }
                        }, {
                        new: true
                    });


                    // send push notification on like post
                    let fcmData = {
                        feedId: ObjectId(id),
                        type: 'FEED_LIKE'
                    }
                    const notification = [
                        {
                            type: 'FEED_LIKE',
                            // user: user._id,
                            user: feed.userId,
                            feedId: ObjectId(id), // added
                            title: 'You have a new notification!',
                            message: `${user.fullName} Like your post.`
                        }
                    ];
                    // device token 
                    let users = await User.findOne(
                        {
                            isDeleted: false,
                            _id: ObjectId(feed.userId)
                        }
                    );
                    //return 0;

                    //return 0;

                    // if (user._id.toString() != feed.userId.toString()) { //like push cmnt(client req)
                    //     sendFCMPush(users.deviceToken, notification[0].title, notification[0].message, fcmData);
                    //     notification.length && await Notification.insertMany(notification);
                    // }



                    return res.status(200).send({
                        success: true,
                        data: feed.length ? feed : [],
                        message: req.__("FEED_LIKED")
                    });
                } else {//unlike

                    if (!feedLike) {
                        return res.warn({}, "Already liked")
                    }


                    await FeedLike.updateOne({
                        _id: feedLike._id
                    }, {
                        $set: {
                            isDeleted: true
                        }
                    })

                    let feed = await Feed.findOneAndUpdate(
                        {
                            "_id": ObjectId(id)
                        }, {
                        $pull: {
                            "likes": user._id
                        },
                        $inc: {
                            totalLikes: -1
                        }
                    }, {
                        "new": true
                    }
                    )

                    let b = await FeedLike.findOneAndUpdate( //its change the status of post deleted true when post unlike
                        {
                            "feedId": ObjectId(id),
                            "userId": ObjectId(req.user._id)
                        },
                        {
                            $set: {
                                "isDeleted": true
                            }
                        }
                    )
                    console.log('sort.avgRating = -1===>>', b);
                    //return 0;

                    return res.status(200).send({
                        success: true,
                        data: feed.length ? feed : [],
                        message: req.__("Feed unliked")
                    });
                }
            }



        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async addComment(req, res, next) {
        const user = req.user
        let { feedId, comment, tagUser } = req.body;
        try {
            if (!user) {
                return res.unauthorized(null, req.__('UNAUTHORIZED'));
            }
            const feed = await Feed.findOne(
                {
                    isDeleted: false,
                    _id: ObjectId(feedId)
                }
            );

            //return 0;
            /*await User.find({
                _id: { $in: tagUser },
                isSuspended: false,
                isDeleted: false
            },
                {
                    _id: 1
                }
            );*/
            
            let tagUsers = [];
            let tagUsersNotify = [];
            let addcmnt;
            if (tagUser && tagUser.length > 0 ) {  //&& tagUser != []
                /* push for cmnt */
                let fcmData = {
                    feedId: ObjectId(feedId),
                    type: 'FEED_COMMENT'
                }
                const notification = [
                    {
                        type: 'FEED_COMMENT',
                        user: feed.userId,
                        feedId: ObjectId(feedId),
                        title: 'You have a new comment!',
                        message: `${user.fullName} commented on your post.`
                    },
                    {
                        type: 'FEED_POST',
                        //user: feed.userId,
                        feedId: ObjectId(feedId),
                        title: 'You have a new tag!',
                        message: `${user.fullName} tagged you in a post.`
                    }
                ];
                const notify = [];
                for (let i = 0; i < tagUser.length; i++) {
                    tagUsersNotify.push({ _id: tagUser[i]._id });
                    tagUsers.push({
                        _id: tagUser[i]._id,
                        name: tagUser[i].name,
                        location: tagUser[i].location,
                        length: tagUser[i].length
                    });

                    notify.push({
                        user: tagUser[i]._id,
                        type: 'FEED_POST',
                        feedId: ObjectId(feedId),
                        title: 'You have a new tag!',
                        message: `${user.fullName} tagged you in a post.`
                    });
                }
                addcmnt = new FeedComment();
                addcmnt.feedId = feedId;
                addcmnt.userId = user._id;
                addcmnt.feedUserId = feed.userId;
                addcmnt.taggedUser = tagUser ? tagUsers : [];
                addcmnt.message = comment;
                await addcmnt.save();

                //device token
                console.log('users==>>', feed);
                let users = await User.findOne(
                    {
                        isDeleted: false,
                        _id: ObjectId(feed.userId)
                    }
                );

                console.log("uid", user._id);
                console.log("fid", feed.userId);

                /* -- push for tagged user */
                console.log('users==>>', tagUsersNotify);
                let usersc = await User.find({ _id: { $in: tagUsersNotify }, isDeleted: false }).select("deviceToken").lean();
                console.log('usersc==>>', usersc);
                //return 0;
                if (usersc) {
                    for (let n = 0; n < usersc.length; n++) {
                        console.log('feedId= nn=>>', usersc[n]);
                        sendFCMPush(usersc[n].deviceToken, notification[1].title, notification[1].message, fcmData);
                    }
                    notify.length && await Notification.insertMany(notify);
                    //}
                }

            } else {
                console.log("else----");
                //return 0;
                const feed = await Feed.findOne(
                    {
                        isDeleted: false,
                        _id: ObjectId(feedId)
                    }
                );
                //console.log('feed12212==>>', feed);
                addcmnt = new FeedComment();
                addcmnt.feedId = feedId;
                addcmnt.feedUserId = feed.userId;
                addcmnt.userId = user._id;
                addcmnt.message = comment;

                await addcmnt.save();

                /* push notification for comment */
                //return 0;
                let fcmData = {
                    feedId: ObjectId(feedId),
                    type: 'FEED_COMMENT'
                }
                const notification = [
                    {
                        type: 'FEED_COMMENT',
                        user: feed.userId,
                        feedId: ObjectId(feedId),
                        title: 'You have a new comment!',
                        message: `${user.fullName} commented on your post.`
                    }
                ];
                console.log('else multiple log')
                let users = await User.findOne(
                    {
                        isDeleted: false,
                        _id: ObjectId(feed.userId)
                    }
                );
                
            }
            return res.status(200).send({
                success: true,
                data: addcmnt ? addcmnt : [],
                message: req.__("CMNT_ADDED")
            });

        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async editComment(req, res, next) {
        let user = req.user;
        let {
            feedId,
            comment
        } = req.body;
        try {

            if (!user) {
                return res.unauthorized(null, req.__('UNAUTHORIZED'));
            }

            let updateUser = await FeedComment.findOneAndUpdate({ feedId: ObjectId(feedId) },
                {
                    $set: {
                        message: comment
                    }
                }, {
                new: true
            })

            return res.status(200).send({
                success: true,
                data: updateUser ? updateUser : [],
                message: req.__("COMMENT_EDIT_SUCCESSFULLY")
            });

        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async feedCommentList(req, res, next) {
        let user = req.user;
        let { perPage, lastcommentid, feedid } = req.query;
        const limit = parseInt(perPage);
        //let skip = (page - 1) * limit;
        console.log('===>>', req.query);
        let query = [];
        // return 0;
        try {
            if (!user) {
                return res.unauthorized(null, req.__('UNAUTHORIZED'));
            }

            let queries = {
                _id: ObjectId(feedid),
                isDeleted: false,
                isSuspended: false
            };


            let commentPagingQuery = {
                "$and": [
                    { "$eq": ["$$feedId", "$feedId"] },
                    // { $lt : [ "$_id" , ObjectId("63a5b7a811364c4d44700298"), ] }
                ]
            }

            if (lastcommentid) {
                commentPagingQuery = {
                    "$and": [
                        { "$eq": ["$$feedId", "$feedId"] },
                        { $lt: ["$_id", ObjectId(lastcommentid),] }
                    ]
                }
            }



            console.log('111===>>');
            query = [
                {
                    $match: queries
                },
                {
                    "$lookup": {
                        "from": "feedcomments",
                        "let": { feedId: "$_id" },
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": commentPagingQuery
                                }
                            },
                            {
                                "$project": {
                                    "_id": 1,
                                    "taggedUser": 1,
                                    "message": 1,
                                    "created": 1,
                                    "userId": 1
                                }
                            },
                            {
                                "$sort": {
                                    "_id": -1
                                }
                            },
                            {
                                "$limit": limit
                            },
                            {
                                "$lookup": {
                                    "from": "users",
                                    "let": {
                                        "userID": "$userId"
                                    },
                                    "as": "cmntUsers",
                                    "pipeline": [
                                        {
                                            "$match": {
                                                "$expr": {
                                                    "$and": [
                                                        {
                                                            "$eq": ["$_id",
                                                                "$$userID"]
                                                        }
                                                    ]
                                                }

                                            }
                                        },
                                        {
                                            "$project": {
                                                "isOnline": 1,
                                                "fullName": 1,
                                                "avatar": 1
                                            }
                                        }
                                    ]
                                }
                            }
                        ], as: 'cmntData',
                    }
                },

                {
                    $lookup: {
                        from: 'feedlikes',
                        let: {
                            uID: '$_id',
                            ssid: ObjectId(user._id)
                        },
                        as: 'feedData',
                        pipeline: [
                            {
                                $match: {
                                    isSelfLiked: true,
                                    $expr: {

                                        $and: [
                                            {
                                                $eq: ["$feedId", "$$uID"]
                                            },
                                            {
                                                $eq: ["$userId", "$$ssid"]
                                            }
                                        ]
                                    },
                                }
                            }

                        ]
                    }
                },

                {
                    $project: {
                        description: 1,
                        totalComments: { $size: "$cmntData" },
                        totalLikes: 1,
                        cmntData: 1,
                        isSelfLiked: {
                            $cond: { if: { $gt: [{ $size: "$feedData" }, 0] }, then: true, else: false }
                        },

                    }
                },




            ];


            //console.log('63a93f25d5248820e05bb178==>>', query);
            console.log(JSON.stringify(query))



            let feed = await getFeedByQuery({
                "query": query
            });

            //console.log('feed==>>',feed);
            //return 0;

            let nextPage = feed.length == limit
            //console.log('feed==>',feed);
            //return 0;
            if (feed.length == 0) {
                return res.status(200).send({
                    success: true,
                    data: feed.length ? feed[0].cmntData : [],
                    message: req.__("Feed not found"),
                    nextPage: nextPage ? nextPage : false
                });
            } else {
                return res.status(200).send({
                    success: true,
                    data: feed[0].cmntData.length ? feed[0].cmntData : [],
                    message: req.__("comment list"),
                    nextPage: nextPage ? nextPage : false
                });
            }

        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async deleteComment(req, res, next) {
        let user = req.user
        try {
            if (!user) {
                return res.unauthorized(null, req.__('UNAUTHORIZED'));
            }

            return res.status(200).send({
                success: true,
                data: [],
                message: req.__("delete comment")
            });
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async getTopFeed(req, res, next) {
        const { _id } = req.user;
        try {
            let user = await User.findOne({
                _id: _id,
                isSuspended: false,
                isDeleted: false
            });

            if (!user) {
                return res.unauthorized(null, req.__('UNAUTHORIZED'));
            }

            return res.status(200).send({
                success: true,
                data: [],
                message: req.__("FEEDS")
            });
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async likelist(req, res, next) {
        let user = req.user;
        let { page = 1, perPage = paginationLimit, feedid } = req.query;
        const limit = parseInt(perPage);
        let skip = (page - 1) * limit;

        if (!user) {
            return res.unauthorized(null, req.__('UNAUTHORIZED'));
        }
        try {

            let query = [
                {
                    $match: {
                        _id: ObjectId(feedid),
                        isDeleted: false
                    }
                },
                {
                    $lookup: {
                        from: 'feedlikes',
                        localField: '_id',
                        foreignField: 'feedId',
                        as: 'likes'
                    },
                },
                {
                    $lookup: {
                        from: 'feedlikes',
                        let: {
                            ufID: '$_id',
                        },
                        as: 'likes',
                        pipeline: [
                            {
                                $match: {
                                    isDeleted: false,
                                    $expr: {
                                        $eq: ["$feedId", "$$ufID"]
                                    },
                                }
                            }

                        ]
                    }
                },

                {
                    $project: {
                        totalLikes: 1,
                        likesData: "$likes",
                        likes: "$likes"
                    }
                },

                {
                    $unwind: { path: '$likes', preserveNullAndEmptyArrays: true }
                },


                {
                    '$lookup': {
                        from: 'users',
                        localField: 'likes.userId',
                        foreignField: '_id',
                        as: 'usersD'
                    }
                },
                {
                    $lookup: {
                        from: 'specialities',
                        localField: 'usersD.specality',
                        foreignField: '_id',
                        as: 'professionData'
                    }
                },
                {
                    $unwind: { path: '$professionData', preserveNullAndEmptyArrays: true }
                },
                {
                    $unwind: { path: '$usersD', preserveNullAndEmptyArrays: true }
                },


                {
                    $project: {
                        // totalLikes : { $size : "$likelistData"},
                        totalLikes: 1,
                        //userData : 1
                        name: "$usersD.fullName",
                        profession: "$professionData.specialityName",
                        city: "$usersD.city",
                        avatar: "$usersD.avatar",
                        isOnline: "$usersD.isOnline",
                        isVerified: "$usersD.isVerified",
                        isVerified: "$usersD.isVerified",
                        userId: "$usersD._id"

                    }
                },
                {
                    $sort: { _id: -1 }
                },
                {
                    $skip: skip
                }, {
                    $limit: limit
                }

            ]

            let feed = await getFeedByQuery({
                "query": query
            });
            let nextPage = feed.length == limit

            let totallikes = await getFeedByQuery({
                "query": query
            });
            //console.log('feed 11==>>',totallikes);



            //console.log('feed 22==>>',totallikes[0].totalLikes);
            //return 0;
            if (totallikes[0].totalLikes != 0) {
                return res.status(200).send({
                    success: true,
                    data: feed.length ? feed : [],
                    message: req.__("Likes data"),
                    totalLikes: totallikes.length != 0 ? totallikes[0].totalLikes : 0,
                    nextPage: nextPage ? nextPage : false
                });
            } else {
                return res.status(200).send({
                    success: true,
                    data: feed.length ? [] : [],
                    message: req.__("Data not found"),
                    nextPage: nextPage ? nextPage : false
                });
            }


        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async generateSignUrl(req, res, next) {
        let { key, file, type } = req.body;
        file = file.split(".");
        let randomstr = Math.ceil((new Date().getTime()));
        var temp = type.split("/");
        let fileName = randomstr + '.' + file[1];
        let params = {
            Bucket: process.env.BUCKET,
            Key: key + "/" + fileName,
            Expires: parseInt(process.env.URL_EXPIRY_TIME),
            ContentType: type,
            ACL: "public-read"
        };
        getSignedUrl("putObject", params).then(data => {
            return res.success({
                signedRequest: data.signedRequest,
                url: data.url,
                fileName: fileName
            });
        });
    }

    async generateMultiSignUrl(req, res, next) {
        const { location, type, count = 1 } = req.query;
        const extensions = { IMAGE: 'jpg', 'DOCUMENT.PDF': 'pdf' };
        const extension = extensions[type] || '';
        if (!extension) return res.warn('', req.__('INVALID_FILE_TYPE'));

        const promises = [];
        for (let i = 1; i <= count; i++) {
            promises.push(getMultiSignedUrl(location.endsWith('/') ? location : `${location}/`, extension, i));
        }

        const urls = await Promise.all(promises);
        res.success(urls);
    }

    
    async userfeedDetails(req, res, next) {
        try {
            let user = req.user;
            let { id } = req.params;
            let { page = 1, perPage = paginationLimit } = req.query;
            const limit = parseInt(perPage);
            let skip = (page - 1) * limit;
            let query = {
                userId: ObjectId(id),
                isDeleted: false,
                isSuspended: false
            };

            const feedQuery = [
                {
                    $match: query
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userData'
                    }
                },
                {
                    $lookup: {
                        from: 'specialities',
                        localField: 'userData.specality',
                        foreignField: '_id',
                        as: 'professionData'
                    }
                },
                {
                    $unwind: { path: '$professionData', preserveNullAndEmptyArrays: true }
                },
                {
                    $unwind: { path: '$userData', preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: 'feedcomments',
                        let: {
                            feedID: '$_id',
                        },
                        as: 'cmntData',
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ['$feedId', '$$feedID'],
                                    },
                                }
                            },

                            //  {
                            //      $project : {
                            //          _id : 0,
                            //          message : 1,
                            //          created : 1,
                            //          //taggedUser : 1,
                            //          userId : 1,
                            //          feedId : 1
                            //      }
                            //  },

                            //    {
                            //          $lookup: {
                            //              from: 'users',
                            //              let: {
                            //                  userID: '$userId',
                            //              },
                            //              as: 'cmntUsers',
                            //              pipeline: [
                            //                  {
                            //                      $match: { 
                            //                          $expr: {
                            //                              $eq: ['$_id', '$$userID'],
                            //                          },
                            //                      },
                            //                  },

                            //                  {
                            //                          $project : {
                            //                              fullName : 1,
                            //                              created : 1
                            //                          }
                            //                  },
                            //              ]
                            //          },
                            //  },

                        ]
                    }
                },
                {
                    $lookup: {
                        from: 'feedlikes',
                        let: {
                            ufID: '$_id',
                        },
                        as: 'feedData',
                        pipeline: [
                            {
                                $match: {
                                    userId: ObjectId(user._id),
                                    isSelfLiked: true,
                                    $expr: {

                                        $eq: ["$feedId", "$$ufID"]
                                    },
                                }
                            }

                        ]
                    }
                },

                {
                    $unwind: {
                        path: "$feedData", preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        // cmntData : 1,
                        feedType: 1,
                        files: 1,
                        totalLikes: 1,
                        totalComments: { $size: "$cmntData" },
                        created: 1,
                        profession: "$professionData.specialityName",
                        userId: "$userData._id",
                        name: "$userData.fullName",
                        avatar: "$userData.avatar",
                        isOnline: "$userData.isOnline",
                        isVerified: 1,
                        updated: 1,
                        tagUser : 1,
                        taggedUser : 1,
                        description: 1,
                        isSelfLiked: {
                            $cond: { if: "$feedData.isSelfLiked", then: true, else: false }
                        }
                    }
                },

                {
                    $project: {
                        feedType: 1,
                        files: 1,
                        totalLikes: 1,
                        totalComments: 1,
                        created: 1,
                        profession: 1,
                        userId: 1,
                        name: 1,
                        avatar: 1,
                        isOnline: 1,
                        isVerified: 1,
                        updated: 1,
                        description: 1,
                        isSelfLiked: 1,
                        //taggedUser : "$tagUser",
                        taggedUser : 1
                    }
                },
                {
                    $sort: { _id: -1 }
                },
                {
                    $skip: skip
                }, {
                    $limit: limit
                }

            ]

            let feed = await getFeedByQuery({
                "query": feedQuery
            });

            console.log("--->>", feed.length);

            let nextPage = feed.length == limit

            if (feed.length == 0) {
                return res.status(200).send({
                    success: true,
                    data: feed.length ? feed[0] : [],
                    message: req.__("Feed not found"),
                    nextPage: nextPage ? nextPage : false
                });
            } else {
                return res.status(200).send({
                    success: true,
                    data: feed.length ? feed : [],
                    message: req.__("Feed Details"),
                    nextPage: nextPage ? nextPage : false
                });
            }

        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

}

module.exports = new FeedController();
