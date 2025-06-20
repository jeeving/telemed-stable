const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    bcrypt = require('bcrypt');
const { Platform } = require('../enums');

const { encryptMessage,decryptMessage } = require("../../encryptions")

const UserSchema = new Schema(
    {
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization'
        },
        userName: {
            type: String,
            trim: true,
            index: true
        },
        fullName: {
            type: String,
            trim: true,
            required: true,
            index: true
        },
        age: {
            type: Number,
        },
        hospitalName: {
            type: String
        },
        phone: {
            type: String,
            trim: true,
            required: true,
        },
        secondary_phone: {
            type: String,
            trim: true,
        },
        password: {
            type: String,
            trim: true,
            required: true,
        },
        email: {
            type: String,
            trim: true,
            //lowercase: true,
        },
        emailHash: {
            type: String,
            
        },
        avatar: {
            type: String,
            trim: true,
        },
        deviceToken: {
            type: String,
            trim: true,
        },
        pushNotificationAllowed: {
            type: Boolean,
            default: true,
        },
        isOnline: {
            type: Boolean,
            default: true,
        },
        isLogoutOnline: {
            type: Boolean,
            default: true,
        },
        appointmentReminder: {
            type: Boolean,
            default: true,
        },
        isAccountComplete: {
            type: Boolean,
            default: false,
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
        authTokenIssuedAt: Number,
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        specality: {
            type: Schema.Types.ObjectId,
            ref: "Speciality",
        },
        dob: {
            type: String,
        },
        experience: {
            type: Number,
            default: 0
        },
        regNumber: {
            type: String,
            trim: true,
        },
        city: {
            type: String,
            trim: true,
        },
        whatsapp: {
            type: String,
            trim: true,
        },
        step: {
            type: Number,
            default: 1
        },
        service: {
            type: String,
            trim: true,
        },
        about: {
            type: String,
            trim: true,
        },
        audioSessionRate: {
            type: Number,
            default: 0,
        },
        videoSessionRate: {
            type: Number,
            default: 0,
        },
        customerId: {
            type: String,
        },
        accountDetails: {
            id: {
                type: String,
                trim: true,
            },
            name: {
                type: String,
                trim: true,
            },
            email: {
                type: String,
                trim: true,
                lowercase: true,
            },
            tnc_accepted: {
                type: Boolean,
            },
            account_details: {
                business_name: {
                    type: String,
                    trim: true,
                },
                business_type: {
                    type: String,
                    trim: true,
                }
            },
            bank_account: {
                ifsc_code: {
                    type: String,
                    trim: true,
                },
                beneficiary_name: {
                    type: String,
                    trim: true,
                },
                account_type: {
                    type: String,
                    trim: true,
                },
                account_number: {
                    type: String,
                },
            }
        },
        bankEmail: {
            type: String,
            trim: true,
            lowercase: true,
        },
        accountEmail: {
            status: {
                type: Boolean,
                default: false
            },
            name: {
                type: String,
                trim: true,
            },
            email: {
                type: String,
                trim: true,
                lowercase: true,
            },
            tnc_accepted: {
                type: Boolean,
            },
            account_details: {
                business_name: {
                    type: String,
                    trim: true,
                },
                business_type: {
                    type: String,
                    trim: true,
                }
            },
            bank_account: {
                ifsc_code: {
                    type: String,
                    trim: true,
                },
                beneficiary_name: {
                    type: String,
                    trim: true,
                },
                account_type: {
                    type: String,
                    trim: true,
                },
                account_number: {
                    type: String,
                },
            }
        },

        charges: {
            type: Number,
            default: 0
        },
        voipToken: {
            type: String,
            trim: true,
        },
        os: {
            type: String,
            default: 'android'
        },
        blockedUser: [
            {
                type: Schema.Types.ObjectId,
                ref: "Speciality"
            }
        ],
        publicKey: {
            type: String,
            trim: true
        },
        work_number: {
            type: String
        },
        countryId: {
            type: Schema.Types.ObjectId,
            ref: "Country",
        },
        stateId: {
            type: Schema.Types.ObjectId,
            ref: "State",
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        fileName: {
            type: String
        },
        requestId: {
            type: Schema.Types.ObjectId,
            ref: "BecomeVerifiedRequest",
        },
        isEmergency: {
            type: Boolean,
            default: true,
        },

        isCallAllowed: {
            type: Boolean,
            default: true,
        },

        walletBalance: {
            type: Number,
            default: 0
        },

        isDeleteRequest: {
            type: Boolean,
            default: false
        },
        deleteRequestDate: {
            type: Number,
            default: 0
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
    },
);

UserSchema.pre('save', async function (next) {
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
    else if (user.isModified('countryCode') || user.isModified('phone')) {
        try {
            user.formattedPhone = `${user.countryCode}${user.phone}`;
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

UserSchema.methods.comparePassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password);
    }
    catch (e) {
        return false;
    }
};

// Post-find middleware to decrypt fields
UserSchema.post('find', function (docs) {
    docs.forEach(doc => {
      if (doc.email) {
        doc.email = decryptMessage(doc.email);
      }
      if (doc.dob) {
        try{
            doc.dob = decryptMessage(doc.dob);
        }catch(err){

        }
        
      }
    });
  });
  
  UserSchema.post('findOne', function (doc) {
    if (doc) {
      if (doc.email) {
        doc.email = decryptMessage(doc.email);
      }
      if (doc.dob) {
        try{
            doc.dob = decryptMessage(doc.dob);
        }catch(err){
            
        }
      }
    }
  });
  
  // Post-aggregate middleware to decrypt fields in aggregate results
  UserSchema.post('aggregate', function (docs) {
    docs.forEach(doc => {
      if (doc.email) {
        doc.email = decryptMessage(doc.email);
      }
      if (doc.dob) {
        try{
            doc.dob = decryptMessage(doc.dob);
        }catch(err){
            
        }
      }
    });
  });

module.exports = mongoose.model('User', UserSchema);
