const mongoose = require('mongoose');

/**
 * Connects to MongoDB Atlas (or any Mongo URI supplied via .env)
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error(`
[DB] ✖  MONGO_URI is missing.

    Create a .env file in the project folder:

        cp .env.example .env      (Mac/Linux)
        copy .env.example .env    (Windows)

    Then open .env and set ONE of these:

    • Local MongoDB:
        MONGO_URI=mongodb://127.0.0.1:27017/hms

    • MongoDB Atlas (cloud):
        MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/hms
`);
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`[DB] ✔  MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`[DB] ✖  Connection failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
