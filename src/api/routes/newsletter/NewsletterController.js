const {
    models: { Newsletters, AdminSettings },
} = require('../../../../lib/models');

const { sendMail } = require('../../../../lib/mailer');

class NewsletterController {
    async newsletters(req, res) {
        let { name, email, message } = req.body;
        
        const newsLetter = new Newsletters({
            name,
            email,
            message
        });

        await newsLetter.save();

        res.success('', req.__('THANKS_NEWSLETTER'));

        let adminContact = await AdminSettings.findOne({});

        sendMail('newsletter-email', req.__('NEWSLETTER'), adminContact.newsLetterEmail, {
            name,
            email,
            message
        })
            .catch(error => {
                logError(`Failed to send password to ${email}`);
                logError(error);
            }); 
    }
}

module.exports = new NewsletterController();
