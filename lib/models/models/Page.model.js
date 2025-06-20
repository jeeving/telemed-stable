const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const PagesSchema = new Schema(
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
        },
        isSuspended: {
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

module.exports = mongoose.model('Page', PagesSchema);
