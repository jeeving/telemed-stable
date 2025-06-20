const {
    models: { Feed }
} = require('../../../../lib/models');
const {  showDateOnly, utcDate, utcDateTime } = require('../../../../lib/util');
const { showDate, showDateAccordingTimezone, showDateTimeZone } = require('../../../../lib/util');
const mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;

class ReportController {
    async listPage(req, res) {
        return res.render('report/list');
    }

    async list(req, res) {
        let reqData = req.query;
        let columnNo = parseInt(reqData.order[0].column);
        let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        let query = {
            "organizationId": {$exists: false},
            isDeleted : false,
            flag : {$size:1}
        }

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

        let sortCond = { _id: -1 };
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

        const count = await Feed.countDocuments(query);
        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        
        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);
        let report = await Feed.aggregate([
            {
                $match : {
                    isDeleted : false,
                    "organizationId": {$exists: false},
                }
            },
              {
                '$lookup': {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind : "$user"
            },
             {
                $project : {
                        fullName : "$user.fullName",
                        feedType : 1,
                        files : 1,
                        description : 1,
                        discription : 1,
                        totalLikes : 1,
                        isSuspended : 1,
                        isStatus : 1,
                        created : 1,
                        flag : 1,
                        flags : {
                            $size : "$flag"
                        }
                }
            },
            {
                $match : {
                    flags : {
                        $gte : 1
                    }
                }
            }
           
        ])
        .sort(sortCond)
        .skip(skip)
        .limit(limit);
        response.recordsTotal = report.length;
        response.recordsFiltered = report.length;

        let fileShow = `https://docs.google.com/gview?url=`
        let fileShow2 = `&embedded=true`

        if (report.length > 0) {
            report = report.map(report => {
                let description = '';
                let filecontent = '';
                let actions = '';
                actions = `<a href="/report/view/${report._id}" title="views"><i class="fa fa-eye"></i> </a>`;
                actions = `${actions}<a href="/report/delete/${report._id}" title="Delete" class="deleteItem"><i class="fa fa-trash"></i></a>`;
                //let img = report.files.map((item)=>{ return `${process.env.MEDIA_DISPLAY_PATH}${item}`});

                description = report.description.substr(0, 20)
                if(report.feedType === ''){
                    filecontent = 'No file'
                }
                if(report.feedType != 'image' && report.feedType != ''){
                    filecontent = `<a href="${fileShow}${process.env.AWS_S3_BASE + report.files[0]}${fileShow2}" target="_blank" title="View" class="text-primary"> <i class="fas fa-eye"></i> </a>`;
                }
                if(report.feedType == 'image' && report.feedType != ''){
                    filecontent = `<img src='${process.env.AWS_S3_BASE + report.files[0]}' alt="Image" style="height: 25px; width: 30px; cursor: pointer;" data-toggle="modal" data-target="#ImgModal" onclick="javascript: setImg('${process.env.AWS_S3_BASE + report.files[0]}');" />`;
                }
                return {
                    0: (skip += 1),
                    1: filecontent,
                    2: report.feedType || 'N/A',
                    3: report.description ? description : 'N/A',
                    4: report.fullName || 'N/A',
                    5: report.flags +' users' || 'N/A',
                    6: report.isSuspended ? '<span class="badge label-table badge-secondary">In-active</span>' : '<span class="badge label-table badge-success">Active</span>',
                    7: report.created ? showDateAccordingTimezone(report.created) : 'N/A',
                    8: actions ? actions : '<span class="badge label-table badge-secondary">N/A</span>',
                };
            });
        }

        response.data = report;
        return res.send(response);
    }

    async delete(req, res) {
        let reqId = req.params.id;
       
        const feed = await Feed.findOne({
            _id: ObjectId(reqId),
            isDeleted: false
        });
        if (!feed) {
            req.flash('error', req.__('Feed not found'));
            return res.redirect('report/list');
        }
        
        feed.isDeleted = true;
        await feed.save();
        req.flash('success', req.__('Feed Deleted.'));
        return res.render('report/list');
    }

    async viewPage(req, res) {
        let id = req.params.id;
        return res.render('report/view', {id});
    }

    async view(req, res, next) {
        try{
            let {id} = req.params;
            
            let reqData = req.query;
            let query = {};
            let columnNo = parseInt(reqData.order[0].column);
        
            let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        
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
            
            response.draw = 0;
            if (reqData.draw) {
                response.draw = parseInt(reqData.draw) + 1;
            }
            
            let skip = parseInt(reqData.start);
            let limit = parseInt(reqData.length);

            
            console.log('report q2==>>');
            let reports = await Feed.aggregate([
                {
                    $match : {
                        _id : ObjectId(id),
                        isDeleted : false,
                    }
                },
                {
                    $unwind : "$flag"
                },
                {
                    '$lookup': {
                        from: 'users',
                        localField: 'flag.userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $unwind : "$user"
                },
                {
                    $project : {
                        totalLikes : 1,
                        reportid : "$flag._id",
                        reseon : "$flag.reason",
                        timestamp : "$flag.timestamp",
                        name : "$user.fullName",
                        created : 1
                    }
                }  
            ])
            .sort(sortCond)
            .skip(skip)
            .limit(limit);
            console.log('report==>>', reports.length);
            response.recordsTotal = reports.length;
            response.recordsFiltered = reports.length;
            let actions = '';
            
            if (reports.length > 0) {
                reports = reports.map(reports => {
                    let description = reports.reseon.substr(0, 20)
                    let d = new Date(reports.timestamp) ;
                    actions = `<a href="/report/view-report/${reports.reportid}" title="views"><i class="fa fa-eye"></i> </a>`;
                    return {
                        0: (skip += 1),
                        1: reports.reseon ? `<p title="${reports.reseon}">${description}</p>` : 'N/A',
                        2: reports.name ? reports.name : 'N/A',
                        3: reports.created ? showDateAccordingTimezone(reports.created) : 'N/A',
                        4: reports.timestamp ? showDateAccordingTimezone(reports.timestamp) : 'N/A',
                        5: actions ? actions : '<span class="badge label-table badge-secondary">N/A</span>',
                    };
                });
            }
            response.data = reports;
            return res.send(response);
        }catch(err){
            console.log(err)
            return next(err)
        }
    }

    async viewReportPage(req, res) {
        let id = req.params.id;
        let reports = await Feed.aggregate([
            
            {
                 $unwind : "$flag"
             },
             {
                 '$lookup': {
                     from: 'users',
                     localField: 'flag.userId',
                     foreignField: '_id',
                     as: 'user'
                 }
             },
             {
                 $unwind : "$user"
             },
             {
                 $project : {
                     totalLikes : 1,
                     reportid : "$flag._id",
                     reseon : "$flag.reason",
                     timestamp : "$flag.timestamp",
                     name : "$user.fullName",
                     created : 1
                 }
             } ,
             {
              $match : {
                  "reportid" : ObjectId(id)
                  }   
              }
         ])
        return res.render('report/view-report', {reports});
    }
}

module.exports = new ReportController();