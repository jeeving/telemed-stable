const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = mongoose.Types.ObjectId;

const DocumentSchema = new Schema(
    {

        title: {
            type: String
        },

        path: {
            type: String
        },

        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization'
        },
       
        isDeleted: {
            type : Boolean,
            default : false
        },
        isSuspended: {
            type: Boolean,
            default: false
        },

       

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


module.exports = mongoose.model('Document', DocumentSchema);
