/**
 * Session-based access control helpers.
 */

// Must be logged in
const isAuth = (req, res, next) => {
  if (req.session && req.session.user) return next();
  req.flash('error', 'Please log in to continue.');
  return res.redirect('/login');
};

// Must be logged OUT (login / register pages)
const HOME = {
  doctor: '/doctor/dashboard',
  receptionist: '/reception/dashboard',
  patient: '/patient/dashboard',
};

const isGuest = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect(HOME[req.session.user.role] || '/');
  }
  return next();
};

// Restrict a route to one or more roles: hasRole('doctor'), hasRole('doctor','receptionist')
const hasRole = (...roles) => (req, res, next) => {
  if (!req.session || !req.session.user) {
    req.flash('error', 'Please log in to continue.');
    return res.redirect('/login');
  }
  if (!roles.includes(req.session.user.role)) {
    return res.status(403).render('error', {
      title: 'Access Denied',
      code: 403,
      message: 'You do not have permission to view this page.',
    });
  }
  return next();
};

module.exports = { isAuth, isGuest, hasRole };
