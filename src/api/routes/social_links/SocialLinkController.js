const {
    models: { SocialLinks },
} = require('../../../../lib/models');

class SocialLinkController {
    async getSocialLinks(req, res) {

        const socialLinks = await SocialLinks.find({isDeleted : false});

        if (!socialLinks && socialLinks.length == 0) {
            return res.warn({}, req.__('SPECIALITY_NOT_FOUND'));
        }

        // if (socialLinks.length == 0) {
        //     return res.notFound({}, req.__('SPECIALITY_NOT_FOUND'));
        // }

        return res.success(socialLinks, req.__('LINK_LIST'));
    }
}

module.exports = new SocialLinkController();
