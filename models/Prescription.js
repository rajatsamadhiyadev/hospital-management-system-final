const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true, default: '' },   // e.g. "500mg"
    frequency: { type: String, trim: true, default: '' },// e.g. "1-0-1 after food"
    duration: { type: String, trim: true, default: '' }, // e.g. "5 days"
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    patientName: { type: String, required: true, trim: true },
    patientEmail: { type: String, required: true, lowercase: true, trim: true, index: true },

    diagnosis: { type: String, required: true, trim: true },
    medicines: { type: [medicineSchema], default: [] },
    advice: { type: String, trim: true, default: '' },
    followUpDate: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);
