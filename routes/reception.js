const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { hasRole } = require('../middleware/auth');

router.use(hasRole('receptionist'));

/* ---------------- Dashboard ---------------- */
router.get('/dashboard', async (req, res, next) => {
  try {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

    const [totalAppts, todayCount, doctorCount, patientCount, pending, recent] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.countDocuments({ date: { $gte: startOfDay, $lte: endOfDay } }),
      User.countDocuments({ role: 'doctor' }),
      User.countDocuments({ role: 'patient' }),
      Appointment.countDocuments({ status: 'Scheduled' }),
      Appointment.find().populate('doctor', 'name specialization').sort({ createdAt: -1 }).limit(8),
    ]);

    res.render('reception/dashboard', {
      title: 'Reception Dashboard',
      stats: { totalAppts, todayCount, doctorCount, patientCount, pending },
      recent,
    });
  } catch (err) { next(err); }
});

/* ---------------- Appointments list ---------------- */
router.get('/appointments', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    if (req.query.q) {
      const rx = new RegExp(req.query.q.trim(), 'i');
      filter.$or = [{ patientName: rx }, { patientEmail: rx }, { patientPhone: rx }];
    }

    const appointments = await Appointment.find(filter)
      .populate('doctor', 'name specialization')
      .sort({ date: -1, createdAt: -1 });

    res.render('reception/appointments', {
      title: 'All Appointments',
      appointments,
      activeStatus: req.query.status || 'all',
      q: req.query.q || '',
    });
  } catch (err) { next(err); }
});

/* ---------------- Book appointment ---------------- */
router.get('/appointments/new', async (req, res, next) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).sort({ name: 1 });
    res.render('reception/newAppointment', { title: 'Book Appointment', doctors });
  } catch (err) { next(err); }
});

router.post('/appointments', async (req, res, next) => {
  try {
    const { patientName, patientEmail, patientPhone, doctor, date, timeSlot, reason } = req.body;

    if (!patientName || !patientEmail || !doctor || !date || !timeSlot) {
      req.flash('error', 'Please fill in all required fields.');
      return res.redirect('/reception/appointments/new');
    }

    const clash = await Appointment.findOne({
      doctor, date: new Date(date), timeSlot, status: { $ne: 'Cancelled' },
    });
    if (clash) {
      req.flash('error', `That doctor already has a booking at ${timeSlot} on this date. Pick another slot.`);
      return res.redirect('/reception/appointments/new');
    }

    const patientDoc = await User.findOne({ email: patientEmail.toLowerCase().trim(), role: 'patient' });

    await Appointment.create({
      patient: patientDoc ? patientDoc._id : null,
      patientName, patientEmail, patientPhone,
      doctor, date, timeSlot, reason,
      createdBy: req.session.user.id,
    });

    req.flash('success', 'Appointment booked successfully.');
    res.redirect('/reception/appointments');
  } catch (err) { next(err); }
});

/* ---------------- Status change / cancel / delete ---------------- */
router.post('/appointments/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Scheduled', 'Completed', 'Cancelled'].includes(status)) {
      req.flash('error', 'Invalid status.');
      return res.redirect('/reception/appointments');
    }
    await Appointment.findByIdAndUpdate(req.params.id, { status });
    req.flash('success', `Appointment marked as ${status}.`);
    res.redirect(req.get('Referer') || '/reception/appointments');
  } catch (err) { next(err); }
});

router.post('/appointments/:id/delete', async (req, res, next) => {
  try {
    await Appointment.findByIdAndDelete(req.params.id);
    req.flash('success', 'Appointment deleted.');
    res.redirect('/reception/appointments');
  } catch (err) { next(err); }
});

/* ---------------- Doctors ---------------- */
router.get('/doctors', async (req, res, next) => {
  try {
    const docs = await User.find({ role: 'doctor' }).sort({ name: 1 });
    const doctors = await Promise.all(
      docs.map(async (d) => ({
        doc: d,
        count: await Appointment.countDocuments({ doctor: d._id, status: 'Scheduled' }),
      }))
    );
    res.render('reception/doctors', { title: 'Doctors', doctors });
  } catch (err) { next(err); }
});

router.get('/doctors/new', (req, res) => {
  res.render('reception/newDoctor', { title: 'Add Doctor' });
});

router.post('/doctors', async (req, res, next) => {
  try {
    const { name, email, password, phone, specialization, fee } = req.body;
    if (!name || !email || !password) {
      req.flash('error', 'Name, email and password are required.');
      return res.redirect('/reception/doctors/new');
    }
    if (await User.findOne({ email: email.toLowerCase().trim() })) {
      req.flash('error', 'A user with that email already exists.');
      return res.redirect('/reception/doctors/new');
    }

    await User.create({
      name, email, password, role: 'doctor', phone, specialization,
      fee: fee ? Number(fee) : 0,
    });

    req.flash('success', `Dr. ${name} added successfully.`);
    res.redirect('/reception/doctors');
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/reception/doctors/new');
  }
});

/* ---------------- Patients ---------------- */
router.get('/patients', async (req, res, next) => {
  try {
    const filter = { role: 'patient' };
    if (req.query.q) {
      const rx = new RegExp(req.query.q.trim(), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }

    const list = await User.find(filter).sort({ createdAt: -1 });
    const patients = await Promise.all(
      list.map(async (p) => ({
        p,
        visits: await Appointment.countDocuments({ patientEmail: p.email }),
      }))
    );

    res.render('reception/patients', { title: 'Patients', patients, q: req.query.q || '' });
  } catch (err) { next(err); }
});

router.get('/patients/new', (req, res) => {
  res.render('reception/newPatient', { title: 'Register Patient' });
});

router.post('/patients', async (req, res, next) => {
  try {
    const { name, email, password, phone, gender, age, bloodGroup, address } = req.body;
    if (!name || !email || !password) {
      req.flash('error', 'Name, email and password are required.');
      return res.redirect('/reception/patients/new');
    }
    if (await User.findOne({ email: email.toLowerCase().trim() })) {
      req.flash('error', 'A user with that email already exists.');
      return res.redirect('/reception/patients/new');
    }

    const patient = await User.create({
      name, email, password, role: 'patient', phone,
      gender: gender || '', age: age ? Number(age) : null, bloodGroup, address,
    });

    // Smart linking: attach any walk-in records already filed under this email
    await Appointment.updateMany(
      { patientEmail: patient.email, patient: null },
      { patient: patient._id }
    );

    req.flash('success', `${name} registered successfully.`);
    res.redirect('/reception/patients');
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/reception/patients/new');
  }
});

module.exports = router;
