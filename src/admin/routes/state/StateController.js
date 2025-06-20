const {
    models: { State, Country }
} = require('../../../../lib/models');

const {showDate, showDateTimeZone} = require('../../../../lib/util');

require("dotenv").config();

const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;

class StateController {
    async listPage(req, res) {
        let countryList = await Country.find({
            isDeleted: false,
            isSuspended: false
        });

        return res.render('state/list', {
            countryList
        });
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

        if (reqData.countryId && reqData.countryId != '') {
            query.countryId = ObjectId(reqData.countryId)
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

        const count = await State.countDocuments(query);
        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        response.recordsTotal = count;
        response.recordsFiltered = count;
        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);
        let state = await State.find(query)
            .populate('countryId', 'name')
            .sort(sortCond)
            .skip(skip)
            .limit(limit);

        if (state) {
            state = state.map(rec => {
                let actions = '';
                actions = `<a href="/state/view/${rec._id}" title="View"><i class="fa fa-eye"></i> </a>`;
                actions = `${actions}<a href="/state/edit/${rec._id}" title="Edit"> <i class="fas fa-edit"></i> </a>`;
                actions = `${actions}<a href="/state/delete/${rec._id}" title="Remove" class="deleteItem"> <i class="fas fa-trash"></i> </a>`;
                if (rec.isSuspended) {
                    actions = `${actions}<a class="statusChange" href="/state/update-status?id=${rec._id}&status=false" title="Activate"> <i class="fa fa-check"></i> </a>`;
                }
                else {
                    actions = `${actions}<a class="statusChange" href="/state/update-status?id=${rec._id}&status=true" title="Inactivate"> <i class="fa fa-ban"></i> </a>`;
                }

                return {
                    0: (skip += 1),
                    1: rec.countryId.name || 'N/A',
                    2: rec.name || 'N/A',
                    3: rec.isSuspended ? `<span class="badge label-table badge-secondary">In-Active</span>` : `<span class="badge label-table badge-success">Active</span>`,
                    4: showDateTimeZone(rec.created, req.session.timeZone),
                    5: actions ? actions : '<span class="badge label-table badge-secondary">N/A</span>',
                };
            });
        }
        response.data = state;
        return res.send(response);
    }

    async view(req, res) {
        const rec = await State.findOne({
            _id: req.params.id,
            isDeleted: false,
        })
        .populate('countryId', 'name');

        if (!rec) {
            req.flash('error', req.__('STATE_NOT_EXIST'));
            return res.redirect('/state');
        }

        return res.render('state/view', {
            rec
        });
    }
    async editPage(req, res) {
        const rec = await State.findOne({
            _id: ObjectId(req.params.id),
        });

        if (!rec) {
            req.flash('error', req.__('STATE_NOT_EXIST'));
            return res.redirect('/state');
        }

        let countryList = await Country.find({
            isDeleted: false,
            isSuspended: false
        });

        return res.render('state/edit', {
            rec,
            countryList
        });
    }

    async edit(req, res) {
        const { countryId, name } = req.body;

        let chkCountry = await Country.findOne({
            _id: ObjectId(countryId),
            isDeleted: false
        });

        if(!chkCountry){
            req.flash('error', req.__('COUNTRY_NOT_EXIST'));
            return res.redirect('/state');
        }

        if(chkCountry.isSuspended){
            req.flash('error', req.__('SUSPENDED_COUNTRY'));
            return res.redirect('/state');
        }

        const rec = await State.findOne({
            _id: ObjectId(req.params.id),
        });
        if (!rec) {
            req.flash('error', req.__('STATE_NOT_EXIST'));
            return res.redirect('/state');
        }

        rec.name = name;
        rec.countryId = countryId;
        await rec.save();

        req.flash('success', req.__('STATE_UPDATED'));
        return res.redirect('/state');
    }

    async addPage(req, res) {
        let countryList = await Country.find({
            isDeleted: false,
            isSuspended: false
        });
        return res.render('state/add', {
            countryList
        });
    }

    async add(req, res) {
       
        let { countryId, name } = req.body;

        let chkCountry = await Country.findOne({
            _id: ObjectId(countryId),
            isDeleted: false
        });

        if(!chkCountry){
            req.flash('error', req.__('STATE_NOT_EXIST'));
            return res.redirect('/state');
        }

        if(chkCountry.isSuspended){
            req.flash('error', req.__('SUSPENDED_COUNTRY'));
            return res.redirect('/state');
        }
        
        const rec = await State.countDocuments({
            name,
            isDeleted: false,
        });

        if (rec) {
            req.flash('error', req.__('STATE_ALREADY_EXISTS'));
            return res.redirect('/state');
        }

        const recSave = new State({
            countryId,
            name
        });
        await recSave.save();

        req.flash('success', req.__('STATE_ADDED'));
        return res.redirect('/state');
    }
  
    async updateStatus(req, res) {
        const {id, status} = req.query;
        let rec = await State.findOne({
            _id: ObjectId(id),
            isDeleted: false,
        });

        if (!rec) {
            req.flash('error', req.__('STATE_NOT_EXIST'));
            return res.redirect('/state');
        }

        rec.isSuspended = status;
        await rec.save();

        req.flash('success', req.__('STATE_STATUS_UPDATED'));
        return res.redirect('/state');
    }

    async delete(req, res) {
        const rec = await State.findOne({
            _id: ObjectId(req.params.id),
            isDeleted: false
        });

        if (!rec) {
            req.flash('error', req.__('STATE_NOT_EXIST'));
            return res.redirect('/state');
        }

        rec.isDeleted = true;
        await rec.save();

        req.flash('success', req.__('STATE_DELETED'));
        return res.redirect('/state');
    }

    async isStateExists(req, res) {
      
        const { key, value, type, id } = req.body;

        const matchCond = {
            [key]: new RegExp(`^${value}$`, 'i'),
            isDeleted: false,
        };

        var count;

        if(type == 'edit')
        {
            console.log("edit");
            count =  await State.aggregate([
                { $match: {isDeleted: false,
                      _id: { $ne: ObjectId(id) },
                      [key] : new RegExp(`^${value}$`, 'i')
                     
                }}  
            ]);
        }
        else
        {
            count =  await State.aggregate([
                { $match: {isDeleted: false,
                    [key] : new RegExp(`^${value}$`, 'i')
                }}  
            ]);
        }
        // const count = await State.countDocuments(matchCond);
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

module.exports = new StateController();
