export function validatePlan(plan) {
  const errors = {};
  if (!plan.title || plan.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters.";
  }
  if (!plan.activityId) {
    errors.activityId = "Please select an activity.";
  }
  if (!plan.date) {
    errors.date = "Date is required.";
  } else if (isNaN(Date.parse(plan.date))) {
    errors.date = "Date format is invalid.";
  }
  if (!plan.durationMin || plan.durationMin < 10 || plan.durationMin > 240) {
    errors.durationMin = "Duration must be between 10 and 240 minutes.";
  }
  if (!plan.objectives || plan.objectives.trim().length < 10) {
    errors.objectives = "Objectives must be at least 10 characters.";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
