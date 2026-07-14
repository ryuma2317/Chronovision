/**
 * FULL DATABASE SEEDER — populates every table in Chronovision.
 *
 * PREREQS — run these three in the Supabase SQL Editor first, in order:
 *   1. chronovision_schema_postgres.sql   (creates the 24 core tables)
 *   2. chronovision_seed_postgres.sql     (badges, aptitude_questions, aptitude_options)
 *   3. db/subject_predictions.sql         (subjects, subject_predictions)
 *
 * Then:
 *   node scripts/seed-all.js              # seed everything
 *   node scripts/seed-all.js --reset      # wipe previous demo data, then re-seed
 *
 * ── ACCOUNTS ────────────────────────────────────────────────
 *   10  admins    admin1@chronovision.edu    … ChronoVision000001 .. 000010
 *   20  teachers  teacher1@chronovision.edu  … chronovision1001   .. 1020
 *  200  students  student1@chronovision.edu  … IDTB111001         .. 111200
 *
 *   Rule:  admin{i}   -> ChronoVision + 6 digits (i zero-padded)
 *          teacher{i} -> chronovision + 4 digits (1000 + i)
 *          student{i} -> IDTB11       + 4 digits (1000 + i)
 * ─────────────────────────────────────────────────────────────
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const db = require('../src/config/db');

const N_ADMINS = 10;
const N_TEACHERS = 20;
const N_STUDENTS = 200;
const N_CLASSES = 10;
const RESET = process.argv.includes('--reset');

const adminPw = (i) => `ChronoVision${String(i).padStart(6, '0')}`;
const teacherPw = (i) => `chronovision${1000 + i}`;
const studentPw = (i) => `IDTB11${1000 + i}`;

// ── helpers ──────────────────────────────────────────────────
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const int = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const dec = (lo, hi, dp = 2) => Number((Math.random() * (hi - lo) + lo).toFixed(dp));
const maybe = (p = 0.5) => (Math.random() < p ? 1 : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const shuffle = (a) => a.slice().sort(() => Math.random() - 0.5);

/**
 * Multi-row insert. Postgres caps a statement at 65535 parameters, so we chunk.
 * `conflict` lets us stay idempotent, e.g. 'ON CONFLICT (a, b) DO NOTHING'.
 */
async function bulk(table, cols, rows, conflict = '') {
  if (rows.length === 0) return 0;
  const perRow = cols.length;
  const maxRows = Math.max(1, Math.floor(30000 / perRow));
  let inserted = 0;

  for (let i = 0; i < rows.length; i += maxRows) {
    const chunk = rows.slice(i, i + maxRows);
    const values = chunk.map(() => `(${cols.map(() => '?').join(',')})`).join(',');
    await db.query(
      `INSERT INTO ${table} (${cols.join(',')}) VALUES ${values} ${conflict}`,
      chunk.flat()
    );
    inserted += chunk.length;
  }
  return inserted;
}

const log = (table, n) => console.log(`  ${String(n).padStart(5)}  ${table}`);

// ── reset ────────────────────────────────────────────────────
// Order matters: classes.created_by -> users has NO cascade, so classes go first.
// Everything else hangs off users/classes with ON DELETE CASCADE.
async function reset() {
  console.log('Resetting demo data…');
  await db.query(`DELETE FROM classes WHERE class_name LIKE 'Demo %'`);
  await db.query(
    `DELETE FROM users WHERE email ~ '^(admin|teacher|student)[0-9]+@chronovision\\.edu$'`
  );
  console.log('  demo users + classes removed (children cascaded)\n');
}

