const {
    models: { Referral }
} = require('../../../../lib/models');
const moment = require("moment")


class ReferralController {

    async listPage(req, res) {
        let referrals = await Referral.find({
            organizationId: { $exists: false }
        })
            .populate({ path: 'senderId', select: '_id fullName' })
            .populate({ path: 'receiverId', select: '_id fullName' })
            .sort({ _id: -1 })
            .skip(0)
            .limit(5000)
            .lean()
        return res.render('referral/list', { referrals,moment });
    }





}




module.exports = new ReferralController();