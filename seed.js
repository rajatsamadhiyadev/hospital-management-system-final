/**
 * Seed script — creates demo doctors, a receptionist, patients,
 * appointments and prescriptions so the app is instantly demo-ready.
 *
 *   npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Appointment = require('./models/Appointment');
const Prescription = require('./models/Prescription');

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
};

(async () => {
  await connectDB();

  console.log('[seed] Clearing old demo data...');
  await Promise.all([
    User.deleteMany({}),
    Appointment.deleteMany({}),
    Prescription.deleteMany({}),
  ]);

  console.log('[seed] Creating users...');

  // NOTE: User.create() triggers the pre-save hook so passwords get hashed.
  const [drSharma, drVerma, drKhan] = await Promise.all([
    User.create({ name: 'Anjali Sharma', email: 'doctor@hms.com', password: '123456', role: 'doctor', specialization: 'Cardiologist', fee: 800, phone: '9876543210' }),
    User.create({ name: 'Rahul Verma', email: 'rahul@hms.com', password: '123456', role: 'doctor', specialization: 'Dermatologist', fee: 600, phone: '9876543211' }),
    User.create({ name: 'Sana Khan', email: 'sana@hms.com', password: '123456', role: 'doctor', specialization: 'Pediatrician', fee: 500, phone: '9876543212' }),
  ]);

  const reception = await User.create({
    name: 'Priya Nair', email: 'reception@hms.com', password: '123456', role: 'receptionist', phone: '9876500000',
  });

  const [amit, neha] = await Promise.all([
    User.create({ name: 'Amit Kumar', email: 'patient@hms.com', password: '123456', role: 'patient', phone: '9812345678', gender: 'Male', age: 32, bloodGroup: 'O+', address: 'C-14, Malviya Nagar, Jaipur' }),
    User.create({ name: 'Neha Gupta', email: 'neha@hms.com', password: '123456', role: 'patient', phone: '9812345679', gender: 'Female', age: 27, bloodGroup: 'B+', address: 'Vaishali Nagar, Jaipur' }),
  ]);

  console.log('[seed] Creating appointments...');
  const appts = await Appointment.insertMany([
    { patient: amit._id, patientName: amit.name, patientEmail: amit.email, patientPhone: amit.phone, doctor: drSharma._id, date: daysFromNow(0), timeSlot: '10:00 AM', reason: 'Chest discomfort and fatigue', status: 'Scheduled', createdBy: reception._id },
    { patient: neha._id, patientName: neha.name, patientEmail: neha.email, patientPhone: neha.phone, doctor: drSharma._id, date: daysFromNow(0), timeSlot: '11:30 AM', reason: 'Routine cardiac check-up', status: 'Scheduled', createdBy: reception._id },
    { patient: amit._id, patientName: amit.name, patientEmail: amit.email, patientPhone: amit.phone, doctor: drSharma._id, date: daysFromNow(-14), timeSlot: '09:30 AM', reason: 'High blood pressure follow-up', status: 'Completed', createdBy: reception._id },
    { patient: neha._id, patientName: neha.name, patientEmail: neha.email, patientPhone: neha.phone, doctor: drVerma._id, date: daysFromNow(-7), timeSlot: '03:00 PM', reason: 'Skin rash on forearm', status: 'Completed', createdBy: reception._id },
    { patient: amit._id, patientName: amit.name, patientEmail: amit.email, patientPhone: amit.phone, doctor: drKhan._id, date: daysFromNow(4), timeSlot: '02:30 PM', reason: 'Child vaccination consult', status: 'Scheduled', createdBy: reception._id },
    // Walk-in filed by reception for someone who has NOT registered yet —
    // demonstrates smart linking once they sign up with this email.
    { patient: null, patientName: 'Vikram Singh', patientEmail: 'vikram@example.com', patientPhone: '9800011122', doctor: drSharma._id, date: daysFromNow(2), timeSlot: '04:00 PM', reason: 'Walk-in consultation', status: 'Scheduled', createdBy: reception._id },
  ]);

  console.log('[seed] Creating prescriptions...');
  await Prescription.insertMany([
    {
      appointment: appts[2]._id, doctor: drSharma._id, patient: amit._id,
      patientName: amit.name, patientEmail: amit.email,
      diagnosis: 'Stage-1 Hypertension',
      medicines: [
        { name: 'Amlodipine', dosage: '5mg', frequency: '1-0-0 before food', duration: '30 days' },
        { name: 'Aspirin', dosage: '75mg', frequency: '0-1-0 after food', duration: '30 days' },
      ],
      advice: 'Reduce salt intake, 30 minutes of brisk walking daily, monitor BP twice a week.',
      followUpDate: daysFromNow(16),
    },
    {
      appointment: appts[3]._id, doctor: drVerma._id, patient: neha._id,
      patientName: neha.name, patientEmail: neha.email,
      diagnosis: 'Contact dermatitis',
      medicines: [
        { name: 'Cetirizine', dosage: '10mg', frequency: '0-0-1 after food', duration: '7 days' },
        { name: 'Mometasone cream', dosage: '0.1%', frequency: 'Apply twice daily', duration: '10 days' },
      ],
      advice: 'Avoid scented soaps and detergents. Keep the area dry.',
      followUpDate: daysFromNow(7),
    },
  ]);

  console.log(`
✅ Seed complete!

  Login credentials (password for all: 123456)
  ────────────────────────────────────────────
  👨‍⚕️  Doctor        doctor@hms.com
  👨‍⚕️  Doctor        rahul@hms.com
  👨‍⚕️  Doctor        sana@hms.com
  🧾  Receptionist  reception@hms.com
  🧑  Patient       patient@hms.com
  🧑  Patient       neha@hms.com

  Tip: register a new patient with vikram@example.com to see
  smart record linking pick up his existing walk-in appointment.
`);

  await mongoose.connection.close();
  process.exit(0);
})().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
