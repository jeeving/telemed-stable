const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId,
    { PaymentStatus } = require('../enums');

const PaymentSchema = new Schema({
    appointment: {
        type: ObjectId,
        ref: 'Appointment',
        required: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    orderId: {
        type: String,
        trim: true
    },
    receipt: {
        type: String,
        trim: true
    },
    refundId: {
        type: String,
        trim: true
    },
    currency: {
        type: String,
        trim: true
    },
    amount: {
        type: Number,
    },
    signature:{
        type: String,
        trim: true
    },
    paymentStatus: {
        type: String,
        enum: Object.keys(PaymentStatus),
        default: 'PENDING'
    },
    paymentId: {
        type: String,
        trim: true
    }
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

module.exports = mongoose.model('Payment', PaymentSchema);
