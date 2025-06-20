const { Joi, common } = require('../../util/validations');

const optionalId = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .optional(),
});

const updateProfile = Joi.object().keys({
    type: Joi.string()
        .trim()
        .valid('PROFILE_UPDATE', 'ACCOUNT_COMPLETE')
        .required(),
    fullName: Joi.string().when('type', {
        is: 'PROFILE_UPDATE',
        then: Joi.string()
            .trim()
            .min(3)
            .max(30)
    }),
    age: Joi.string()
        .trim()
        .optional(),
    hospitalName: Joi.string()
        .trim()
        .optional()
        .allow(''),
    userName: Joi.string()
        .trim()
        .min(3)
        .max(30),
    bio: Joi.string()
        .trim()
        .min(3)
        .optional()
        .allow(''),
    description: Joi.string()
        .trim()
        .min(3)
        .optional()
        .allow(''),
    avatar: Joi.string()
        .trim()
        .optional(),
    service: Joi.string()
        .trim()
        .min(3),
    about: Joi.string()
        .trim()
        .min(3),
    audioSessionRate: Joi.number(),
        //.min(1),
    videoSessionRate: Joi.number(),
        //.min(1),
    specality: Joi.objectId()
        .valid()
        .optional(),
    dob: Joi.string(),
    experience: Joi.number()
        .min(1)
        .optional(),
    regNumber: Joi.string()
        .trim()
        .min(1),
    city: Joi.string()
            .trim()
            .min(1),
    phone: common.whatsappPhone,
    secondary_phone: Joi.string().allow(''),
    countryId: Joi.objectId()
        .valid()
        .required(),
    stateId: Joi.objectId()
        .valid()
        .required(),
    fileName: Joi.string()
        .trim()
        .optional()
        .allow(''),
    selected: Joi.boolean()
        .optional()
});

const updatePassword = Joi.object().keys({
    currentPassword: Joi.string()
        .trim()
        .required(),
    newPassword: common.password,
});

const updateEmail = Joi.object().keys({
    currentPassword: Joi.string()
        .trim()
        .required(),
    email: common.email,
});

const updatePhone = Joi.object().keys({
    currentPassword: Joi.string()
        .trim()
        .required(),
    phone: common.phone,
});
const UpdatePersonalInformation = Joi.object().keys({
    specality: Joi.string(),
    dob: Joi.string()
        .min(3)
        .max(10)
        .required(),
    experience: Joi.number()
        .min(1)
        .optional(),
    // hospitalName: Joi.string()
    //     .trim()
    //     .optional()
    //     .allow(''),
    regNumber: Joi.string()
        .trim()
        .min(1)
        .required(),
    city: Joi.string()
        .trim()
        .min(1),
    whatsapp: common.whatsappPhone,
    avatar: Joi.string()
        .trim()
        .max(500)
        .optional()
        .allow(''),
    audioSessionRate: Joi.number()
    //.min(1)
    .required(),
    videoSessionRate: Joi.number()
        //.min(1)
        .required(),
    // secondary_phone: Joi.string().allow(''),
    countryId: Joi.objectId()
        .valid()
        .required(),
    stateId: Joi.objectId()
        .valid()
        .required(),
        
});

const UpdateWorkingDetail = Joi.object().keys({
    service: Joi.string()
        .trim()
        .min(3)
        .required(),
    about: Joi.string()
        .trim()
        .min(3)
        .required(),
});

const UpdatePaymentDetail = Joi.object().keys({
    audioSessionRate: Joi.number()
        .min(1)
        .required(),
    videoSessionRate: Joi.number()
        .min(1)
        .required(),
});
const readNotifications = Joi.object().keys({
    id: Joi.alternatives().try([
        Joi.array().items(
            Joi.objectId()
                .valid()
                .required()
        ),
        Joi.objectId()
            .valid()
            .required()
    ]).required(),
});
const paginated = Joi.object().keys({
    page: common.page,
    perPage: common.perPage,
});

const UpdateDeviceToken = Joi.object().keys({
    deviceToken: Joi.string()
        .required()
})

const unBlockUser = Joi.object().keys({
    receiver_id: Joi.objectId()
        .valid()
        .required(),
    is_blocked: Joi.boolean()
        .required()
})

const updateUserProfile = Joi.object().keys({
    field: Joi.string().required(),
    value: Joi.string().optional().allow("")
});

module.exports = {
    readNotifications,
    optionalId,
    updateProfile,
    updatePassword,
    updateEmail,
    updatePhone,
    UpdatePersonalInformation,
    UpdateWorkingDetail,
    UpdatePaymentDetail,
    paginated,
    UpdateDeviceToken,
    unBlockUser,
    updateUserProfile,
    // becomeVerified
};
