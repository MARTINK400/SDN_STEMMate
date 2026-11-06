const DB_NAME = "stemmate";
const DB_VERSION = 2; // bumped for users store

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("sessions"))
        db.createObjectStore("sessions", { keyPath: "id" });
      if (!db.objectStoreNames.contains("activities"))
        db.createObjectStore("activities", { keyPath: "id" });
      if (!db.objectStoreNames.contains("users"))
        db.createObjectStore("users", { keyPath: "username" });
    };
    req.onsuccess = async () => {
      const db = req.result;
      await seedUsers(db); // idempotent
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

// Synthetic demo users — NO real data (A4 ethics rule)
const DEMO_USERS = [
  { username: "facilitator", password: "stem123", displayName: "Demo Facilitator", role: "facilitator" },
  { username: "admin",       password: "admin123", displayName: "Demo Admin",       role: "admin" },
];

async function hashPassword(pw) {
  const buf = new TextEncoder().encode(pw);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function seedUsers(db) {
  const existing = await new Promise((res) => {
    const req = db.transaction("users", "readonly").objectStore("users").getAll();
    req.onsuccess = () => res(req.result);
  });
  if (existing.length > 0) return;

  const tx = db.transaction("users", "readwrite");
  for (const u of DEMO_USERS) {
    tx.objectStore("users").put({
      username: u.username,
      passwordHash: await hashPassword(u.password),
      displayName: u.displayName,
      role: u.role,
    });
  }
  await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
}

export async function get(store, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(store, "readonly").objectStore(store).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function put(store, value) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => res(value);
    tx.onerror = () => rej(tx.error);
  });
}

export async function getAll(store) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(store, "readonly").objectStore(store).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export { hashPassword };
