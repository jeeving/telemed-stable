const {
    models: { Country }
} = require('../../../../lib/models');

const {showDate, showDateTimeZone} = require('../../../../lib/util');

require("dotenv").config();

const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;

class CountryController {
    async listPage(req, res) {
        return res.render('country/list');
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
                {name: searchValue},
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

        const count = await Country.countDocuments(query);
        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        response.recordsTotal = count;
        response.recordsFiltered = count;
        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);
        let country = await Country.find(query)
            .sort(sortCond)
            .skip(skip)
            .limit(limit);

        if (country) {
            country = country.map(rec => {
                let actions = '';
                actions = `<a href="/country/view/${rec._id}" title="View"><i class="fa fa-eye"></i> </a>`;
                actions = `${actions}<a href="/country/edit/${rec._id}" title="Edit"> <i class="fas fa-edit"></i> </a>`;
                actions = `${actions}<a href="/country/delete/${rec._id}" title="Remove" class="deleteItem"> <i class="fas fa-trash"></i> </a>`;
                if (rec.isSuspended) {
                    actions = `${actions}<a class="statusChange" href="/country/update-status?id=${rec._id}&status=false" title="Activate"> <i class="fa fa-check"></i> </a>`;
                }
                else {
                    actions = `${actions}<a class="statusChange" href="/country/update-status?id=${rec._id}&status=true" title="Inactivate"> <i class="fa fa-ban"></i> </a>`;
                }

                return {
                    0: (skip += 1),
                    1: rec.name || 'N/A',
                    2: rec.isSuspended ? `<span class="badge label-table badge-secondary">In-Active</span>` : `<span class="badge label-table badge-success">Active</span>`,
                    3: showDateTimeZone(rec.created, req.session.timeZone),
                    4: actions ? actions : '<span class="badge label-table badge-secondary">N/A</span>',
                };
            });
        }
        response.data = country;
        return res.send(response);
    }

    async view(req, res) {
        const rec = await Country.findOne({
            _id: req.params.id,
            isDeleted: false,
        });

        if (!rec) {
            req.flash('error', req.__('COUNTRY_NOT_EXIST'));
            return res.redirect('/country');
        }

        return res.render('country/view', {
            rec
        });
    }
    async editPage(req, res) {
        const rec = await Country.findOne({
            _id: ObjectId(req.params.id),
        });
        
        if (!rec) {
            req.flash('error', req.__('COUNTRY_NOT_EXIST'));
            return res.redirect('/country');
        }

        return res.render('country/edit', {
            rec
        });
    }

    async edit(req, res) {
        const { name, currency } = req.body;
        const rec = await Country.findOne({
            _id: ObjectId(req.params.id),
        });
        if (!rec) {
            req.flash('error', req.__('COUNTRY_NOT_EXIST'));
            return res.redirect('/country');
        }

        rec.name = name;
        rec.currency = currency;
        await rec.save();

        req.flash('success', req.__('COUNTRY_UPDATED'));
        return res.redirect('/country');
    }

    async addPage(req, res) {
        return res.render('country/add');
    }

    async add(req, res) {
       
        let { name, currency} = req.body;
        
        const rec = await Country.countDocuments({
            name,
            isDeleted: false,
        });

        if (rec) {
            req.flash('error', req.__('COUNTRY_ALREADY_EXISTS'));
            return res.redirect('/country');
        }

        const recSave = new Country({
            name,
            currency
        });
        await recSave.save();

        req.flash('success', req.__('COUNTRY_ADDED'));
        return res.redirect('/country');
    }
  
    async updateStatus(req, res) {
        const {id, status} = req.query;
        let rec = await Country.findOne({
            _id: ObjectId(id),
            isDeleted: false,
        });

        if (!rec) {
            req.flash('error', req.__('COUNTRY_NOT_EXIST'));
            return res.redirect('/country');
        }

        rec.isSuspended = status;
        await rec.save();

        req.flash('success', req.__('COUNTRY_STATUS_UPDATED'));
        return res.redirect('/country');
    }

    async delete(req, res) {
        const rec = await Country.findOne({
            _id: ObjectId(req.params.id),
            isDeleted: false
        });

        if (!rec) {
            req.flash('error', req.__('COUNTRY_NOT_EXIST'));
            return res.redirect('/country');
        }

        rec.isDeleted = true;
        await rec.save();

        req.flash('success', req.__('COUNTRY_DELETED'));
        return res.redirect('/country');
    }

    async isCountryExists(req, res) {
      
        const { key, value, type, id } = req.body;

        const matchCond = {
            [key]: new RegExp(`^${value}$`, 'i'),
            isDeleted: false,
        };

        var count;

        if(type == 'edit')
        {
            console.log("edit");
            count =  await Country.aggregate([
                { $match: {isDeleted: false,
                      _id: { $ne: ObjectId(id) },
                      [key] : new RegExp(`^${value}$`, 'i')
                     
                }}  
            ]);
        }
        else
        {
            count =  await Country.aggregate([
                { $match: {isDeleted: false,
                    [key] : new RegExp(`^${value}$`, 'i')
                }}  
            ]);
        }
        // const count = await Country.countDocuments(matchCond);
        return res.send(count.length === 0);
    }
   
    // async uploadImage(req, res) {

    //     console.log("==================+++")
    //     const { location, type, count = 1 } = req.query;
    //         const extensions = { IMAGE: 'jpg', 'DOCUMENT.PDF': 'pdf' };
    //         const extension = extensions[type] || '';
    //         if (!extension) return res.warn('', req.__('INVALID_FILE_TYPE'));
    
    //         const uploader = require('../../../../lib/uploader');
    //         const promises = [];
    //         for (let i = 1; i <= count; i++) {
    //             promises.push(uploader.getSignedUrl(location.endsWith('/') ? location : `${location}/`, extension));
    //         }
            
    //         const urls = await Promise.all(promises);
    //         return res.success(urls);
    // }
}

module.exports = new CountryController();
