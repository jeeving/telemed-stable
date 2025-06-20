const validations = require('./ioValidations');
const { validateSocketData } = require('./validations');
const { verifyTokenSocket } = require('./auth');
const { withLanguage } = require('../../../lib/i18n');
const { consoleInDevEnv, sendFCMPush, utcDate, utcDateTime, showDate, randomString, logError } = require('../../../lib/util');
const { getObjectId } = require('./common');
const {
    models: { User,Coach,Chat,Message, FriendRequest },
} = require('./../../../lib/models');

module.exports.listen = function(server) {
    let io = require('socket.io')(server),
        loggedInUsers = {},
        loggedInUsersSockets = {};
        connectUsers ={},

    io.on('connection', async function(socket) {
        // eslint-disable-next-line no-console
        consoleInDevEnv('a new user connected');
        consoleInDevEnv('log input param : ' + socket.handshake.query.token);

        let connectData = {token: socket.handshake.query.token}
        const validationResConnect = await validateSocketData(validations.connect, 'en', connectData);
        if (validationResConnect.isError) {
            socket.disconnect();
            /* return ack({
                status: 'failed',
                error: validationResConnect.msg,
            }); */
        }

        const verifyUserResConnect = await verifyTokenSocket(connectData.token, 'en');
        if (verifyUserResConnect.error) {
            socket.disconnect();
            /* return ack({
                status: 'failed',
                error: verifyUserResConnect.msg,
            }); */
        }else{

            loggedInUsers[verifyUserResConnect.data.user._id] = socket.id;
            loggedInUsersSockets[socket.id] = { user: verifyUserResConnect.data.user._id, socket };
            
            socket.emit('connected', {});
        }

        socket.on('user-login', async function(data, ack) {
            const { token, language } = data;
            const __ = withLanguage(language);

            const validationRes = await validateSocketData(validations.config, language, data);
            if (validationRes.isError) {
                return ack({
                    status: 'failed',
                    error: validationRes.msg,
                });
            }

            const verifyUserRes = await verifyTokenSocket(token, language);
            if (verifyUserRes.error) {
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                });
            }

            loggedInUsers[verifyUserRes.data.user._id] = socket.id;
            loggedInUsersSockets[socket.id] = { user: verifyUserRes.data.user._id, socket };

            return ack({
                status: 'success',
            });
        });

        socket.on('user-logout', async function(data, ack) {
            const { token, language } = data;
            const __ = withLanguage(language);

            const validationRes = await validateSocketData(validations.config, language, data);
            if (validationRes.isError) {
                return ack({
                    status: 'failed',
                    error: validationRes.msg,
                });
            }

            const verifyUserRes = await verifyTokenSocket(token, language);
            if (verifyUserRes.error) {
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                });
            }

            if (!(loggedInUsers[verifyUserRes.data.user._id])) {
                return ack({
                    status: 'failed',
                    error: __('UNAUTHORIZED'),
                });
            }

            delete loggedInUsersSockets[loggedInUsers[verifyUserRes.data.user._id]];
            delete loggedInUsers[verifyUserRes.data.user._id];
            delete connectUsers[verifyUserRes.data.user._id];
            return ack({
                status: 'success',
            });
        });

        socket.on('disconnect', async function() {
            let userLoginKey = null;
            for (let key in loggedInUsers) {
                if (loggedInUsers[key] === socket.id) {
                    userLoginKey = key;
                    break;
                }
            }
                
            userLoginKey && delete loggedInUsers[userLoginKey];
            delete loggedInUsersSockets[socket.id];
            delete connectUsers[userLoginKey];

            // eslint-disable-next-line no-console
            consoleInDevEnv('a user disconnected');
        });

        socket.on('message', async function(data, ack) {
            const { token, language, receiver_id, message ,message_type} = data;
            const __ = withLanguage(language);

            const validationRes = await validateSocketData(validations.send_message, language, data);
            if (validationRes.isError) {
                return ack({
                    status: 'failed',
                    error: validationRes.msg,
                });
            }

            const verifyUserRes = await verifyTokenSocket(token, language); 
            if (verifyUserRes.error) {
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                });
            }

            if (!(loggedInUsers[verifyUserRes.data.user._id])) {
                return ack({
                    status: 'failed',
                    error: __('UNAUTHORIZED'),
                });
            }
            let chat;
            let msg;
            let receiver = loggedInUsers[receiver_id];
            let sender = loggedInUsersSockets[socket.id]
            
            let receiverExist = await User.findOne({_id:receiver_id})
            if(!receiverExist){
                
                return ack({
                    status: 'failed',
                    error:"Receiver not found"
                
                });
            }
            

            let exist = await Chat.findOne({$and:[
                {
                    $or:[
                        {
                            receiver_id:sender.user
                        },
                        {
                            receiver_id:receiver_id
                        }
                    ]
                },{
                    $or:[
                        {
                            user_id:sender.user
                        },
                        {
                            user_id:receiver_id
                        }
                    ]
                }
            ]})

        let connect =   connectUsers[receiver_id]; 
        //   let connected_id = verifyUserRes.data.user._id
        //   connected_id =connected_id.toString()
    
            if(exist){
                msg = new Message();
                msg.chat_id=exist._id
                msg.sender_id=verifyUserRes.data.user._id;
                msg.receiver_id=receiver_id;
                msg.message=message;
                msg.message_type= message_type;
                if(connect==verifyUserRes.data.user._id.toString()){
                    msg.isRead=true;
                }
                await msg.save();
                exist.last_message = message;
                exist.message_type = message_type;
                exist.deleted_by = [];
                await exist.save();
            }else{
                chat = new Chat();
                chat.sender_id=verifyUserRes.data.user._id;

            
                chat.user_id=verifyUserRes.data.user._id;
                chat.receiver_id=receiver_id;
                
                chat.last_message=message;
                chat.message_type = message_type;
                
                await chat.save();

                msg = new Message();
                msg.chat_id=chat._id
                msg.sender_id=verifyUserRes.data.user._id;
                msg.receiver_id=receiver_id;
                msg.message=message;
                msg.message_type = message_type;
                await msg.save();

            }
                
            if(connect==verifyUserRes.data.user._id.toString()){
                io.to(receiver).emit("message",msg);
            }else{
                const cryptLib = require('@skavinvarnan/cryptlib');
                const decryptedString = cryptLib.decryptCipherTextWithRandomIV(message, 'd5a423f64b607ea7c65d311d855dc48f36114f227bd0c7a3d403f61x8a9e4412');
                sendFCMPush(receiverExist.deviceToken, verifyUserRes.data.user.fullName, decryptedString, { type: "chat"});
            }

          
            console.log("done")
            return ack({
                status: 'success',
               message:msg
            
            });
        });

        socket.on('chat-detail', async function(data, ack) {
            let { token, language,receiver_id,lastMessageId ,perPage=50 } = data;
            const __ = withLanguage(language);
            perPage = parseInt(perPage);

            const validationRes = await validateSocketData(validations.chat_detail, language, data);
            if (validationRes.isError) {
                return ack({
                    status: 'failed',
                    error: validationRes.msg,
                });
            }

            const verifyUserRes = await verifyTokenSocket(token, language);
            if (verifyUserRes.error) {
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                });
            }

            if (!(loggedInUsers[verifyUserRes.data.user._id])) {
                return ack({
                    status: 'failed',
                    error: __('UNAUTHORIZED'),
                });
            }

           
            connectUsers[verifyUserRes.data.user._id]=receiver_id;
            let sender = loggedInUsersSockets[socket.id];
            let exist;
            let chatdetail
           
            exist = await User.findOne({_id:receiver_id})
            if(!exist){
                return ack({
                    status: 'failed',
                    error: __('Receiver not found')
                
                });
            }

            await Message.updateMany({$and:[{sender_id:receiver_id},{receiver_id:sender.user}]},{isRead:true},{new:true});
            

            let profile={}
            profile._id=exist._id;
            profile.fullName=exist.fullName;
            profile.profileImage=exist.avatar
            if(lastMessageId=='' || lastMessageId==null){
                chatdetail = await Message.find({$and:[{
                $or:[{sender_id:sender.user},{sender_id:receiver_id}]
                },{
                    $or:[{receiver_id:sender.user},{receiver_id:receiver_id}]
                }
                ], deleted_by: {$nin: [sender.user]} }).sort({created:-1}).limit(perPage);

            } else{
                let lastMessage = await Message.findOne({_id:lastMessageId}).select('chat_id created');

                chatdetail = await Message.find({ chat_id:lastMessage.chat_id, created:{$lt:lastMessage.created} , deleted_by: {$nin: [sender.user]} }).sort({created:-1}).limit(perPage);
            }

            let chatInfo1;
            let chatInfo = await Chat.findOne( {
                $or:[
                    {
                        user_id:sender.user, receiver_id:receiver_id
                    },
                    {
                        receiver_id:sender.user, user_id:receiver_id
                    }
                ]}
            );
            if(chatInfo){
                let blockuserId = chatInfo.user_id;
                let recevieruserId = chatInfo.user_id;
                if((sender.user).toString() == (chatInfo.user_id).toString()){
                    blockuserId = chatInfo.receiver_id;
                    recevieruserId = chatInfo.receiver_id;
                }
                let isBlock = await User.countDocuments({_id: sender.user, blockedUser: {$in:[blockuserId]}});

                let isBlocked = await User.countDocuments({_id: recevieruserId, blockedUser: {$in:[sender.user]}});
                chatInfo1 = JSON.parse(JSON.stringify(chatInfo));
                chatInfo1['is_block'] = isBlock;
                chatInfo1['is_blockedbyotheruser'] = isBlocked;
            }
            

            return ack({
                status: 'success',
                profile,
                chatdetail,
                chatInfo: chatInfo1
            });

            if(sender.user_type=='COACH'){
                exist = await User.findOne({_id:receiver_id})
               console.log(exist)
               if(!exist){
                return ack({
                    status: 'failed',
                    error: __('User not found')
                
                });
               }
               await Message.updateMany({$and:[{sender_id:receiver_id},{receiver_id:sender.user}]},{isRead:true},{new:true});
               let profile={}
               profile._id=exist._id;
               profile.firstName=exist.firstName;
               profile.profileImage=exist.profileImage;

               if(lastMessageId==''|| lastMessageId==null){

               chatdetail = await Message.find({$and:[{
                $or:[{sender_id:sender.user},{sender_id:receiver_id}]
            },{
             $or:[{receiver_id:sender.user},{receiver_id:receiver_id}]
            }
         ]}).sort({created:-1}).limit(perPage);
        }else{
            let lastMessage = await Message.findOne({_id:lastMessageId}).select('chat_id created');
             chatdetail = await Message.find({chat_id:lastMessage.chat_id,created:{$lte:lastMessage.created}}).sort({created:-1}).limit(perPage);
            
        }


         return ack({
             status: 'success',
             profile,
             chatdetail,
            
         
         });

            }
           
        });

        socket.on('chat-detail-pending', async function(data, ack) {
            let { token, language,receiver_id, topMessageId ,perPage=50 } = data;
            const __ = withLanguage(language);
            perPage = parseInt(perPage);

            const validationRes = await validateSocketData(validations.chat_detail_pending, language, data);
            if (validationRes.isError) {
                return ack({
                    status: 'failed',
                    error: validationRes.msg,
                });
            }

            const verifyUserRes = await verifyTokenSocket(token, language);
            if (verifyUserRes.error) {
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                });
            }

            if (!(loggedInUsers[verifyUserRes.data.user._id])) {
                return ack({
                    status: 'failed',
                    error: __('UNAUTHORIZED'),
                });
            }

           
            connectUsers[verifyUserRes.data.user._id]=receiver_id;
            let sender = loggedInUsersSockets[socket.id];
            let exist;
            let chatdetail
            if(sender.user_type=='USER'){
               exist = await Coach.findOne({_id:receiver_id})
               if(!exist){
                return ack({
                    status: 'failed',
                    error: __('Coach not found')
                
                });
               }

             await Message.updateMany({$and:[{sender_id:receiver_id},{receiver_id:sender.user}]},{isRead:true},{new:true});
            

               let profile={}
               profile._id=exist._id;
               profile.firstName=exist.firstName;
               profile.profileImage=exist.image
               if(topMessageId=='' || topMessageId==null){


                chatdetail = await Message.find({$and:[{
                   $or:[{sender_id:sender.user},{sender_id:receiver_id}]
               },{
                $or:[{receiver_id:sender.user},{receiver_id:receiver_id}]
               }
            ]}).sort({created:-1}).limit(perPage);

        }else{
          
          let lastMessage = await Message.findOne({_id:topMessageId}).select('chat_id created');

           chatdetail = await Message.find({chat_id:lastMessage.chat_id,created:{$gte:lastMessage.created},_id:{$ne:topMessageId}}).sort({created:-1}).limit(perPage);
          

        }

            return ack({
                status: 'success',
                profile,
                chatdetail
            
            });

            }

            if(sender.user_type=='COACH'){
                exist = await User.findOne({_id:receiver_id})
               console.log(exist)
               if(!exist){
                return ack({
                    status: 'failed',
                    error: __('User not found')
                
                });
               }
               await Message.updateMany({$and:[{sender_id:receiver_id},{receiver_id:sender.user}]},{isRead:true},{new:true});
               let profile={}
               profile._id=exist._id;
               profile.firstName=exist.firstName;
               profile.profileImage=exist.profileImage;

               if(topMessageId=='' || topMessageId==null){

               chatdetail = await Message.find({$and:[{
                $or:[{sender_id:sender.user},{sender_id:receiver_id}]
            },{
             $or:[{receiver_id:sender.user},{receiver_id:receiver_id}]
            }
         ]}).sort({created:-1}).limit(perPage);
        }else{
            let lastMessage = await Message.findOne({_id:topMessageId}).select('chat_id created');
             chatdetail = await Message.find({chat_id:lastMessage.chat_id,created:{$gte:lastMessage.created},_id:{$ne:topMessageId}}).sort({created:-1}).limit(perPage);
            
        }


         return ack({
             status: 'success',
             profile,
             chatdetail,
            
         
         });

            }
           
        });

        socket.on('chat-list', async function(data, ack) {
            const { token, language} = data;
            const __ = withLanguage(language);

            const validationRes = await validateSocketData(validations.chat_list, language, data);
            if (validationRes.isError) {
                return ack({
                    status: 'failed',
                    error: validationRes.msg,
                });
            }

            const verifyUserRes = await verifyTokenSocket(token, language);
            if (verifyUserRes.error) {
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                });
            }
            console.log("verifyUserRes", loggedInUsers, loggedInUsers[verifyUserRes.data.user._id])
            if (!(loggedInUsers[verifyUserRes.data.user._id])) {
                return ack({
                    status: 'failed',
                    error: __('UNAUTHORIZED'),
                });
            }
 
           delete connectUsers[verifyUserRes.data.user._id];
            let list =[]
            let sender = loggedInUsersSockets[socket.id];
            let exist;
            let chatlist;

            chatlist = await Chat.find( {is_reject: false, is_approve: true, deleted_by: {$nin: [sender.user]}, 
                $or:[{user_id:sender.user},{receiver_id:sender.user}],
                
            })
            .populate({path:"receiver_id",model:User,  select: { '_id': 1,'fullName':1,'avatar':1}})
            .populate({path:"user_id",model:User,  select: { '_id': 1,'fullName':1,'avatar':1}})
            .sort({updated:-1});

              if(chatlist.length>0){
                let lng = chatlist.length
                for(let i=0;i<=lng-1;i++){
                    let obj =chatlist[i].toJSON();

                   

                    let count = await Message.find({chat_id: obj._id, receiver_id: verifyUserRes.data.user._id, isRead:false}).countDocuments();
                    obj['unread_count']=count;

                    let blockuserId = obj.receiver_id._id;
                    if((obj.receiver_id._id).toString() == (sender.user).toString()){
                        blockuserId = obj.user_id._id;
                    }
                    let isBlock = await User.countDocuments({_id: sender.user, blockedUser: {$in:[blockuserId]}});
                    obj['is_block']=isBlock;

                    const lastMessage = await Message.findOne({$and:[
                        {
                            $or:[{ sender_id:sender.user },{ sender_id:blockuserId }]
                        },
                        {
                            $or:[{receiver_id:sender.user},{receiver_id:blockuserId}]
                        }
                        ], deleted_by: {$nin: [sender.user]} }, { message:1 , message_type: 1}).sort({created:-1})
                    
                        console.log("lastMessage", lastMessage)
                    obj['last_message'] = (lastMessage && lastMessage.message) || '';
                    obj['message_type'] = ( lastMessage && lastMessage.message_type) || 'NORMAL';
                    let blockeduserId = obj.user_id._id;
                    let recevieruserId = obj.receiver_id._id; 
                    console.log((obj.receiver_id._id).toString() == (sender.user).toString(), obj.receiver_id._id ,"==", sender.user)
                    if((obj.receiver_id._id).toString() == (sender.user).toString()){
                        blockeduserId = obj.receiver_id._id;
                        recevieruserId = obj.user_id._id;
                    }else{
                        //recevieruserId = obj.user_id;
                    }
                    let isBlocked = await User.countDocuments({_id: recevieruserId, blockedUser: {$in:[blockeduserId]}});
                    obj['is_blockedbyotheruser']=isBlocked;
                    list.push(obj);
                }

                return ack({
                    status: 'success',
                    list
                });
            }else{
                return ack({
                    status: 'success',
                    list:[]
                });
            }
        });
        
        socket.on('block_user', async function(data, ack) {
            const { token, language, receiver_id} = data;
            const __ = withLanguage(language);

            const validationRes = await validateSocketData(validations.block_user, language, data);
            if (validationRes.isError) {
                return ack({
                    status: 'failed',
                    error: validationRes.msg,
                });
            }

            const verifyUserRes = await verifyTokenSocket(token, language); console.log("----", verifyUserRes)
            if (verifyUserRes.error) {
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                });
            }

            if (!(loggedInUsers[verifyUserRes.data.user._id])) {
                return ack({
                    status: 'failed',
                    error: __('UNAUTHORIZED'),
                });
            }
 
            connectUsers[verifyUserRes.data.user._id];
            let list =[]
            let sender = loggedInUsersSockets[socket.id];
            let exist;
            let receiver = loggedInUsers[receiver_id];

            await User.findByIdAndUpdate(verifyUserRes.data.user._id, { $push : { "blockedUser":  receiver_id} });

            if(receiver){
                io.to(receiver).emit("block_user",sender.user);
            }

            return ack({
                status: 'success', 
                message: 'User blocked successfully'
            });
        });

        socket.on('unblock_user', async function(data, ack) {
            const { token, language, receiver_id} = data;
            const __ = withLanguage(language);

            const validationRes = await validateSocketData(validations.block_user, language, data);
            if (validationRes.isError) {
                return ack({
                    status: 'failed',
                    error: validationRes.msg,
                });
            }

            const verifyUserRes = await verifyTokenSocket(token, language); console.log("----", verifyUserRes)
            if (verifyUserRes.error) {
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                });
            }

            if (!(loggedInUsers[verifyUserRes.data.user._id])) {
                return ack({
                    status: 'failed',
                    error: __('UNAUTHORIZED'),
                });
            }
 
            connectUsers[verifyUserRes.data.user._id];
            let list =[]
            let sender = loggedInUsersSockets[socket.id];
            let exist;
            let receiver = loggedInUsers[receiver_id];

            await User.findByIdAndUpdate(verifyUserRes.data.user._id, { $pull : { "blockedUser":  receiver_id} });

            if(receiver){
                io.to(receiver).emit("unblock_user",sender.user);
            }

            return ack({
                status: 'success'
            });
        });

        socket.on('request-send', async function(data, ack){
            const { token, language, receiver_id, message} = data;
            const __ = withLanguage(language);

            const validationRes = await validateSocketData(validations.requestSend, language, data);
            if (validationRes.isError) {
                return ack({
                    status: 'failed',
                    error: validationRes.msg,
                });
            }

            const verifyUserRes = await verifyTokenSocket(token, language);
            if (verifyUserRes.error) {
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                });
            }

            if (!(loggedInUsers[verifyUserRes.data.user._id])) {
                return ack({
                    status: 'failed',
                    error: __('UNAUTHORIZED'),
                });
            }
 
            connectUsers[verifyUserRes.data.user._id];
            let list =[]
            let sender = loggedInUsersSockets[socket.id];
            let exist;
            let chatlist;

            if((sender.user).toString() == (receiver_id).toString()){
                return ack({
                    status: 'failed',
                    error: 'same user id not allowed',
                });
            }

            const friendReq = await Chat.findOne({
                $or:[
                    {
                        user_id: verifyUserRes.data.user._id, receiver_id: receiver_id
                    },
                    {
                        receiver_id: verifyUserRes.data.user._id, user_id: receiver_id
                    }
                ]
            });

            if(friendReq){
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                    friendReq
                });
            }else{
                const chatSave = new Chat({user_id: verifyUserRes.data.user._id, receiver_id: receiver_id, last_message: message, message_type: "NORMAL"});
                await chatSave.save();

                msg = new Message();
                msg.chat_id = chatSave._id
                msg.sender_id = verifyUserRes.data.user._id;
                msg.receiver_id = receiver_id;
                msg.message = message;
                msg.message_type = "NORMAL";
                await msg.save();

                let receiverExist = await User.findOne({_id: receiver_id}, {deviceToken:1, fullName:1})
                receiverExist && receiverExist.deviceToken && sendFCMPush(receiverExist.deviceToken, verifyUserRes.data.user.fullName, `${verifyUserRes.data.user.fullName} sent you a friend request.`, { type: "chat"});
                

                return ack({
                    status: 'success'
                });
            }
        });

        socket.on('request-list', async function(data, ack){
            const { token, language, type} = data;
            const __ = withLanguage(language);

            const validationRes = await validateSocketData(validations.requestList , language, data);
            if (validationRes.isError) {
                return ack({
                    status: 'failed',
                    error: validationRes.msg,
                });
            }

            const verifyUserRes = await verifyTokenSocket(token, language); console.log("----", verifyUserRes)
            if (verifyUserRes.error) {
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                });
            }

            if (!(loggedInUsers[verifyUserRes.data.user._id])) {
                return ack({
                    status: 'failed',
                    error: __('UNAUTHORIZED'),
                });
            }
 
            connectUsers[verifyUserRes.data.user._id];
            let list =[]
            let sender = loggedInUsersSockets[socket.id];
            let exist;
            let requsetList;
            if(type == "REQUEST"){
                requsetList = await Chat.find({
                    user_id: verifyUserRes.data.user._id, is_approve: false, is_reject: false
                }).populate({ 'path':'receiver_id', 'select':'fullName avatar' }).populate({ 'path':'user_id',  'select':'fullName avatar'});
            }else{
                requsetList = await Chat.find({
                    receiver_id: verifyUserRes.data.user._id, is_approve: false, is_reject: false
                }).populate({ 'path':'user_id',  'select':'fullName avatar'}).populate({ 'path':'receiver_id',  'select':'fullName avatar'});
            }

            return ack({
                status: 'success',
                requsetList
            });
        });

        socket.on('request-action', async function(data, ack){
            const { token, language, status, request_id} = data;
            const __ = withLanguage(language);

            const validationRes = await validateSocketData(validations.requestAction , language, data);
            if (validationRes.isError) {
                return ack({
                    status: 'failed',
                    error: validationRes.msg,
                });
            }

            const verifyUserRes = await verifyTokenSocket(token, language);
            if (verifyUserRes.error) {
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                });
            }

            if (!(loggedInUsers[verifyUserRes.data.user._id])) {
                return ack({
                    status: 'failed',
                    error: __('UNAUTHORIZED'),
                });
            }
 
            connectUsers[verifyUserRes.data.user._id];
            let list =[]
            let sender = loggedInUsersSockets[socket.id];
            let exist;
            let requsetList;
            if(status == "WITHDRAW"){
                requsetList = await Chat.findByIdAndRemove(request_id);
                await Message.remove({ chat_id:request_id});
                return ack({
                    status: 'success'
                });
            } else if(status == "ACCEPT"){
                requsetList = await Chat.findByIdAndUpdate(request_id, { $set :{is_approve: true} }, { new: true});

                let receiverExist = await User.findOne({_id: requsetList.user_id}, {deviceToken:1, fullName:1})
                sendFCMPush(receiverExist.deviceToken, verifyUserRes.data.user.fullName, `${verifyUserRes.data.user.fullName} accepted your friend request.`, { type: "chat"});

                return ack({
                    status: 'success',
                    requsetList
                });
            } else if(status == "REJECT"){
                await Message.remove({chat_id: request_id});
                requsetList = await Chat.findByIdAndRemove(request_id);
                
                let receiverExist = await User.findOne({_id: requsetList.user_id}, {deviceToken:1, fullName:1})
                sendFCMPush(receiverExist.deviceToken, verifyUserRes.data.user.fullName, `${verifyUserRes.data.user.fullName} rejected your friend request.`, { type: "chat"});

                return ack({
                    status: 'success',
                    requsetList
                });
            }

            
        });

        socket.on('delete-message', async function(data, ack){
            const { token, language, message_id} = data;
            const __ = withLanguage(language);

            const validationRes = await validateSocketData(validations.deleteMessage , language, data);
            if (validationRes.isError) {
                return ack({
                    status: 'failed',
                    error: validationRes.msg,
                });
            }

            const verifyUserRes = await verifyTokenSocket(token, language); console.log("----", verifyUserRes)
            if (verifyUserRes.error) {
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                });
            }

            if (!(loggedInUsers[verifyUserRes.data.user._id])) {
                return ack({
                    status: 'failed',
                    error: __('UNAUTHORIZED'),
                });
            }
 
            connectUsers[verifyUserRes.data.user._id];
            let list =[]
            let sender = loggedInUsersSockets[socket.id];
            let exist;
            let requsetList;
            
            requsetList = await Message.findOneAndUpdate({ _id: message_id }, { $push :{deleted_by: sender.user} }, { new: true});
            return ack({
                status: 'success',
                requsetList
            });
        });

        socket.on('clear-chat', async function(data, ack){
            const { token, language, chat_id} = data;
            const __ = withLanguage(language);

            const validationRes = await validateSocketData(validations.clearChat , language, data);
            if (validationRes.isError) {
                return ack({
                    status: 'failed',
                    error: validationRes.msg,
                });
            }

            const verifyUserRes = await verifyTokenSocket(token, language); console.log("----", verifyUserRes)
            if (verifyUserRes.error) {
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                });
            }

            if (!(loggedInUsers[verifyUserRes.data.user._id])) {
                return ack({
                    status: 'failed',
                    error: __('UNAUTHORIZED'),
                });
            }
 
            connectUsers[verifyUserRes.data.user._id];
            let list =[]
            let sender = loggedInUsersSockets[socket.id];
            
            await Message.updateMany({chat_id }, { $push :{deleted_by: sender.user} });
            return ack({
                status: 'success'
            });
        });

        socket.on('clear-thread', async function(data, ack){
            const { token, language, chat_id} = data;
            const __ = withLanguage(language);

            const validationRes = await validateSocketData(validations.clearChat , language, data);
            if (validationRes.isError) {
                return ack({
                    status: 'failed',
                    error: validationRes.msg,
                });
            }

            const verifyUserRes = await verifyTokenSocket(token, language); console.log("----", verifyUserRes)
            if (verifyUserRes.error) {
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                });
            }

            if (!(loggedInUsers[verifyUserRes.data.user._id])) {
                return ack({
                    status: 'failed',
                    error: __('UNAUTHORIZED'),
                });
            }
 
            connectUsers[verifyUserRes.data.user._id];
            let list =[]
            let sender = loggedInUsersSockets[socket.id];
            
            await Message.updateMany({chat_id }, { $push :{deleted_by: sender.user} });
            await Chat.update({_id: chat_id }, { $push :{deleted_by: sender.user} });
            return ack({
                status: 'success'
            });
        });
        
        socket.on('is_friend', async function(data, ack){
            const { token, language, receiver_id} = data;
            const __ = withLanguage(language);

            const validationRes = await validateSocketData(validations.block_user , language, data);
            if (validationRes.isError) {
                return ack({
                    status: 'failed',
                    error: validationRes.msg,
                });
            }

            const verifyUserRes = await verifyTokenSocket(token, language); console.log("----", verifyUserRes)
            if (verifyUserRes.error) {
                return ack({
                    status: 'failed',
                    error: verifyUserRes.msg,
                });
            }

            if (!(loggedInUsers[verifyUserRes.data.user._id])) {
                return ack({
                    status: 'failed',
                    error: __('UNAUTHORIZED'),
                });
            }
 
            connectUsers[verifyUserRes.data.user._id];
            let list =[]
            let sender = loggedInUsersSockets[socket.id];
            
            const friendReq = await Chat.findOne({
                $or:[
                    {
                        user_id: verifyUserRes.data.user._id, receiver_id: receiver_id
                    },
                    {
                        receiver_id: verifyUserRes.data.user._id, user_id: receiver_id
                    }
                ]
            }, { is_approve:1, is_reject:1, receiver_id:1, user_id:1 });

            if(friendReq){
                return ack({
                    status: 'success',
                    friendReq
                });
            }else{
                return ack({
                    status: 'success',
                    friendReq:{}
                });
            }
        });

    });
};
 