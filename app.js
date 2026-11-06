import { login, logout, currentSession } from "./auth.js";
import { validatePlan } from "./validation.js";
import { savePlan, listPlans, syncPlan } from "./planService.js";

const app = document.getElementById("app");
const statusBar = document.getElementById("status-bar");
const userChip = document.getElementById("user-chip");
const toast = document.getElementById("toast");

/* ---------- Status bar ---------- */
function setStatus() {
  const online = navigator.onLine;
  statusBar.textContent = online ? "Online — ready to sync" : "Offline — changes saved locally";
  statusBar.className = online ? "online" : "offline";
}
window.addEventListener("online", setStatus);
window.addEventListener("offline", setStatus);

/* ---------- Toast ---------- */
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("visible"), 2500);
}

/* ---------- Header chip ---------- */
function renderChip() {
  const s = currentSession();
  if (!s) { userChip.hidden = true; return; }
  userChip.hidden = false;
  userChip.innerHTML = `${s.displayName} · ${s.role} · <button id="logout">Log out</button>`;
  document.getElementById("logout").onclick = () => {
    logout();
    renderLogin();
  };
}

/* ---------- S00 Login ---------- */
function renderLogin() {
  renderChip();
  app.innerHTML = `
    <h1>STEMMate Namibia</h1>
    <p class="sub">Sign in to plan STEM sessions offline.</p>
    <form id="login-form" novalidate>
      <label>Username <input name="username" autocomplete="username" required></label>
      <label>Password <input name="password" type="password" autocomplete="current-password" required></label>
      <div class="error" id="login-error" role="alert"></div>
      <button type="submit">Log in</button>
    </form>
    <p class="hint">Demo users: <code>facilitator / stem123</code> or <code>admin / admin123</code></p>
  `;
  const form = document.getElementById("login-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { username, password } = Object.fromEntries(new FormData(form).entries());
    const res = await login(username, password);
    if (!res.ok) {
      document.getElementById("login-error").textContent = res.error;
      return;
    }
    showToast(`Welcome, ${res.session.displayName}.`);
    renderList();
  });
}

/* ---------- S06 Create / Edit Plan ---------- */
function renderCreateForm(plan = {}) {
  try { requireSession(); } catch { renderLogin(); return; }
  renderChip();

  app.innerHTML = `
    <h1>${plan.id ? "Edit Session Plan" : "Create Session Plan"}</h1>
    <form id="plan-form" novalidate>
      <label>Session Title <input name="title" value="${plan.title || ""}" required></label>
      <span class="error" data-for="title"></span>
      <label>Activity <input name="activityId" value="${plan.activityId || ""}" required></label>
      <span class="error" data-for="activityId"></span>
      <label>Date <input type="date" name="date" value="${plan.date || ""}" required></label>
      <span class="error" data-for="date"></span>
      <label>Duration (min) <input type="number" name="durationMin" value="${plan.durationMin || ""}" required></label>
      <span class="error" data-for="durationMin"></span>
      <label>Objectives <textarea name="objectives" required>${plan.objectives || ""}</textarea></label>
      <span class="error" data-for="objectives"></span>
      <button type="submit" name="action" value="draft">Save Draft</button>
      <button type="submit" name="action" value="save">Save Plan</button>
      <button type="button" id="cancel">Cancel</button>
    </form>
  `;
  document.getElementById("cancel").onclick = () => renderList();

  const form = document.getElementById("plan-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.durationMin = Number(data.durationMin);
    const { ok, errors } = validatePlan(data);
    document.querySelectorAll(".error").forEach(el => el.textContent = "");
    if (!ok) {
      Object.entries(errors).forEach(([k, v]) => {
        const el = document.querySelector(`.error[data-for="${k}"]`);
        if (el) el.textContent = v;
      });
      return;
    }
    const saved = {
      id: plan.id || crypto.randomUUID(),
      ...data,
      status: e.submitter.value === "draft" ? "draft" : "saved",
      syncState: "pending",
    };
    await savePlan(saved);
    showToast("Session plan saved locally.");
    renderList();
  });
}

/* ---------- S10 My Session Plans ---------- */
async function renderList() {
  const session = currentSession();
  if (!session) { renderLogin(); return; }
  renderChip();

  const plans = await listPlans();
  app.innerHTML = `<h1>My Session Plans</h1>`;
  if (!plans.length) {
    app.innerHTML += `<p>No plans yet.</p><button id="new">Create a session plan</button>`;
    document.getElementById("new").onclick = () => renderCreateForm();
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "plan-list";
  for (const p of plans) {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${p.title}</strong>
      <span class="badge ${p.syncState}">${p.syncState}</span>
      <button data-id="${p.id}" class="sync">Synchronise Now</button>
      <button data-id="${p.id}" class="edit">Edit</button>
    `;
    ul.appendChild(li);
  }
  app.appendChild(ul);
  const newBtn = document.createElement("button");
  newBtn.id = "new";
  newBtn.textContent = "Create another plan";
  newBtn.onclick = () => renderCreateForm();
  app.appendChild(newBtn);

  app.querySelectorAll(".sync").forEach(btn => {
    btn.onclick = async () => {
      if (!navigator.onLine) { showToast("You are offline. Retry when online."); return; }
      const plan = plans.find(p => p.id === btn.dataset.id);
      btn.textContent = "Syncing…";
      const updated = await syncPlan(plan);
      showToast(updated.syncState === "synced"
        ? "Session plan synchronised successfully."
        : "Sync failed: " + updated.errorMessage);
      renderList();
    };
  });
  app.querySelectorAll(".edit").forEach(btn => {
    btn.onclick = () => {
      const plan = plans.find(p => p.id === btn.dataset.id);
      renderCreateForm(plan);
    };
  });
}

/* ---------- Boot ---------- */
setStatus();
if (currentSession()) renderList();
else renderLogin();
