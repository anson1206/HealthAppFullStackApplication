const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  name: { type: String },
  age: { type: Number },
  weight: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
