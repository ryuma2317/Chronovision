const predictionRepo = require('../repositories/prediction.repo');
const courseRepo = require('../repositories/course.repo');
const simulationRepo = require('../repositories/simulation.repo');
const mlCourseService = require('../services/mlCourse.service');

// WHAT-IF — rewired to the course model.
//
// It was never really broken: it called ml.service.whatif -> port 5001, and
// nothing is listening there. That is the whole "ML what-if service unavailable"
// message.
//
// Rather than restart the dead 36-feature model, we point What-If at the course
// model, which makes it strictly better. Before: "your GPA would be 3.1."
// Now: WHICH courses move, and by how much. Sleeping more helps the hard course
// you're failing more than the easy one you're acing — and now you can see that.

// POST /api/student/whatif
// body: { overrides: { sleep_hours: 8, study_hours_per_day: 6, ... } }
const runWhatIf = async (req, res, next) => {
  try {
    const student_id = req.user.user_id;
    const overrides = req.body.overrides || req.body;

    // 1. The baseline: their most recent real prediction.
    const baseline = await predictionRepo.findLatestByStudent(student_id);
    if (!baseline) {
      return res.status(404).json({
        message: 'No baseline prediction found. Run a prediction first, then simulate.',
      });
    }

    // 2. The SAME courses with the SAME evidence they predicted with. Only the
    //    behaviour changes — otherwise the comparison would be meaningless.
    const baselineCourses = await courseRepo.findLatestForStudent(student_id);
    if (!baselineCourses.length) {
      return res.status(404).json({
        message: 'Your last prediction has no courses. Run a prediction first.',
      });
    }

    // 3. Behaviour features from the profile, then apply the slider overrides.
    const features = {};
    predictionRepo.BEHAVIOUR_FIELDS.forEach((f) => { features[f] = baseline[f]; });

    const allowed = predictionRepo.BEHAVIOUR_FIELDS;
    const applied = {};
    Object.entries(overrides).forEach(([k, v]) => {
      if (allowed.includes(k) && v !== undefined && v !== null && v !== '') {
        features[k] = v;
        applied[k] = v;
      }
    });

    if (!Object.keys(applied).length) {
      return res.status(422).json({ message: 'No valid habit changes were supplied.' });
    }

    // 4. Re-predict the same courses with the new habits.
    const courses = baselineCourses.map((c) => ({
      course_id: c.course_id,
      course_name: c.course_name,
      credits: c.credits,
      difficulty_level: c.difficulty_level,
      course_attendance: c.course_attendance,
      quiz_average: c.quiz_average,
      assignment_average: c.assignment_average,
      midterm: c.midterm_score,
    }));

    const ml = await mlCourseService.predictCourses(features, courses, !!baseline.is_partial);

    const baseline_gpa = Number(baseline.predicted_gpa);
    const simulated_gpa = Number(ml.predicted_gpa);
    const delta = Number((simulated_gpa - baseline_gpa).toFixed(2));

    // 5. The interesting part: WHICH courses moved.
    const before = Object.fromEntries(
      baselineCourses.map((c) => [c.course_id, Number(c.predicted_final)])
    );
    const course_deltas = ml.courses
      .map((c) => ({
        course_id: c.course_id,
        course_name: c.course_name,
        before: before[c.course_id] ?? null,
        after: c.predicted_final,
        delta:
          before[c.course_id] != null
            ? Number((c.predicted_final - before[c.course_id]).toFixed(1))
            : null,
      }))
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));

    // simulation.repo.create stringifies `overrides` and derives delta/improved
    // itself — don't pre-compute them here or you'll double-encode.
    await simulationRepo.create({
      student_id,
      prediction_id: baseline.prediction_id,
      overrides: applied,
      baseline_gpa,
      simulated_gpa,
      course_deltas,
    });

    res.json({
      baseline_gpa,
      simulated_gpa,
      delta,
      improved: delta > 0,
      applied,
      course_deltas,
      biggest_gain: course_deltas[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    res.json(await simulationRepo.findByStudent(req.user.user_id));
  } catch (err) {
    next(err);
  }
};

module.exports = { runWhatIf, getHistory };