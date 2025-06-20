const defaultImgSize = 2097152;
const UploadConfig = Object.freeze({
    CAT_IMAGE: {
        MAX_SIZE: parseInt(process.env.maxCatImgSize || defaultImgSize),
        MAX_FILES: 1,
        LOCATION: 'categories/images',
        EXTENSION: 'jpg',
    },
});

module.exports = UploadConfig;