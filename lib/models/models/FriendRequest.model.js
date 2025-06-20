const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const FriendRequestSchema = new Schema(
    {
        user_id: {
            type:mongoose.Types.ObjectId,
            required: true,
            ref:'users'

        },
        sender_id: {
            type:mongoose.Types.ObjectId,
            required: true,
            ref:'users'
        },
        is_approve:{
            type: Boolean,
            default: false
        },
        is_reject:{
            type: Boolean,
            default: false
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


module.exports = mongoose.model('FriendRequest', FriendRequestSchema);
