const { Joi, common } = require('./validations');
const { UserType ,MessageType} = require('../../../lib/models/enums');


const config = Joi.object().keys({
    language: Joi.string()
        .trim()
        .valid('en', 'ru', 'kk')
        .required(),
    token: Joi.string()
        .trim()
        .required(),
    //user_type: Joi.string().valid(...Object.keys(UserType)).required(),
});

const connect = Joi.object().keys({
    token: Joi.string()
        .trim()
        .required()
});

const requireId = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
});

const paginated = Joi.object().keys({
    page: common.page,
    perPage: common.perPage,
});



const send_message = Joi.object().keys({
    language: Joi.string()
        .trim()
        .valid('en', 'ru', 'kk')
        .required(),
    token: Joi.string()
        .trim()
        .required(),
    receiver_id:Joi.objectId()
    .valid()
    .required(),
    message:Joi.string().required(),

    message_type: Joi.string().valid(...Object.keys(MessageType)).required(),


});

const chat_detail = Joi.object().keys({
    language: Joi.string()
        .trim()
        .valid('en', 'ru', 'kk')
        .required(),

    token: Joi.string()
        .trim()
        .required(),
    receiver_id:Joi.objectId()
    .valid()
    .required(),
    lastMessageId:Joi.objectId().allow("",null).required(),
    perPage:Joi.number()
   

});

const chat_detail_pending = Joi.object().keys({
    language: Joi.string()
        .trim()
        .valid('en', 'ru', 'kk')
        .required(),

    token: Joi.string()
        .trim()
        .required(),
    receiver_id:Joi.objectId()
    .valid()
    .required(),
    topMessageId:Joi.objectId().required(),
    perPage:Joi.number()
   

});

const chat_list = Joi.object().keys({
    language: Joi.string()
        .trim()
        .valid('en', 'ru', 'kk')
        .required(),
    token: Joi.string()
        .trim()
        .required()
   

});

const block_user = Joi.object().keys({
    language: Joi.string()
        .trim()
        .valid('en', 'ru', 'kk')
        .required(),
    token: Joi.string()
        .trim()
        .required(),
    receiver_id:Joi.objectId()
        .valid()
        .required()
});

const requestList = Joi.object().keys({
    language: Joi.string()
        .trim()
        .valid('en', 'ru', 'kk')
        .required(),
    token: Joi.string()
        .trim()
        .required(),
    type:Joi.string()
        .trim()
        .valid('REQUEST', 'APPROVAL')
        .required()
});

const requestSend = Joi.object().keys({
    language: Joi.string()
        .trim()
        .valid('en', 'ru', 'kk')
        .required(),
    token: Joi.string()
        .trim()
        .required(),
    receiver_id:Joi.objectId()
        .valid()
        .required(),
    message: Joi.string()
        .trim()
        .required()
});

const requestAction = Joi.object().keys({
    language: Joi.string()
        .trim()
        .valid('en', 'ru', 'kk')
        .required(),
    token: Joi.string()
        .trim()
        .required(),
    status: Joi.string()
        .trim()
        .valid('WITHDRAW', 'ACCEPT', 'REJECT')
        .required(),
    request_id: Joi.objectId()
        .valid()
        .required()
});

const deleteMessage = Joi.object().keys({
    language: Joi.string()
        .trim()
        .valid('en', 'ru', 'kk')
        .required(),
    token: Joi.string()
        .trim()
        .required(),
    message_id: Joi.objectId()
        .valid()
        .required()
});

const clearChat = Joi.object().keys({
    language: Joi.string()
        .trim()
        .valid('en', 'ru', 'kk')
        .required(),
    token: Joi.string()
        .trim()
        .required(),
    chat_id: Joi.objectId()
        .valid()
        .required()
});

module.exports = {
    config,
    requireId,
    paginated,
    send_message,
    chat_detail,
    chat_list,
    chat_detail_pending,
    block_user,
    requestList,
    requestSend,
    requestAction,
    clearChat,
    deleteMessage,
    connect
};
