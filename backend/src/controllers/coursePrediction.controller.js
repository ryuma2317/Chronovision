const predictionRepo = require('../repositories/prediction.repo');
const courseRepo = require('../repositories/course.repo');
const classRepo = require('../repositories/class.repo');
const mlCourseService = require('../services/mlCourse.service');
const gamificationService = require('../services/gamification.service');

// ONE prediction across ALL the student's classes — or a subset they pick.
// No hardcoded subject list exists anywhere in this file. A student's courses
// are, by definition, whatever the admin put in the classes they enrolled them
// in.

// GET /api/student/courses
// The form builder: every course the student takes, plus their attendance in
// each class (auto-filled, so they never type it).
const getMyCourses = async (req, res, next) => {
  try {
    const courses = await courseRepo.findAllForStudent(req.user.user_id);
    res.json({
      courses,
      total_credits: courses.reduce((s, c) => s + Number(c.credits), 0),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/student/prediction/courses
// body: {
//   features:    { ...15 behaviour fields... },   // optional, falls back to profile
//   course_ids:  ["uuid", ...],                   // optional: predict a SUBSET
//   inputs: {                                     // all four are OPTIONAL
//     "<course_id>": { midterm?, quiz_average?, assignment_average?, course_attendance? }
//   }
// }
const submitCoursePrediction = async (req, res, next) => {
  try {
    const { course_ids, inputs = {} } = req.body;
    let { features } = req.body;
    const student_id = req.user.user_id;

    // 1. THE GATE — enforced by the JOIN, not an if-statement. A course is only
    //    reachable through class_students. No enrolment, no courses, full stop.
    let courses = await courseRepo.findAllForStudent(student_id);
    if (!courses.length) {
      const myClasses = await classRepo.findByStudent(student_id);
      return res.status(422).json({
        message: myClasses.length
          ? 'Your classes have no courses yet. Ask your admin to add them.'
          : 'You are not enrolled in any class yet. An admin needs to add you to a class first.',
      });
    }

    // 2. Subset. We FILTER the enrolled list rather than trusting the incoming
    //    ids — so a student cannot smuggle in a course that isn't theirs.
    const isPartial = Array.isArray(course_ids) && course_ids.length > 0;
    if (isPartial) {
      courses = courses.filter((c) => course_ids.includes(c.course_id));
      if (!courses.length) {
        return res.status(422).json({
          message: 'None of the selected courses are ones you are enrolled in.',
        });
      }
    }

    // 3. Behaviour features — about the PERSON, not any one class, so one
    //    profile serves every course.
    if (!features) {
      const latest = await predictionRepo.findLatestByStudent(student_id);
      if (!latest) {
        return res.status(422).json({
          message: 'Fill in your study habits — we have no profile saved for you yet.',
        });
      }
      features = {};
      predictionRepo.BEHAVIOUR_FIELDS.forEach((f) => { features[f] = latest[f]; });
    }

    // 4. Build the payload. EVERY course input is optional — a blank box means
    //    "hasn't happened yet", which the model handles as NaN. There is no
    //    "you must enter a midterm" check any more; that was the bug that made
    //    the tool useless before week 8.
    //
    //    course_attendance is auto-filled from the attendance you already track
    //    per class, unless the student overrode it.
    const payload = courses.map((c) => {
      const given = inputs[c.course_id] || {};
      return {
        course_id: c.course_id,
        course_name: c.course_name,
        credits: c.credits,
        difficulty_level: c.difficulty_level,
        course_attendance:
          given.course_attendance ?? c.attendance_percentage ?? null,
        quiz_average: given.quiz_average,
        assignment_average: given.assignment_average,
        midterm: given.midterm,
      };
    });

    const ml = await mlCourseService.predictCourses(features, payload, isPartial);

    // 5. Persist.
    const profile_id = await predictionRepo.upsertProfile({
      student_id,
      class_id: courses[0].class_id,   // satisfies UNIQUE(student_id, class_id)
      features,
    });

    const saved = await predictionRepo.createPrediction({
      student_id,
      profile_id,
      predicted_gpa: ml.predicted_gpa,
      bucket: ml.bucket,
      at_risk_status: ml.at_risk_status,
      is_partial: ml.is_partial ? 1 : 0,
      evidence_stage: ml.evidence_stage,
    });

    await courseRepo.createCoursePredictions(saved.prediction_id, ml.courses);

    const { new_badges } = await gamificationService.awardPoints(
      student_id, 'PREDICTION_SUBMITTED'
    );

    res.status(201).json({ ...saved, ...ml, new_badges });
  } catch (err) {
    next(err);
  }
};

// GET /api/student/prediction/:id/courses
const getCourseBreakdown = async (req, res, next) => {
  try {
    const rows = await courseRepo.findByPrediction(req.params.id);
    if (!rows.length) {
      return res.status(404).json({ message: 'No course breakdown found for this prediction' });
    }
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyCourses, submitCoursePrediction, getCourseBreakdown };