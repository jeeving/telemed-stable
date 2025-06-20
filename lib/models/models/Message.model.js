const mongoose = require('mongoose'),
Schema = mongoose.Schema;

const { UserType,MessageType } = require('../enums');

const MessageSchema = new Schema(
    {    
        message_type: {
            type: String,
            required: true,
            enum: [...Object.keys(MessageType)]
        },

        chat_id: {
            type:mongoose.Types.ObjectId,
            required: true,
            ref:'chats'

        },
        sender_id: {
            type:mongoose.Types.ObjectId,
            required: true,

        },
        receiver_id: {
            type:mongoose.Types.ObjectId,
            required: true,
        },
        message: {
            type: String,
            //required: true
        },


        file: {
            type: String,
            //required: true
        },
        file_type: {
            type: String,
            //required: true
        },


        isRead: {
            type: Boolean,
            default: false,
        },
        deleted_by:[{
            type: mongoose.Types.ObjectId,
            ref: 'users'
        }],
        isSuspended: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: {
            createdAt: 'created',
            updatedAt: 'updated'
        },
        id: false,
        toJSON: {
            getters: true
        },
        toObject: {
            getters: true
        },
    }
);

module.exports = mongoose.model('Message', MessageSchema);
