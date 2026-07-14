/**
 * Study plan generation — now driven by the student's ACTUAL COURSES.
 *
 * WHAT CHANGED
 * ------------
 * The old version opened with:
 *
 *     const SUBJECT_FIELDS = [
 *       ['mathematics_score', 'Mathematics'],
 *       ['biology_score', 'Biology'],
 *       ...
 *     ];
 *
 * — six hardcoded columns on student_academic_profiles. So the study plan
 * always allocated hours to the same six subjects no matter what class the
 * student was actually in.
 *
 * Now it takes `courses` — the per-course rows of the student's latest
 * prediction (course_predictions), which came from the class the admin
 * enrolled them in. If the class teaches four courses, the plan has four rows.
 * If it teaches eleven, it has eleven.
 *
 * TWO STAGES, unchanged:
 *   1. generateAutoPlanCourses() — suggest weekly hours per course to close the
 *      gap toward a target GPA.
 *   2. generateSchedule() — turn confirmed hours + free-time slots into a real
 *      weekly calendar, rejecting (422) if free time cannot cover the hours.
 */

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const toTimeString = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const priorityFor = (need) => (need >= 0.5 ? 'high' : need >= 0.25 ? 'medium' : 'low');

/**
 * courses: rows from course_predictions for the student's latest prediction —
 *          [{ course_id, course_name, predicted_final, credits, difficulty_level }]
 * predicted_gpa / target_gpa: 0.0-4.0
 * iq_percentile: 0-100, a rough learning-efficiency modifier.
 *
 * Hours are allocated on THREE signals, not just the score:
 *   - weakness  : how far the PREDICTED FINAL is from 100
 *   - credits   : a 4-credit course moves the GPA harder than a 1-credit one,
 *                 so an hour spent there is worth more
 *   - difficulty: harder courses need more time per point of improvement
 *
 * This is why the admin's credits/difficulty settings matter: they change the
 * study plan, not just the GPA arithmetic.
 */
const generateAutoPlanCourses = ({ courses, predicted_gpa, target_gpa = 3.5, iq_percentile = 50 }) => {
  if (!courses || !courses.length) {
    const err = new Error(
      'No courses found on your latest prediction. Run a prediction for a class first.'
    );
    err.status = 422;
    throw err;
  }

  const gpaGap = Math.max(target_gpa - Number(predicted_gpa), 0.1);
  const efficiency = 0.7 + (Number(iq_percentile) / 100) * 0.6; // 0.7 (needs more time) .. 1.3

  const maxCredits = Math.max(...courses.map((c) => Number(c.credits)));

  const plan = courses.map((c) => {
    const score = Number(c.predicted_final);
    const credits = Number(c.credits);
    const difficulty = Number(c.difficulty_level ?? 3);

    const weakness = Math.max(0, (100 - score) / 100);        // 0 = perfect, 1 = worst
    const creditWeight = 0.7 + 0.3 * (credits / maxCredits);  // 0.7 .. 1.0
    const difficultyWeight = 0.85 + (difficulty - 1) * 0.075; // 0.85 (easy) .. 1.15 (hardest)

    // "need" blends all three, and is what drives priority.
    const need = Math.min(1, weakness * creditWeight * difficultyWeight);

    const rawHours = 1 + need * 4;                            // 1..5 base hours/week
    const adjusted = (rawHours * (1 + gpaGap)) / efficiency;
    const hours_per_week = Math.max(0.5, Math.round(adjusted * 2) / 2); // nearest 0.5h

    return {
      course_id: c.course_id || null,
      subject: c.course_name,          // study_plan_subjects.subject_name
      score,
      credits,
      difficulty_level: difficulty,
      hours_per_week,
      priority: priorityFor(need),
      reason:
        `Predicted final in ${c.course_name} is ${score}/100 ` +
        `(${credits} credits, difficulty ${difficulty}/5). ` +
        `Recommended ${hours_per_week}h/week toward your ${target_gpa} GPA target.`,
    };
  });

  return plan.sort((a, b) => b.hours_per_week - a.hours_per_week);
};

