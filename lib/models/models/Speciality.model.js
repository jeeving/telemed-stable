const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const SpecialitySchema = new Schema({
    specialityName: {
        type: String,
        trim: true,
        required: true,
    },
    specialityIcon: {
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

module.exports = mongoose.model('Speciality', SpecialitySchema);