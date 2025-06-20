const mongoose = require('mongoose'),
    Schema = mongoose.Schema;
    ObjectId = mongoose.Types.ObjectId;


const ReferralSchema = new Schema(
    {
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization',
            index: true
        },
        senderId: {
            type: ObjectId,
            ref: 'User',
            index: true
        },
        receiverId: {
            type: ObjectId,
            ref: 'User',
            index: true
        },
            
        message: {
            type: String
        },

        msgTime : {
            type: Number,
            default: 0
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
    }
);

module.exports = mongoose.model('Referral', ReferralSchema);
