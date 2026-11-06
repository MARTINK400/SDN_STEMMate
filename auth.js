import { get, hashPassword } from "./db.js";

const SESSION_KEY = "stemmate.session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export async function login(username, password) {
  if (!username || !password) {
    return { ok: false, error: "Enter both username and password." };
  }
  const user = await get("users", username);
  if (!user) {
    return { ok: false, error: "Unknown username or incorrect password." };
  }
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) {
    return { ok: false, error: "Unknown username or incorrect password." };
  }
  const session = {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    issuedAt: Date.now(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, session };
}

export function currentSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  let s;
  try { s = JSON.parse(raw); } catch { return null; }
  if (Date.now() - s.issuedAt > SESSION_TTL_MS) {
    logout();
    return null;
  }
  return s;
}

export function requireSession() {
  const s = currentSession();
  if (!s) throw new Error("AUTH_REQUIRED");
  return s;
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}
