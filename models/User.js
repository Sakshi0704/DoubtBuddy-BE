const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'tutor'],
    default: 'student'
  },
  expertise: {
    type: [String],
    validate: {
      validator: function (v) {
        return this.role === 'student' || (this.role === 'tutor' && v.length > 0);
      },
      message: 'Tutors must have at least one area of expertise'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
},
  {
    versionKey: false,
  });

module.exports = mongoose.model('User', userSchema);
