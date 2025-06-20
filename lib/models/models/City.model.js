const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const CitySchema = new Schema(
    {
        id: {
            type: Number,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        state: {
            type: Boolean,
            default: false,
        }
    },
    {
        toJSON: {
            getters: true,
        },
        toObject: {
            getters: true,
        },
    }
);

CitySchema.pre('save', async function (next) {
    const city = this;
    if(city.isModified('countryCode') || city.isModified('phone')) {
        try {
            city.formattedPhone = `${city.countryCode}${city.phone}`;
            next();
        }
        catch (e) {
            next(e);
        }
    } else {
        return next();
    }
});

module.exports = mongoose.model('City', CitySchema);
