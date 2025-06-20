const {
    models: { Page, Faq },
} = require('../../../../lib/models');

class FaqController {

    async getFaqs(req, res) {
        const faq = await Faq.find({
            isDeleted: false,
            isSuspended: false
        });

        if (!faq) {
            return res.warn({}, req.__('FAQ_NOT_EXISTS'));
        }

        return res.success(faq, req.__('FAQ list.'));
    }

    async getFaqsAll(req, res) {
        const faq = await Faq.find({
            isDeleted: false,
            isSuspended: false
        }).lean();

        return res.render('users/faq', {faq});

        
    }
}

module.exports = new FaqController();
