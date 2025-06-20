const { ClientEncryption } = require('mongodb-client-encryption');
const { MongoClient, ObjectId } = require('mongodb');


const keyVaultDb = "medical-records";
const keyVaultCollection = "__keyVault";
const patientsCollection = "patients";
const keyVaultNamespace = `${keyVaultDb}.${keyVaultCollection}`;
const provider = "aws";
const kmsProvider = {
  aws: {
        accessKeyId: process.env.MONGO_ACCESS_KEY_ID,
        secretAccessKey: process.env.MONGO_SECRET_ACCESS_KEY
    }
};
const kmsKeyARn = process.env.KMS_KEY_ARN;
const altKeyName = "patient";

class MongoEncryption {
    constructor(connectionString) {
        this.connectionString = connectionString;
        this.csfleDatabaseConnection;
        this.encryption = '';
        return this.createKey();
    }

    async createKey() {
        const dbConnection = new MongoClient(this.connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        try {
        
            console.log("Connecting to database");
            await dbConnection.connect();
            const checkKeyExist = await dbConnection.db(keyVaultDb).collection(keyVaultCollection).findOne({keyAltNames: altKeyName});

            if (!checkKeyExist) {
                console.log("Creating key");
                const encryption = new ClientEncryption(dbConnection, {
                keyVaultNamespace: keyVaultNamespace,
                kmsProviders: kmsProvider,
                });
            
                const key = await encryption.createDataKey(provider, {
                    masterKey: {
                        key: kmsKeyARn,
                        region: kmsKeyARn.split(':')[3]
                    },
                    keyAltNames: [altKeyName]
                });
            
                //const base64DataKeyId = key.toString("base64");
                //console.log('DataKeyId [base64]: ', base64DataKeyId);
            }
        
        } finally {
            console.log('connection close');
            await dbConnection.close();
        }
        return this;
    }

    async makeConnection() {
        this.csfleDatabaseConnection = new MongoClient(this.connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            monitorCommands: true,
            autoEncryption: {
                keyVaultNamespace: keyVaultNamespace,
                kmsProviders: kmsProvider,
                bypassAutoEncryption: true,
            }
        });
        await this.csfleDatabaseConnection.connect()
        
        this.csfleDatabaseConnection.on('error', function (err) {
            console.error('[2]Mongoose default error: ' + err);
        });

        console.log('Creating encryption client')
        this.encryption = new ClientEncryption(this.csfleDatabaseConnection, {
            keyVaultNamespace: keyVaultNamespace,
            kmsProviders: kmsProvider,
        });

        await this.csfleDatabaseConnection.db(keyVaultDb).collection(patientsCollection).createIndex({appointmentId: -1});
        return this;
    }

    async encryptData(dataToEncrypt) {
        let encryptDataObj = {};
        for (const prop in dataToEncrypt) {
            const encryptedData = await this.encryption.encrypt(
                dataToEncrypt[prop],
                {
                    keyAltName: altKeyName,
                    algorithm: Array.isArray(dataToEncrypt[prop]) ? 'AEAD_AES_256_CBC_HMAC_SHA_512-Random' : 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic' 
                }
            )
            encryptDataObj[prop] = encryptedData;
        }
    
        return encryptDataObj;
    }

    async insertData(data) {
        const result = await this.csfleDatabaseConnection.db(keyVaultDb).collection(patientsCollection).insertOne(data);
        return result;
    }

    async getPatientData(query) {
        const result = await this.csfleDatabaseConnection.db(keyVaultDb).collection(patientsCollection).findOne(query);
        return result;
    }

    async getPatientCollection() {
        return this.csfleDatabaseConnection.db(keyVaultDb).collection(patientsCollection);
    }

    async updatePatientData(condition, updatedata) {
        await this.csfleDatabaseConnection.db(keyVaultDb).collection(patientsCollection).updateOne(condition, updatedata);
    }

    async finAndUpdate(condition, updatedata) {
        return await this.csfleDatabaseConnection.db(keyVaultDb).collection(patientsCollection).findOneAndUpdate(condition, updatedata, {returnNewDocument: true});
    }
}


module.exports = MongoEncryption;