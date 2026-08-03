const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Single user collection for all three roles.
 * role: doctor | receptionist | patient
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned unless explicitly asked for
    },
    role: {
      type: String,
      enum: ['doctor', 'receptionist', 'patient'],
      required: true,
      default: 'patient',
    },
    phone: { type: String, trim: true, default: '' },

    // ---- Doctor-only fields ----
    specialization: { type: String, trim: true, default: '' },
    fee: { type: Number, default: 0, min: 0 },

    // ---- Patient-only fields ----
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
    age: { type: Number, min: 0, max: 130, default: null },
    bloodGroup: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

/* -------- Hash password before saving (only when changed) -------- */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/* -------- Instance helper to verify a login attempt -------- */
userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
