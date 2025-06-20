const mongoose = require('mongoose'),
  Schema = mongoose.Schema;
  //const MODALFUNC = require('./modelFunctions').functions;

/**
 * Feed Schema
 */
 const FeedCommentSchema = new Schema({
  feedId:{
    type: Schema.Types.ObjectId,
    ref: 'Feed'
  },
  userId:{
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  taggedUser:[{
    _id:{
        type: Schema.Types.ObjectId,
        ref: 'User'
        },
    name:{
          type: String
        },
    location:{
          type: Number
        },
    length:{
          type: Number
        }
  }],
  message:{
    type:String,default:""
  },
  
  isDeleted:{
    type:Boolean,default:false
  },
  isSuspended:{
    type:Boolean,default:false
  },
  timestamp:{
    type:Number,default:0
  }
  //headtip
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
      getters: true,
      virtuals: true
    }
  });


module.exports = mongoose.model('FeedComment', FeedCommentSchema);