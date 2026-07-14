const { Pool } = require('pg');
const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = require('./env');

// Supabase requires SSL. Set DB_SSL=false only for a local Postgres.
const useSSL = process.env.DB_SSL !== 'false';

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: 10,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

// Translate a mysql2-style call into Postgres. Handles the two things the
// existing repository code relies on:
//   1. `?` positional placeholders   -> `$1, $2, ...`
//   2. bulk insert `... VALUES ?`     -> `... VALUES ($1,$2),($3,$4),...`
//      (mysql2 expanded a 2-D array passed as a single param; Postgres can't)
function prepare(text, params) {
  params = params || [];

  const isBulk =
    /VALUES\s*\?\s*$/i.test(text) &&
    params.length === 1 &&
    Array.isArray(params[0]) &&
    Array.isArray(params[0][0]);

  if (isBulk) {
    const rows = params[0];
    const cols = rows[0].length;
    const groups = rows
      .map(() => `(${Array(cols).fill('?').join(', ')})`)
      .join(', ');
    text = text.replace(/VALUES\s*\?\s*$/i, `VALUES ${groups}`);
    params = rows.flat();
  }

  // mysql2 silently coerced JS booleans to 1/0 for TINYINT columns; Postgres
  // is strict, so do the same coercion here (all flag columns are SMALLINT).
  params = params.map((v) => (v === true ? 1 : v === false ? 0 : v));

  let i = 0;
  const pgText = text.replace(/\?/g, () => `$${++i}`);
  return { pgText, params };
}

// Return a mysql2-shaped result: [rows, fields]. `rows` is the row array, and
// we attach `affectedRows` so write code (`const [result] = ...;
// result.affectedRows`) keeps working without changes.
function wrap(res) {
  const rows = res.rows;
  rows.affectedRows = res.rowCount;
  return [rows, res.fields];
}

async function query(text, params) {
  const { pgText, params: p } = prepare(text, params);
  return wrap(await pool.query(pgText, p));
}

// mysql2-compatible transaction handle (used by quiz.repo.js).
async function getConnection() {
  const client = await pool.connect();
  return {
    query: async (text, params) => {
      const { pgText, params: p } = prepare(text, params);
      return wrap(await client.query(pgText, p));
    },
    beginTransaction: () => client.query('BEGIN'),
    commit: () => client.query('COMMIT'),
    rollback: () => client.query('ROLLBACK'),
    release: () => client.release(),
  };
}

module.exports = { query, getConnection };
