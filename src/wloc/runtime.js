import { patchResponseBytes } from "./core.js";
import { ungzip } from "pako";

export const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  longitude: null,
  latitude: null,
  accuracy: 25,
  verticalAccuracy: 30,
  altitude: 0,
  motionActivityType: 63,
  motionActivityConfidence: 467,
  logLevel: "info",
});
export const MAX_BODY_BYTES = 1_048_576;

const MODULE_DEFAULT = Object.freeze({ longitude: 113.94114, latitude: 22.544577 });

function booleanValue(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value == null || value === "") return fallback;
  if (["false", "0", "no", "off"].includes(String(value).toLowerCase())) return false;
  if (["true", "1", "yes", "on"].includes(String(value).toLowerCase())) return true;
  return fallback;
}

function finiteValue(value, fallback) {
  if (value == null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function parseArguments(input) {
  if (input && typeof input === "object") return { ...input };
  const result = {};
  for (const pair of String(input || "").replace(/^\?/, "").split("&")) {
    if (!pair) continue;
    const separator = pair.indexOf("=");
    const key = separator < 0 ? pair : pair.slice(0, separator);
    const value = separator < 0 ? "" : pair.slice(separator + 1);
    result[decodeURIComponent(key.replace(/\+/g, " "))] = decodeURIComponent(value.replace(/\+/g, " "));
  }
  return result;
}

export function resolveConfig(argumentsConfig = {}, savedConfig = null) {
  const args = argumentsConfig || {};
  const saved = savedConfig && typeof savedConfig === "object" ? savedConfig : {};
  const merged = { ...DEFAULT_CONFIG };
  const apply = (source) => {
    if (Object.hasOwn(source, "enabled")) merged.enabled = booleanValue(source.enabled, merged.enabled);
    merged.longitude = finiteValue(source.longitude ?? source.lon, merged.longitude);
    merged.latitude = finiteValue(source.latitude ?? source.lat, merged.latitude);
    merged.accuracy = finiteValue(source.accuracy ?? source.acc, merged.accuracy);
    merged.verticalAccuracy = finiteValue(source.verticalAccuracy, merged.verticalAccuracy);
    merged.altitude = finiteValue(source.altitude, merged.altitude);
    merged.motionActivityType = finiteValue(source.motionActivityType, merged.motionActivityType);
    merged.motionActivityConfidence = finiteValue(source.motionActivityConfidence, merged.motionActivityConfidence);
    if (source.logLevel) merged.logLevel = String(source.logLevel);
  };
  apply(args);
  apply(saved);
  if (merged.latitude != null && (merged.latitude < -90 || merged.latitude > 90)) throw new Error("invalid latitude");
  if (merged.longitude != null && (merged.longitude < -180 || merged.longitude > 180)) throw new Error("invalid longitude");
  return merged;
}

function bytesFrom(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value === "string") return Uint8Array.from(value, (character) => character.charCodeAt(0) & 255);
  if (value && typeof value.length === "number") return Uint8Array.from(value);
  return new Uint8Array();
}

function bodyBytes(response) {
  return bytesFrom(response?.bodyBytes ?? response?.rawBody ?? response?.body);
}

function findHeader(headers, name) {
  const key = Object.keys(headers || {}).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

function deleteHeader(headers, name) {
  for (const key of Object.keys(headers || {})) {
    if (key.toLowerCase() === name.toLowerCase()) delete headers[key];
  }
}

function isGzip(bytes, headers) {
  return (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) || String(findHeader(headers, "Content-Encoding") || "").toLowerCase().includes("gzip");
}

async function decompressGzip(bytes) {
  if (globalThis.$utils?.ungzip) return bytesFrom(globalThis.$utils.ungzip(bytes));
  return bytesFrom(ungzip(bytes));
}

function logMessage(config, level, message, output = console.log) {
  const priorities = { off: 0, error: 1, warn: 2, info: 3, debug: 4, all: 5 };
  if ((priorities[String(config.logLevel).toLowerCase()] ?? 3) >= priorities[level]) {
    output(`[wloc] ${message}`);
  }
}

export function detectRuntime() {
  if (typeof globalThis.$task !== "undefined") return "Quantumult X";
  if (typeof globalThis.$loon !== "undefined") return "Loon";
  if (typeof globalThis.$rocket !== "undefined") return "Shadowrocket";
  if (typeof globalThis.Egern !== "undefined") return "Egern";
  if (globalThis.$environment?.["stash-version"]) return "Stash";
  if (globalThis.$environment?.["surge-version"]) return "Surge";
  return "Unknown";
}

function hasCoordinates(config) {
  return Number.isFinite(config.latitude) && Number.isFinite(config.longitude);
}

function usesUntouchedModuleDefaults(config, savedConfigPresent) {
  return !savedConfigPresent && config.longitude === MODULE_DEFAULT.longitude && config.latitude === MODULE_DEFAULT.latitude;
}

export async function processResponse(response, config, options = {}) {
  if (!config.enabled || !hasCoordinates(config) || usesUntouchedModuleDefaults(config, options.savedConfigPresent === true ? true : false)) return response;
  const output = options.logger || console.log;
  try {
    let bytes = bodyBytes(response);
    if (!bytes.length) throw new Error("response body is empty");
    const headers = { ...(response.headers || {}) };
    if (bytes.length > MAX_BODY_BYTES) throw new Error(`body exceeds ${MAX_BODY_BYTES} bytes`);
    const compressed = isGzip(bytes, headers);
    if (compressed) bytes = await decompressGzip(bytes);
    if (bytes.length > MAX_BODY_BYTES) throw new Error(`decompressed body exceeds ${MAX_BODY_BYTES} bytes`);
    const patched = patchResponseBytes(bytes, config);
    deleteHeader(headers, "Content-Encoding");
    deleteHeader(headers, "Transfer-Encoding");
    deleteHeader(headers, "Content-Length");
    headers["Content-Length"] = String(patched.response.length);
    logMessage(config, "debug", `runtime=${options.runtime || detectRuntime()} envelope=${patched.kind} compressed=${compressed ? "gzip" : "identity"} payload=${patched.payloadLength} fields=${patched.fields} wifi=${patched.wifiCount} cell=${patched.cellCount} result=patched`, output);
    logMessage(config, "info", `patched ${patched.kind}: wifi=${patched.wifiCount}, cell=${patched.cellCount}`, output);
    return { ...response, status: response.status || 200, statusCode: response.statusCode || 200, headers, body: patched.response, bodyBytes: patched.response, rawBody: patched.response };
  } catch (error) {
    logMessage(config, "error", `response pass-through: ${error?.message || error}`, output);
    return response;
  }
}

export function prepareRequest(request) {
  const headers = { ...(request.headers || {}) };
  deleteHeader(headers, "Accept-Encoding");
  headers["Accept-Encoding"] = "identity";
  return { ...request, headers };
}

function readSavedSettings() {
  try {
    let raw;
    if (globalThis.$persistentStore?.read) raw = globalThis.$persistentStore.read("wloc_settings");
    else if (globalThis.$prefs?.valueForKey) raw = globalThis.$prefs.valueForKey("wloc_settings");
    if (raw == null || raw === "") return null;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (error) {
    console.log(`[wloc] settings read failed: ${error?.message || error}`);
    return null;
  }
}

function done(value, hasResponse) {
  if (typeof globalThis.$done !== "function") return;
  const quantumult = typeof globalThis.$task !== "undefined";
  globalThis.$done(quantumult && hasResponse ? { response: value } : value);
}

async function run() {
  const request = globalThis.$request;
  const response = globalThis.$response;
  if (!response) {
    done(prepareRequest(request || {}), false);
    return;
  }
  const saved = readSavedSettings();
  const config = resolveConfig(parseArguments(globalThis.$argument), saved);
  const output = await processResponse(response, config, { savedConfigPresent: saved != null });
  done(output, true);
}

if (typeof globalThis.$done === "function" && globalThis.$request) {
  run().catch((error) => {
    console.log(`[wloc] runtime pass-through: ${error?.message || error}`);
    done(globalThis.$response || globalThis.$request || {}, Boolean(globalThis.$response));
  });
}
