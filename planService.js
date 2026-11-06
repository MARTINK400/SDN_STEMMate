import { put, getAll } from "./db.js";

export const API_URL = "/sync/session-plan";

export async function savePlan(plan) {
  plan.updatedAt = new Date().toISOString();
  plan.syncState = plan.syncState || "pending";
  await put("sessions", plan);
  return plan;
}

export async function listPlans() {
  return getAll("sessions");
}

export async function syncPlan(plan, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    plan.syncState = "synced";
    plan.errorMessage = null;
  } catch (err) {
    plan.syncState = "failed";
    plan.errorMessage = err.message;
  }
  await put("sessions", plan);
  return plan;
}
