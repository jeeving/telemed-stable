const root = document.getElementById('root');
const usernameInput = document.getElementById('username');
const button = document.getElementById('join_leave');
const shareScreen = document.getElementById('share_screen');
//const toggleChat = document.getElementById('toggle_chat');
const container = document.getElementById('container');
const otherContainer = document.getElementById('otherContainer');

const count = document.getElementById('count');
//const chatScroll = document.getElementById('chat-scroll');
//const chatContent = document.getElementById('chat-content');
//const chatInput = document.getElementById('chat-input');
let connected = false;
let room;
let chat;
let conv;
let screenTrack;

//https://www.twilio.com/blog/screen-sharing-javascript-twilio-programmable-video
//const search = window.location.search;
//const queryParams = new URLSearchParams(window.location.search);
let localTrack
const queryParams = {};
$.each(document.location.search.substr(1).split('&'), function (c, q) {
    const i = q.split('=');
    if(i[0] && i[1] )
        queryParams[i[0].toString()] = i[1].toString();
});
const { vdr, identity } = queryParams
//console.log("queryParams 1====>",queryParams);


function addLocalVideo() {
    Twilio.Video.createLocalVideoTrack({name: 'camera',priority: 'low'}).then(track => {
        console.log("local1")
        localTrack = track
        let video = document.getElementById('local').firstElementChild;
        let trackElement = track.attach();
        trackElement.addEventListener('click', () => { zoomTrack(trackElement); });
        //video.appendChild(trackElement);
        video.prepend(trackElement)
    });
};

function connectButtonHandler(event) {
    event.preventDefault();
    if (!connected) {
        /*let username = usernameInput.value;
        if (!username) {
            alert('Enter your name before connecting');
            return;
        }*/

        if (vdr && identity) {
            button.disabled = true;
            button.innerHTML = 'Connecting...';
            connectToTwilio().then(() => {
                button.innerHTML = 'Leave call';
                button.disabled = false;
                //shareScreen.disabled = false;
            }).catch(() => {
                alert('Connection failed. Is the backend running?');
                button.innerHTML = 'Join call';
                button.disabled = false;
            });
        }
    }
    else {
        disconnect();
        button.innerHTML = 'Join call';
        connected = false;
        shareScreen.innerHTML = 'Share screen';
        shareScreen.disabled = true;
    }
};



async function connectToTwilio() {
    //const { vdr, identity } = queryParams
    console.log("queryParams 2 ====>",queryParams);
    if (vdr && identity) {

        let promise = new Promise((resolve, reject) => {
            let data;
            button.disabled = true;
            button.innerHTML = 'Connecting...';
            axios({//status,statusText
                method: 'post',
                url: '/webinar/webinar/join-room',
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "Authorization": identity
                },
                data: {
                    roomName: vdr,
                    identity
                }
            }).then((_data) => {
                //console.log( "data==>",data )
                //let {token,webinar,currentMember} = _data.data;
                data = _data.data
                console.log( "data2==>",data )
                if( data.success == false ){
                    toastr.error(data.message);
                    setTimeout( ()=>{
                        window.location = "/webinar/cme"
                    },1000 )
                    throw new Error(data.message)
                    return
                }

                if(data?.webinar?.title) { $("#titleHeading").html( `${data.webinar.title} (Telemedicine CME)`  );}

                if( data?.currentMember?.fullName ){
                    $("#meLabel").html(data?.currentMember?.fullName)
                }
                if( data?.currentMember?.isPresenter ){
                    shareScreen.innerHTML = 'Share screen';
                    shareScreen.disabled = false;
                }
                
                return Twilio.Video.connect(data.token);
            }).then(_room => {
                button.innerHTML = 'Leave call';
                button.disabled = false;

                room = _room;
                room.participants.forEach(participantConnected);
                room.on('participantConnected', participantConnected);
                room.on('participantDisconnected', participantDisconnected);
                connected = true;
                updateParticipantCount();
                //connectChat(data.token, data.conversation_sid);
                resolve();
            }).catch(e => {
                console.log(e);
                
                button.innerHTML = 'Join call';
                button.disabled = false; 
                
                reject()
            });
        });
        return promise;
    }

}

