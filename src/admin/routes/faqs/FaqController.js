const {
    models: { Faq }
} = require('../../../../lib/models');

const {showDate, showDateTimeZone} = require('../../../../lib/util');

class FaqController {
    async listPage(req, res) {
        return res.render('faqs/list');
    }

    async list(req, res) {
        let reqData = req.query;
        let columnNo = parseInt(reqData.order[0].column);
        let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        let query = {
            isDeleted: false
        };

        if (reqData.search.value) {
            const searchValue = new RegExp(
                reqData.search.value
                    .split(' ')
                    .filter(val => val)
                    .map(value => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
                    .join(' '),
                'i'
            );

            query.$or = [{ question: searchValue }, { answer: searchValue }];
        }

        let sortCond = { created: sortOrder };
        let response = {};
        switch (columnNo) {
        case 1:
            sortCond = {
                title: sortOrder,
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

        const count = await Faq.countDocuments(query);
        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        response.recordsTotal = count;
        response.recordsFiltered = count;
        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);
        let faqData = await Faq.find(query)
            .sort(sortCond)
            .skip(skip)
            .limit(limit);

        if (faqData.length) {
            faqData = faqData.map(faq => {
                let actions = '';
                actions = `<a href="/faqs/view/${faq._id}" title="View"><i class="fa fa-eye"></i> </a>`;
                actions = `${actions}<a href="/faqs/edit/${faq._id}" title="Edit"> <i class="fas fa-edit"></i> </a>`;
                actions = `${actions}<a href="/faqs/delete/${faq._id}" title="Remove" class="deleteItem"> <i class="fas fa-trash"></i> </a>`;
                if (faq.isSuspended) {
                    actions = `${actions}<a class="statusChange" href="/faqs/update-status?id=${faq._id}&status=false" title="Activate"> <i class="fa fa-check"></i> </a>`;
                }
                else {
                    actions = `${actions}<a class="statusChange" href="/faqs/update-status?id=${faq._id}&status=true" title="In-activate"> <i class="fa fa-ban"></i> </a>`;
                }

                return {
                    0: (skip += 1),
                    1: faq.question,
                    2: faq.answer,
                    3: faq.isSuspended ? '<span class="badge label-table badge-secondary">In-active</span>' : '<span class="badge label-table badge-success">Active</span>',
                    4: showDateTimeZone(faq.created, req.session.timeZone),
                    5: actions ? actions : '<span class="badge label-table badge-secondary">N/A</span>',
                };
            });
        }
        response.data = faqData;
        return res.send(response);
    }

    async view(req, res) {
        const faq = await Faq.findOne({
            _id: req.params.id,
        });

        if (!faq) {
            req.flash('error', req.__('FAQ_NOT_EXISTS'));
            return res.redirect('/faqs');
        }

        return res.render('faqs/view', {
            faq,
        });
    }

    async addPage(req, res) {
        return res.render('faqs/add');
    }

    async add(req, res) {
       
        let { question, answer } = req.body;
        
        const faqCount = await Faq.countDocuments({
            question,
            isDeleted: false,
        });

        if (faqCount) {
            req.flash('error', req.__('FAQ_ALREADY_EXISTS'));
            return res.redirect('/faqs');
        }

        const faqSave = new Faq({
            question,
            answer
        });
        await faqSave.save();

        req.flash('success', req.__('FAQ_ADDED'));
        return res.redirect('/faqs');
    }

    async delete(req, res) {
        const faq = await Faq.findOne({
            _id: req.params.id,
            isDeleted: false
        });

        if (!faq) {
            req.flash('error', req.__('FAQ_NOT_EXIST'));
            return res.redirect('/faqs');
        }

        faq.isDeleted = true;
        await faq.save();

        req.flash('success', req.__('FAQ_DELETED'));
        return res.redirect('/faqs');
    }

    async editPage(req, res) {
        const faq = await Faq.findOne({
            _id: req.params.id,
        });

        if (!faq) {
            req.flash('error', req.__('FAQ_NOT_EXISTS'));
            return res.redirect('/faqs');
        }

        return res.render('faqs/edit', {
            faq,
        });
    }

    async edit(req, res) {
        const {
            question, answer
        } = req.body;

        const faq = await Faq.findOne({
            _id: req.params.id,
        });

        if (!faq) {
            req.flash('error', req.__('FAQ_NOT_EXISTS'));
            return res.redirect('/faqs');
        }

        faq.question = question;
        faq.answer = answer;
        await faq.save();

        req.flash('success', req.__('FAQ_UPDATED'));
        return res.redirect('/faqs');
    }

    async updateStatus(req, res) {
        const { id, status } = req.query;
        let faq = await Faq.findOne({
            _id: id,
        });

        if (!faq) {
            req.flash('error', req.__('FAQ_NOT_EXISTS'));
            return res.redirect('/faqs');
        }

        faq.isSuspended = status;
        await faq.save();

        req.flash('success', req.__('FAQ_STATUS_UPDATED'));
        return res.redirect('/faqs');
    }

    async isFaqExists(req, res) {
        console.log("req", req.body)
        const { _id,key, value } = req.body;

        let matchCond = {
            [key]: new RegExp(`^${value}$`, 'i'),
            isDeleted: false,
        };
        if( _id ){
            matchCond = {
                _id: {$ne: _id},
                ...matchCond
            }
        }
        const count = await Faq.countDocuments(matchCond);
        return res.send(count === 0);
    }
}

module.exports = new FaqController();