const {
    models: { Blog,Page }
} = require('../../../../lib/models');
const { randomString } = require('../../../../lib/util');
const moment = require("moment")

class BlogController {

    async addPage(req,res,next){
        try{
            return res.render('blogs/add');
        }catch(err){
            console.log(err)
            return next(err)
        }
    }

    async add(req,res,next){
        try{
            let {
                title,
                description,
                sImage1,
                sImage2,
                video,
            } = req.body;

            const added = moment().utc().unix()
            const slug = await generateSlug({title})

            await Blog.create({
                title,
                description,
                image1:sImage1,
                image2:sImage2||"",
                video,
                added,
                slug
            })

            req.flash('success', "Blog added successfully");
            res.redirect('/blogs')
            
        }catch(err){
            console.log(err)
            return next(err)
        }
    }

    async listPage(req, res) {
        return res.render('blogs/list');
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
                }else {
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

    async view(req, res) {
        const page = await Page.findOne({
            _id: req.params.id,
        });

        if (!blog) {
            req.flash('error', "Blog not exists");
            return res.redirect('/blogs');
        }

        return res.render('pages/view', {
            page,
        });
    }

    async editPage(req, res) {
        const blog = await Blog.findOne({
            _id: req.params.id,
        });

        if (!blog) {
            req.flash('error', "Blog not exists");
            return res.redirect('/blogs');
        }

        return res.render('blogs/edit', {
            blog,
        });
    }

    async edit(req, res) {
        let {
            title,
            description,
            sImage1,
            sImage2,
            video,
        } = req.body;

        const blog = await Blog.findOne({
            _id: req.params.id,
        });

        if (!blog) {
            req.flash('error', "Blog not exists");
            return res.redirect('/blogs');
        }

        const slug = await generateSlug({title,"blogId": blog._id})

        await Blog.updateOne({
            _id: blog._id
        },{
            $set: {
                title,
                description,
                image1:sImage1,
                image2:sImage2||"",
                video,
                slug
            }
        })
        
        req.flash('success', "Blog update successfully");
        //return res.redirect('/blogs');
        return res.redirect(req.headers['referer']);
    }

    async updateStatus(req, res) {
        const { id, status } = req.query;
        let blog = await Blog.findOne({
            _id: id,
        });

        if (!blog) {
            req.flash('error', "Blog not exists");
            return res.redirect('/blogs');
        }

        blog.isSuspended = status;
        await blog.save();

        req.flash('success', "Blog status updated successfully");
        return res.redirect('/blogs');
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

    async delete(req, res) {
        const blog = await Blog.findOne({
            _id: req.params.id,
            isDeleted: false
        });

        if (!blog) {
            req.flash('error', "Blog not exists");
            return res.redirect('/blogs');
        }

        blog.isDeleted = true;
        blog.isSuspended = true;
        await blog.save();

        req.flash('success', "Blog deleted successfully");
        return res.redirect('/blogs');
    }
}


async function generateSlug( { title, number, blogId } ){
    if( !number ){
        number = 0;
    }
    let slug = slugify(title);
    if( number!=0 ){
        slug = `${slug}-${number}`
    } 

    let qry = {
        slug,
        isDeleted: false,
    }
    if( blogId ){
        qry = {
            ...qry,
            _id: { $ne: blogId }
        }
    }

    let blog = await Blog.findOne(qry).lean()

    if( blog?._id){
        number = randomString(5,'1234567890')
        return slug+'-'+number
        //return await generateSlug({title,number,blogId})
    }else{
        return slug
    }
}

function slugify(text, separator = "-") {
    text = text.toLowerCase();
    text = text.replace(/[^a-z0-9-]+/g, " ");
    text = text.replace(/ /g, separator);
    return text;
}

module.exports = new BlogController();