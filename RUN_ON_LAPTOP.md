# 💻 How to Run This Project on Your Laptop

Works on **Windows, macOS and Linux**. Total time: about 10 minutes.

---

## What you need

| Software | Why | Link |
|---|---|---|
| **Node.js 18+** | Runs the server | https://nodejs.org (pick the **LTS** button) |
| **A MongoDB database** | Stores the data | Two options below — pick one |
| A code editor (optional) | Editing files | https://code.visualstudio.com |

---

## Step 1 — Install Node.js

Download the **LTS** version from https://nodejs.org and run the installer
(keep clicking Next — the defaults are fine).

Then **open a new terminal** and check it worked:

```bash
node -v
npm -v
```

> **Terminal =** Command Prompt or PowerShell on Windows · Terminal app on Mac/Linux.
> You must open a *new* window after installing, or it won't find the command.

You should see something like `v20.11.0` and `10.2.4`. Any Node version **18 or
higher** works. If you get *"node is not recognized"*, restart your computer.

---

## Step 2 — Get the project folder

**If you pushed it to GitHub:**
```bash
git clone https://github.com/YOUR-USERNAME/hospital-management-system.git
cd hospital-management-system
```

**If you have the folder already:** just open a terminal inside the `hms` folder.

> 💡 **Windows tip:** open the folder in File Explorer, type `cmd` in the address
> bar and press Enter — a terminal opens already in the right place.
>
> 💡 **VS Code tip:** File → Open Folder → then Terminal → New Terminal.

Confirm you're in the right place — this must list `server.js`:
```bash
dir        # Windows
ls         # Mac/Linux
```

---

## Step 3 — Install the dependencies

```bash
npm install
```

Downloads the ~300 MB `node_modules` folder. Takes 1–3 minutes.
Warnings are normal; **errors** are not.

---

## Step 4 — Set up the database

Choose **ONE** of these.

### 🅰️ Option A — MongoDB Atlas (cloud, nothing to install) ← *recommended*

Best if you don't want to install a database, and it works on any laptop.

1. Sign up free at **https://www.mongodb.com/cloud/atlas/register**
2. Create a **free M0 cluster** (any provider/region — pick one near you)
3. **Database Access** → *Add New Database User*
   - Username: `hmsuser`, password: pick a simple one **with no special characters**
     (`@`, `:`, `/` break the URL) → **Add User**
4. **Network Access** → *Add IP Address* → **Allow Access from Anywhere** (`0.0.0.0/0`)
   → Confirm
   *(fine for a college project; restrict it for anything real)*
5. **Database** → **Connect** → **Drivers** → copy the connection string.

It looks like:
```
mongodb+srv://hmsuser:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
```

Now fix it up — replace `<password>` with your real password, and insert `hms`
before the `?`:
```
mongodb+srv://hmsuser:MyPass123@cluster0.abcde.mongodb.net/hms?retryWrites=true&w=majority
                      ^^^^^^^^^^                             ^^^^
                      your password                          database name
```

### 🅱️ Option B — Local MongoDB (works offline)

1. Install **MongoDB Community Server**: https://www.mongodb.com/try/download/community
   - On Windows, keep *"Install MongoDB as a Service"* ticked so it starts automatically
   - On Mac with Homebrew: `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
2. Your connection string is simply:
```
mongodb://127.0.0.1:27017/hms
```

---

## Step 5 — Create your `.env` file

```bash
cp .env.example .env       # Mac/Linux
copy .env.example .env     # Windows
```

Open `.env` in your editor and set `MONGO_URI` to the string from Step 4:

```env
MONGO_URI=mongodb://127.0.0.1:27017/hms
SESSION_SECRET=my-super-secret-random-string-12345
PORT=3000
```

> ⚠️ No quotes, no spaces around the `=`. The file must be named exactly `.env`
> — if Windows saved it as `.env.txt`, rename it.

---

## Step 6 — Load the demo data

```bash
npm run seed
```

Creates 3 doctors, a receptionist, 2 patients, appointments and prescriptions,
then prints the login list. **You need this** — without it there are no accounts
to log in with.

---

## Step 7 — Start the app 🎉

```bash
npm run dev
```

You'll see:
```
🏥  HMS running at http://localhost:3000
[DB] ✔  MongoDB connected: ...
```

Open **http://localhost:3000** in your browser.

Stop the server anytime with **Ctrl + C**.

---

## 🔑 Login details

Password for **every** account is `123456`.

| Role | Email |
|---|---|
| 👨‍⚕️ Doctor | `doctor@hms.com` |
| 🧾 Receptionist | `reception@hms.com` |
| 🧑 Patient | `patient@hms.com` |

(Also seeded: `rahul@hms.com`, `sana@hms.com`, `neha@hms.com`)

---

## 🎬 What to demo (in this order)

1. **Receptionist** (`reception@hms.com`) → *Book Appointment*. Then try booking the
   **same doctor, same date, same slot** again → it's rejected.
2. **Doctor** (`doctor@hms.com`) → your dashboard shows today's schedule. Click **✓**
   to mark a visit complete, then the **℞** icon to write a prescription
   (*Add Medicine* adds more rows).
3. **Patient** (`patient@hms.com`) → the prescription is already in *My Prescriptions*.
   Open it and hit **Print**.
4. **The clever bit** — register a brand-new patient with email
   `vikram@example.com`. Log in as him: an appointment reception booked *before he
   had an account* is already in his portal, linked by email.

---

## 🛠 Troubleshooting

| Error | Fix |
|---|---|
| `'node' is not recognized` | Node isn't installed or terminal not restarted. Reinstall, open a **new** terminal. |
| `Cannot find module 'express'` | You skipped `npm install`, or you're in the wrong folder. |
| `MONGO_URI is missing` | No `.env` file. Redo Step 5. Check it isn't named `.env.txt`. |
| `ECONNREFUSED 127.0.0.1:27017` | Local MongoDB isn't running. Start the service, or switch to Atlas (Option A). |
| `Authentication failed` (Atlas) | Wrong password in the URI, or you left `<password>` in literally. Avoid special characters. |
| `IP not whitelisted` / connection times out | Atlas → Network Access → allow `0.0.0.0/0`. |
| `EADDRINUSE: port 3000` | Something else uses port 3000. Set `PORT=3001` in `.env`. |
| Page loads but login fails | You skipped `npm run seed`, so no accounts exist. |
| `npm ERR! code EACCES` (Mac/Linux) | Don't use `sudo`. Fix folder ownership: `sudo chown -R $(whoami) .` |

**Still stuck?** Read the terminal output — the app prints a specific reason
(`[DB] ✖ ...`) rather than failing silently.

---

## 📋 The whole thing, condensed

```bash
git clone https://github.com/YOUR-USERNAME/hospital-management-system.git
cd hospital-management-system
npm install
cp .env.example .env        # then edit MONGO_URI inside it
npm run seed
npm run dev                 # → http://localhost:3000
```

---

## ℹ️ Notes

- `npm run dev` uses **nodemon** — it auto-restarts when you edit a file. Use
  `npm start` for a plain run.
- Your data lives in the database, so it survives restarts. Re-run `npm run seed`
  to wipe and reset it to the demo state.
- **Don't want to run it at all?** Just open `preview.html` in a browser to see
  every screen as a gallery — no install, no database.
