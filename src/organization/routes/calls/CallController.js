const {
    models: {  Call }
} = require('../../../../lib/models');
const moment = require("moment")


class CallController {

    async listPage(req, res) {
        let calls = await Call.find({
            $and: [
                {
                    CallDuration: { $gt: 0 },
                },{
                    organizationId:req.user._id
                }
            ]
            
            
        })
            .populate({ path: 'callerId', select: '_id fullName' })
            .populate({ path: 'receiverId', select: '_id fullName' })
            .sort({ _id: -1 })
            .skip(0)
            .limit(5000)
            .lean()
        return res.render('calls/list', { calls ,moment});
    }





}




module.exports = new CallController();