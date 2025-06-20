const {
    models: { Documents }
} = require('../../../../lib/models');
const { randomString } = require('../../../../lib/util');
const moment = require("moment")

class DocumentController {

    async addPage(req, res, next) {
        try {
            return res.render('documents/add');
        } catch (err) {
            console.log(err)
            return next(err)
        }
    }

    async add(req, res, next) {
        try {
            let {
                title,
                sImage1,
            } = req.body;

            await Documents.create({
                title,
                path: sImage1,
                organizationId: req.user._id
            })

            req.flash('success', "Document added successfully");
            res.redirect('/documents')

        } catch (err) {
            console.log(err)
            return next(err)
        }
    }

    async listPage(req, res) {
        let documents = await Documents.find({
            isDeleted: false,
            organizationId: req.user._id,
        })
            .sort({
                _id: -1
            })
            .lean()
        let s3Path = process.env.AWS_S3_BASE
        return res.render('documents/list', { documents, s3Path });
    }

    async list(req, res) {
        let reqData = req.query;
        let columnNo = parseInt(reqData.order[0].column);
        let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        let query = {
            isDeleted: false
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

        const count = await Blog.countDocuments(query);
        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        response.recordsTotal = count;
        response.recordsFiltered = count;
        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);
        let blogs = await Blog.find(query)
            .sort(sortCond)
            .skip(skip)
            .limit(limit);

        if (blogs.length) {
            blogs = blogs.map(blog => {
                let actions = '';
                //actions = `<a href="/blogs/view/${blog._id}" title="View"><i class="fa fa-eye"></i> </a>`;
                actions = `${actions}<a href="/blogs/edit/${blog._id}" title="Edit"> <i class="fas fa-edit"></i> </a>`;
                if (blog.isSuspended) {
                    actions = `${actions}<a class="statusChange" href="/blogs/update-status?id=${blog._id}&status=false" title="Activate"> <i class="fa fa-check"></i> </a>`;
                } else {
                    actions = `${actions}<a class="statusChange" href="/blogs/update-status?id=${blog._id}&status=true" title="In-activate"> <i class="fa fa-ban"></i> </a>`;
                }

                actions = `${actions}<a href="/blogs/delete/${blog._id}" title="Remove" class="deleteItem"> <i class="fas fa-trash"></i> </a>`;

                return {
                    0: (skip += 1),
                    1: blog.title,
                    2: blog.isSuspended ? '<span class="badge label-table badge-secondary">In-active</span>' : '<span class="badge label-table badge-success">Active</span>',
                    3: actions ? actions : '<span class="badge label-table badge-secondary">N/A</span>',
                };
            });
        }
        response.data = blogs;
        return res.send(response);
    }



    async uploadImage(req, res) {
        const { location, type, count = 1 } = req.query;
        console.log('----', req.query)
        const extensions = {
            "jpg": "jpg",
            "jpeg": "jpeg",
            "png": "png",
            "gif": "gif",
            "bmp": "bmp",
            "tiff": "tiff",
            "tif": "tif",
            "svg": "svg",
            "xlsx": "xlsx",
            "xls": "xls",
            "xlsm": "xlsm",
            "xlsb": "xlsb",
            "xlt": "xlt",
            "xltm": "xltm",
            "xlam": "xlam",
            "docx": "docx",
            "doc": "doc",
            "docm": "docm",
            "dotx": "dotx",
            "dot": "dot",
            "dotm": "dotm",
            "wll": "wll",
            "pdf": "pdf"
        };
        const extension = extensions[type] || '';
        //if (!extension) return res.warn('', req.__('INVALID_FILE_TYPE'));
        if (!type) return res.warn('', req.__('INVALID_FILE_TYPE'));

        const uploader = require('../../../../lib/uploader');
        const promises = [];
        for (let i = 1; i <= count; i++) {
            promises.push(uploader.getSignedUrl(location.endsWith('/') ? location : `${location}/`, extension));
        }

        const urls = await Promise.all(promises);
        return res.success(urls);
    }

    async delete(req, res) {
        const blog = await Documents.findOne({
            _id: req.params.id,
            organizationId: req.user._id,
            isDeleted: false
        });

        if (!blog) {
            req.flash('error', "Document not exists");
            return res.redirect('/documents');
        }

        blog.isDeleted = true;
        blog.isSuspended = true;
        await blog.save();

        req.flash('success', "Documents deleted successfully");
        return res.redirect('/documents');
    }
}




module.exports = new DocumentController();