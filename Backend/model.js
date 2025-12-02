const mongoose = require('mongoose');

const HealthRecordSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    metric: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('HealthRecord', HealthRecordSchema);