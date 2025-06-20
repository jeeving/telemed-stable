const mongoose = require('mongoose'),
    Schema = mongoose.Schema;
    ObjectId = mongoose.Types.ObjectId;
const { Appointments } = require('../enums');


const CallSchema = new Schema(
    {
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization',
            index: true
        },
        type: String,
        callerId: {
            type: ObjectId,
            ref: 'User'
            // required: true,
        },
        receiverId: {
            type: ObjectId,
            ref: 'User'
            // required: true,
        },
        callStatus: {
            type: Number,
            enum: Object.values(Appointments.CallStatus),
            default: 4
        },
        startTime : {
            type: Number,
            default: 0
        },
        endTime : {
            type: Number,
            default: 0
        },
        roomName : {
            type: String,
            default: 0
        },
        roomSid : {
            type: String,
            default: 0
        },
        CallDuration: {
            type: Number,
            default: 0
        },

        start: {
            type: Number,
            default: 0
        },
        end: {
            type: Number,
            default: 0
        },

        CallSid: {
            type: String
        },
        ParentCallSid: {
            type: String
        },

        allSid: [{
            type: String
        }],

        call_status: {
            type: Number,
            enum: Object.values(Appointments.CallStatus),
            default: 4
        },
        call_history:[{
            call_sid: {
                type: String
            },
            parent_call_sid: {
                type: String
            },
            call_status: {
                type: Number,
                enum: Object.values(Appointments.CallStatus),
                default: 4
            },
            date: {
                type: Date,
                default: new Date()
            },
            CallDuration: {
                type: Number,
                default: 0
            }
        }],
        amount:{
            type: Number,
            default: 0,
            index: true
        },

        isReceived: { type: Boolean,default: false },
        receivedTime: { type: Number }



    }, {
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

module.exports = mongoose.model('Call', CallSchema);
