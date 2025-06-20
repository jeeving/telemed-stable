class UtilController {
    async uploadFile(req, res) {
        try{
            const { location, type, count = 1 } = req.query;
            const extensions = { IMAGE: 'jpg', 'DOCUMENT.PDF': 'pdf', 'DOCUMENT.WORD': 'word', 'DOCUMENT.DOCX': 'docx','DOCUMENT.DOC': 'doc', 'DOCUMENT.DOCS': 'docs', 'DOCUMENT.PPT': 'ppt', 'DOCUMENT.XLS': 'xls', 'AUDIO':'m4a', 'DOCUMENT.TXT': 'txt','DOCUMENT.PPTX': 'pptx' };
            console.log('extensions==>>',extensions);
            const extension = extensions[type] || '';
            if (!extension) return res.warn('', req.__('INVALID_FILE_TYPE'));

            const uploader = require('../../../../lib/uploader');
            const promises = [];
            for (let i = 1; i <= count; i++) {console.log('xxxxxx')
                promises.push(uploader.getSignedUrl(location.endsWith('/') ? location : `${location}/`, extension));
            }

            const urls = await Promise.all(promises);
            console.dir(urls,{depth:5})

            if( urls.length>0 ){
                urls.forEach( x=>{
                    x.url = x.url.replace("http://", "https://");
                })

            }

            return res.success(urls);
        }catch(err){
            console.log("err",err)
        }
        
    }
}

module.exports = new UtilController();
