const MongoEncryption = require('./MongoEncryption');
const { ObjectId } = require('mongodb');
const patientDBConnections = {};

const connectDBs = async () => {
    const patientDBList = process.env.PATIENT_MONGO_URI.split(",");
    for (const dburi of patientDBList) {
        const [country, uri] = dburi.split("####");
        let encryptionInstance = await new MongoEncryption(uri);
        await encryptionInstance.makeConnection();
        patientDBConnections[country] = encryptionInstance;
    }
}

module.exports = { 
    connectDBs, 
    patientDBConnections,
    mongoObjectId: ObjectId
}