// ── Everything below is unchanged from your original file ────────────────────

const validateFreeTime = (freeSlots) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  for (const slot of freeSlots) {
    if (!days.includes(slot.day)) {
      const err = new Error(`Invalid day: ${slot.day}`);
      err.status = 422;
      throw err;
    }
    if (toMinutes(slot.start) >= toMinutes(slot.end)) {
      const err = new Error(`Invalid time range for ${slot.day}: start must be before end`);
      err.status = 422;
      throw err;
    }
  }

  const byDay = {};
  freeSlots.forEach((slot) => {
    if (!byDay[slot.day]) byDay[slot.day] = [];
    byDay[slot.day].push(slot);
  });

  for (const day in byDay) {
    const sorted = [...byDay[day]].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    for (let i = 1; i < sorted.length; i++) {
      if (toMinutes(sorted[i].start) < toMinutes(sorted[i - 1].end)) {
        const err = new Error(`Overlapping free time slots on ${day}`);
        err.status = 422;
        throw err;
      }
    }
  }

  return true;
};

const totalFreeMinutes = (freeSlots) =>
  freeSlots.reduce((sum, slot) => sum + (toMinutes(slot.end) - toMinutes(slot.start)), 0);

const totalNeededMinutes = (subjects) =>
  subjects.reduce((sum, s) => sum + Number(s.hours_per_week) * 60, 0);

const checkCapacity = (subjects, freeSlots) => {
  const needed = totalNeededMinutes(subjects);
  const available = totalFreeMinutes(freeSlots);
  if (available < needed) {
    const err = new Error(
      `Not enough free time: you need ${(needed / 60).toFixed(1)}h/week to cover your courses, ` +
      `but only entered ${(available / 60).toFixed(1)}h/week of free time. ` +
      `Add more free time or reduce course hours.`
    );
    err.status = 422;
    throw err;
  }
  return { needed_minutes: needed, available_minutes: available };
};

const generateSchedule = ({ subjects, freeSlots, sessionLengthMinutes = 60 }) => {
  validateFreeTime(freeSlots);
  checkCapacity(subjects, freeSlots);

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const orderedSlots = [...freeSlots].sort(
    (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day) || toMinutes(a.start) - toMinutes(b.start)
  );

  const priorityRank = { high: 0, medium: 1, low: 2 };
  const queue = [...subjects]
    .sort((a, b) => (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1))
    .map((s) => ({
      subject: s.subject,
      course_id: s.course_id || null,
      remainingMinutes: Math.round(Number(s.hours_per_week) * 60),
    }));

  const schedule = [];
  let queueIndex = 0;

  for (const slot of orderedSlots) {
    let cursor = toMinutes(slot.start);
    const slotEnd = toMinutes(slot.end);

    while (cursor < slotEnd) {
      while (queueIndex < queue.length && queue[queueIndex].remainingMinutes <= 0) queueIndex++;

      if (queueIndex >= queue.length) {
        schedule.push({
          day: slot.day, start: toTimeString(cursor), end: toTimeString(slotEnd), activity_type: 'free',
        });
        break;
      }

      const current = queue[queueIndex];
      const chunk = Math.min(sessionLengthMinutes, current.remainingMinutes, slotEnd - cursor);
      schedule.push({
        day: slot.day,
        start: toTimeString(cursor),
        end: toTimeString(cursor + chunk),
        activity_type: 'study',
        subject: current.subject,
        course_id: current.course_id,
      });

      current.remainingMinutes -= chunk;
      cursor += chunk;
    }
  }

  return schedule;
};

module.exports = {
  generateAutoPlanCourses,
  validateFreeTime,
  totalFreeMinutes,
  totalNeededMinutes,
  checkCapacity,
  generateSchedule,
};