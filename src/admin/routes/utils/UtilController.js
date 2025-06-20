const {
    enums: { UploadConfig }
} = require('../../../../lib/models');
const { upload, deleteObj } = require('../../../../lib/uploader');

class UtilController {
    async upload(req, res) {
        const { files } = req;
        const { type } = req.params;
        const maxFileSize = UploadConfig[type].MAX_SIZE;
        const dataFiles = [];
        for(let image in files){
            const img = files[image];
            if (img.size > maxFileSize) {
                return res.status(400).send(req.__('FILE_MAX_SIZE_ERR', maxFileSize/1024/1024))
            }
            dataFiles.push(img);
        }

        const imgUrl = upload(dataFiles, UploadConfig[type].LOCATION, UploadConfig[type].EXTENSION);
        if((!Array.isArray(imgUrl) && !!imgUrl) || (Array.isArray(imgUrl) && !!imgUrl.length)) {
            return res.success(imgUrl)
        }
        return res.forbidden();
    }

    async deleteFile(req, res) {
        const { key } = req.body;
        let fileType = key.split('.').filter(i => i);
        fileType = fileType[fileType.length - 1] === 'mp4' ? 'VIDEO' : 'IMAGE';
        const result = await deleteObj(key);
        if (!result) {
            return res.warn('', req.__(`${fileType}_DELETE_FAILED`));
        }
        return res.success('', req.__(`${fileType}_DELETE_SUCCESS`));
    }
}

module.exports = new UtilController();
