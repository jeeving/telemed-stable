const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const CountrySchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        currency: {
            type: String,
            required: true,
            default:"INR"
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


CountrySchema.index({name: 1}, {unique: true});

module.exports = mongoose.model('Country', CountrySchema);
