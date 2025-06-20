const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId;
const { PaymentStatus } = require('../enums');

const PaymentRequestSchema = new Schema({
    amount: {
        type: Number,
        required: true,
    },


    gst: {
        type: Number,
        default: 0
    },
    fee: {
        type: Number,
        default: 0
    },
    netAmount: {
        type: Number,
        default: 0
    },


    bank_details: {
        type: Object,
    },
    consultant_id: {
        type: ObjectId,
        trim: true,
        required: false,
    },
    status: {
        type: String,
        required: true,
        enum: Object.keys(PaymentStatus),
    },
    action_date: {
        type: Date
    },
    type: {
        type: String,
        required: false,
        enum: ['wallettopup']
    },
    userId: {
        type: ObjectId,
        ref: 'User',
        trim: true,
        required: false,
    },
    appointmentId: {
        type: ObjectId,
        ref: 'Appointment',
    },
    webinarId: {
        type: ObjectId,
        ref: 'Webinar',
    },
    callId: {
        type: ObjectId,
        ref: 'Call',
    },

    isShowOnList: {
        type: Boolean,
        default: true
    }
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
    },
);

module.exports = mongoose.model('PaymentRequest', PaymentRequestSchema);
