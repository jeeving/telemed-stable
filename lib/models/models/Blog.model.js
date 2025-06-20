const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const BlogSchema = new Schema(
    {
        title: {
            type: String,
            trim: true,
            required: true
        },
        description: {
            type: String,
            trim: true,
            required: true
        },
        slug: {
            type: String,
            trim: true,
            required: true,
            index: true
        },
        images: [{
            type: String
        }],
        image1: {
            type: String
        },
        image2: {
            type: String
        },
        video: {
            type: String
        },
        links: [{
            type: String
        }],
        added: { type: Number },
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

module.exports = mongoose.model('Blog', BlogSchema);
