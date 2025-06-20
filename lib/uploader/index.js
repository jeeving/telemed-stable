const fs = require('fs');
const AWS = require('aws-sdk');
const { logError, randomString } = require('../util');
const path = require('path');
const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY;
const region = process.env.AWS_S3_REGION;
const bucket = process.env.AWS_S3_BUCKET;
const awsConfig = {
    accessKeyId,
    secretAccessKey,
    region,
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    ACL: 'public-read',
};
const { exec } = require('child_process');
process.env.NODE_ENV === 'production' && ['accessKeyId','secretAccessKey'].forEach(i => delete awsConfig[i]);
AWS.config.update(awsConfig);
const s3 = new AWS.S3({
    sslEnabled: process.env.AWS_S3_SECURE === 'true'
});
const S3_BASE = `https://${bucket}.s3.${region}.amazonaws.com/`;

const getSignedUrl = (location, extension) =>{
    return new Promise((resolve, reject) => {
        const key = `${location}${randomString()}.${extension}`;
        s3.getSignedUrl(
            'putObject',
            {
                Bucket: process.env.AWS_S3_BUCKET,
                Key: key,
                ACL: 'public-read',
            },
            (err, data) => {console.log({err,data})
                if (err) {
                    console.log(err)
                    return reject(err)
                };
                resolve({
                    url: data,
                    preview: `${S3_BASE}${key}`,
                });
            }
        );
    });
}


const getReadSignedUrl = async (key) => {
    const expirationTime = 2 * 24 * 60 * 60;  // two day
    const params = {
        Bucket: process.env.AWS_S3_BUCKET, 
        Key: key,
        Expires: expirationTime
    };

    try {
        const url = await s3.getSignedUrlPromise('getObject', params);
        return url;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        throw error;
    }
};
    
    


const getDownloaddUrl = (location,fileName) =>
    new Promise((resolve, reject) => {
        const key = `${location}`;

        //let contentDisposition = 'attachment; filename=\"' + myPassedInKey + '\"';


        s3.getSignedUrl(
            'getObject',
            {
                Bucket: process.env.AWS_S3_BUCKET,
                Key: key,
                ResponseContentDisposition: `attachment; filename="${fileName}"`
            },
            (err, data) => {
                console.log({err,data})
                if (err) return reject(err);
                data = data.replace("http:/", "https:/");
                resolve({
                    url: data,
                    //preview: `${S3_BASE}${key}`,
                });
            }
        );
    });



const upload = (files, location, extension = 'jpg') => {
    const urlsArr = [];
    const onErr = err => {
        logError("Error in uploading file: ", err);
        return null;
    };
    files = !Array.isArray(files) ? [files] : files;
    for(let i = 0; i < files.length; i++){
        const file  = files[i];
        const fileUrl = `${location}/${randomString()}.${extension}`;

        fs.readFile(file.tempFilePath, (err, buffer) => {
            err && onErr(err);
            s3.putObject({
                Bucket: bucket,
                Key: fileUrl,
                Body: buffer,
                ACL: 'public-read'
            },  uploadErr => {
                uploadErr && onErr(uploadErr);
            });
        });
        urlsArr.push(fileUrl);
    }
    return urlsArr && urlsArr.length === 1 ? urlsArr[0] : urlsArr;
};

const deleteObj = Key => new Promise(resolve => {
    s3.deleteObject({
        Bucket: bucket,
        Key
    }, error => {
        if (error) {
            console.log("Error in uploading file: ", error);
            resolve(false);
        }
        resolve(true);
    });
});


const downloadFileFromS3 = async (s3Key, localFilePath) => {
    console.log({ s3Key, localFilePath })
    

    let fileName = s3Key
    fileName = fileName.split('/');
    console.log({ fileName })
    fileName = fileName[fileName.length - 1]
    console.log({ fileName })

    const params = {
        Bucket: bucket,
        Key: `voice-recordings/${fileName}`
    };

    return new Promise( (resolve,reject)=>{
        let file = require('fs').createWriteStream(path.join(localFilePath, fileName));
        s3.getObject(params).createReadStream().pipe(file).on('error', (err) => {
            console.error(`Error downloading file: ${err}`);
            //callback(err);
            reject(false)
        })
            .on('close', () => {
                console.log(`File downloaded to: ${localFilePath}`);
                //callback(null);
                resolve(fileName)
            });;
    })
}

const makeObjectPublicRead = async (objectKey)=> {
  try {
    const params = {
      Bucket: bucket,
      Key: objectKey,
      ACL: 'public-read',
    };

    await s3.putObjectAcl(params).promise();
    return

    console.log(`Object ${objectKey} in bucket ${bucketName} is now public-read.`);
  } catch (error) {
    console.error('Error making object public-read:', error);
  }
}


const uploadFromLocal = async( {key,localPath} )=>{
    console.log({key,localPath})
    const params = {
        Bucket: bucket,
        Key: key,
        Body: require('fs').createReadStream(localPath),
        ACL: 'public-read'
      };

      return new Promise( ( resolve,reject )=>{
        s3.upload(params, (err, data) => {
            if (err) {
              console.error('S3 upload error:', err);
              reject(err)
              //res.status(500).json({ error: 'S3 upload failed' });
            } else {
                console.log('S3 upload successful');
                resolve( true )
              
              
            }
          });
      })
      

}

const headS3Object = async ( file )=>{
    const params = {
        Bucket: bucket,
        Key: file
    };
    return new Promise( ( resolve,reject )=>{
        s3.headObject(params, (err, data) => {
            if (err) {
                resolve(false)
            } else {
                resolve(true)
            }
          });
    })
    
}

const _downloadFileFromS3 = async (s3Key, localFilePath, callback) => {
    console.log({ s3Key, localFilePath })
    const params = {
        Bucket: bucket,
        Key: s3Key
    };

    let fileName = s3Key
    fileName = fileName.split('/');
    console.log({ fileName })
    fileName = fileName[fileName.length - 1]

    let file = require('fs').createWriteStream(path.join(localFilePath, fileName));
    s3.getObject(params).createReadStream().pipe(file).on('error', (err) => {
        console.error(`Error downloading file: ${err}`);
        callback(err);
    })
        .on('close', () => {
            console.log(`File downloaded to: ${localFilePath}`);
            callback(null);
        });;

}


const fixFrameRate = async ( {localPath,fileName,newFileName} )=>{
    let input = path.join(localPath,fileName);
    let output = path.join(localPath,newFileName);

    console.log({
        input,output
    })

    let ffmpegCommand = `ffmpeg -i ${input} -r 30 ${output}`
    return new Promise( (resolve,reject)=>{
        exec(ffmpegCommand, (error) => {
            if(error){
                console.log("eeeee",error)
                resolve(false)
            }else{
                resolve(true)
            }
        })
    })
}


// s3.deleteObject({
//     Bucket: MY_BUCKET,
//     Key: 'some/subfolders/nameofthefile1.extension'
//   },function (err,data){})

module.exports = {
    getSignedUrl,
    upload,
    deleteObj,
    downloadFileFromS3,
    uploadFromLocal,
    getDownloaddUrl,
    headS3Object,
    fixFrameRate,
    makeObjectPublicRead,
    getReadSignedUrl
};