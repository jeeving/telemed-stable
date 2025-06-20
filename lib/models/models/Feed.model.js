const mongoose = require('mongoose'),
  Schema = mongoose.Schema;
/**
 * Feed Schema
 */
 const FeedSchema = new Schema(
  {
      organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization'
      },
      userId:{
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      
      feedType:{ //image,file
        type:String,
        default:''
      },
      files:[{
        type:String,
        default:""
      }],
      
      description:{
        type:String,
        default:""
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

  //taggedPeople:[{ type: Schema.Types.ObjectId, ref: 'User' }],
      // isSelfLiked:{ //self like post
      //   type:Boolean,
      //   default:false
      // },
  
      totalLikes: {
        type:Number,
        default:0
      },
      likes:[
        {
          type: Schema.Types.ObjectId,
          ref: 'User'
        }
      ],

      totalComments:{ 
        type:Number,
        default:0 
      },
      isDeleted:{
        type:Boolean,default:false
      },
      isSuspended:{
        type:Boolean,
        default:false
      },
      isStatus:{
        type:Boolean,
        default:true
      },
      timestamp:{
        type:Number,
        default:0
      },
      totalFlag:{ 
        type:Number,
        default:0 
      },
      flag:[
        {
          userId:{
            type: Schema.Types.ObjectId,
            ref: 'User'
          },
          reason:{
            type:String,default:""
          },
          timestamp:{
            type:Number,default:0
          }  
        }
      ]
    }, 
    {
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
  }
  );


module.exports = mongoose.model('Feed', FeedSchema);