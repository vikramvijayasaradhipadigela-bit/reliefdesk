const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const dir = path.join(__dirname, "data");
fs.mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(process.env.DB_FILE || path.join(dir, "reliefdesk.db"));

db.exec(`
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  type TEXT NOT NULL,
  urgency TEXT NOT NULL,
  people INTEGER NOT NULL DEFAULT 1,
  vuln TEXT NOT NULL DEFAULT '[]',
  location TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'New',
  team TEXT NOT NULL DEFAULT 'Unassigned',
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL
);
`);

const adminUser = process.env.ADMIN_USER || "admin";
const adminPass = process.env.ADMIN_PASS || "admin123";
const row = db.prepare("SELECT username FROM users WHERE username = ?").get(adminUser);
if (!row) {
  db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .run(adminUser, bcrypt.hashSync(adminPass, 10));
  if (!process.env.ADMIN_PASS) console.warn("WARNING: using default admin password. Set ADMIN_PASS before deploying.");
}
module.exports = db;
