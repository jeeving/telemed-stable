const {
    models: { Banner }
} = require('../../../../lib/models');


class BannerController {
    async listPage(req, res) {
        const banner = await Banner.findOne({
            isDeleted: false
        }).sort({ _id: -1 });

        let previewUrl = process.env.AWS_S3_BASE

        let bannerId = ""
        if( banner?._id ){
            bannerId = banner._id
        }

        return res.render('banner/edit', {
            bannerId,
            banner,
            previewUrl
        });
    }


    async uploadImage(req, res) {
        const { location, type, count = 1 } = req.query;
        const extensions = { "JPEG": "jpeg", "GIF": 'gif', "JPG": "jpg" };
        const extension = extensions[type] || '';
        if (!extension) return res.warn('', req.__('INVALID_ONLY_JPG_GIF'));

        const uploader = require('../../../../lib/uploader');
        const promises = [];
        for (let i = 1; i <= count; i++) {
            promises.push(uploader.getSignedUrl(location.endsWith('/') ? location : `${location}/`, extension));
        }

        const urls = await Promise.all(promises);
        return res.success(urls);
    }

    async updateBanner( req,res ){
        try{
            let {
                location,
                result
            } = req.body;
            console.log(req.body)
            let currentBanner = await Banner.findOne({isDeleted: false}).lean()
            console.log({currentBanner})

            let image = `${location}${result}`
            if( currentBanner?._id ){
                await Banner.updateOne({
                    _id: currentBanner._id
                },{
                    $set: {
                        image
                    }
                })
            }else{
                await Banner.create({
                        image
                })
            }
            
            req.flash("success", "Banner upload successfully" );
            return res.success({});
        }catch( err ){
            return res.warn({});
        }
    }

    async deleteBanner( req,res,next ){
        try{
            let {
                bannerId,
            } = req.body;

            await Banner.updateOne({
                _id: bannerId
            },{
                $set: {
                    isDeleted: true
                }
            })
            req.flash("success", "Banner deleted successfully" );
            return res.success({});
        }catch( err ){
            return res.warn({});
        }
    }
}

module.exports = new BannerController();