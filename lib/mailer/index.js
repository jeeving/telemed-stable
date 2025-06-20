const Email = require('email-templates');
const path = require('path');

if (['smtp', 'sendgrid'].indexOf(process.env.MAIL_SERVICE) === -1) {
    throw new Error("Allowed mail service values are: 'smtp', 'sendgrid'");
}

const mailer = require(`./services/${process.env.MAIL_SERVICE}`);

const templateRenderer = new Email({
    views: {
        root: path.join(__dirname, 'templates'),
        options: {
            extension: 'ejs',
        },
    },
});

const sendMail = async (template, subject, email, emailData, from = process.env.FROM_MAIL) => {
    const locals = { custom: emailData };
    locals.site_title = process.env.SITE_TITLE || '';
    locals.email_logo = process.env.LOGO_PATH || '';

    const renderedTemplate = await templateRenderer.render(template, locals);

    return mailer(email, from, subject, renderedTemplate);
};

module.exports = { sendMail };
