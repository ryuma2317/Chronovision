const studyplanRepo = require('../repositories/studyplan.repo');
const predictionRepo = require('../repositories/prediction.repo');
const iqtestRepo = require('../repositories/iqtest.repo');
const classRepo = require('../repositories/class.repo');
const studyplanService = require('../services/studyplan.service');
const gamificationService = require('../services/gamification.service');

// POST /api/student/studyplan/auto
// Stage 1: suggest weekly subject hours to hit a target GPA. No calendar yet.
// body: { target_gpa? } — defaults to 3.5
const generateAutoPlan = async (req, res, next) => {
  try {
    const student_id = req.user.user_id;
    const target_gpa = Number(req.body.target_gpa) || 3.5;

    const latestPrediction = await predictionRepo.findLatestByStudent(student_id);
    if (!latestPrediction) {
      return res.status(404).json({ message: 'Submit a GPA prediction first.' });
    }
    const latestIq = await iqtestRepo.findLatestByStudent(student_id);
    if (!latestIq) {
      return res.status(404).json({ message: 'Take the aptitude/IQ test first.' });
    }

    const subjects = studyplanService.generateAutoPlanSubjects({
      profile: latestPrediction,
      predicted_gpa: latestPrediction.predicted_gpa,
      target_gpa,
      iq_percentile: latestIq.percentile,
    });
    const total_study_hours_per_week = subjects.reduce((sum, s) => sum + s.hours_per_week, 0);

    const plan_id = await studyplanRepo.create({
      student_id,
      prediction_id: latestPrediction.prediction_id,
      iq_result_id: latestIq.iq_result_id,
      target_gpa,
      total_study_hours_per_week,
      free_time_hours_per_week: 0,
      status: 'draft',
    });
    await studyplanRepo.addSubjects(plan_id, subjects);

    res.status(201).json({ plan_id, target_gpa, predicted_gpa: latestPrediction.predicted_gpa, subjects });
  } catch (err) {
    next(err);
  }
};

// POST /api/student/studyplan/schedule
// Stage 2: turn confirmed/edited subject hours + free-time slots into a real
// weekly calendar. Rejects (422) if free time can't cover the study hours.
// body: { plan_id?, target_gpa?, subjects: [{subject, hours_per_week, priority}],
//         freeSlots: [{day,start,end}], sessionLengthMinutes? }
const confirmSchedule = async (req, res, next) => {
  try {
    const student_id = req.user.user_id;
    const { plan_id, subjects, freeSlots, sessionLengthMinutes } = req.body;

    if (!Array.isArray(subjects) || subjects.length === 0 || !Array.isArray(freeSlots) || freeSlots.length === 0) {
      return res.status(400).json({ message: 'subjects and freeSlots arrays are required' });
    }

    let targetPlanId = plan_id;

    if (targetPlanId) {
      const existing = await studyplanRepo.findById(targetPlanId);
      if (!existing || existing.student_id !== student_id) {
        return res.status(404).json({ message: 'Study plan not found' });
      }
    } else {
      // No prior auto-plan — student went straight to manual entry.
      const latestPrediction = await predictionRepo.findLatestByStudent(student_id);
      const latestIq = await iqtestRepo.findLatestByStudent(student_id);
      if (!latestPrediction || !latestIq) {
        return res.status(404).json({ message: 'Submit a prediction and take the IQ test first, or pass an existing plan_id.' });
      }
      const target_gpa = Number(req.body.target_gpa) || 3.5;
      const total_study_hours_per_week = subjects.reduce((sum, s) => sum + Number(s.hours_per_week), 0);

      targetPlanId = await studyplanRepo.create({
        student_id,
        prediction_id: latestPrediction.prediction_id,
        iq_result_id: latestIq.iq_result_id,
        target_gpa,
        total_study_hours_per_week,
        free_time_hours_per_week: 0,
        status: 'draft',
      });
      await studyplanRepo.addSubjects(targetPlanId, subjects.map((s) => ({ ...s, priority: s.priority || 'medium' })));
    }

    // The required validation: total free time >= total requested study time, or 422.
    const schedule = studyplanService.generateSchedule({ subjects, freeSlots, sessionLengthMinutes });

    const total_study_hours_per_week = subjects.reduce((sum, s) => sum + Number(s.hours_per_week), 0);
    const free_time_hours_per_week = studyplanService.totalFreeMinutes(freeSlots) / 60;

    await studyplanRepo.clearSchedule(targetPlanId);
    await studyplanRepo.addScheduleEntries(targetPlanId, schedule);
    await studyplanRepo.setHours(targetPlanId, { total_study_hours_per_week, free_time_hours_per_week });
    await studyplanRepo.updateStatus(targetPlanId, 'active');

    const { new_badges } = await gamificationService.awardPoints(student_id, 'STUDY_PLAN_GENERATED');

    const plan = await studyplanRepo.findById(targetPlanId);
    res.status(201).json({ ...plan, new_badges });
  } catch (err) {
    next(err);
  }
};

// GET /api/student/studyplan/latest
const getLatestStudyPlan = async (req, res, next) => {
  try {
    const student_id = req.user.user_id;
    const plan = await studyplanRepo.findLatestByStudent(student_id);
    if (!plan) {
      return res.status(404).json({ message: 'No study plan found. Generate one first.' });
    }
    res.json(plan);
  } catch (err) {
    next(err);
  }
};

// GET /api/teacher/students/:studentId/studyplan
const getStudentStudyPlan = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const teacher_id = req.user.user_id;

    const sharesClass = await classRepo.isTeacherOfStudent(teacher_id, studentId);
    if (!sharesClass) {
      return res.status(403).json({ message: 'You do not teach a class this student is enrolled in' });
    }

    const plan = await studyplanRepo.findLatestByStudent(studentId);
    if (!plan) {
      return res.status(404).json({ message: 'This student has no study plan yet' });
    }
    res.json(plan);
  } catch (err) {
    next(err);
  }
};

module.exports = { generateAutoPlan, confirmSchedule, getLatestStudyPlan, getStudentStudyPlan };
