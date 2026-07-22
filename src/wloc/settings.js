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

export function handleSettingsRequest(input, store) {
  try {
    const url = new URL(input);
    const action = url.searchParams.get("action") || "save";
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
    const longitude = finiteInRange(url.searchParams.get("longitude") ?? url.searchParams.get("lon"), -180, 180, "longitude");
    const latitude = finiteInRange(url.searchParams.get("latitude") ?? url.searchParams.get("lat"), -90, 90, "latitude");
    if (longitude === undefined || latitude === undefined) return { success: false, error: "missing longitude or latitude" };
    const accuracy = finiteInRange(url.searchParams.get("accuracy") ?? url.searchParams.get("acc"), 0, 10000, "accuracy") ?? DEFAULTS.accuracy;
    const verticalAccuracy = finiteInRange(url.searchParams.get("verticalAccuracy"), 0, 10000, "verticalAccuracy") ?? DEFAULTS.verticalAccuracy;
    const altitude = finiteInRange(url.searchParams.get("altitude"), -12000, 100000, "altitude") ?? DEFAULTS.altitude;
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
