const form = document.getElementById("room-name-form");
const roomNameInput = document.getElementById("room-name-input");
const container = document.getElementById("video-container");

const muteAudioBtn = document.getElementById("muteAudioBtn");
const muteVideoBtn = document.getElementById("muteVideoBtn");

function getUrlVars() {
    var url = window.location.href;
    var vars = {};
    var hashes = url.split("?")[1];
    var hash = hashes.split('&');

    for (var i = 0; i < hash.length; i++) {
        params = hash[i].split("=");
        vars[params[0]] = params[1];
    }
    return vars;
}

const startRoom = async (event) => {
    // prevent a page reload when a user submits the form
    //event.preventDefault();
    // hide the join form
    form.style.visibility = "hidden";
    // retrieve the room name
    const roomName = roomNameInput.value;

    let {identity} = getUrlVars()
    
    // fetch an Access Token from the join-room route
    const response = await fetch("/webinar/webinar/join-room", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Authorization": identity
        },
        body: JSON.stringify({ roomName: roomName }),
    });
    const { token } = await response.json();

    // join the video room with the token
    const room = await joinVideoRoom(roomName, token);

    // render the local and remote participants' video and audio tracks
    handleConnectedParticipant(room.localParticipant);
    room.participants.forEach(handleConnectedParticipant);
    room.on("participantConnected", handleConnectedParticipant);

    // handle cleanup when a participant disconnects
    room.on("participantDisconnected", handleDisconnectedParticipant);
    window.addEventListener("pagehide", () => room.disconnect());
    window.addEventListener("beforeunload", () => room.disconnect());
};

const handleConnectedParticipant = (participant) => {
    // create a div for this participant's tracks
    const participantDiv = document.createElement("div");
    participantDiv.setAttribute("id", participant.identity);
    container.appendChild(participantDiv);

    // iterate through the participant's published tracks and
    // call `handleTrackPublication` on them
    participant.tracks.forEach((trackPublication) => {
        handleTrackPublication(trackPublication, participant);
    });

    // listen for any new track publications
    participant.on("trackPublished", handleTrackPublication);
};

const handleTrackPublication = (trackPublication, participant) => {
    function displayTrack(track) {
        // append this track to the participant's div and render it on the page
        const participantDiv = document.getElementById(participant.identity);
        // track.attach creates an HTMLVideoElement or HTMLAudioElement
        // (depending on the type of track) and adds the video or audio stream
        participantDiv.append(track.attach());
    }

    // check if the trackPublication contains a `track` attribute. If it does,
    // we are subscribed to this track. If not, we are not subscribed.
    if (trackPublication.track) {
        displayTrack(trackPublication.track);
    }

    // listen for any new subscriptions to this track publication
    trackPublication.on("subscribed", displayTrack);
};

const handleDisconnectedParticipant = (participant) => {
    // stop listening for this participant
    participant.removeAllListeners();
    // remove this participant's div from the page
    const participantDiv = document.getElementById(participant.identity);
    participantDiv.remove();
};

const joinVideoRoom = async (roomName, token) => {
    // join the video room with the Access Token and the given room name
    const room = await Twilio.Video.connect(token, {
        room: roomName,
    });
    return room;
};

startRoom();
//form.addEventListener("submit", startRoom);







muteAudioBtn.addEventListener("click", );
muteVideoBtn.addEventListener("click", );

//roomName roomNameInput.value

function muteOrUnmuteYourMedia(room, kind, action) {
  const publications = kind === 'audio'
    ? room.localParticipant.audioTracks
    : room.localParticipant.videoTracks;

  publications.forEach(function(publication) {
    if (action === 'mute') {
      publication.track.disable();
    } else {
      publication.track.enable();
    }
  });
}

/**
 * Mute your audio in a Room.
 * @param {Room} room - The Room you have joined
 * @returns {void}
 */
function muteYourAudio(room) {
  muteOrUnmuteYourMedia(room, 'audio', 'mute');
}

/**
 * Mute your video in a Room.
 * @param {Room} room - The Room you have joined
 * @returns {void}
 */
function muteYourVideo(room) {
  muteOrUnmuteYourMedia(room, 'video', 'mute');
}

/**
 * Unmute your audio in a Room.
 * @param {Room} room - The Room you have joined
 * @returns {void}
 */
function unmuteYourAudio(room) {
  muteOrUnmuteYourMedia(room, 'audio', 'unmute');
}

/**
 * Unmute your video in a Room.
 * @param {Room} room - The Room you have joined
 * @returns {void}
 */
function unmuteYourVideo(room) {
  muteOrUnmuteYourMedia(room, 'video', 'unmute');
}

/**
 * A RemoteParticipant muted or unmuted its media.
 * @param {Room} room - The Room you have joined
 * @param {function} onMutedMedia - Called when a RemoteParticipant muted its media
 * @param {function} onUnmutedMedia - Called when a RemoteParticipant unmuted its media
 * @returns {void}
 */
function participantMutedOrUnmutedMedia(room, onMutedMedia, onUnmutedMedia) {
  room.on('trackSubscribed', function(track, publication, participant) {
    track.on('disabled', function() {
      return onMutedMedia(track, participant);
    });
    track.on('enabled', function() {
      return onUnmutedMedia(track, participant);
    });
  });
}