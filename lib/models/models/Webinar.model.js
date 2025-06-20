const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId,
    { PaymentStatus } = require('../enums');

const WebinarSchema = new Schema(
    {
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization'
        },
        isStart: { type: Boolean, default: false },
        userId: {
            type: ObjectId,
            ref: 'User',
        },
        title: {
            type: String
        },
        description: {
            type: String
        },
        cmePartner: {
            type: String
        },
        dateWebinar: {
            type: String
        },
        endDateWebinar: {
            type: String
        },
        timeWebinar: {
            start: { type: String },
            end: { type: String }
        },
        timeStart: { type: Number },
        timeEnd: { type: Number },
        timeOffset: { type: Number },
        accredited: {
            type: Boolean
        },
        image: {
            type: String
        },
        link: {
            type: String
        },
        presenter: {
            type: String
        },

        isRecordingStart: { type: Boolean,default: false },
        recordingEnable: { type: Boolean,default: false },
        lessthan50ppl: { type: Boolean,default: false },
        isCmeDelete: {type: Boolean,default: false},

        roomSid: { type: String },
        recordingSid: [{ type: String }],  //all recoding sids for room

        compositionPermission: { type: Boolean,default: false },

        compositionIds: [{ type: String }],

        recordingRules: [
            {
                _id: false,
                "trackSid": { type: String },
                'roomSid': { type: String },
                "RecordingSid": { type: String },
                "participantSid": { type: String },
                "userType": { type: String, default: "user" },  //presenter or user
                "trackType": { type: String, default:"normal" },   // share or normal,
                "trackKind": { type: String,default: '' }
            }
        ],
        // recordingRules: [{
        //     'roomSid': { type: String },
        //     "recordings": [{
        //         "RecordingSid": { type: String },
        //         "participantSid": { type: String },
        //         "userType": { type: String, default: "user" },  //presenter or user
        //         "trackType": { type: String, default:"normal" },   // share or normal
        //     }]
        // }],

        // recordingUrl: [{
        //     roomSid: { type: String }, 
        //     mediaType: { type: String } ,
        //     url: { type: String } , 
        //     downloadUrl: { type: String },
        //     fileName: { type: String }
        // }],
        
        
        members: [{
            userId: { type: ObjectId,ref: 'User' },
            isHost: { type: Boolean,default: false },
            isPresenter: { type: Boolean,default: false },
            acceptTime: { type: Number },
            rejectTime: { type: Number },
            status: { type: String, default: "accept" },   //accept reject new
            isInvited: { type: Boolean,default: true },
            canTalk: { type: Boolean,default: false },
            inRoom: { type: Boolean, default: false },
            RoomSid: { type: String },
            ParticipantSid: { type: String },

            token: { type: String}
            
        }],
        isDeleted: {
            type : Boolean,
            default : false
        },
        isSuspended: {
            type: Boolean,
            default: false
        },

        paymentInfo: {
            type: Schema.Types.Mixed
        },


        amount:{
            type: Number,
            default: 0
        },
        gst: {
            type: Number,
            default: 0
        },
        totalPayable:{
            type: Number,
            default: 0
        },

        webinarId: {
            type: Number,
            default: 1
        },
        orderId: {
            type: String,
            trim: true
        },

        isWallet: {
            type: Boolean,default: false
        },
        walletAmount: {
            type: Number
        },
        isWalletUpdate: { //prevent refresh page
            type: Boolean,default: false
        },
        paymentMethod: {
            type: String,
            default: ""
        },
        paymentId: {
            type: String,
            trim: true,
            default: ""
        },
        paymentStatus: {
            type: String,
            enum: Object.keys(PaymentStatus),
            default: 'PENDING'
        },
        signature:{
            type: String,
            trim: true,
            default: ""
        },
        paymentTime: {
            type: Number,
            default: 0
        },

        hostSid :{
            type: String,
            default:"",
            trim: true   
        },

        isRefund:{
            type: Boolean,
            default: false
        },
        refundId: {
            type: String,
            trim: true
        },
        bannerDescription: {
            type: String
        },
        shareCount: {
            type: Number,default:0
        },
        viewCount: {
            type: Number,default:0
        },

    },
    {
        timestamps: {
            createdAt: 'created',
            updatedAt: 'updated',
        },
        id: false,
        toJSON: {
            getters: true,
        },
        toObject: {
            getters: true,
        },
    }
);


module.exports = mongoose.model('Webinar', WebinarSchema);
