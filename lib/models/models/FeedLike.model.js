const mongoose = require('mongoose'),
  Schema = mongoose.Schema;
  const moment = require('moment');

/**
 * Feed Schema
 */
 const FeedLikeSchema = new Schema({
  feedUserId:{
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  feedId:{
    type: Schema.Types.ObjectId,
    ref: 'Feed'
  },
  userId:{
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isSelfLiked:{ //self like post
    type:Boolean,
    default:false
  },
  likeTime:{
    type:Number,
    default:moment().utc().unix()
  },
  isDeleted:{ //==>is deleted
    type:Boolean,
    default:false
  },
  isSuspended:{ //==>is suspended
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
      getters: true
    },
    toObject: {
      getters: true
    }
  });


module.exports = mongoose.model('FeedLike', FeedLikeSchema);