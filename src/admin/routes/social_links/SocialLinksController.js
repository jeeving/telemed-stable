const {
    models: { SocialLinks }
} = require('../../../../lib/models');

const {showDate, showDateTimeZone} = require('../../../../lib/util');

require("dotenv").config();

const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;

class SocialLinksController {
    async listPage(req, res) {
        return res.render('social_links/list');
    }    

    async list(req, res) {
        console.log("------------>",req.query)
        let reqData = req.query;
        let columnNo = parseInt(reqData.order[0].column);
        let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        let query = {
            isDeleted: false,
        };

        if (reqData.search.value) {
            const searchValue = new RegExp(
                reqData.search.value
                    .split(' ')
                    .filter(val => val)
                    .map(value => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
                    .join('|'),
                'i'
            );

            query.$or = [
                {socialName: searchValue},
            ];
        }

        let sortCond = {created: sortOrder};
        let response = {};
        switch (columnNo) {
            case 1:
                sortCond = {
                    name: sortOrder,
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

        const count = await SocialLinks.count(query);
        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        response.recordsTotal = count;
        response.recordsFiltered = count;
        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);
        let linkData = await SocialLinks.find(query)
            .sort(sortCond)
            .skip(skip)
            .limit(limit);

        if (linkData) {
            linkData = linkData.map(link => {
                let actions = '';
                actions = `<a href="/social_links/view/${link._id}" title="View"><i class="fa fa-eye"></i> </a>`;
                actions = `${actions}<a href="/social_links/edit/${link._id}" title="Edit"> <i class="fas fa-edit"></i> </a>`;
                actions = `${actions}<a href="/social_links/delete/${link._id}" title="Remove" class="deleteItem"> <i class="fas fa-trash"></i> </a>`;
                // if (link.isSuspended) {
                //     actions = `${actions}<a class="statusChange" href="/social_links/update-status?id=${link._id}&status=false" title="Activate"> <i class="fa fa-check"></i> </a>`;
                // }
                // else {
                //     actions = `${actions}<a class="statusChange" href="/social_links/update-status?id=${link._id}&status=true" title="Inactivate"> <i class="fa fa-ban"></i> </a>`;
                // }

                return {
                    0: (skip += 1),
                    1: link.socialName || 'N/A',
                    2: link.linkUrl || 'N/A',
                    3: showDateTimeZone(link.created, req.session.timeZone),
                    4: actions ? actions : '<span class="badge label-table badge-secondary">N/A</span>',
                };
            });
        }
        response.data = linkData;
        return res.send(response);
    }

    async view(req, res) {
        const link = await SocialLinks.findOne({
            _id: req.params.id,
            isDeleted: false,
        });

        if (!link) {
            req.flash('error', req.__('LINK_NOT_EXIST'));
            return res.redirect('/social_links');
        }

        let prviewUrl = process.env.AWS_S3_BASE

        return res.render('social_links/view', {
            link,
            prviewUrl
        });
    }
    async editPage(req, res) {
        const link = await SocialLinks.findOne({
            _id: req.params.id,
            isDeleted: false,
        });

        if (!link) {
            req.flash('error', req.__('LINK_NOT_EXIST'));
            return res.redirect('/social_links');
        }

        let prviewUrl = process.env.AWS_S3_BASE

        return res.render('social_links/edit', {
            prviewUrl,
            link
        });
    }

    async edit(req, res) {
        let { socialName, linkUrl, socialIcon, s3Image } = req.body;

       const linkFetch = await SocialLinks.findOne({
            _id: req.params.id
        });
        if (!linkFetch) {
            req.flash('error', req.__('LINK_NOT_EXIST'));
            return res.redirect('/social_links');
        }

        linkFetch.socialName = socialName;
        linkFetch.linkUrl = linkUrl;
        linkFetch.socialIcon = '/socialIcons/'+s3Image
        await linkFetch.save();

        req.flash('success', req.__('LINK_UPDATED'));
        return res.redirect('/social_links');
    }

    async addPage(req, res) {
        return res.render('social_links/add');
    }

    async add(req, res) {
       
        let { socialName, linkUrl, socialIcon, s3Image } = req.body;
        
        const linkSave = new SocialLinks({
            socialName,
            linkUrl,
            socialIcon : '/socialIcons/'+s3Image
        });

        await linkSave.save();

        req.flash('success', req.__('LINK_ADDED'));
        return res.redirect('/social_links');
    }
  
    // async updateStatus(req, res) {
    //     const {id, status} = req.query;
    //     let speciality = await Speciality.findOne({
    //         _id: id,
    //         isDeleted: false,
    //     });

    //     if (!speciality) {
    //         req.flash('error', req.__('SPECIALITY_NOT_EXIST'));
    //         return res.redirect('/speciality');
    //     }

    //     speciality.isSuspended = status;
    //     await speciality.save();

    //     req.flash('success', req.__('SPECIALITY_STATUS_UPDATED'));
    //     return res.redirect('/speciality');
    // }

    async delete(req, res) {
        const link = await SocialLinks.findOne({
            _id: req.params.id,
            isDeleted: false,
        });

        if (!link) {
            req.flash('error', req.__('LINK_NOT_EXIST'));
            return res.redirect('/social_links');
        }

        link.isDeleted = true;
        await link.save();

        req.flash('success', req.__('LINK_DELETED'));
        return res.redirect('/social_links');
    }

    async isLinkExists(req, res) {
      
        const { key, value, type, id } = req.body;

        const matchCond = {
            [key]: new RegExp(`^${value}$`, 'i'),
            isDeleted: false,
        };

        var count;

        if(type == 'edit')
        {
            console.log("edit");
            count =  await SocialLinks.aggregate([
                { $match: {isDeleted: false,
                      _id: { $ne: ObjectId(id) },
                      [key] : new RegExp(`^${value}$`, 'i')
                     
                }}  
            ]);
        }
        else
        {
            count =  await SocialLinks.aggregate([
                { $match: {isDeleted: false,
                    [key] : new RegExp(`^${value}$`, 'i')
                }}  
            ]);
        }
    
        return res.send(count.length === 0);
    }

    async uploadImage(req, res) {
        const { location, type, count = 1 } = req.query;
            const extensions = { IMAGE: 'jpg', IMAGE: 'svg', 'DOCUMENT.PDF': 'pdf' };
            const extension = extensions[type] || '';
            if (!extension) return res.warn('', req.__('INVALID_FILE_TYPE'));
    
            const uploader = require('../../../../lib/uploader');
            const promises = [];
            for (let i = 1; i <= count; i++) {
                promises.push(uploader.getSignedUrl(location.endsWith('/') ? location : `${location}/`, extension));
            }
            
            const urls = await Promise.all(promises);
            return res.success(urls);
    }
   
}

module.exports = new SocialLinksController();
