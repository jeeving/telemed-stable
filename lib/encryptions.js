const themis = require('jsthemis');
const crypto = require('crypto');

const clientPrivateKey = process.env.ENC_PUBLIC_KEY;
const serverPublicKey = process.env.ENC_PRIVATE_KEY;
const randomIV = Buffer.from(process.env.ENC_RAN_IV, 'utf-8'); 


const sm = new themis.SecureMessage(
  Buffer.from(clientPrivateKey, "base64"),
  Buffer.from(serverPublicKey, "base64")
);

async function encryptMessage(email) {
  const encBuffer = sm.encrypt(Buffer.from(email), randomIV );
  const hash = crypto.createHash('sha256').update(email).digest('hex');
    return {
        encrypt: encBuffer.toString("base64"),
        hash
    }
}

function decryptMessage(encryptedMessage) {
  const decryptedBuffer = sm.decrypt(Buffer.from(encryptedMessage, "base64"), randomIV );
  return decryptedBuffer.toString();
}

function decryptUserData(users) {
  return users.map(user => {
    if (user.email) {
      user.email = decryptMessage(user.email);
    }
    if (user.dob) {
      user.dob = decryptMessage(user.dob);
    }
    return user;
  });
}

module.exports = {
  encryptMessage,
  decryptMessage,
  decryptUserData
};


