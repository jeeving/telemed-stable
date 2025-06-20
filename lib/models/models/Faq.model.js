const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const FaqSchema = new Schema(
    {
        question: {
            type: String,
            required: true,
        },
        answer: {
            type: String,
            required: true,
        },
        isSuspended: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type : Boolean,
            default : false
        }
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

FaqSchema.pre('save', async function (next) {
    const faq = this;
    if(faq.isModified('countryCode') || faq.isModified('phone')) {
        try {
            faq.formattedPhone = `${faq.countryCode}${faq.phone}`;
            next();
        }
        catch (e) {
            next(e);
        }
    } else {
        return next();
    }
});

module.exports = mongoose.model('Faq', FaqSchema);
