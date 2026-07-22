export const SCALE = 100_000_000;
const SYNTHETIC_PREFIX = Uint8Array.from([0, 1, 0, 0, 0, 1, 0, 0]);
const MARKER = Uint8Array.from([0, 0, 0, 1, 0, 0]);
const LOCATION_FIELDS = new Set([1, 2, 3, 5, 6, 11, 12]);

export function coordinateToInteger(value) {
  return Math.trunc(Number(value) * SCALE);
}

export function concatBytes(parts) {
  const output = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function encodeVarint(value) {
  let current = BigInt.asUintN(64, BigInt(value));
  const bytes = [];
  while (current >= 0x80n) {
    bytes.push(Number((current & 0x7fn) | 0x80n));
    current >>= 7n;
  }
  bytes.push(Number(current));
  return Uint8Array.from(bytes);
}

export function decodeVarint(bytes, offset = 0) {
  let value = 0n;
  let shift = 0n;
  let cursor = offset;
  while (cursor < bytes.length && shift < 70n) {
    const byte = BigInt(bytes[cursor++]);
    value |= (byte & 0x7fn) << shift;
    if ((byte & 0x80n) === 0n) {
      return { value: BigInt.asIntN(64, value), unsigned: value, offset: cursor };
    }
    shift += 7n;
  }
  throw new Error("invalid varint");
}

export function encodeField(fieldNumber, wireType, valueBytes) {
  const key = encodeVarint(BigInt(fieldNumber * 8 + wireType));
  if (wireType === 0) return concatBytes([key, valueBytes]);
  if (wireType === 1 && valueBytes.length === 8) return concatBytes([key, valueBytes]);
  if (wireType === 2) return concatBytes([key, encodeVarint(valueBytes.length), valueBytes]);
  if (wireType === 5 && valueBytes.length === 4) return concatBytes([key, valueBytes]);
  throw new Error(`unsupported wire type ${wireType}`);
}

export function parseFields(bytes) {
  const fields = [];
  let offset = 0;
  while (offset < bytes.length) {
    const start = offset;
    const key = decodeVarint(bytes, offset);
    offset = key.offset;
    const keyNumber = Number(key.unsigned);
    const fieldNumber = Math.floor(keyNumber / 8);
    const wireType = keyNumber & 7;
    if (fieldNumber === 0) throw new Error("protobuf field number 0");
    let valueBytes;
    let value;
    if (wireType === 0) {
      const decoded = decodeVarint(bytes, offset);
      valueBytes = bytes.slice(offset, decoded.offset);
      value = decoded.value;
      offset = decoded.offset;
    } else if (wireType === 1 || wireType === 5) {
      const size = wireType === 1 ? 8 : 4;
      if (offset + size > bytes.length) throw new Error("protobuf field exceeds buffer");
      valueBytes = bytes.slice(offset, offset + size);
      offset += size;
    } else if (wireType === 2) {
      const length = decodeVarint(bytes, offset);
      offset = length.offset;
      const size = Number(length.unsigned);
      if (!Number.isSafeInteger(size) || offset + size > bytes.length) throw new Error("protobuf field exceeds buffer");
      valueBytes = bytes.slice(offset, offset + size);
      offset += size;
    } else {
      throw new Error(`unsupported protobuf wire type ${wireType}`);
    }
    fields.push({ fieldNumber, wireType, valueBytes, value, raw: bytes.slice(start, offset) });
  }
  return fields;
}

export function fieldHistogram(fields) {
  const counts = new Map();
  for (const field of fields) {
    const key = `${field.fieldNumber}/${field.wireType}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts].map(([key, count]) => `${key}x${count}`).join(",");
}

function uint16(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, false);
  return bytes;
}

function uint32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

function readUint16(bytes, offset) {
  if (offset + 2 > bytes.length) throw new Error("uint16 exceeds buffer");
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, false);
}

function readUint32(bytes, offset) {
  if (offset + 4 > bytes.length) throw new Error("uint32 exceeds buffer");
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
}

function encodePascal(value) {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > 65535) throw new Error("ARPC string too long");
  return concatBytes([uint16(bytes.length), bytes]);
}

function readPascal(bytes, state) {
  const length = readUint16(bytes, state.offset);
  state.offset += 2;
  if (state.offset + length > bytes.length) throw new Error("ARPC string exceeds buffer");
  const value = new TextDecoder().decode(bytes.slice(state.offset, state.offset + length));
  state.offset += length;
  return value;
}

export function parseArpc(bytes) {
  const state = { offset: 0 };
  const version = readUint16(bytes, state.offset);
  state.offset += 2;
  const locale = readPascal(bytes, state);
  const appIdentifier = readPascal(bytes, state);
  const osVersion = readPascal(bytes, state);
  const functionId = readUint32(bytes, state.offset);
  state.offset += 4;
  const payloadLength = readUint32(bytes, state.offset);
  state.offset += 4;
  if (payloadLength === 0 || state.offset + payloadLength > bytes.length) throw new Error("ARPC payload exceeds buffer");
  const payload = bytes.slice(state.offset, state.offset + payloadLength);
  const suffix = bytes.slice(state.offset + payloadLength);
  parseFields(payload);
  return { version, locale, appIdentifier, osVersion, functionId, payload, suffix };
}

export function serializeArpc(arpc) {
  return concatBytes([
    uint16(arpc.version),
    encodePascal(arpc.locale),
    encodePascal(arpc.appIdentifier),
    encodePascal(arpc.osVersion),
    uint32(arpc.functionId),
    uint32(arpc.payload.length),
    arpc.payload,
    arpc.suffix || new Uint8Array(),
  ]);
}

function startsWith(bytes, prefix) {
  return bytes.length >= prefix.length && prefix.every((byte, index) => bytes[index] === byte);
}

function hasSyntheticPrefix(bytes) {
  return bytes.length >= 8 && bytes[0] === 0 && bytes[1] === 1 && bytes[6] === 0 && bytes[7] === 0;
}

function indexOfBytes(bytes, needle) {
  for (let index = 0; index <= bytes.length - needle.length; index += 1) {
    if (needle.every((byte, offset) => bytes[index + offset] === byte)) return index;
  }
  return -1;
}

function validateWlocPayload(payload) {
  const fields = parseFields(payload);
  if (!fields.some((field) => [2, 22, 24].includes(field.fieldNumber) && field.wireType === 2)) {
    throw new Error("payload lacks WLOC records");
  }
  return payload;
}

export function extractEnvelope(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 2) throw new Error("WLOC response too short");
  if (hasSyntheticPrefix(bytes)) {
    const length = readUint16(bytes, 8);
    const end = 10 + length;
    if (length === 0 || end > bytes.length) throw new Error("synthetic payload length exceeds buffer");
    return { kind: "synthetic", prefix: bytes.slice(0, 8), payload: validateWlocPayload(bytes.slice(10, end)), suffix: bytes.slice(end) };
  }
  try {
    const arpc = parseArpc(bytes);
    validateWlocPayload(arpc.payload);
    return { kind: "arpc", arpc, payload: arpc.payload };
  } catch (error) {
    if (startsWith(bytes, Uint8Array.of(0, 1))) {
      const markerIndex = indexOfBytes(bytes, MARKER);
      if (markerIndex < 0) throw error;
    }
  }
  const markerIndex = indexOfBytes(bytes, MARKER);
  if (markerIndex >= 0) {
    const lengthOffset = markerIndex + MARKER.length;
    const length = readUint16(bytes, lengthOffset);
    const payloadOffset = lengthOffset + 2;
    const end = payloadOffset + length;
    if (length === 0 || end > bytes.length) throw new Error("marker payload length exceeds buffer");
    return {
      kind: "marker",
      prefix: bytes.slice(0, markerIndex),
      marker: bytes.slice(markerIndex, lengthOffset),
      payload: validateWlocPayload(bytes.slice(payloadOffset, end)),
      suffix: bytes.slice(end),
    };
  }
  return { kind: "bare", payload: validateWlocPayload(bytes) };
}

export function rebuildEnvelope(envelope, payload) {
  if (payload.length > 65535 && envelope.kind !== "arpc" && envelope.kind !== "bare") {
    throw new Error("WLOC payload length exceeds uint16");
  }
  if (envelope.kind === "bare") return payload;
  if (envelope.kind === "arpc") return serializeArpc({ ...envelope.arpc, payload });
  if (envelope.kind === "marker") {
    return concatBytes([envelope.prefix, envelope.marker || MARKER, uint16(payload.length), payload, envelope.suffix || new Uint8Array()]);
  }
  return concatBytes([envelope.prefix || SYNTHETIC_PREFIX, uint16(payload.length), payload, envelope.suffix || new Uint8Array()]);
}

function numericField(fieldNumber, value) {
  return encodeField(fieldNumber, 0, encodeVarint(value));
}

export function patchLocation(payload, config) {
  const retained = parseFields(payload).filter((field) => !LOCATION_FIELDS.has(field.fieldNumber)).map((field) => field.raw);
  return concatBytes([
    ...retained,
    numericField(1, coordinateToInteger(config.latitude)),
    numericField(2, coordinateToInteger(config.longitude)),
    numericField(3, Math.trunc(config.accuracy)),
    numericField(5, Math.trunc(config.altitude)),
    numericField(6, Math.trunc(config.verticalAccuracy)),
    numericField(11, Math.trunc(config.motionActivityType)),
    numericField(12, Math.trunc(config.motionActivityConfidence)),
  ]);
}

function patchContainer(payload, locationFieldNumber, config) {
  const parts = [];
  let found = false;
  for (const field of parseFields(payload)) {
    if (field.fieldNumber === locationFieldNumber && field.wireType === 2) {
      parts.push(encodeField(locationFieldNumber, 2, patchLocation(field.valueBytes, config)));
      found = true;
    } else {
      parts.push(field.raw);
    }
  }
  if (!found) parts.push(encodeField(locationFieldNumber, 2, patchLocation(new Uint8Array(), config)));
  return concatBytes(parts);
}

export const patchWifiDevice = (payload, config) => patchContainer(payload, 2, config);
export const patchCellTower = (payload, config) => patchContainer(payload, 5, config);

export function patchWlocPayload(payload, config) {
  const parts = [];
  let wifiCount = 0;
  let cellCount = 0;
  for (const field of parseFields(payload)) {
    if (field.fieldNumber === 2 && field.wireType === 2) {
      parts.push(encodeField(2, 2, patchWifiDevice(field.valueBytes, config)));
      wifiCount += 1;
    } else if ([22, 24].includes(field.fieldNumber) && field.wireType === 2) {
      parts.push(encodeField(field.fieldNumber, 2, patchCellTower(field.valueBytes, config)));
      cellCount += 1;
    } else {
      parts.push(field.raw);
    }
  }
  return { payload: concatBytes(parts), wifiCount, cellCount };
}

export function patchResponseBytes(bytes, config) {
  const envelope = extractEnvelope(bytes);
  const fields = fieldHistogram(parseFields(envelope.payload));
  const patched = patchWlocPayload(envelope.payload, config);
  return { ...patched, kind: envelope.kind, fields, payloadLength: envelope.payload.length, response: rebuildEnvelope(envelope, patched.payload) };
}
