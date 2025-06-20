const {
    models: { BecomeVerifiedRequest, Notification, User },
    enums: {BecomeVerified}
} = require('../../../../lib/models');

const {showDate, showDateTimeZone, sendFCMPush} = require('../../../../lib/util');

require("dotenv").config();

const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;

class BecomeVerifiedController {
    async listPage(req, res) {
        return res.render('becomeverified/list', {
            BecomeVerified
        });
    }
    

    async list(req, res) {
        let reqData = req.query;
        let columnNo = parseInt(reqData.order[0].column);
        let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        let query = {
            "organizationId" : { $exists: false },
            isDeleted: false,
        };

        // if (reqData.search.value) {
        //     let searchValue = new RegExp("\\b(" + reqData.search.value + ")\\b", "gi");
        //     query.$or = [
        //         {name: searchValue},
        //     ];
        // }

        if (reqData.status && reqData.status != '') {
            query.status = reqData.status;
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

        const count = await BecomeVerifiedRequest.countDocuments(query);
        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        response.recordsTotal = count;
        response.recordsFiltered = count;
        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);
        let record = await BecomeVerifiedRequest.find(query)
            .populate('userId')
            .sort(sortCond)
            .skip(skip)
            .limit(limit);

        if (record) {
            let fileShow = `https://docs.google.com/gview?url=`
            let fileShow2 = `&embedded=true`

            record = record.map(rec => {
                let actions = '';
                let statusLabel;
                let filecontent = '';

                if(rec.status == 'PENDING'){
                    statusLabel = `<span class="badge label-table badge-info">Pending</span>`;
                    actions = `${actions}<a href="/becomeverified/approve/${rec._id}" title="Approve" class="text-success"> <i class="fas fa-check"></i> </a> &nbsp;&nbsp;`;
                    actions = `${actions}<a href="/becomeverified/reject/${rec._id}" title="Reject" class="text-danger"> <i class="fas fa-times"></i> </a>`;
                }
                else if(rec.status == 'APPROVED'){
                    statusLabel = `<span class="badge label-table badge-success">Approved</span>`;
                }
                else if(rec.status == 'REJECTED'){
                    statusLabel = `<span class="badge label-table badge-danger">Rejected</span>`;
                }

                // filecontent = `<a href="${process.env.AWS_S3_BASE + rec.fileName}" title="Download" class="text-primary" download> <i class="fas fa-download"></i> </a>`;

                if(rec.fileName.toString().includes('.pdf') == true){
                    filecontent = `<a href="${fileShow}${process.env.AWS_S3_BASE + rec.fileName}${fileShow2}" target="_blank" title="View" class="text-primary" > <i class="fas fa-eye"></i> </a>`;
                    //filecontent = `<a href="${process.env.AWS_S3_BASE + rec.fileName}" title="Download" class="text-primary" download> <i class="fas fa-download"></i> </a>`;
                    //filecontent = `<a href="javascript:void(0);" data-url="${process.env.AWS_S3_BASE + rec.fileName}" title="Download" class="text-primary displayPdf" > <i class="fas fa-download"></i> </a>`;
                }
                else{
                    filecontent = `<img src='${process.env.AWS_S3_BASE + rec.fileName}' alt="Image" style="height: 25px; width: 30px; cursor: pointer;" data-toggle="modal" data-target="#ImgModal" onclick="javascript: setImg('${process.env.AWS_S3_BASE + rec.fileName}');" />`;
                }

                return {
                    0: (skip += 1),
                    1: `<a href='${process.env.SITE_URL}/users/view/${rec.userId._id}'>${rec.userId.fullName}</a>`,
                    2: filecontent,
                    3: statusLabel,
                    4: showDateTimeZone(rec.created, req.session.timeZone),
                    5: actions ? actions : '<span class="badge label-table badge-secondary">N/A</span>',
                };
            });
        }
        response.data = record;
        return res.send(response);
    }

    async reject(req, res) {
        try{
            const rec = await BecomeVerifiedRequest.findOne({
                _id: ObjectId(req.params.id),
                isDeleted: false
            })
            .populate({
                path: 'userId',
                select: '_id fullName deviceToken'
            });
    
            if (!rec) {
                req.flash('error', req.__('REQUEST_NOT_EXIST'));
                return res.redirect('/becomeverified');
            }
    
            rec.status = 'REJECTED';
            await rec.save();
    
            const notification = {
                type: 'VERIFIED_REQUEST_REJECTED',
                title: 'Become Verified Request Rejected!',
                message:`Become verified request has been rejected by TelemedReferral.`,
                user: rec.userId._id,
            };
            let fcmData = {
                type: 'VERIFIED_REQUEST_REJECTED'
            }
            sendFCMPush(rec.userId.deviceToken, notification.title, notification.message, fcmData);
            await new Notification(notification).save();
            req.flash('success', req.__('REQUEST_REJECTED'));
            return res.redirect('/becomeverified');
        }
        catch(error){
            console.error('error>>>', error);
            req.flash('error', req.__('GENERAL_ERROR'));
            return res.redirect('/becomeverified');
        }
    }

    async approve(req, res) {
        try{
            const rec = await BecomeVerifiedRequest.findOne({
                _id: ObjectId(req.params.id),
                isDeleted: false
            })
            .populate({
                path: 'userId',
                select: '_id fullName deviceToken'
            });
    
            if (!rec) {
                req.flash('error', req.__('REQUEST_NOT_EXIST'));
                return res.redirect('/becomeverified');
            }
    
            rec.status = 'APPROVED';
            await rec.save();
    
            await User.updateOne({
                _id: ObjectId(rec.userId._id)
            },
            {
                $set: {
                    isVerified: true,
                    fileName: rec.fileName
                }
            });
    
            const notification = {
                type: 'VERIFIED_REQUEST_APPROVED',
                title: 'Become Verified Request Approved!',
                message:`Become verified request has been approved by TelemedReferral.`,
                user: rec.userId._id,
            };
            let fcmData = {
                type: 'VERIFIED_REQUEST_APPROVED'
            }
            sendFCMPush(rec.userId.deviceToken, notification.title, notification.message, fcmData);
            await new Notification(notification).save();
    
            req.flash('success', req.__('REQUEST_APPROVED'));
            return res.redirect('/becomeverified');
        }
        catch(error){
            console.error('error>>>', error);
            req.flash('error', req.__('GENERAL_ERROR'));
            return res.redirect('/becomeverified');
        }
    }

}

module.exports = new BecomeVerifiedController();
