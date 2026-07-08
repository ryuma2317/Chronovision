const classRepo = require('../repositories/class.repo');
const predictionRepo = require('../repositories/prediction.repo');
const attendanceRepo = require('../repositories/attendance.repo');

const validateMembership = async (class_id, student_id) => {
  const members = await classRepo.getMembers(class_id);
  const isMember = members.some((m) => m.user_id === student_id);
  if (!isMember) {
    const err = new Error('Student is not a member of this class');
    err.status = 403;
    throw err;
  }
};

const getClassDashboard = async (class_id) => {
  const members = await classRepo.getMembers(class_id);
  const students = members.filter((m) => m.role === 'student');

  const studentsWithPredictions = await Promise.all(
    students.map(async (s) => {
      const latest = await predictionRepo.findLatestByStudent(s.user_id);
      const attendance_rate = await attendanceRepo.getAttendanceRate(class_id, s.user_id);
      return {
        ...s,
        latest_prediction: latest
          ? { predicted_gpa: latest.predicted_gpa, bucket: latest.bucket, at_risk_status: latest.at_risk_status }
          : null,
        attendance_rate,
      };
    })
  );

  // Use the schema's own at_risk_status (set by the ML pipeline) rather
  // than re-deriving a threshold here — single source of truth.
  const atRisk = studentsWithPredictions.filter(
    (s) => s.latest_prediction && s.latest_prediction.at_risk_status !== 'on_track'
  );
  const noPrediction = studentsWithPredictions.filter((s) => !s.latest_prediction);

  return {
    total_students: students.length,
    at_risk_count: atRisk.length,
    no_prediction_count: noPrediction.length,
    students: studentsWithPredictions,
    at_risk: atRisk,
  };
};

module.exports = { validateMembership, getClassDashboard };
