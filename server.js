require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');

const connectDB = require('./config/db');

const app = express();

/* ---------------- Database ---------------- */
connectDB();

/* ---------------- View engine ---------------- */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

/* ---------------- Core middleware ---------------- */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------------- Sessions ---------------- */
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'hms-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: 'sessions',
      ttl: 60 * 60 * 24, // 1 day
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    },
  })
);

app.use(flash());

/* ---------------- Locals available in every view ---------------- */
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.path = req.path;
  res.locals.title = 'Hospital Management System';
  next();
});

/* ---------------- Routes ---------------- */
app.use('/', require('./routes/auth'));
app.use('/doctor', require('./routes/doctor'));
app.use('/reception', require('./routes/reception'));
app.use('/patient', require('./routes/patient'));

// Friendly alias so /receptionist/dashboard also works
app.use('/receptionist', (req, res) => res.redirect('/reception' + req.url));

/* ---------------- 404 ---------------- */
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    code: 404,
    message: 'The page you are looking for does not exist.',
  });
});

/* ---------------- Error handler ---------------- */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Server Error',
    code: 500,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong on our side.' : err.message,
  });
});

/* ---------------- Start ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🏥  HMS running at http://localhost:${PORT}\n`);
});
