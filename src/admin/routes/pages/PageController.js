const {
    models: { Page }
} = require('../../../../lib/models');

class PageController {
    async listPage(req, res) {
        return res.render('pages/list');
    }

    async list(req, res) {
        let reqData = req.query;
        let columnNo = parseInt(reqData.order[0].column);
        let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        let query = {};

        if (reqData.search.value) {
            const searchValue = new RegExp(
                reqData.search.value
                    .split(' ')
                    .filter(val => val)
                    .map(value => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
                    .join(' '),
                'i'
            );

            query.$or = [{ slug: searchValue }, { title: searchValue }];
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

        const count = await Page.countDocuments(query);
        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        response.recordsTotal = count;
        response.recordsFiltered = count;
        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);
        let pages = await Page.find(query)
            .sort(sortCond)
            .skip(skip)
            .limit(limit);

        if (pages.length) {
            pages = pages.map(page => {
                let actions = '';
                actions = `<a href="/pages/view/${page._id}" title="View"><i class="fa fa-eye"></i> </a>`;
                actions = `${actions}<a href="/pages/edit/${page._id}" title="Edit"> <i class="fas fa-edit"></i> </a>`;
                // if (page.isSuspended) {
                //     actions = `${actions}<a class="statusChange" href="/pages/update-status?id=${page._id}&status=false" title="Activate"> <i class="fa fa-check"></i> </a>`;
                // }
                // else {
                //     actions = `${actions}<a class="statusChange" href="/pages/update-status?id=${page._id}&status=true" title="In-activate"> <i class="fa fa-ban"></i> </a>`;
                // }

                return {
                    0: (skip += 1),
                    1: page.title,
                    2: page.isSuspended ? '<span class="badge label-table badge-secondary">In-active</span>' : '<span class="badge label-table badge-success">Active</span>',
                    3: actions ? actions : '<span class="badge label-table badge-secondary">N/A</span>',
                };
            });
        }
        response.data = pages;
        return res.send(response);
    }

    async view(req, res) {
        const page = await Page.findOne({
            _id: req.params.id,
        });

        if (!page) {
            req.flash('error', req.__('PAGE_NOT_EXISTS'));
            return res.redirect('/pages');
        }

        return res.render('pages/view', {
            page,
        });
    }

    async editPage(req, res) {
        const page = await Page.findOne({
            _id: req.params.id,
        });

        if (!page) {
            req.flash('error', req.__('PAGE_NOT_EXISTS'));
            return res.redirect('/pages');
        }

        return res.render('pages/edit', {
            page,
        });
    }

    async edit(req, res) {
        const {
            title,
            description,
        } = req.body;

        const page = await Page.findOne({
            _id: req.params.id,
        });

        if (!page) {
            req.flash('error', req.__('PAGE_NOT_EXISTS'));
            return res.redirect('/pages');
        }

        page.title = title;
        page.description = description;
        await page.save();

        req.flash('success', req.__('PAGE_UPDATED'));
        return res.redirect('/pages');
    }

    async updateStatus(req, res) {
        const { id, status } = req.query;
        let page = await Page.findOne({
            _id: id,
        });

        if (!page) {
            req.flash('error', req.__('PAGE_NOT_EXISTS'));
            return res.redirect('/pages');
        }

        page.isSuspended = status;
        await page.save();

        req.flash('success', req.__('PAGE_STATUS_UPDATED'));
        return res.redirect('/pages');
    }
}

module.exports = new PageController();