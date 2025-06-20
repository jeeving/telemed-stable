const { Joi, common, patterns } = require('../../util/validations');
const {
    enums: {},
} = require('../../../../lib/models');


const generateSignUrl = Joi.object().keys({
    file: Joi.string().required(),
    type: Joi.string().required(),
    key: Joi.string().required()
})

const listFeed = Joi.object().keys({
    page: Joi.number().optional().min(1),
    paginationLimit: Joi.number().optional().min(1)
})


const generateMultiSignUrl = Joi.object().keys({
    location: Joi.string()
        .trim()
        .required(),
    type: Joi.string()
        .valid('IMAGE', 'DOCUMENT.PDF', 'DOCUMENT.xls', 'DOCUMENT.docs', 'DOCUMENT.doc', 'DOCUMENT.ppt')
        .required(),
    count: Joi.string()
        .regex(patterns.number, 'numberPattern')
        .required(),
});

const id = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required()
    
});

const uploadFile = Joi.object().keys({
    location: Joi.string()
        .trim()
        .required(),
    type: Joi.string()
        .valid('image', 'pdf', 'word', 'xls', 'ppt')
        .required(),
});

const createFeed = Joi.object().keys({
    description: Joi.optional(),
    files: Joi.array().items(Joi.string().max(10)).max(10),
    feedType:Joi.string().allow("").optional()
});

const editFeed = Joi.object().keys({
    description: Joi.string().optional().max(10),
    tagUser: Joi.string().optional()
});

const report = Joi.object().keys({
    messege: Joi.string().optional()
});

const comment = Joi.object().keys({
    feedId: Joi.string().required(),
    comment: Joi.string().required(),
    tagUser : Joi.array().optional()
});

const feedId = Joi.object().keys({
    id: Joi.string().required(),
    type: Joi.string().required()  
});

const _id = Joi.object().keys({
    _id: Joi.string().optional()   
});


module.exports = {
    comment,
    id ,
    _id,
    feedId,
    uploadFile ,
    generateMultiSignUrl,
    generateSignUrl,
    createFeed,
    editFeed,
    report,
    listFeed

}; 
