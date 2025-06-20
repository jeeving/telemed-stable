const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const getLanguage = req => req.session.lang || 'en';

const generateToken = payload => jwt.sign(payload, process.env.JWT_SECRET);

const getObjectId = id => ObjectId(id);

const isMaster = user => user.role === 'MASTER';

module.exports = {
    getLanguage,
    generateToken,
    getObjectId,
    isMaster,
};
