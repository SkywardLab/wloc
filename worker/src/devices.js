const encoder = new TextEncoder();

export function bearerToken(request) {
  const value = request.header("Authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

export function constantTimeEqual(left, right) {
  const a = encoder.encode(String(left || ""));
  const b = encoder.encode(String(right || ""));
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) difference |= (a[index % (a.length || 1)] || 0) ^ (b[index % (b.length || 1)] || 0);
  return difference === 0;
}

export async function tokenDigest(token) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(token)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

export function requireDatabase(env) {
  if (!env?.DB?.prepare) throw new Error("D1 binding DB is not configured");
  return env.DB;
}

export function publicDevice(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    enabled: Boolean(row.enabled),
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    verticalAccuracy: row.vertical_accuracy,
    altitude: row.altitude,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDevices(db) {
  const result = await db.prepare("SELECT * FROM devices ORDER BY updated_at DESC").all();
  return (result.results || []).map(publicDevice);
}

export async function getDevice(db, id) {
  return db.prepare("SELECT * FROM devices WHERE id = ?").bind(id).first();
}

export async function createDevice(db, name) {
  const id = crypto.randomUUID();
  const token = randomToken();
  const hash = await tokenDigest(token);
  const now = new Date().toISOString();
  await db.prepare("INSERT INTO devices (id, name, token_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(id, name, hash, now, now).run();
  return { device: publicDevice(await getDevice(db, id)), token };
}

export async function renameDevice(db, id, name) {
  await db.prepare("UPDATE devices SET name = ?, updated_at = ? WHERE id = ?").bind(name, new Date().toISOString(), id).run();
  const device = publicDevice(await getDevice(db, id));
  if (!device) throw new Error("device not found");
  return device;
}

export async function deleteDevice(db, id) {
  const result = await db.prepare("DELETE FROM devices WHERE id = ?").bind(id).run();
  if (!result.success || Number(result.meta?.changes || 0) < 1) throw new Error("device not found");
  return true;
}

export async function saveLocation(db, id, location) {
  const now = new Date().toISOString();
  await db.prepare("UPDATE devices SET enabled = 1, latitude = ?, longitude = ?, accuracy = ?, vertical_accuracy = ?, altitude = ?, updated_at = ? WHERE id = ?")
    .bind(location.latitude, location.longitude, location.accuracy, location.verticalAccuracy, location.altitude, now, id).run();
  return publicDevice(await getDevice(db, id));
}

export async function setDeviceEnabled(db, id, enabled) {
  await db.prepare("UPDATE devices SET enabled = ?, updated_at = ? WHERE id = ?").bind(enabled ? 1 : 0, new Date().toISOString(), id).run();
  return publicDevice(await getDevice(db, id));
}

export async function clearLocation(db, id) {
  await db.prepare("UPDATE devices SET enabled = 0, latitude = NULL, longitude = NULL, updated_at = ? WHERE id = ?").bind(new Date().toISOString(), id).run();
  return publicDevice(await getDevice(db, id));
}

export async function verifyDeviceToken(row, token) {
  return Boolean(row && token && constantTimeEqual(row.token_hash, await tokenDigest(token)));
}
