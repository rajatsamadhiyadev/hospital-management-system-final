const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const { hasRole } = require('../middleware/auth');

router.use(hasRole('patient'));

/**
 * SMART RECORD LINKING
 * Everything a patient sees is matched on their login email, so records
 * created by a receptionist before the patient ever registered still show up.
 */

/* ---------------- Dashboard ---------------- */
router.get('/dashboard', async (req, res, next) => {
  try {
    const email = req.session.user.email;
    const now = new Date();

    const [upcoming, past, scripts, nextAppt] = await Promise.all([
      Appointment.countDocuments({ patientEmail: email, status: 'Scheduled', date: { $gte: now } }),
      Appointment.countDocuments({ patientEmail: email, status: 'Completed' }),
      Prescription.countDocuments({ patientEmail: email }),
      Appointment.findOne({ patientEmail: email, status: 'Scheduled', date: { $gte: now } })
        .populate('doctor', 'name specialization')
        .sort({ date: 1 }),
    ]);

    const recent = await Appointment.find({ patientEmail: email })
      .populate('doctor', 'name specialization')
      .sort({ date: -1 })
      .limit(5);

    res.render('patient/dashboard', {
      title: 'My Dashboard',
      stats: { upcoming, past, scripts },
      nextAppt,
      recent,
    });
  } catch (err) { next(err); }
});

/* ---------------- My appointments ---------------- */
router.get('/appointments', async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ patientEmail: req.session.user.email })
      .populate('doctor', 'name specialization fee')
      .sort({ date: -1 });
    res.render('patient/appointments', { title: 'My Appointments', appointments });
  } catch (err) { next(err); }
});

/* ---------------- Request an appointment ---------------- */
router.get('/appointments/new', async (req, res, next) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).sort({ name: 1 });
    res.render('patient/newAppointment', { title: 'Book Appointment', doctors });
  } catch (err) { next(err); }
});

router.post('/appointments', async (req, res, next) => {
  try {
    const { doctor, date, timeSlot, reason } = req.body;
    if (!doctor || !date || !timeSlot) {
      req.flash('error', 'Doctor, date and time slot are required.');
      return res.redirect('/patient/appointments/new');
    }

    const clash = await Appointment.findOne({
      doctor, date: new Date(date), timeSlot, status: { $ne: 'Cancelled' },
    });
    if (clash) {
      req.flash('error', `That slot is already taken. Please choose another time.`);
      return res.redirect('/patient/appointments/new');
    }

    const me = await User.findById(req.session.user.id);

    await Appointment.create({
      patient: me._id,
      patientName: me.name,
      patientEmail: me.email,
      patientPhone: me.phone,
      doctor, date, timeSlot, reason,
      createdBy: me._id,
    });

    req.flash('success', 'Appointment requested successfully.');
    res.redirect('/patient/appointments');
  } catch (err) { next(err); }
});

/* ---------------- Cancel own appointment ---------------- */
router.post('/appointments/:id/cancel', async (req, res, next) => {
  try {
    const appt = await Appointment.findOne({ _id: req.params.id, patientEmail: req.session.user.email });
    if (!appt) {
      req.flash('error', 'Appointment not found.');
      return res.redirect('/patient/appointments');
    }
    if (appt.status === 'Completed') {
      req.flash('error', 'A completed appointment cannot be cancelled.');
      return res.redirect('/patient/appointments');
    }
    appt.status = 'Cancelled';
    await appt.save();
    req.flash('success', 'Appointment cancelled.');
    res.redirect('/patient/appointments');
  } catch (err) { next(err); }
});

/* ---------------- Prescriptions ---------------- */
router.get('/prescriptions', async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({ patientEmail: req.session.user.email })
      .populate('doctor', 'name specialization')
      .sort({ createdAt: -1 });
    res.render('patient/prescriptions', { title: 'My Prescriptions', prescriptions });
  } catch (err) { next(err); }
});

router.get('/prescriptions/:id', async (req, res, next) => {
  try {
    const prescription = await Prescription.findOne({
      _id: req.params.id,
      patientEmail: req.session.user.email,
    }).populate('doctor', 'name specialization email phone');

    if (!prescription) {
      req.flash('error', 'Prescription not found.');
      return res.redirect('/patient/prescriptions');
    }
    res.render('patient/viewPrescription', { title: 'Prescription', prescription });
  } catch (err) { next(err); }
});

/* ---------------- Profile ---------------- */
router.get('/profile', async (req, res, next) => {
  try {
    const me = await User.findById(req.session.user.id);
    res.render('patient/profile', { title: 'My Profile', me });
  } catch (err) { next(err); }
});

router.post('/profile', async (req, res, next) => {
  try {
    const { name, phone, gender, age, bloodGroup, address } = req.body;
    await User.findByIdAndUpdate(req.session.user.id, {
      name, phone, gender: gender || '', age: age ? Number(age) : null, bloodGroup, address,
    });
    req.session.user.name = name;
    req.flash('success', 'Profile updated.');
    res.redirect('/patient/profile');
  } catch (err) { next(err); }
});

module.exports = router;
