const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId;

const CategorySchema = new Schema({
    categoryName: {
        type: String,
        trim: true,
        required: true,
    },
    parentId: {
        type: ObjectId,
        default: null
    },
    isSuspended: {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
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
});

module.exports = mongoose.model('Category', CategorySchema);