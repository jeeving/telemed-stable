const {
    models: { Page,Webinar }
} = require('../../../../lib/models');
const moment = require("moment")

class CmeController {
    async listPage(req, res) {
        return res.render('cmes/list');
    }

    async list(req, res,next) {
        try{
            let reqData = req.query;
            let columnNo = parseInt(reqData.order[0].column);
            let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
            let query = {
                "organizationId": {$exists: false},
                "paymentStatus" : "SUCCESS",
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

            const count = await Webinar.countDocuments(query);
            response.draw = 0;
            if (reqData.draw) {
                response.draw = parseInt(reqData.draw) + 1;
            }
            response.recordsTotal = count;
            response.recordsFiltered = count;
            let skip = parseInt(reqData.start);
            let limit = parseInt(reqData.length);
            let pages = await Webinar.find(query)
                .populate("userId","fullName")
                .sort(sortCond)
                .skip(skip)
                .limit(limit);

            //console.log({pages})

            if (pages.length) {
                pages = pages.map(page => {
                    let actions = '';
                    actions = `<a href="/cme/view/${page._id}" title="View"><i class="fa fa-eye"></i> </a>`;
                    //actions = `${actions}<a href="/pages/edit/${page._id}" title="Edit"> <i class="fas fa-edit"></i> </a>`;
                    // if (page.isSuspended) {
                    //     actions = `${actions}<a class="statusChange" href="/pages/update-status?id=${page._id}&status=false" title="Activate"> <i class="fa fa-check"></i> </a>`;
                    // }
                    // else {
                    //     actions = `${actions}<a class="statusChange" href="/pages/update-status?id=${page._id}&status=true" title="In-activate"> <i class="fa fa-ban"></i> </a>`;
                    // }
                    ///console.log("XXX",page.userId)
                    let cme = ``
                    if( page.recordingEnable ){
                        cme = `Yes`
                        if( !page.isCmeDelete ){
                            cme = `${cme} <a class="statusChange" href="/cme/update-recording?id=${page._id}&status=false" title="Delete"> <i class="fa fa-trash"></i> </a>`
                        }
                    }

                    return {
                        0: (skip += 1),
                        1: page.title,
                        2: page.userId.fullName,
                        3: page.dateWebinar+" "+ page.timeWebinar?.start  +" to "+ page.endDateWebinar+" "+ page.timeWebinar?.end ,
                        4: cme,
                        5: actions ? actions : '<span class="badge label-table badge-secondary">N/A</span>',
                    };
                });
            }
            response.data = pages;
            return res.send(response);
        }catch(err){

            console.log(err)
            return next(err)
        }
    }

    async view(req, res) {
        const page = await Webinar.findOne({
            _id: req.params.id,
        })
        .populate("userId","fullName")
        .populate("members.userId","fullName")
        .lean();

        //console.log( JSON.stringify(page) );

        let presenter = page.members.find( x=> x.isPresenter==true )
        
        let members = page.members.filter( x=> !x.isPresenter && !x.isHost )

        if (!page) {
            req.flash('error', req.__('PAGE_NOT_EXISTS'));
            return res.redirect('/cme');
        }

        let isOrganization = false
        if(page.organizationId){
            isOrganization = true
        }
        
        
        return res.render('cmes/view', {
            isOrganization,
            page,
            presenter,
            members,
            moment
        });
    }

    async updateRecording(req,res,next){
        try{
            let {
                id
            } = req.query;

            await Webinar.updateOne({
                _id: id
            },{
                $set: {
                    isCmeDelete: true
                }
            })
            
            req.flash('success', "Recording remove successfully");
            return res.redirect('/cme');
            
        }catch(err){
            console.log(err)
            return next(err)
        }
    }

    
}

module.exports = new CmeController();