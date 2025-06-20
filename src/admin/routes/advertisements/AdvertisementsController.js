const {
    enums: { UploadConfig },
    models: { Speciality, Advertisement,State,Country, }
} = require('../../../../lib/models');

const {showDate, showDateTimeZone} = require('../../../../lib/util');

require("dotenv").config();
const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;

const advLimit = 50000000

class AdvertisementsController {
    async listPage(req, res) {
        return res.render('advertisements/list');
    }
    
    async list(req, res) {
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
                {advertiseName: searchValue},
                { adPlace: searchValue }
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

        const count = await Advertisement.countDocuments(query);
        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        response.recordsTotal = count;
        response.recordsFiltered = count;
        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);
        let advertise = await Advertisement.find(query)
            .sort(sortCond)
            .skip(skip)
            .limit(limit);

        if (advertise) {
            advertise = advertise.map(advert => {
                let actions = '';
                actions = `<a href="/advertisements/view/${advert._id}" title="View"><i class="fa fa-eye"></i> </a>`;
                actions = `${actions}<a href="/advertisements/edit/${advert._id}" title="Edit"> <i class="fas fa-edit"></i> </a>`;
                actions = `${actions}<a href="/advertisements/delete/${advert._id}" title="Remove" class="deleteItem"> <i class="fas fa-trash"></i> </a>`;
                if (advert.isSuspended) {
                    actions = `${actions}<a class="statusChange" href="/advertisements/update-status?id=${advert._id}&status=false" title="Activate"> <i class="fa fa-check"></i> </a>`;
                }
                else {
                    actions = `${actions}<a class="statusChange" href="/advertisements/update-status?id=${advert._id}&status=true" title="Inactivate"> <i class="fa fa-ban"></i> </a>`;
                }

                return {
                    0: (skip += 1),
                    1: advert.advertiseName || 'N/A',
                    2: advert.bannerImage ? `<img src="${process.env.AWS_S3_BASE+''+process.env.AWS_S3_LOCALPATH + advert.bannerImage}" width="80" height="80" />` : 'N/A',
                    3: advert.bannerUrl || 'N/A',
                    // 3: advert.adPlace || 'N/A',
                    4: advert.isSuspended ? `<span class="badge label-table badge-secondary">In-Active</span>` : `<span class="badge label-table badge-success">Active</span>`,
                    5: showDateTimeZone(advert.created, req.session.timeZone),
                    6: actions ? actions : '',
                };
            });
        }
        response.data = advertise;
        return res.send(response);
    }

    async view(req, res) {
        const advertise = await Advertisement.findOne({
            _id: req.params.id,
            isDeleted: false,
        });

        if (!advertise) {
            req.flash('error', req.__('ADVERTISEMENT_NOT_EXIST'));
            return res.redirect('/advertisements');
        }

        let prviewUrl = process.env.AWS_S3_BASE+''+process.env.AWS_S3_LOCALPATH

        return res.render('advertisements/view', {
            advertise,
            prviewUrl
        });
    }
    async editPage(req, res) {
        let specialities = await Speciality.find({
            isDeleted: false,
            isSuspended: false
        }).select("specialityName").lean()

        const countries = await Country.find({
            //countryId: ObjectId(countryId),
            isDeleted: false,
            isSuspended: false
        });

        let parents = req.params.id;
        const advertise = await Advertisement.findOne({
            _id: req.params.id,
        }).lean();
        //console.log({advertise})

        if (!advertise) {
            req.flash('error', req.__('ADVERTISEMENT_NOT_EXIST'));
            return res.redirect('/advertisements');
        }

        advertise.specialityIds = advertise.specialityIds.map(x=> x.toString())

        let prviewUrl = process.env.AWS_S3_BASE+''+process.env.AWS_S3_LOCALPATH

        return res.render('advertisements/edit', {
            countries,
            parents,
            advertise,
            prviewUrl,
            specialities
        });
    }

    async edit(req, res) {
        let { advertiseName, bannerUrl, adPlace, s3Image,description,countryId,specialityIds } = req.body;

        const advertiseFetch = await Advertisement.findOne({
            _id: req.params.id,
        });
        if (!advertiseFetch) {
            req.flash('error', req.__('ADVERTISEMENT_NOT_EXIST'));
            return res.redirect('/advertisements');
        }

        advertiseFetch.advertiseName = advertiseName;
        advertiseFetch.bannerImage = s3Image;
        advertiseFetch.bannerUrl = bannerUrl;
        advertiseFetch.description = description;
        advertiseFetch.countryId = countryId
        specialityIds && ( advertiseFetch.specialityIds = specialityIds )
            
        await advertiseFetch.save();

        req.flash('success', req.__('ADVERTISEMENT_UPDATED'));
        return res.redirect('/advertisements');
    }

    async addPage(req, res) {

        let specialities = await Speciality.find({
            isDeleted: false,
            isSuspended: false
        }).select("specialityName").lean()

        const countries = await Country.find({
            //countryId: ObjectId(countryId),
            isDeleted: false,
            isSuspended: false
        });


        let count = await Advertisement.countDocuments({isDeleted : false});

        if(count >= advLimit)
        {
            req.flash('error', req.__('Advertisement limit exceed'));
            return res.redirect('/advertisements');
        }

        return res.render('advertisements/add',{countries,specialities});
    }

    async add(req, res) {

        let { advertiseName, bannerUrl, adPlace, s3Image,description,countryId, specialityIds } = req.body;
        //console.log(req.body); return
        
        /*const advertisementsCount = await Advertisement.countDocuments({
            advertiseName,
            bannerUrl,
            // adPlace,
            isDeleted: false,
        });
        //advertiseFetch.description = description;
        if (advertisementsCount) {
            req.flash('error', req.__('ADVERTISEMENT_ALREADY_EXISTS'));
            return res.redirect('/advertisements');
        }

        let count = await Advertisement.countDocuments({isDeleted : false});

        if(count >= advLimit)
        {
            req.flash('error', req.__('Advertisement limit exceed'));
            return res.redirect('/advertisements');
        }*/

        const advSave = new Advertisement({
            advertiseName,
            bannerImage : s3Image,
            bannerUrl,
            description,
            countryId,
            specialityIds
        });
        await advSave.save();

        req.flash('success', req.__('ADVERTISEMENT_ADDED'));
        return res.redirect('/advertisements');
    }
  
    async updateStatus(req, res) {
        const {id, status} = req.query;
        let advertise = await Advertisement.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!advertise) {
            req.flash('error', req.__('ADVERTISEMENT_NOT_EXIST'));
            return res.redirect('/advertisements');
        }

        advertise.isSuspended = status;
        await advertise.save();

        req.flash('success', req.__('ADVERTISEMENT_STATUS_UPDATED'));
        return res.redirect('/advertisements');
    }

    async delete(req, res) {
        const advertise = await Advertisement.findOne({
            _id: req.params.id,
            isDeleted: false
        });

        if (!advertise) {
            req.flash('error', req.__('ADVERTISEMENT_NOT_EXIST'));
            return res.redirect('/advertisements');
        }

        advertise.isDeleted = true;
        await advertise.save();

        req.flash('success', req.__('ADVERTISEMENT_DELETED'));
        return res.redirect('/advertisements');
    }

    async isAdvertiseExists(req, res) {
      
        const { key, value, id, type } = req.body;

        const matchCond = {
            [key]: new RegExp(`^${value}$`, 'i'),
            isDeleted: false,
        };
        // id && (matchCond._id = {
        //     $ne: id,
        // });

        var count;

        if(type == 'edit')
        {
            count =  await Advertisement.aggregate([
                { $match: {isDeleted: false,
                      _id: { $ne: ObjectId(id) },
                      advertiseName : new RegExp(`^${value}$`, 'i')
                     
                }}  
            ]);
        }
        else
        {
            count =  await Advertisement.aggregate([
                { $match: {isDeleted: false,
                     advertiseName : new RegExp(`^${value}$`, 'i')
                }}  
            ]);
        }
    
           
        
        // const count = await Advertisement.countDocuments(matchCond);
        return res.send(count.length === 0);
    }

async uploadImage(req, res) {
    const { location, type, count = 1 } = req.query;
    console.log('----',req.query)
    const extensions = { IMAGE: 'jpg', 'DOCUMENT.PDF': 'pdf' };
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

module.exports = new AdvertisementsController();
