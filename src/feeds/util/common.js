const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const getPlatform = req => req.headers['x-TeleMedicine-platform'];

const getLanguage = req => req.headers['accept-language'];

const generateToken = payload => jwt.sign(payload, process.env.JWT_SECRET);

const getObjectId = id => ObjectId(id);

const percentage = (percent, total) => {
  return Number(((percent / 100) * total).toFixed(2));
}


module.exports = {
  percentage,
  getPlatform,
  getLanguage,
  generateToken,
  getObjectId,
};
