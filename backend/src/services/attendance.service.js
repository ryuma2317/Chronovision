const attendanceRepo = require('../repositories/attendance.repo');

/**
 * Automatically marks a student "present" for a class when they submit a quiz.
 * Called from quiz submission flow — ties quiz completion to attendance.
 */
const autoMarkPresent = async ({ class_id, student_id, quiz_attempt_id = null }) => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  await attendanceRepo.upsert({
    class_id,
    student_id,
    session_date: today,
    status: 'present',
    quiz_attempt_id,
  });
};

module.exports = { autoMarkPresent };
