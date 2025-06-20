const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const OrganizationRequestSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        numAccount: {
            type: Number,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },


        isSuspended: {
            type: Boolean,default: false,
        },
        isDeleted: {
            type : Boolean,default : false
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



module.exports = mongoose.model('OrganizationRequest', OrganizationRequestSchema);
