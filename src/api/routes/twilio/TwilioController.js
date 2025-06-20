const {
    models: { Page, Slot },
} = require('../../../../lib/models');

const { utcDateTime, showDate } = require('../../../../lib/util');
const moment = require('moment');

const Twilio = require('twilio');
const AccessToken = Twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const VideoGrant = AccessToken.VideoGrant;
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioApiKey = process.env.TWILIO_API_KEY;
const twilioApiSecret = process.env.TWILIO_API_SECRET;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(twilioAccountSid, authToken);
const twilio_client = new Twilio(twilioApiKey, twilioApiSecret, {
    accountSid: twilioAccountSid
});


class TwilioController {
    async test(req, res) {

        try{
            const outgoingApplicationSid = process.env.TWILIO_APP_SID;
            let pushCredentialSid = req.headers['os'] == "Android" ? process.env.ANDROID_PUSH_SID : process.env.IOS_PUSH_SID;
            pushCredentialSid =""
            const identity = "_id".toString();
            const voiceGrant = new VoiceGrant({ outgoingApplicationSid, pushCredentialSid });
            let token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret);

            console.log({token})

            token.addGrant(voiceGrant);
            token.identity = identity;
            res.success({ identity, token: token.toJwt() });
        }catch(err){
            console.log(err)
            res.badRequest(err)
        }
        

    }
}

module.exports = new TwilioController();
