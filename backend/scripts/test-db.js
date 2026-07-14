require('dotenv').config();
const db = require('../src/config/db');

(async () => {
  try {
    const [r] = await db.query('SELECT current_database() AS db, inet_server_addr()::text AS host, now() AS t');
    console.log('✅ CONNECTED');
    console.log('   database:', r[0].db);
    console.log('   server:  ', r[0].host);

    const [t] = await db.query(
      "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'"
    );
    console.log('   tables:  ', t[0].n, t[0].n === 26 ? '(all 26 ✓)' : '(expected 26 — run the SQL files)');

    const [u] = await db.query("SELECT count(*)::int AS n FROM users");
    console.log('   users:   ', u[0].n, u[0].n === 0 ? '(empty — run seed-all.js)' : '');
  } catch (e) {
    console.error('❌ FAILED:', e.message);
  }
  process.exit(0);
})();