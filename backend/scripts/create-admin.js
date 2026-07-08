/**
 * One-time bootstrap: creates the first admin account.
 * Every other account (teacher/student) is created by an admin through the
 * app itself — but the very first admin has to come from somewhere.
 *
 * Usage:
 *   node scripts/create-admin.js "Jane" "Doe" jane@chronovision.edu "a-strong-password"
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const db = require('../src/config/db');

async function main() {
  const [first_name, last_name, email, password] = process.argv.slice(2);

  if (!first_name || !last_name || !email || !password) {
    console.error('Usage: node scripts/create-admin.js <first_name> <last_name> <email> <password>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    console.error(`A user with email ${email} already exists.`);
    process.exit(1);
  }

  const user_id = randomUUID();
  const password_hash = await bcrypt.hash(password, 10);

  await db.query(
    `INSERT INTO users (user_id, first_name, last_name, email, password_hash, role)
     VALUES (?, ?, ?, ?, ?, 'admin')`,
    [user_id, first_name, last_name, email, password_hash]
  );

  console.log(`✔ Admin account created: ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to create admin:', err.message);
  process.exit(1);
});
