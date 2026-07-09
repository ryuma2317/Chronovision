const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');
const userRepo = require('../repositories/user.repo');
const classRepo = require('../repositories/class.repo');

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const EMAIL_G = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

// Pull { email, name } pairs out of free text (used for txt/csv/docx/pdf).
// One email per line gets the rest of the line as a name guess; any email
// missed that way (e.g. several on one line) is still captured with no name.
const extractFromText = (text) => {
  const byEmail = {};
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(EMAIL);
    if (!m) continue;
    const email = m[0].toLowerCase();
    if (!(email in byEmail)) {
      const name = line.replace(m[0], ' ').replace(/[<>,;|"]/g, ' ').replace(/\s+/g, ' ').trim();
      byEmail[email] = name || null;
    }
  }
  for (const e of String(text).match(EMAIL_G) || []) {
    const email = e.toLowerCase();
    if (!(email in byEmail)) byEmail[email] = null;
  }
  return Object.entries(byEmail).map(([email, name]) => ({ email, name }));
};

// Spreadsheets: find the email cell per row; other text cells become the name.
const extractFromRows = (rows) => {
  const out = [];
  for (const row of rows) {
    const cells = (row || []).map((c) => (c == null ? '' : String(c)));
    const emailCell = cells.find((c) => EMAIL.test(c));
    if (!emailCell) continue;
    const email = emailCell.match(EMAIL)[0].toLowerCase();
    const name = cells
      .filter((c) => c !== emailCell && !EMAIL.test(c) && c.trim() && !['email', 'name'].includes(c.trim().toLowerCase()))
      .join(' ')
      .trim();
    out.push({ email, name: name || null });
  }
  return out;
};

const parseRoster = async ({ originalname, buffer }) => {
  const ext = path.extname(originalname || '').toLowerCase();
  let entries;
  if (ext === '.xlsx' || ext === '.xls') {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    entries = extractFromRows(XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }));
  } else if (ext === '.docx') {
    const { value } = await mammoth.extractRawText({ buffer });
    entries = extractFromText(value);
  } else if (ext === '.pdf') {
    const data = await pdfParse(buffer);
    entries = extractFromText(data.text);
  } else {
    entries = extractFromText(buffer.toString('utf8')); // csv, txt, fallback
  }
  // de-dupe by email, keep first name seen
  const seen = new Set();
  return entries.filter((e) => (seen.has(e.email) ? false : (seen.add(e.email), true)));
};

// Enroll each entry; never let one failure stop the rest. Returns which
// students were added and which were skipped, each with a reason.
const bulkEnroll = async (class_id, entries) => {
  const current = await classRepo.getStudents(class_id);
  const enrolled = new Set(current.map((s) => s.user_id));
  const added = [];
  const skipped = [];

  for (const { email, name } of entries) {
    try {
      const user = await userRepo.findByEmail(email);
      if (!user) {
        skipped.push({ email, name, reason: 'not_found' });
      } else if (user.role !== 'student') {
        skipped.push({ email, name: `${user.first_name} ${user.last_name}`, reason: 'not_a_student' });
      } else if (enrolled.has(user.user_id)) {
        skipped.push({ email, name: `${user.first_name} ${user.last_name}`, reason: 'already_enrolled' });
      } else {
        await classRepo.addStudent(class_id, user.user_id);
        enrolled.add(user.user_id);
        added.push({ email, name: `${user.first_name} ${user.last_name}`, user_id: user.user_id });
      }
    } catch (err) {
      skipped.push({ email, name, reason: 'error', detail: err.message });
    }
  }

  return {
    summary: { total: entries.length, added: added.length, skipped: skipped.length },
    added,
    skipped,
  };
};

module.exports = { parseRoster, bulkEnroll };
