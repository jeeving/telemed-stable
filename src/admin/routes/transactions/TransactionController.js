const {
    models: { PaymentRequest, Notification, User }
} = require('../../../../lib/models');

const {showDate, showDateTimeZone, sendFCMPush} = require('../../../../lib/util');

require("dotenv").config();

const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;

class TransactionController {
    async listPage(req, res) {
        const {userId} = req.query;
        return res.render('transactions/list', {
            userId: (userId && userId != '')?userId:''
        });
    }
    

    async list(req, res) {
        let reqData = req.query;
        let columnNo = parseInt(reqData.order[0].column);
        let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        let query = {userId: {$exists: true}};
        let {userId} = req.body;

        // if (reqData.search.value) {
        //     let searchValue = new RegExp("\\b(" + reqData.search.value + ")\\b", "gi");
        //     query.$or = [
        //         {name: searchValue},
        //     ];
        // }

        // if (reqData.status && reqData.status != '') {
        //     query.status = reqData.status;
        // }

        if(reqData.userId && reqData.userId != ''){
            query.userId = ObjectId(reqData.userId);
        }

        let sortCond = {created: sortOrder};
        let response = {};
        switch (columnNo) {
            case 1:
                sortCond = {
                    created: sortOrder,
                };
                break;
            case 5:
                sortCond = {
                    created: sortOrder,
                };
                break;
            default:
                sortCond = {created: sortOrder};
                break;
        }

        const count = await PaymentRequest.countDocuments(query);
        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        response.recordsTotal = count;
        response.recordsFiltered = count;
        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);
        //console.log({ query })
        let record = await PaymentRequest.find(query)
            .populate('userId')
            .sort(sortCond)
            .skip(skip)
            .limit(limit);

        //console.log({ record })

        if (record) {
            record = record.map(rec => {

                return {
                    0: (skip += 1),
                    1: `<a href='${process.env.SITE_URL}/users/view/${rec.userId._id}'>${rec.userId.fullName}</a>`,
                    2: parseFloat(rec.amount).toFixed(2),
                    3: showDateTimeZone(rec.created, req.session.timeZone)
                };
            });
        }
        response.data = record;
        return res.send(response);
    }

}

module.exports = new TransactionController();
