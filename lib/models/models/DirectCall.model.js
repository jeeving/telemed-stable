const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * ReportUser Schema
 */
const DirectCallSchema = new Schema({
  callerId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  amount: {
    type: Number,
    default: 0
  },

  callType: {
    type: String, default: "voice"  //voice or video
  },
 

  isDeleted: {
    type: Boolean,
    default: false
  },
  isSuspended: {
    type: Boolean,
    default: false
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

module.exports = mongoose.model('DirectCall', DirectCallSchema);