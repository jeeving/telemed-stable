const sendgrid = require('@sendgrid/mail');

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

const sendMail = (to, from, subject, html) => sendgrid.send({ to, from, subject, html });

module.exports = sendMail;
