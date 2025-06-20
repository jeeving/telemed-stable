const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const AdminSettings = new Schema(
    {
        androidAppVersion: {
            type: String,
            trim: true,
            required: true,
        },
        iosAppVersion: {
            type: String,
            trim: true,
            required: true,
        },
        androidForceUpdate: {
            type: Boolean,
            default: true,
        },
        iosForceUpdate: {
            type: Boolean,
            default: true,
        },
        maintenance: {
            type: Boolean,
            default: true,
        },
        supportEmail: [{
            type: String,
            trim: true,
            lowercase: true,
        }],
        supportNumber: [{
            type: String,
            trim: true,
        }],
        adminCommission:{
            type: Number, 
        },
        gst: {
            type: Number,
            required: true
        },
        transactionFee: {
            type: Number,
            required: true
        },

        adminFlatFee: {
            type: Number,
            default:0
        },
        newsLetterEmail: {
            type: String,
            trim: true,
            lowercase: true,
        },
        webinarPrice: {
            type: Number,
            required: true
        },
        webinarGst: {
            type: Number,
            required: true
        },
        conversionRate: {
            type: Number,
            required: true
        },

        audioCallFee: {
            type: Number,
            default:0
        },
        videoCallFee: {
            type: Number,
            default:0
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
    });

module.exports = mongoose.model('AdminSettings', AdminSettings);