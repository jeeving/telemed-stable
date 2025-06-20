const {
    models: { User, Speciality },
} = require('../../../../lib/models');
const { showDateAccordingTimezone, logError } = require('../../../../lib/util');
const { utcDateTime } = require('../../../../lib/util');
const { sendMail } = require('../../../../lib/mailer');

const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;


class AccountUpdateController {
    
    async listPage(req, res) {
        return res.render('accountUpdate/list');
    }

    async list(req, res) {
        let reqData = req.query;
        let columnNo = parseInt(reqData.order[0].column);
        let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        let query = {
            isDeleted: false,
            accountEmail: { $exists: true, $ne: null },
        };

        if (reqData.search.value) {
            const searchValue = new RegExp(
                reqData.search.value
                    .split(' ')
                    .filter(val => val)
                    .map(value => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
                    .join('|'),
                'i',
            );

            query.$or = [
                { fullName: searchValue },
            ];
        }

        let sortCond = { created: sortOrder };
        let response = {};
        switch (columnNo) {
            case 1:
                sortCond = {
                    fullName: sortOrder,
                };
                break;
            case 2:
                sortCond = {
                    isSuspended: sortOrder,
                };
                break;
            default:
                sortCond = { created: sortOrder };
                break;
        }


        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);

        const data = await User.aggregate([{
            $match: query,
        },
            {
                $project: {
                    fullName: 1,
                    accountDetails: 1,
                    accountEmail: 1,
                    updated: 1,
                },
            },
            {
                $sort: sortCond,
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    items: { $push: '$$ROOT' },
                },
            },
            {
                $project: {
                    count: 1,
                    items: {
                        $slice: ['$items', skip, limit],
                    },
                },
            },

        ]);

        const count = data.length ? data[0].count : 0;

        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        response.recordsTotal = count;
        response.recordsFiltered = count;

        let users = data.length ? data[0].items : [];

        if (users) {
            users = users.map(user => {
                let actions = '';
                actions = `<a href="/accountUpdate/view/${user._id}" title="View"><i class="fa fa-eye"></i> </a>`;
                actions = `${actions}<a href="/accountUpdate/delete/${user._id}" title="Remove" class="deleteItem"> <i class="fas fa-trash"></i> </a>`;
                actions = `${actions}<a href="/accountUpdate/edit/${user._id}" title="Edit"> <i class="fas fa-edit"></i> </a>`;

                return {
                    0: (skip += 1),
                    1: user.fullName || 'N/A',
                    2: user.accountDetails && user.accountDetails.email || 'N/A',
                    3: user.accountEmail.email || 'N/A',
                    4: user.accountEmail.status ? '<span class="badge label-table badge-success">Completed</span>' : '<span class="badge label-table badge-danger">new</span>',
                    5: showDateAccordingTimezone(user.updated),
                    6: actions ? actions : '<span class="badge label-table badge-secondary">N/A</span>',
                };
            });
        }
        response.data = users;
        return res.send(response);
    }

    async view(req, res) {

        let user = await User.aggregate([
            {
                $match: {
                    _id: ObjectId(req.params.id),
                    isDeleted: false,
                    accountEmail: { $exists: true, $ne: null },
                },
            },
            {
                $project: {
                    fullName: 1,
                    accountDetails: 1,
                    accountEmail: 1,
                    updated: 1,
                },
            },
        ]);
        user = user[0];

        if (!user) {
            req.flash('error', req.__('REQUEST_NOT_FOUND'));
            return res.redirect('/accountUpdate');
        }
        return res.render('accountUpdate/view', {
            user,
        });
    }

    async updateStatus(req, res) {
        const { id, status } = req.query;
        let user = await User.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!user) {
            req.flash('error', req.__('REQUEST_NOT_FOUND'));
            return res.redirect('/accountUpdate');
        }

        await User.updateOne(
            { _id: user._id }, // Find the user by their ID
            { $set: { "accountEmail.status": status } } // Update the accountEmail status
        );
        
        //user.accountEmail.status = status;
        //await user.save();

        req.flash('success', req.__('REQUEST_STATUS_UPDATED'));
        return res.redirect('/accountUpdate');
    }

}

module.exports = new AccountUpdateController();
