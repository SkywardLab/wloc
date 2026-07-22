const DEFAULTS = Object.freeze({ accuracy: 25, verticalAccuracy: 30, altitude: 0 });

function finiteInRange(value, minimum, maximum, name) {
  if (value == null || value === "") return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) throw new Error(`invalid ${name}`);
  return number;
}

function publicSettings(settings) {
  return { success: true, ...settings };
}

function queryParameters(input) {
  const values = new Map();
  const queryStart = String(input).indexOf("?");
  if (queryStart < 0) return values;
  const query = String(input).slice(queryStart + 1).split("#", 1)[0];
  for (const part of query.split("&")) {
    if (!part) continue;
    const separator = part.indexOf("=");
    const rawKey = separator < 0 ? part : part.slice(0, separator);
    const rawValue = separator < 0 ? "" : part.slice(separator + 1);
    let key;
    let value;
    try { key = decodeURIComponent(rawKey.replace(/\+/g, " ")); } catch { key = rawKey; }
    try { value = decodeURIComponent(rawValue.replace(/\+/g, " ")); } catch { value = rawValue; }
    if (!values.has(key)) values.set(key, value);
  }
  return values;
}

export function handleSettingsRequest(input, store) {
  try {
    const parameters = queryParameters(input);
    const action = parameters.get("action") || "save";
    const current = store.read();
    if (action === "query") {
      return current ? publicSettings(current) : { success: false, state: "clear", error: "no saved location" };
    }
    if (action === "clear") {
      store.write(null);
      return { success: true, state: "clear" };
    }
    if (action === "enable" || action === "disable") {
      if (!current || !Number.isFinite(Number(current.longitude)) || !Number.isFinite(Number(current.latitude))) {
        return { success: false, error: "save a location first" };
      }
      const next = { ...current, enabled: action === "enable" };
      store.write(next);
      return publicSettings(next);
    }
    const longitude = finiteInRange(parameters.get("longitude") ?? parameters.get("lon"), -180, 180, "longitude");
    const latitude = finiteInRange(parameters.get("latitude") ?? parameters.get("lat"), -90, 90, "latitude");
    if (longitude === undefined || latitude === undefined) return { success: false, error: "missing longitude or latitude" };
    const accuracy = finiteInRange(parameters.get("accuracy") ?? parameters.get("acc"), 0, 10000, "accuracy") ?? DEFAULTS.accuracy;
    const verticalAccuracy = finiteInRange(parameters.get("verticalAccuracy"), 0, 10000, "verticalAccuracy") ?? DEFAULTS.verticalAccuracy;
    const altitude = finiteInRange(parameters.get("altitude"), -12000, 100000, "altitude") ?? DEFAULTS.altitude;
    const next = { enabled: true, longitude, latitude, accuracy, verticalAccuracy, altitude, updatedAt: new Date().toISOString() };
    store.write(next);
    return publicSettings(next);
  } catch (error) {
    return { success: false, error: error?.message || String(error) };
  }
}

function proxyStore() {
  return {
    read() {
      let raw = null;
      if (globalThis.$persistentStore?.read) raw = globalThis.$persistentStore.read("wloc_settings");
      else if (globalThis.$prefs?.valueForKey) raw = globalThis.$prefs.valueForKey("wloc_settings");
      if (raw == null || raw === "") return null;
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    },
    write(value) {
      const raw = value == null ? null : JSON.stringify(value);
      if (globalThis.$persistentStore?.write) return globalThis.$persistentStore.write(raw, "wloc_settings");
      if (value == null && globalThis.$prefs?.removeValueForKey) return globalThis.$prefs.removeValueForKey("wloc_settings");
      if (globalThis.$prefs?.setValueForKey) return globalThis.$prefs.setValueForKey(raw, "wloc_settings");
      return false;
    },
  };
}

function respond(result) {
  const response = {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(result),
  };
  const quantumult = typeof globalThis.$task !== "undefined";
  globalThis.$done(quantumult ? response : { response });
}

if (typeof globalThis.$done === "function" && globalThis.$request?.url) {
  respond(handleSettingsRequest(globalThis.$request.url, proxyStore()));
}
