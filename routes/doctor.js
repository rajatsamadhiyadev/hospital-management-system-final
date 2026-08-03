const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const { hasRole } = require('../middleware/auth');

router.use(hasRole('doctor'));

/* ---------------- Dashboard ---------------- */
router.get('/dashboard', async (req, res, next) => {
  try {
    const docId = req.session.user.id;
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

    const [total, todayCount, completed, pending, todayList] = await Promise.all([
      Appointment.countDocuments({ doctor: docId }),
      Appointment.countDocuments({ doctor: docId, date: { $gte: startOfDay, $lte: endOfDay } }),
      Appointment.countDocuments({ doctor: docId, status: 'Completed' }),
      Appointment.countDocuments({ doctor: docId, status: 'Scheduled' }),
      Appointment.find({ doctor: docId, date: { $gte: startOfDay, $lte: endOfDay } }).sort({ date: 1 }),
    ]);

    const prescriptionCount = await Prescription.countDocuments({ doctor: docId });

    res.render('doctor/dashboard', {
      title: 'Doctor Dashboard',
      stats: { total, todayCount, completed, pending, prescriptionCount },
      todayList,
    });
  } catch (err) { next(err); }
});

/* ---------------- All appointments ---------------- */
router.get('/appointments', async (req, res, next) => {
  try {
    const filter = { doctor: req.session.user.id };
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;

    const appointments = await Appointment.find(filter).sort({ date: -1, createdAt: -1 });
    res.render('doctor/appointments', {
      title: 'My Appointments',
      appointments,
      activeStatus: req.query.status || 'all',
    });
  } catch (err) { next(err); }
});

/* ---------------- Toggle Completed / Scheduled ---------------- */
router.post('/appointments/:id/toggle', async (req, res, next) => {
  try {
    const appt = await Appointment.findOne({ _id: req.params.id, doctor: req.session.user.id });
    if (!appt) {
      req.flash('error', 'Appointment not found.');
      return res.redirect('/doctor/appointments');
    }
    appt.status = appt.status === 'Completed' ? 'Scheduled' : 'Completed';
    await appt.save();
    req.flash('success', `Appointment marked as ${appt.status}.`);
    res.redirect(req.get('Referer') || '/doctor/appointments');
  } catch (err) { next(err); }
});

/* ---------------- Patients treated by this doctor ---------------- */
router.get('/patients', async (req, res, next) => {
  try {
    const docId = req.session.user.id;
    const emails = await Appointment.distinct('patientEmail', { doctor: docId });

    const patients = await Promise.all(
      emails.map(async (email) => {
        const [profile, last, visits, scripts] = await Promise.all([
          User.findOne({ email, role: 'patient' }),
          Appointment.findOne({ doctor: docId, patientEmail: email }).sort({ date: -1 }),
          Appointment.countDocuments({ doctor: docId, patientEmail: email }),
          Prescription.countDocuments({ doctor: docId, patientEmail: email }),
        ]);
        return {
          email,
          name: profile ? profile.name : last ? last.patientName : email,
          phone: profile ? profile.phone : last ? last.patientPhone : '',
          registered: !!profile,
          lastVisit: last ? last.date : null,
          visits,
          scripts,
        };
      })
    );

    patients.sort((a, b) => (b.lastVisit || 0) - (a.lastVisit || 0));
    res.render('doctor/patients', { title: 'My Patients', patients });
  } catch (err) { next(err); }
});

/* ---------------- Prescriptions list ---------------- */
router.get('/prescriptions', async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({ doctor: req.session.user.id }).sort({ createdAt: -1 });
    res.render('doctor/prescriptions', { title: 'Prescriptions', prescriptions });
  } catch (err) { next(err); }
});

/* ---------------- New prescription form ---------------- */
router.get('/prescriptions/new', async (req, res, next) => {
  try {
    let prefill = { name: '', email: '', appointmentId: '' };

    if (req.query.appointment) {
      const appt = await Appointment.findOne({ _id: req.query.appointment, doctor: req.session.user.id });
      if (appt) prefill = { name: appt.patientName, email: appt.patientEmail, appointmentId: appt._id.toString() };
    } else if (req.query.email) {
      const appt = await Appointment.findOne({ doctor: req.session.user.id, patientEmail: req.query.email }).sort({ date: -1 });
      prefill = { name: appt ? appt.patientName : '', email: req.query.email, appointmentId: '' };
    }

    res.render('doctor/newPrescription', { title: 'Write Prescription', prefill });
  } catch (err) { next(err); }
});

/* ---------------- Save prescription ---------------- */
router.post('/prescriptions', async (req, res, next) => {
  try {
    const { patientName, patientEmail, diagnosis, advice, followUpDate, appointmentId } = req.body;

    if (!patientName || !patientEmail || !diagnosis) {
      req.flash('error', 'Patient name, email and diagnosis are required.');
      return res.redirect('/doctor/prescriptions/new');
    }

    // Medicine rows arrive as parallel arrays from the dynamic form
    const names = [].concat(req.body.medName || []);
    const dosages = [].concat(req.body.medDosage || []);
    const freqs = [].concat(req.body.medFrequency || []);
    const durations = [].concat(req.body.medDuration || []);

    const medicines = names
      .map((n, i) => ({
        name: (n || '').trim(),
        dosage: (dosages[i] || '').trim(),
        frequency: (freqs[i] || '').trim(),
        duration: (durations[i] || '').trim(),
      }))
      .filter((m) => m.name);

    const patientDoc = await User.findOne({ email: patientEmail.toLowerCase().trim(), role: 'patient' });

    await Prescription.create({
      appointment: appointmentId || null,
      doctor: req.session.user.id,
      patient: patientDoc ? patientDoc._id : null,
      patientName,
      patientEmail,
      diagnosis,
      medicines,
      advice,
      followUpDate: followUpDate || null,
    });

    // Auto-complete the linked appointment
    if (appointmentId) {
      await Appointment.updateOne(
        { _id: appointmentId, doctor: req.session.user.id },
        { status: 'Completed' }
      );
    }

    req.flash('success', 'Prescription issued successfully.');
    res.redirect('/doctor/prescriptions');
  } catch (err) { next(err); }
});

/* ---------------- View one prescription ---------------- */
router.get('/prescriptions/:id', async (req, res, next) => {
  try {
    const prescription = await Prescription.findOne({ _id: req.params.id, doctor: req.session.user.id })
      .populate('doctor', 'name specialization email phone');
    if (!prescription) {
      req.flash('error', 'Prescription not found.');
      return res.redirect('/doctor/prescriptions');
    }
    res.render('doctor/viewPrescription', { title: 'Prescription', prescription });
  } catch (err) { next(err); }
});

module.exports = router;
