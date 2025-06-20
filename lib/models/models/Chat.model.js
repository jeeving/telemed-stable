const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const { MessageType } = require('../enums');

const ChatSchema = new Schema(
    {
        user_id: {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        receiver_id: {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        message_type: {
            type: String,
            required: true,
            enum: [...Object.keys(MessageType)]
        },

        file_type: {
            type: String,
            enum: ['PDF', 'WORD', 'PPT', 'TXT' ,'IMAGE' ]
        },
        file: {
            type: String
        },

        last_message: {
            type: String,
            //required: true
        },
        is_approve: {
            type: Boolean,
            default: false
        },
        is_reject: {
            type: Boolean,
            default: false
        },
        deleted_by: [{
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

module.exports = mongoose.model('Chat', ChatSchema);
