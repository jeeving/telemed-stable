const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const SocialLinksSchema = new Schema({
    socialName: {
        type: String,
        trim: true,
        required: true,
    },
    linkUrl: {
        type: String,
        trim: true,
        required: true
    },
    socialIcon : {
        type: String,
        trim: true,
        required: true,
    },
    isSuspended: {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    }
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
});

module.exports = mongoose.model('Social', SocialLinksSchema);