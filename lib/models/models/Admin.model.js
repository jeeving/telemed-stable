const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    { AdminRole } = require('../enums'),
    bcrypt = require('bcrypt');

const AdminSchema = new Schema(
    {
        firstName: {
            type: String,
            trim: true,
            required: true,
        },
        lastName: {
            type: String,
            trim: true,
            required: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            required: true,
        },
        countryCode: {
            type: String,
            default: '+1',
        },
        contactNumber: {
            type: String,
            trim: true,
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
            default: false,
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
        authorizedOtp: {
            type: Number,
        },
        otpExpired: {
            type: Date,
        },
        // role: {
        //     type: String,
        //     enum: Object.keys(AdminRole),
        //     required: true,
        // },
        authTokenIssuedAt: Number,
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

AdminSchema.pre('save', async function(next) {
    const admin = this;
    if (!admin.isModified('password')) return next();
    try {
        const saltRounds = parseInt(process.env.BCRYPT_ITERATIONS, 10) || 10;
        admin.password = await bcrypt.hash(admin.password, saltRounds);
        next();
    } catch (e) {
        next(e);
    }
});

AdminSchema.methods.comparePassword = async function(password) {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (e) {
        return false;
    }
};

module.exports = mongoose.model('Admin', AdminSchema);
