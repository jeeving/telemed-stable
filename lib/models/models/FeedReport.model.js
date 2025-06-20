const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * ReportUser Schema
 */
 const ReportUserSchema = new Schema({
  
  reportorId:{
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  userId:{//reported user
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isStatus: {
    type: Boolean,
    default: true
  },
  isDeleted:{
    type:Boolean,
    default:false
  },
  isSuspended:{
    type:Boolean,
    default:false
  }
 }, {
    timestamps: {
      createdAt: 'created',
      updatedAt: 'updated'
    },
    id: false,
    toJSON: {
      getters: true,
      virtuals: true
    },
    toObject: {
      getters: true
    }
  });

module.exports = mongoose.model('ReportUser', ReportUserSchema);