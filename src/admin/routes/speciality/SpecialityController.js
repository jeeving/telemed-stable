const {
    models: { Speciality }
} = require('../../../../lib/models');

const {showDate, showDateTimeZone} = require('../../../../lib/util');

require("dotenv").config();

const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;

class SpecialityController {
    async listPage(req, res) {
        return res.render('specialities/list');
    }
    

    async list(req, res) {
        let reqData = req.query;
        let columnNo = parseInt(reqData.order[0].column);
        let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        let query = {
            isDeleted: false,
        };

        if (reqData.search.value) {
            let searchValue = new RegExp("\\b(" + reqData.search.value + ")\\b", "gi");
            query.$or = [
                {specialityName: searchValue},
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

        const count = await Speciality.countDocuments(query);
        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        response.recordsTotal = count;
        response.recordsFiltered = count;
        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);
        let specialities = await Speciality.find(query)
            .sort(sortCond)
            .skip(skip)
            .limit(limit);

        if (specialities) {
            specialities = specialities.map(speciality => {
                let actions = '';
                actions = `<a href="/speciality/view/${speciality._id}" title="View"><i class="fa fa-eye"></i> </a>`;
                actions = `${actions}<a href="/speciality/edit/${speciality._id}" title="Edit"> <i class="fas fa-edit"></i> </a>`;
                actions = `${actions}<a href="/speciality/delete/${speciality._id}" title="Remove" class="deleteItem"> <i class="fas fa-trash"></i> </a>`;
                if (speciality.isSuspended) {
                    actions = `${actions}<a class="statusChange" href="/speciality/update-status?id=${speciality._id}&status=false" title="Activate"> <i class="fa fa-check"></i> </a>`;
                }
                else {
                    actions = `${actions}<a class="statusChange" href="/speciality/update-status?id=${speciality._id}&status=true" title="Inactivate"> <i class="fa fa-ban"></i> </a>`;
                }

                return {
                    0: (skip += 1),
                    1: speciality.specialityName || 'N/A',
                    2: speciality.isSuspended ? `<span class="badge label-table badge-secondary">In-Active</span>` : `<span class="badge label-table badge-success">Active</span>`,
                    3: showDateTimeZone(speciality.created, req.session.timeZone),
                    4: actions ? actions : '<span class="badge label-table badge-secondary">N/A</span>',
                };
            });
        }
        response.data = specialities;
        return res.send(response);
    }

    async view(req, res) {
        const speciality = await Speciality.findOne({
            _id: req.params.id,
            isDeleted: false,
        });

        if (!speciality) {
            req.flash('error', req.__('SPECIALITY_NOT_EXIST'));
            return res.redirect('/speciality');
        }

        let prviewUrl = process.env.AWS_S3_BASE

        return res.render('specialities/view', {
            speciality,
            prviewUrl
        });
    }
    async editPage(req, res) {
        const speciality = await Speciality.findOne({
            _id: req.params.id,
        });

        if (!speciality) {
            req.flash('error', req.__('SPECIALITY_NOT_EXIST'));
            return res.redirect('/speciality');
        }

        let prviewUrl = process.env.AWS_S3_BASE

        return res.render('specialities/edit', {
            speciality,
            prviewUrl
        });
    }

    async edit(req, res) {
        const { speciality, s3Image } = req.body;
        const specialityFetch = await Speciality.findOne({
            _id: req.params.id,
        });
        if (!specialityFetch) {
            req.flash('error', req.__('SPECIALITY_NOT_EXIST'));
            return res.redirect('/speciality');
        }

        specialityFetch.specialityName = speciality;
        specialityFetch.specialityIcon = process.env.AWS_S3_SPECIALITY + s3Image;
        await specialityFetch.save();

        req.flash('success', req.__('SPECIALITY_UPDATED'));
        return res.redirect('/speciality');
    }

    async addPage(req, res) {
        return res.render('specialities/add');
    }

    async add(req, res) {
       
        let { speciality, s3Image } = req.body;
        
        const specialityCount = await Speciality.countDocuments({
            specialityName: speciality,
            isDeleted: false,
        });

        if (specialityCount) {
            req.flash('error', req.__('SPECIALITY_ALREADY_EXISTS'));
            return res.redirect('/speciality');
        }

        const specialitySave = new Speciality({
            specialityName: speciality,
            specialityIcon : process.env.AWS_S3_SPECIALITY + s3Image
        });
        await specialitySave.save();

        req.flash('success', req.__('SPECIALITY_ADDED'));
        return res.redirect('/speciality');
    }
  
    async updateStatus(req, res) {
        const {id, status} = req.query;
        let speciality = await Speciality.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!speciality) {
            req.flash('error', req.__('SPECIALITY_NOT_EXIST'));
            return res.redirect('/speciality');
        }

        speciality.isSuspended = status;
        await speciality.save();

        req.flash('success', req.__('SPECIALITY_STATUS_UPDATED'));
        return res.redirect('/speciality');
    }

    async delete(req, res) {
        const speciality = await Speciality.findOne({
            _id: req.params.id,
            isDeleted: false
        });

        if (!speciality) {
            req.flash('error', req.__('SPECIALITY_NOT_EXIST'));
            return res.redirect('/speciality');
        }

        speciality.isDeleted = true;
        await speciality.save();

        req.flash('success', req.__('SPECIALITY_DELETED'));
        return res.redirect('/speciality');
    }

    async isSpecialityExists(req, res) {
      
        const { key, value, type, id } = req.body;

        const matchCond = {
            [key]: new RegExp(`^${value}$`, 'i'),
            isDeleted: false,
        };

        var count;

        if(type == 'edit')
        {
            console.log("edit");
            count =  await Speciality.aggregate([
                { $match: {isDeleted: false,
                      _id: { $ne: ObjectId(id) },
                      [key] : new RegExp(`^${value}$`, 'i')
                     
                }}  
            ]);
        }
        else
        {
            count =  await Speciality.aggregate([
                { $match: {isDeleted: false,
                    [key] : new RegExp(`^${value}$`, 'i')
                }}  
            ]);
        }
        // const count = await Speciality.countDocuments(matchCond);
        return res.send(count.length === 0);
    }
   
    async uploadImage(req, res) {

        console.log("==================+++")
        const { location, type, count = 1 } = req.query;
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

module.exports = new SpecialityController();
