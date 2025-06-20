const {
    models: { Page },
} = require('../../../../lib/models');

class PageController {
    async page(req, res) {
        const page = await Page.findOne({
            slug: req.params.slug,
            isSuspended: false
        });

        if (!page) {
            return res.warn({}, req.__('PAGE_NOT_EXISTS'));
        }

        return res.success(page, req.__('PAGE_FOUND'));
    }
}

module.exports = new PageController();
