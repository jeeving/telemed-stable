const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    bcrypt = require('bcrypt');

const OrganizationSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        numAccount: {
            type: Number,
            required: true,
        },

        tenureDate: {
            type: String,
            trim: true,
        },
        tenureStamp: {
            type: Number,
            trim: true,
        },

        email: {
            type: String,
            required: true,
        },
        countryCode: {
            type: String,
            default: '+1',
        },
        phone: {
            type: String,
            required: true,
        },
        password: {
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
            default: false
        },

        payment: [  new mongoose.Schema( {
            "receivedTime": {
                type: Number,
            },
            "amount": {
                type: Number,
            },
            "endDate": {
                type: Number,
            },
            "numAccount": {
                type: Number,
            }
        })],
        lastAmountReceived: {
            type: Number,
            default: 0
        },

        failedLoginAttempts: {
            type: Number,
            default: 0,
        },
        preventLoginTill: {
            type: Number,
            default: 0,
        },
        resetToken: {
            type: String,
            trim: true,
        },
        authTokenIssuedAt: Number,
        remarks: {
            type: String
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


OrganizationSchema.pre('save', async function (next) {
    const user = this;
    if (user.isModified('password')) {
        try {
            const saltRounds = parseInt(process.env.BCRYPT_ITERATIONS, 10) || 10;
            user.password = await bcrypt.hash(user.password, saltRounds);
            next();
        }
        catch (e) {
            next(e);
        }
    }
    else {
        return next();
    }
});

OrganizationSchema.methods.comparePassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password);
    }
    catch (e) {
        return false;
    }
};


module.exports = mongoose.model('Organization', OrganizationSchema);
