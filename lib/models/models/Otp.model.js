const mongoose = require('mongoose'),
    Schema = mongoose.Schema;
const { OtpType } = require('../enums');

const OtpSchema = new Schema(
    {
        type: {
            type: String,
            required: true,
            enum: [...Object.keys(OtpType)]
        },
        email: {
            type: String,
            default: ''
        },
        token: {
            type: String,
            trim: true,
            required: true,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        validTill: {
            type: Date,
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


module.exports = mongoose.model('Otp', OtpSchema);
