const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const AdvertisementSchema = new Schema({
    advertiseName: {
        type: String,
        trim: true,
        required: true,
    },
    bannerImage: {
        type: String,
        trim: true,
        required: true,
    },
    description: {
        type: String,default: ""
    },
    bannerUrl: {
        type: String,
        trim: true,
    },
    adPlace : {
        type: String,
        trim: true,
    },
    countryId: {
        type: Schema.Types.ObjectId,
        ref: "Country",
    },
    specialityIds: [{
        type: Schema.Types.ObjectId,
        ref: "Speciality",  
    }],
    stateId: {
        type: Schema.Types.ObjectId,
        ref: "State",
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

module.exports = mongoose.model('Advertisement', AdvertisementSchema);