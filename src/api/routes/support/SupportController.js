const {
    models: { AdminSettings },
} = require('../../../../lib/models');

class SupportController {

    async support(req, res) {
        const support = await AdminSettings.findOne({},{_id:0,supportEmail:1,supportNumber:1});

        if (!support) {
            return res.warn({}, req.__('SUPPORT_NOT_EXISTS'));
        }
        return res.success(support, req.__('SUPPORT'));
    }
}

module.exports = new SupportController();
