const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const db = require("./db");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
if (!process.env.JWT_SECRET) console.warn("WARNING: using default JWT_SECRET. Set JWT_SECRET before deploying.");

const TYPES = ["Rescue", "Medical", "Food & water", "Shelter", "Power & comms", "Other"];
const URGENCY = ["Critical", "High", "Medium", "Low"];
const STATUS = ["New", "Assigned", "In progress", "Resolved"];
const TEAMS = ["Unassigned", "Rescue Team A", "Rescue Team B", "Medical Unit 1", "Supply Convoy", "Shelter Desk"];
const VULN = ["Elderly", "Children", "Disabled", "Medical condition", "Pregnant"];
const URGW = { Critical: 50, High: 35, Medium: 20, Low: 5 };

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

// naive per-IP rate limit for public submissions (10 per minute)
const hits = new Map();
function limit(req, res, next) {
  const now = Date.now(), k = req.ip;
  const arr = (hits.get(k) || []).filter(t => now - t < 60000);
  if (arr.length >= 10) return res.status(429).json({ error: "Too many requests. Wait a minute and try again." });
  arr.push(now); hits.set(k, arr); next();
}

const score = r => Math.min(100, Math.round(URGW[r.urgency] + Math.min(r.people, 20) * 1.5 + r.vuln.length * 6));
const label = s => (s >= 70 ? "Critical" : s >= 50 ? "High" : s >= 30 ? "Medium" : "Low");
const shape = r => {
  const o = { ...r, vuln: JSON.parse(r.vuln) };
  o.score = score(o); o.priority = label(o.score);
  return o;
};
const clean = (s, n) => String(s ?? "").trim().slice(0, n);

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  try { req.user = jwt.verify(h.replace("Bearer ", ""), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: "Login required." }); }
}

app.get("/api/meta", (_req, res) => res.json({ TYPES, URGENCY, STATUS, TEAMS, VULN }));

// Public: create a request
app.post("/api/requests", limit, (req, res) => {
  const b = req.body || {};
  const name = clean(b.name, 80), phone = clean(b.phone, 20), location = clean(b.location, 300);
  const errors = {};
  if (!name) errors.name = "Enter your name.";
  if (!/^[+\d][\d\s-]{7,}$/.test(phone)) errors.phone = "Enter a phone number with at least 8 digits.";
  if (!location) errors.location = "Describe where you are.";
  if (!TYPES.includes(b.type)) errors.type = "Choose a type of help.";
  if (!URGENCY.includes(b.urgency)) errors.urgency = "Choose an urgency.";
  if (Object.keys(errors).length) return res.status(400).json({ error: "Please fix the highlighted fields.", errors });
  const people = Math.min(500, Math.max(1, parseInt(b.people) || 1));
  const vuln = (Array.isArray(b.vuln) ? b.vuln : []).filter(v => VULN.includes(v));
  let id;
  do { id = "RD-" + Math.floor(1000 + Math.random() * 9000); }
  while (db.prepare("SELECT 1 FROM requests WHERE id = ?").get(id));
  const now = Date.now();
  db.prepare(`INSERT INTO requests (id,name,phone,type,urgency,people,vuln,location,description,status,team,created,updated)
    VALUES (?,?,?,?,?,?,?,?,?,'New','Unassigned',?,?)`)
    .run(id, name, phone, b.type, b.urgency, people, JSON.stringify(vuln), location, clean(b.description, 1000), now, now);
  res.status(201).json({ id });
});

// Public: track by ID (limited fields, no phone or name)
app.get("/api/track/:id", limit, (req, res) => {
  const r = db.prepare("SELECT * FROM requests WHERE id = ?").get(String(req.params.id).toUpperCase().trim());
  if (!r) return res.status(404).json({ error: "No request found with that ID." });
  const s = shape(r);
  res.json({ id: s.id, type: s.type, status: s.status, team: s.team, location: s.location, priority: s.priority, created: s.created, updated: s.updated });
});

app.post("/api/login", limit, (req, res) => {
  const { username, password } = req.body || {};
  const u = db.prepare("SELECT * FROM users WHERE username = ?").get(String(username || ""));
  if (!u || !bcrypt.compareSync(String(password || ""), u.password_hash))
    return res.status(401).json({ error: "Wrong username or password." });
  res.json({ token: jwt.sign({ sub: u.username }, JWT_SECRET, { expiresIn: "8h" }) });
});

// Responders only
app.get("/api/requests", auth, (_req, res) => {
  const rows = db.prepare("SELECT * FROM requests").all().map(shape);
  rows.sort((a, b) => b.score - a.score || a.created - b.created);
  res.json(rows);
});

app.patch("/api/requests/:id", auth, (req, res) => {
  const r = db.prepare("SELECT * FROM requests WHERE id = ?").get(req.params.id);
  if (!r) return res.status(404).json({ error: "Request not found." });
  let { status, team } = req.body || {};
  if (status !== undefined && !STATUS.includes(status)) return res.status(400).json({ error: "Invalid status." });
  if (team !== undefined && !TEAMS.includes(team)) return res.status(400).json({ error: "Invalid team." });
  status = status ?? r.status; team = team ?? r.team;
  if (status === "New" && team !== "Unassigned") status = "Assigned";
  if (status === "Assigned" && team === "Unassigned") team = "Rescue Team A";
  db.prepare("UPDATE requests SET status=?, team=?, updated=? WHERE id=?").run(status, team, Date.now(), r.id);
  res.json(shape(db.prepare("SELECT * FROM requests WHERE id = ?").get(r.id)));
});

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));

const PORT = process.env.PORT || 3000;
if (require.main === module) app.listen(PORT, () => console.log(`ReliefDesk running on http://localhost:${PORT}`));
module.exports = app;
