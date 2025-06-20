const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * ReportUser Schema
 */
 const PreWalletSchema = new Schema({
  
  userId:{//reported user
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  amount: {
    type: Number,
    default: 0
  },

  gst: {
    type: Number,
    default: 0
  },
  fee: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    default: 0
  },


  orderId: { type: String },
  orderReceipt: { type: String },
  currency: { type: String },

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

module.exports = mongoose.model('PreWallet', PreWalletSchema);