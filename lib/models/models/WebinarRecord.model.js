const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId,
    { PaymentStatus } = require('../enums');

const WebinarRecordSchema = new Schema(
    {
        roomSid: {
            type: String,
            unique: true
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
    }
);


module.exports = mongoose.model('WebinarRecord', WebinarRecordSchema);
