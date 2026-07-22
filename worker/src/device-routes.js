import {
  bearerToken, clearLocation, constantTimeEqual, createDevice, deleteDevice, getDevice, listDevices,
  publicDevice, renameDevice, requireDatabase, saveLocation, setDeviceEnabled, verifyDeviceToken,
} from "./devices.js";

const NO_STORE = { "Cache-Control": "no-store" };

function error(c, message, status = 400) {
  return c.json({ error: message }, status, NO_STORE);
}

async function jsonBody(c) {
  const length = Number(c.req.header("content-length") || 0);
  if (length > 16_384) throw new Error("request body too large");
  const reader = c.req.raw.body?.getReader();
  if (!reader) return {};
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16_384) { await reader.cancel(); throw new Error("request body too large"); }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text ? JSON.parse(text) : {};
}

function validName(value) {
  const name = String(value || "").trim();
  if (!name || name.length > 60) throw new Error("device name must be 1-60 characters");
  return name;
}

function number(value, minimum, maximum, name) {
  const result = Number(value);
  if (!Number.isFinite(result) || result < minimum || result > maximum) throw new Error(`invalid ${name}`);
  return result;
}

function location(body) {
  return {
    latitude: number(body.latitude ?? body.lat, -90, 90, "latitude"),
    longitude: number(body.longitude ?? body.lon, -180, 180, "longitude"),
    accuracy: number(body.accuracy ?? body.acc ?? 25, 0, 10_000, "accuracy"),
    verticalAccuracy: number(body.verticalAccuracy ?? 30, 0, 10_000, "verticalAccuracy"),
    altitude: number(body.altitude ?? 0, -12_000, 100_000, "altitude"),
  };
}

function requireAdmin(c) {
  const configured = c.env?.ADMIN_TOKEN || "";
  if (!configured) throw new Error("ADMIN_TOKEN is not configured");
  if (!constantTimeEqual(bearerToken(c.req), configured)) throw new Error("unauthorized");
}

async function requireDevice(c) {
  requireAdmin(c);
  const db = requireDatabase(c.env);
  const row = await getDevice(db, c.req.param("id"));
  if (!row) throw new Error("device not found");
  return { db, row };
}

async function requireClient(c) {
  const db = requireDatabase(c.env);
  const row = await getDevice(db, c.req.param("id"));
  if (!row) throw new Error("device not found");
  if (!(await verifyDeviceToken(row, bearerToken(c.req)))) throw new Error("unauthorized");
  return { db, row };
}

export function registerDeviceRoutes(app) {
  app.get("/api/devices", async c => {
    try { requireAdmin(c); return c.json({ devices: await listDevices(requireDatabase(c.env)) }, 200, NO_STORE); }
    catch (e) { return error(c, e.message, e.message === "unauthorized" ? 401 : 503); }
  });

  app.post("/api/devices", async c => {
    try { requireAdmin(c); const body = await jsonBody(c); return c.json(await createDevice(requireDatabase(c.env), validName(body.name)), 201, NO_STORE); }
    catch (e) { return error(c, e.message, e.message === "unauthorized" ? 401 : 400); }
  });

  app.patch("/api/devices/:id", async c => {
    try { requireAdmin(c); const body = await jsonBody(c); return c.json({ device: await renameDevice(requireDatabase(c.env), c.req.param("id"), validName(body.name)) }, 200, NO_STORE); }
    catch (e) { return error(c, e.message, e.message === "unauthorized" ? 401 : 400); }
  });

  app.delete("/api/devices/:id", async c => {
    try { requireAdmin(c); await deleteDevice(requireDatabase(c.env), c.req.param("id")); return c.json({ success: true }, 200, NO_STORE); }
    catch (e) { return error(c, e.message, e.message === "unauthorized" ? 401 : 400); }
  });

  app.get("/api/devices/:id/location", async c => {
    try { const { row } = await requireDevice(c); return c.json({ device: publicDevice(row) }, 200, NO_STORE); }
    catch (e) { return error(c, e.message, e.message === "unauthorized" ? 401 : 404); }
  });

  app.put("/api/devices/:id/location", async c => {
    try { const { db } = await requireDevice(c); const body = await jsonBody(c); return c.json({ device: await saveLocation(db, c.req.param("id"), location(body)) }, 200, NO_STORE); }
    catch (e) { return error(c, e.message, e.message === "unauthorized" ? 401 : 400); }
  });

  app.post("/api/devices/:id/enable", async c => {
    try { const { db, row } = await requireDevice(c); const body = await jsonBody(c); if (body.enabled !== false && (!Number.isFinite(row.latitude) || !Number.isFinite(row.longitude))) throw new Error("save a location first"); return c.json({ device: await setDeviceEnabled(db, row.id, body.enabled !== false) }, 200, NO_STORE); }
    catch (e) { return error(c, e.message, e.message === "unauthorized" ? 401 : 400); }
  });

  app.delete("/api/devices/:id/location", async c => {
    try { const { db, row } = await requireDevice(c); return c.json({ device: await clearLocation(db, row.id) }, 200, NO_STORE); }
    catch (e) { return error(c, e.message, e.message === "unauthorized" ? 401 : 400); }
  });

  app.get("/api/client/:id/config", async c => {
    try { const { row } = await requireClient(c); return c.json(publicDevice(row), 200, NO_STORE); }
    catch (e) { return error(c, e.message, e.message === "unauthorized" ? 401 : 404); }
  });
}
