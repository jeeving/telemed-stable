const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId;

const StateSchema = new Schema(
    {
        countryId: {
            type: ObjectId,
            ref: 'Country',
        },
        name: {
            type: String,
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
    },
    {
        timestamps: {
            createdAt: 'created',
            updatedAt: 'updated',
        },
        toJSON: {
            getters: true,
        },
        toObject: {
            getters: true,
        },
        id: false,
    }
);

StateSchema.index({name: 1});

module.exports = mongoose.model('State', StateSchema);