function updateParticipantCount() {
    console.log("room.participants",room.participants)
    if (!connected)
        count.innerHTML = 'Disconnected.';
    else
        count.innerHTML = (room.participants.size + 1) + ' participants online.';
};



async function changeMuteStatus(participant){
    //console.log("hi2",participant)

    let info = await axios({
        method: 'post',
        url: `/webinar/webinar/mute-unmute-user?identity=${identity}`,
        headers: {
            'x-telemedicine-platform': "ios",
            'x-telemedicine-version':"2.2.2",
            'accept-language':"en"
        },
        data: {
            webinarId:vdr,
            memberId:participant,
        }
    })

    console.log(info)
    if( info.status==200 ){
        let {
            canTalk
        } = info.data.data
        console.log({canTalk})
        if( canTalk ){
            $(".c_"+participant).html(`<i class="fas fa-volume-up">`)
        }else{
            $(".c_"+participant).html(`<i class="fas fa-volume-mute">`)
        }
    }

    //this.innerHTML
}

async function participantConnected(participant) {
    console.log( "===3===>", {participant})
    
    let participantDiv = document.createElement('div');
    participantDiv.setAttribute('id', participant.sid);
    participantDiv.setAttribute('class', 'participant col-md-6 col-xl-3');

    let tracksDiv = document.createElement('div');
    participantDiv.appendChild(tracksDiv);

    let labelDiv = document.createElement('div');
    labelDiv.setAttribute('class', 'label');
    const participantIdentity = JSON.parse(participant.identity)

    let userInfo = await axios({
        method: 'get',
        url: `/webinar/webinar/member-info/${vdr}/${participantIdentity._id}`,
    })
    if( userInfo.status==200 ){
        console.log("xxx==>",userInfo.data.data.userInfo)
        let {
            acceptTime,canTalk,isHost,isInvited,isPresenter,
        } = userInfo?.data?.data?.userInfo
        //console.log(participantIdentity._id)
        //console.log({acceptTime,canTalk,isHost,isInvited,isPresenter,} )

        let muteUnmuteSpan
        if( isHost || isPresenter  ){
            muteUnmuteSpan = `<span class="makeMuteUnmute" "></span>`
        }else if( !canTalk ){
            canTalk = false
            muteUnmuteSpan = `<span class="makeMuteUnmute c_${participantIdentity._id}" onclick="changeMuteStatus( '${participantIdentity._id}' )"><i class="fas fa-volume-mute"></i></span>`
        }else if(canTalk){
            canTalk = true
            muteUnmuteSpan = `<span class="makeMuteUnmute c_${participantIdentity._id}" onclick="changeMuteStatus( '${participantIdentity._id}' )"><i class="fas fa-volume-up"></i></span>`
        }

        labelDiv.innerHTML = `${participantIdentity.n} ${muteUnmuteSpan}`
        //participantDiv.appendChild(labelDiv);
        

        otherContainer.appendChild(participantDiv);
        participant.tracks.forEach(publication => {
            if (publication.isSubscribed){
                trackSubscribed(tracksDiv, publication.track, labelDiv);
            }
        });
        participant.on('trackSubscribed', track => trackSubscribed(participantDiv, track, labelDiv ));
        //participant.on('trackUnsubscribed', trackUnsubscribed);
        participant.on('trackUnsubscribed', track => trackUnsubscribed(participantDiv, track));

        updateParticipantCount();
    }
    
};

function participantDisconnected(participant) {
    try{
        document.getElementById(participant.sid)?.remove();
    }catch(e){
        console.log(e)
    }
    
    updateParticipantCount();
};

function trackSubscribed(div, track, labelDiv) {
    console.log( "trackSubscribed", {track})
    let trackElement = track.attach();
    trackElement.addEventListener('click', () => { zoomTrack(trackElement); });
    div.appendChild(trackElement);
    labelDiv && div.appendChild(labelDiv);
};

function trackUnsubscribed(div,track) {
    console.log("unsubsc");console.log("track",track)
    track.detach().forEach(element => {console.log({element})
        if (element.classList.contains('participantZoomed')) {
            zoomTrack(element);
        }
        div.remove()
        //element.remove()
    });
};



