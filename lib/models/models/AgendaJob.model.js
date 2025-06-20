const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AgendaJobSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  data: {
    type: Schema.Types.Mixed,
  },
  priority: {
    type: String,
    default: 'normal'
  },
  nextRunAt: {
    type: Date
  },
  lastRunAt: {
    type: Date
  },
  lockedAt: {
    type: Date
  },
  repeatInterval: {
    type: String
  },
  repeatTimezone: {
    type: String
  },
  repeatAt: {
    type: String
  },
  failReason: {
    type: String
  },
  failCount: {
    type: Number
  },
  status: {
    type: String,
    default: 'created'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AgendaJob', AgendaJobSchema,"agendaJobs");
