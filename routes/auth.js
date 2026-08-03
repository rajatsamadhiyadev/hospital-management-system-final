const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isGuest, isAuth } = require('../middleware/auth');

// Each role has its own dashboard URL prefix
const HOME = {
  doctor: '/doctor/dashboard',
  receptionist: '/reception/dashboard',
  patient: '/patient/dashboard',
};

/* ---------------- Landing page ---------------- */
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect(HOME[req.session.user.role]);
  res.render('index', { title: 'Welcome' });
});

/* ---------------- Login ---------------- */
router.get('/login', isGuest, (req, res) => {
  res.render('auth/login', { title: 'Login' });
});

router.post('/login', isGuest, async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      req.flash('error', 'Email and password are both required.');
      return res.redirect('/login');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }

    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    req.flash('success', `Welcome back, ${user.name}!`);
    res.redirect(HOME[user.role]);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong while logging in.');
    res.redirect('/login');
  }
});

/* ---------------- Register (patients self-register) ---------------- */
router.get('/register', isGuest, (req, res) => {
  res.render('auth/register', { title: 'Patient Registration' });
});

router.post('/register', isGuest, async (req, res) => {
  const { name, email, password, confirmPassword, phone, gender, age, bloodGroup, address } = req.body;
  try {
    if (!name || !email || !password) {
      req.flash('error', 'Name, email and password are required.');
      return res.redirect('/register');
    }
    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect('/register');
    }
    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters long.');
      return res.redirect('/register');
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      req.flash('error', 'An account with that email already exists.');
      return res.redirect('/register');
    }

    await User.create({
      name,
      email,
      password,
      role: 'patient',
      phone,
      gender: gender || '',
      age: age ? Number(age) : null,
      bloodGroup,
      address,
    });

    req.flash('success', 'Registration successful. Please log in.');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    req.flash('error', err.message || 'Registration failed.');
    res.redirect('/register');
  }
});

/* ---------------- Logout ---------------- */
router.get('/logout', isAuth, (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