function disconnect() {
    room.disconnect();
    if (chat) {
        chat.shutdown().then(() => {
            conv = null;
            chat = null;
        });
    }
    while (container.lastChild.id != 'local')
        container.removeChild(container.lastChild);
    button.innerHTML = 'Join call';
    if (root.classList.contains('withChat')) {
        root.classList.remove('withChat');
    }
    //toggleChat.disabled = true;
    connected = false;
    updateParticipantCount();
};

function shareScreenHandler() {
    //event.preventDefault();
    if (!screenTrack) {
        navigator.mediaDevices.getDisplayMedia().then(stream => {
            console.log("stream====>", stream.getTracks() )

            screenTrack = new Twilio.Video.LocalVideoTrack(stream.getTracks()[0],{ name: 'share_screen',priority: 'high' });
            room.localParticipant.publishTrack(screenTrack,{name: 'share_screen',priority: 'high' });
            
            screenTrack.mediaStreamTrack.onended = () => { shareScreenHandler() };
            console.log( "444444====>", screenTrack);

            
            let video = document.getElementById('localShare');
            video.append(screenTrack.attach())
            video.style.display = "block";
            shareScreen.innerHTML = 'Stop sharing';
        }).catch((err) => {
            console.log(err)
            alert('Could not share the screen.')
        });
    }
    else {
        let video = document.getElementById('localShare');
        video.style.display = "none";

        
        room.localParticipant.unpublishTrack(screenTrack);
        screenTrack.stop();
        screenTrack = null;
        shareScreen.innerHTML = 'Share screen';
        
        //localTrack.attach()
        //room.localParticipant.publishTrack(localTrack);
    }
};

function zoomTrack(trackElement) {
    if (!trackElement.classList.contains('trackZoomed')) {
        // zoom in
        container.childNodes.forEach(participant => {
            if (participant.classList && participant.classList.contains('participant')) {
                let zoomed = false;
                participant.childNodes[0].childNodes.forEach(track => {
                    if (track === trackElement) {
                        track.classList.add('trackZoomed')
                        zoomed = true;
                    }
                });
                if (zoomed) {
                    participant.classList.add('participantZoomed');
                }
                else {
                    //participant.classList.add('participantHidden');
                }
            }
        });
    }
    else {
        // zoom out
        container.childNodes.forEach(participant => {
            if (participant.classList && participant.classList.contains('participant')) {
                participant.childNodes[0].childNodes.forEach(track => {
                    if (track === trackElement) {
                        track.classList.remove('trackZoomed');
                    }
                });
                participant.classList.remove('participantZoomed')
                participant.classList.remove('participantHidden')
            }
        });
    }
};

function connectChat(token, conversationSid) {
    return Twilio.Conversations.Client.create(token).then(_chat => {
        chat = _chat;
        return chat.getConversationBySid(conversationSid).then((_conv) => {
            conv = _conv;
            conv.on('messageAdded', (message) => {
                addMessageToChat(message.author, message.body);
            });
            return conv.getMessages().then((messages) => {
                chatContent.innerHTML = '';
                for (let i = 0; i < messages.items.length; i++) {
                    addMessageToChat(messages.items[i].author, messages.items[i].body);
                }
                //toggleChat.disabled = false;
            });
        });
    }).catch(e => {
        console.log(e);
    });
};

function addMessageToChat(user, message) {
    chatContent.innerHTML += `<p><b>${user}</b>: ${message}`;
    chatScroll.scrollTop = chatScroll.scrollHeight;
}

function toggleChatHandler() {
    event.preventDefault();
    if (root.classList.contains('withChat')) {
        root.classList.remove('withChat');
    }
    else {
        root.classList.add('withChat');
        chatScroll.scrollTop = chatScroll.scrollHeight;
    }
};

function onChatInputKey(ev) {
    if (ev.keyCode == 13) {
        conv.sendMessage(chatInput.value);
        chatInput.value = '';
    }
};

addLocalVideo();
connectToTwilio();

button.addEventListener('click', connectButtonHandler);
shareScreen.addEventListener('click', shareScreenHandler);
//toggleChat.addEventListener('click', toggleChatHandler);
//chatInput.addEventListener('keyup', onChatInputKey);
