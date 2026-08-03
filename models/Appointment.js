const mongoose = require('mongoose');

/**
 * An appointment booked by a receptionist (or a patient) for a doctor.
 * patientEmail is stored denormalised so a patient who registers later
 * still sees records that a receptionist created for them ("smart linking").
 */
const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    patientName: { type: String, required: true, trim: true },
    patientEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    patientPhone: { type: String, trim: true, default: '' },

    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    date: { type: Date, required: true },
    timeSlot: { type: String, required: true, trim: true }, // e.g. "10:30 AM"
    reason: { type: String, trim: true, default: '' },

    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled'],
      default: 'Scheduled',
      index: true,
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

appointmentSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
