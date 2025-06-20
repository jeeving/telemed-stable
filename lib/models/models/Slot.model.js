const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId,
    { PaymentStatus } = require('../enums');

const SlotSchema = new Schema({
    doctorId: {
        type: ObjectId,
        required : true
    },
    slotDate : {
        type : Date,
        required : true
    },
    startDate : {
        type : Date,
        required : true
    },
    endDate : {
        type : Date,
        required : true
    },
    slotDuration: {
        type: String,
        default: '15 mins',
    },
    time : {
        type: String,
        trim : true
    },
    weekDay: {
        type: String,
        trim : true,
        required : true
    },
    slots : [{
                bookingId : {
                    type: String,
                    trim : true
                },
                utcTime : {
                    type: Date,
                    required : true
                },
                slotTime : {
                    type: String,
                    trim : true,
                },
                isBooked : {
                    type: Boolean,
                    default: false,
                },
                paymentStatus: {
                    type: String,
                    enum: Object.keys(PaymentStatus),
                    default: 'PENDING'
                },
    }],
    isEmergency: {
        type: Boolean,
        default: false,
    },
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
});

module.exports = mongoose.model('Slot', SlotSchema);