// ── main ─────────────────────────────────────────────────────
async function main() {
  // Guard: the three SQL files must have run already.
  for (const t of ['badges', 'aptitude_questions', 'subjects']) {
    const [r] = await db.query(`SELECT count(*)::int AS n FROM ${t}`);
    if (r[0].n === 0) {
      console.error(
        `✖ Table "${t}" is empty. Run the three SQL files in the Supabase SQL Editor first:\n` +
          '    1. chronovision_schema_postgres.sql\n' +
          '    2. chronovision_seed_postgres.sql\n' +
          '    3. db/subject_predictions.sql'
      );
      process.exit(1);
    }
  }

  if (RESET) await reset();

  console.log('Seeding…\n');

  // ── 1. users ───────────────────────────────────────────────
  // bcrypt is deliberately slow (~80ms each). 230 hashes would take ~20s, so we
  // hash each DISTINCT password once — passwords are unique per user, but this
  // still lets us run them concurrently instead of serially.
  const userRows = [];
  const admins = [];
  const teachers = [];
  const students = [];

  const mk = async (i, role, email, pw, bucket) => {
    const id = randomUUID();
    const hash = await bcrypt.hash(pw, 10);
    userRows.push([id, email, hash, role, role[0].toUpperCase() + role.slice(1), String(i)]);
    bucket.push(id);
  };

  const jobs = [];
  for (let i = 1; i <= N_ADMINS; i++)
    jobs.push(mk(i, 'admin', `admin${i}@chronovision.edu`, adminPw(i), admins));
  for (let i = 1; i <= N_TEACHERS; i++)
    jobs.push(mk(i, 'teacher', `teacher${i}@chronovision.edu`, teacherPw(i), teachers));
  for (let i = 1; i <= N_STUDENTS; i++)
    jobs.push(mk(i, 'student', `student${i}@chronovision.edu`, studentPw(i), students));
  await Promise.all(jobs);

  log(
    'users',
    await bulk(
      'users',
      ['user_id', 'email', 'password_hash', 'role', 'first_name', 'last_name'],
      userRows,
      'ON CONFLICT (email) DO NOTHING'
    )
  );

  // ── 2. classes ─────────────────────────────────────────────
  const SUBJECT_NAMES = [
    'Mathematics', 'Physics', 'Computer Science',
    'Chemistry', 'Biology', 'Statistics',
  ];
  const year = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  const classes = [];
  const classRows = [];
  for (let i = 0; i < N_CLASSES; i++) {
    const id = randomUUID();
    classes.push(id);
    classRows.push([
      id,
      admins[i % admins.length],
      `Demo ${SUBJECT_NAMES[i % SUBJECT_NAMES.length]} ${101 + i}`,
      'Seeded demo class',
      year,
      int(1, 8),
    ]);
  }
  log('classes', await bulk('classes',
    ['class_id', 'created_by', 'class_name', 'description', 'academic_year', 'semester'],
    classRows));

  // ── 3. class_teachers — 2 teachers per class ───────────────
  const classTeacher = {}; // class_id -> primary teacher (for lessons/quizzes)
  const ctRows = [];
  classes.forEach((cid, i) => {
    const t1 = teachers[(i * 2) % teachers.length];
    const t2 = teachers[(i * 2 + 1) % teachers.length];
    classTeacher[cid] = t1;
    ctRows.push([randomUUID(), cid, t1], [randomUUID(), cid, t2]);
  });
  log('class_teachers', await bulk('class_teachers', ['id', 'class_id', 'teacher_id'], ctRows,
    'ON CONFLICT (class_id, teacher_id) DO NOTHING'));

  // ── 4. class_students — 20 students per class ──────────────
  const studentClass = {}; // student_id -> class_id
  const csRows = [];
  students.forEach((sid, i) => {
    const cid = classes[i % classes.length];
    studentClass[sid] = cid;
    csRows.push([randomUUID(), cid, sid]);
  });
  log('class_students', await bulk('class_students', ['id', 'class_id', 'student_id'], csRows,
    'ON CONFLICT (class_id, student_id) DO NOTHING'));

  // ── 5. student_academic_profiles ───────────────────────────
  // Each student gets a hidden "diligence" score. Habits AND grades are both
  // derived from it, so the at-risk dashboard shows a believable spread instead
  // of noise where every student predicts the same mediocre GPA.
  const diligence = {};
  const profileOf = {};
  const profRows = [];
  const PROF_COLS = [
    'profile_id','student_id','class_id','age','gender','major','semester','course_load',
    'study_hours_per_day','attendance_percentage','time_management_score','study_environment',
    'social_media_hours','netflix_hours','sleep_hours','diet_quality','exercise_frequency',
    'part_time_job','extracurricular_participation','stress_level','mental_health_rating',
    'exam_anxiety_score','motivation_level','learning_style','parental_education_level',
    'parental_support_level','family_income_range','internet_quality','access_to_tutoring',
    'previous_gpa','aptitude_score','exam_score','mathematics_score','biology_score',
    'chemistry_score','physics_score','computer_science_score','statistics_score',
  ];
  for (const sid of students) {
    const d = Math.random();
    diligence[sid] = d;
    const pid = randomUUID();
    profileOf[sid] = pid;
    const base = 45 + d * 45;
    const sc = () => clamp(dec(base - 12, base + 12), 0, 100);

    profRows.push([
      pid, sid, studentClass[sid],
      int(18, 25), pick(['male','female','other']), pick(SUBJECT_NAMES), int(1, 8), int(3, 7),
      dec(0.5 + d * 3, 1.5 + d * 4), dec(55 + d * 40, clamp(70 + d * 30, 0, 100)),
      int(1 + Math.round(d * 5), 5 + Math.round(d * 5)), pick(['home','library','cafe','dormitory']),
      dec(0.5, 5 - d * 3), dec(0.2, 4 - d * 2), dec(5 + d * 2, 7 + d * 1.5),
      pick(['poor','average','good']), int(0, 7), maybe(0.35), maybe(0.5),
      int(1, 10), int(1 + Math.round(d * 4), 6 + Math.round(d * 4)), int(1, 10),
      int(1 + Math.round(d * 5), 5 + Math.round(d * 5)),
      pick(['visual','auditory','reading','kinesthetic']),
      pick(['high_school','bachelor','master','phd']), int(1, 10),
      pick(['low','middle','high']), pick(['poor','moderate','good','excellent']), maybe(0.3),
      dec(clamp(1.5 + d * 2.3, 0, 4), clamp(2.0 + d * 2.0, 0, 4)),
      int(40 + Math.round(d * 40), 60 + Math.round(d * 40)),
      sc(), sc(), sc(), sc(), sc(), sc(), sc(),
    ]);
  }
  log('student_academic_profiles', await bulk('student_academic_profiles', PROF_COLS, profRows,
    'ON CONFLICT (student_id, class_id) DO NOTHING'));

  // ── 6. gpa_predictions ─────────────────────────────────────
  const predOf = {};
  const predGpa = {};
  const predRows = [];
  for (const sid of students) {
    const d = diligence[sid];
    const gpa = clamp(dec(1.2 + d * 2.6, 1.6 + d * 2.4), 0, 4);
    const status = gpa < 2.0 ? 'high_risk' : gpa < 2.7 ? 'at_risk' : 'on_track';
    const pid = randomUUID();
    predOf[sid] = pid;
    predGpa[sid] = gpa;
    predRows.push([
      pid, sid, profileOf[sid], gpa,
      gpa >= 3.5 ? 'excellent' : gpa >= 3.0 ? 'good' : gpa >= 2.0 ? 'average' : 'poor',
      status, clamp(gpa - 0.25, 0, 4), clamp(gpa + 0.25, 0, 4),
    ]);
  }
  log('gpa_predictions', await bulk('gpa_predictions',
    ['prediction_id','student_id','profile_id','predicted_gpa','bucket','at_risk_status',
     'confidence_lower','confidence_upper'], predRows));

  // ── 7. subject_predictions — 6 rows per prediction ─────────
  const [subjectRows] = await db.query(
    'SELECT subject_key, credits FROM subjects WHERE is_active = 1'
  );
  const totalCredits = subjectRows.reduce((s, r) => s + Number(r.credits), 0);
  const spRows = [];
  for (const sid of students) {
    const d = diligence[sid];
    // grade points per subject, weighted by credits -> contribution to GPA
    const gps = subjectRows.map(() => clamp(dec(1.0 + d * 3.0, 1.6 + d * 2.4, 3), 0, 4));
    const contrib = subjectRows.map((r, i) => (gps[i] * Number(r.credits)) / totalCredits);
    const contribTotal = contrib.reduce((a, b) => a + b, 0) || 1;

    subjectRows.forEach((r, i) => {
      const mid = clamp(dec(40 + d * 45, 60 + d * 40), 0, 100);
      spRows.push([
        randomUUID(), predOf[sid], r.subject_key,
        mid,
        clamp(dec(mid - 8, mid + 10), 0, 100),   // predicted_final
        r.credits,
        gps[i],
        Number(contrib[i].toFixed(3)),
        Number(((contrib[i] / contribTotal) * 100).toFixed(2)),
        Number(((Number(r.credits) / totalCredits) * 100).toFixed(2)),
      ]);
    });
  }
  log('subject_predictions', await bulk('subject_predictions',
    ['id','prediction_id','subject_key','midterm_score','predicted_final','credits',
     'grade_point','contribution_points','contribution_pct','weight_pct'], spRows,
    'ON CONFLICT (prediction_id, subject_key) DO NOTHING'));

  // ── 8. iq_test_results ─────────────────────────────────────
  const iqOf = {};
  const iqRows = [];
  for (const sid of students) {
    const d = diligence[sid];
    const correct = int(3 + Math.round(d * 6), 6 + Math.round(d * 9));
    const id = randomUUID();
    iqOf[sid] = id;
    iqRows.push([
      id, sid, correct, Math.round(85 + d * 45), dec(10 + d * 85, 25 + d * 74),
      15, clamp(correct, 0, 15), int(300, 1500),
    ]);
  }
  log('iq_test_results', await bulk('iq_test_results',
    ['iq_result_id','student_id','score','iq_estimate','percentile',
     'questions_attempted','correct_answers','time_taken_seconds'], iqRows));

  // ── 9. study_plans (+ subjects + schedule) ─────────────────
  const planRows = [], planSubRows = [], schedRows = [];
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  for (const sid of students) {
    const d = diligence[sid];
    const planId = randomUUID();
    const study = dec(4 + d * 16, 8 + d * 14);
    planRows.push([
      planId, sid, predOf[sid], iqOf[sid],
      clamp(Number((predGpa[sid] + dec(0.2, 0.6)).toFixed(2)), 0, 4),
      study, dec(study, study + 12),
      pick(['draft','active','active','completed']),
    ]);

    // split the weekly hours across the six subjects
    const weights = subjectRows.map(() => Math.random());
    const wSum = weights.reduce((a, b) => a + b, 0);
    subjectRows.forEach((r, i) => {
      planSubRows.push([
        randomUUID(), planId, r.subject_key,
        Number(((study * weights[i]) / wSum).toFixed(2)),
        pick(['high','medium','low']),
        'Auto-generated from predicted weak areas',
      ]);
    });

    // 5 scheduled blocks; end_time > start_time is a CHECK constraint
    for (let k = 0; k < 5; k++) {
      const start = int(8, 19);
      schedRows.push([
        randomUUID(), planId, DAYS[k % 7],
        `${String(start).padStart(2, '0')}:00:00`,
        `${String(start + 1).padStart(2, '0')}:30:00`,
        pick(['study','study','study','break','exercise']),
        pick(SUBJECT_NAMES), null,
      ]);
    }
  }
  log('study_plans', await bulk('study_plans',
    ['plan_id','student_id','prediction_id','iq_result_id','target_gpa',
     'total_study_hours_per_week','free_time_hours_per_week','status'], planRows));
  log('study_plan_subjects', await bulk('study_plan_subjects',
    ['id','plan_id','subject_name','hours_per_week','priority','reason'], planSubRows));
  log('study_plan_schedule', await bulk('study_plan_schedule',
    ['schedule_id','plan_id','day_of_week','start_time','end_time','activity_type',
     'subject_name','notes'], schedRows));

  // ── 10. whatif_simulations — 2 per student ─────────────────
  const wiRows = [];
  for (const sid of students) {
    for (let k = 0; k < 2; k++) {
      const baseline = predGpa[sid];
      const delta = dec(-0.3, 0.5);
      const sim = clamp(Number((baseline + delta).toFixed(2)), 0, 4);
      wiRows.push([
        randomUUID(), sid, predOf[sid],
        JSON.stringify({ study_hours_per_day: dec(1, 6), sleep_hours: dec(5, 9) }),
        baseline, sim, Number((sim - baseline).toFixed(2)), sim > baseline ? 1 : 0,
      ]);
    }
  }
  log('whatif_simulations', await bulk('whatif_simulations',
    ['simulation_id','student_id','prediction_id','overrides','baseline_gpa',
     'simulated_gpa','delta','improved'], wiRows));

  // ── 11. lessons + lesson_views ─────────────────────────────
  const lessons = [];
  const lessonRows = [];
  for (const cid of classes) {
    for (let k = 1; k <= 4; k++) {
      const id = randomUUID();
      lessons.push({ id, cid });
      lessonRows.push([
        id, cid, classTeacher[cid], `Lesson ${k}: Core Concepts`,
        'Seeded demo lesson', `/uploads/demo-lesson-${k}.pdf`, 'pdf',
        int(50000, 900000), 1,
      ]);
    }
  }
  log('lessons', await bulk('lessons',
    ['lesson_id','class_id','teacher_id','title','description','file_url','file_type',
     'file_size_bytes','is_published'], lessonRows));

  const lvRows = [];
  for (const { id, cid } of lessons) {
    for (const sid of students.filter((s) => studentClass[s] === cid)) {
      if (Math.random() < 0.25 + diligence[sid] * 0.6) {
        lvRows.push([randomUUID(), id, sid, maybe(diligence[sid])]);
      }
    }
  }
  log('lesson_views', await bulk('lesson_views',
    ['view_id','lesson_id','student_id','completed'], lvRows,
    'ON CONFLICT (lesson_id, student_id) DO NOTHING'));

  // ── 12. quizzes + questions + options ──────────────────────
  const quizzes = [];
  const quizRows = [], qqRows = [], qoRows = [];
  for (const cid of classes) {
    for (let k = 1; k <= 2; k++) {
      const quizId = randomUUID();
      const questions = [];
      quizzes.push({ quizId, cid, questions });
      quizRows.push([
        quizId, cid, classTeacher[cid], `Quiz ${k}: Progress Check`,
        pick(['manual','ai_generated']), null, int(15, 45), 2, 1,
      ]);

      for (let q = 1; q <= 5; q++) {
        const qid = randomUUID();
        const correctLabel = pick(['A','B','C','D']);
        const options = [];
        qqRows.push([qid, quizId, q, `Question ${q} for Quiz ${k}?`, 'Seeded explanation.']);

        for (const label of ['A','B','C','D']) {
          const oid = randomUUID();
          const isCorrect = label === correctLabel ? 1 : 0;
          options.push({ oid, isCorrect });
          qoRows.push([oid, qid, label, `Option ${label}`, isCorrect]);
        }
        questions.push({ qid, options });
      }
    }
  }
  log('quizzes', await bulk('quizzes',
    ['quiz_id','class_id','teacher_id','title','quiz_type','source_file_url',
     'time_limit_minutes','max_attempts','is_published'], quizRows));
  log('quiz_questions', await bulk('quiz_questions',
    ['question_id','quiz_id','question_order','question_text','explanation'], qqRows,
    'ON CONFLICT (quiz_id, question_order) DO NOTHING'));
  log('quiz_options', await bulk('quiz_options',
    ['option_id','question_id','option_label','option_text','is_correct'], qoRows,
    'ON CONFLICT (question_id, option_label) DO NOTHING'));

  // ── 13. quiz_attempts + answers ────────────────────────────
  const attemptRows = [], answerRows = [];
  const attemptsByStudent = {};
  for (const { quizId, cid, questions } of quizzes) {
    for (const sid of students.filter((s) => studentClass[s] === cid)) {
      if (Math.random() > 0.8) continue; // ~20% never attempt
      const attemptId = randomUUID();
      let correct = 0;

      for (const { qid, options } of questions) {
        // stronger students pick the right option more often
        const getsIt = Math.random() < 0.3 + diligence[sid] * 0.6;
        const chosen = getsIt
          ? options.find((o) => o.isCorrect)
          : pick(options.filter((o) => !o.isCorrect));
        if (chosen.isCorrect) correct++;
        answerRows.push([randomUUID(), attemptId, qid, chosen.oid, chosen.isCorrect]);
      }

      const score = Number(((correct / questions.length) * 100).toFixed(2));
      attemptRows.push([
        attemptId, quizId, sid, new Date(), score, questions.length, correct, 'graded',
      ]);
      (attemptsByStudent[sid] ||= []).push({ attemptId, score });
    }
  }
  log('quiz_attempts', await bulk('quiz_attempts',
    ['attempt_id','quiz_id','student_id','submitted_at','score','total_questions',
     'correct_answers','status'], attemptRows));
  log('quiz_attempt_answers', await bulk('quiz_attempt_answers',
    ['id','attempt_id','question_id','selected_option_id','is_correct'], answerRows,
    'ON CONFLICT (attempt_id, question_id) DO NOTHING'));

  // ── 14. attendance — 12 sessions per class ─────────────────
  const attRows = [];
  for (const cid of classes) {
    const roster = students.filter((s) => studentClass[s] === cid);
    for (let s = 0; s < 12; s++) {
      const day = new Date();
      day.setDate(day.getDate() - s * 7);
      const iso = day.toISOString().slice(0, 10);
      for (const sid of roster) {
        const r = Math.random();
        const d = diligence[sid];
        const status =
          r < 0.55 + d * 0.35 ? 'present' : r < 0.8 ? 'late' : r < 0.9 ? 'excused' : 'absent';
        attRows.push([randomUUID(), cid, sid, iso, status, classTeacher[cid]]);
      }
    }
  }
  log('attendance', await bulk('attendance',
    ['attendance_id','class_id','student_id','session_date','status','marked_by'], attRows,
    'ON CONFLICT (class_id, student_id, session_date) DO NOTHING'));

  // ── 15. student_points ─────────────────────────────────────
  const REASONS = ['Quiz completed','Lesson viewed','Study plan created',
                   'Perfect attendance','Prediction run'];
  const ptsRows = [];
  const totalPoints = {};
  for (const sid of students) {
    const n = int(3, 8);
    totalPoints[sid] = 0;
    for (let k = 0; k < n; k++) {
      const p = int(10, 120);
      totalPoints[sid] += p;
      ptsRows.push([randomUUID(), sid, studentClass[sid], p, pick(REASONS)]);
    }
  }
  log('student_points', await bulk('student_points',
    ['id','student_id','class_id','points','reason'], ptsRows));

  // ── 16. student_badges — awarded on the points ladder ──────
  const [badges] = await db.query(
    "SELECT badge_id, criteria_value FROM badges WHERE criteria_type = 'points' ORDER BY criteria_value"
  );
  const sbRows = [];
  for (const sid of students) {
    for (const b of badges) {
      if (totalPoints[sid] >= Number(b.criteria_value)) {
        sbRows.push([randomUUID(), sid, b.badge_id]);
      }
    }
  }
  log('student_badges', await bulk('student_badges',
    ['id','student_id','badge_id'], sbRows,
    'ON CONFLICT (student_id, badge_id) DO NOTHING'));

  // ── done ───────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(58));
  console.log('Log in with any of these:\n');
  console.log(`  admin1@chronovision.edu     ${adminPw(1)}`);
  console.log(`  teacher1@chronovision.edu   ${teacherPw(1)}`);
  console.log(`  student1@chronovision.edu   ${studentPw(1)}`);
  console.log('\n  Pattern:');
  console.log(`    admin{i}    ChronoVision + i padded to 6  (admin10 -> ${adminPw(10)})`);
  console.log(`    teacher{i}  chronovision + (1000 + i)     (teacher20 -> ${teacherPw(20)})`);
  console.log(`    student{i}  IDTB11 + (1000 + i)           (student200 -> ${studentPw(200)})`);
  console.log('─'.repeat(58));
  process.exit(0);
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  if (err.detail) console.error('Detail:', err.detail);
  process.exit(1);
});
