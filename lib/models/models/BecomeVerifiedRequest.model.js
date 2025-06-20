const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId;

const {BecomeVerified} = require('../enums');

const BecomeVerifiedRequestSchema = new Schema(
    {
        userId: {
            type: ObjectId,
            ref: 'User',
            required: true
        },
        fileName: {
            type: String,
            required: true
        },
        status: {
            type: String,
            required: true,
            enum: Object.keys(BecomeVerified),
            default: 'PENDING'
        },
        isDeleted: {
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: {
            createdAt: 'created',
            updatedAt: 'updated',
        },
        toJSON: {
            getters: true,
        },
        toObject: {
            getters: true,
        },
        id: false,
    }
);

module.exports = mongoose.model('BecomeVerifiedRequest', BecomeVerifiedRequestSchema);
