/**
 * Study plan generation — two stages, matching the product flow:
 *
 *  1. generateAutoPlanSubjects() — right after a GPA prediction + IQ test,
 *     suggest how many weekly hours each subject needs to close the gap
 *     toward a target GPA (default 3.5). No calendar yet — just allocation.
 *
 *  2. generateSchedule() — once the student has confirmed/edited those
 *     subject hours and entered their actual free-time slots, build the
 *     real weekly calendar. This is also where the required business
 *     rule lives: total free time must be >= total hours needed, or we
 *     reject with a 422 instead of silently producing an impossible plan.
 */

const SUBJECT_FIELDS = [
  ['mathematics_score', 'Mathematics'],
  ['biology_score', 'Biology'],
  ['chemistry_score', 'Chemistry'],
  ['physics_score', 'Physics'],
  ['computer_science_score', 'Computer Science'],
  ['statistics_score', 'Statistics'],
];

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const toTimeString = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const priorityFor = (weakness) => (weakness >= 0.5 ? 'high' : weakness >= 0.25 ? 'medium' : 'low');

/**
 * profile: the student_academic_profiles row (has *_score fields 0-100)
 * predicted_gpa / target_gpa: decimals 0.0-4.0
 * iq_percentile: 0-100 (from the student's latest iq_test_results), used as
 *   a rough "learning efficiency" modifier — lower percentile -> a bit more
 *   recommended time to close the same gap, higher percentile -> a bit less.
 */
const generateAutoPlanSubjects = ({ profile, predicted_gpa, target_gpa = 3.5, iq_percentile = 50 }) => {
  const gpaGap = Math.max(target_gpa - predicted_gpa, 0.1);
  const efficiency = 0.7 + (iq_percentile / 100) * 0.6; // 0.7 (needs more time) .. 1.3 (needs less)

  const subjects = SUBJECT_FIELDS.map(([field, label]) => {
    const score = Number(profile[field]);
    const weakness = Math.max(0, (100 - score) / 100); // 0 = perfect, 1 = worst
    const rawHours = 1 + weakness * 4; // 1..5 base hours/week
    const adjusted = (rawHours * (1 + gpaGap)) / efficiency;
    const hours_per_week = Math.max(0.5, Math.round(adjusted * 2) / 2); // nearest 0.5h

    return {
      subject: label,
      score,
      hours_per_week,
      priority: priorityFor(weakness),
      reason: `Current ${label} score is ${score}/100. Recommended ${hours_per_week}h/week to help close the gap toward your ${target_gpa} GPA target.`,
    };
  });

  return subjects.sort((a, b) => b.hours_per_week - a.hours_per_week);
};

// Slots don't overlap and fall within a valid time range
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
  subjects.reduce((sum, s) => sum + s.hours_per_week * 60, 0);

/**
 * The required check: free time must cover the requested study hours.
 * Throws a 422 (not a silent truncation) if it doesn't — exactly the rule
 * you described: validate before generating, not after.
 */
const checkCapacity = (subjects, freeSlots) => {
  const needed = totalNeededMinutes(subjects);
  const available = totalFreeMinutes(freeSlots);
  if (available < needed) {
    const err = new Error(
      `Not enough free time: you need ${(needed / 60).toFixed(1)}h/week to cover your subjects, ` +
      `but only entered ${(available / 60).toFixed(1)}h/week of free time. ` +
      `Add more free time or reduce subject hours.`
    );
    err.status = 422;
    throw err;
  }
  return { needed_minutes: needed, available_minutes: available };
};

/**
 * subjects: [{ subject, hours_per_week, priority }, ...] — student-confirmed allocation
 * freeSlots: [{ day, start, end }, ...]
 * Greedily fills slots in chronological order, exhausting each subject's
 * weekly minutes (highest priority first) before moving to the next,
 * in sessionLengthMinutes chunks. Leftover slot time becomes 'free'.
 */
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
    .map((s) => ({ subject: s.subject, remainingMinutes: Math.round(s.hours_per_week * 60) }));

  const schedule = [];
  let queueIndex = 0;

  for (const slot of orderedSlots) {
    let cursor = toMinutes(slot.start);
    const slotEnd = toMinutes(slot.end);

    while (cursor < slotEnd) {
      // Skip subjects that are already fully scheduled
      while (queueIndex < queue.length && queue[queueIndex].remainingMinutes <= 0) queueIndex++;

      if (queueIndex >= queue.length) {
        // Nothing left to schedule — mark the rest of this slot as free time
        schedule.push({ day: slot.day, start: toTimeString(cursor), end: toTimeString(slotEnd), activity_type: 'free' });
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
      });

      current.remainingMinutes -= chunk;
      cursor += chunk;
    }
  }

  return schedule;
};

module.exports = {
  generateAutoPlanSubjects,
  validateFreeTime,
  totalFreeMinutes,
  totalNeededMinutes,
  checkCapacity,
  generateSchedule,
};
