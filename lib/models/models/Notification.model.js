const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId;
const { NotificationType } = require('../enums');

const NotificationSchema = new Schema({
        type: {
            type: String,
            //required: true,
            enum: Object.keys(NotificationType),
        },
        title: {
            type: String,
            trim: true,
            //required: true,
        },
        message: {
            type: String,
            trim: true,
            //required: true,
        },
        user: {
            type: ObjectId,
            ref: 'User',
        },
        appointment: {
            type: ObjectId,
            ref: 'Appointment',
        },
        feedId: {
            type: ObjectId,
            ref: 'Feed',
        },
        webinarId: {
            type: ObjectId,
            ref: 'Webinar',
        },
        isRead: {
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
            updatedAt: 'updated',
        },
        id: false,
        toJSON: {
            getters: true,
        },
        toObject: {
            getters: true,
        },
    },
);

module.exports = mongoose.model('Notification', NotificationSchema);
