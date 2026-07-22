import { gcj02ToWgs84, round6 } from "./parse.js";

function text(value) {
  if (Array.isArray(value)) return value.join("");
  return value == null ? "" : String(value);
}

function normalizeAmap(poi) {
  const [lon, lat] = text(poi.location).split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const wgs = gcj02ToWgs84(lat, lon);
  return {
    name: text(poi.name),
    address: [text(poi.pname), text(poi.cityname), text(poi.adname), text(poi.address)].filter(Boolean).join(" · "),
    lat: round6(wgs.lat),
    lon: round6(wgs.lon),
    source: "amap",
  };
}

async function searchAmap(query, key, fetcher) {
  if (!key) return [];
  const url = new URL("https://restapi.amap.com/v3/place/text");
  url.searchParams.set("key", key);
  url.searchParams.set("keywords", query);
  url.searchParams.set("offset", "8");
  url.searchParams.set("page", "1");
  url.searchParams.set("extensions", "base");
  const response = await fetcher(url.toString(), { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Amap HTTP ${response.status}`);
  const body = await response.json();
  if (body.status !== "1") throw new Error(body.info || "Amap search failed");
  return (body.pois || []).map(normalizeAmap).filter(Boolean).slice(0, 8);
}

async function searchNominatim(query, fetcher) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "8");
  url.searchParams.set("q", query);
  const response = await fetcher(url.toString(), { headers: { Accept: "application/json", "User-Agent": "SkywardLab-WLOC/1.0" } });
  if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
  const body = await response.json();
  return body.map(item => ({
    name: text(item.name) || text(item.display_name).split(",", 1)[0],
    address: text(item.display_name),
    lat: round6(item.lat),
    lon: round6(item.lon),
    source: "nominatim",
  })).filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lon)).slice(0, 8);
}

export async function searchPlaces(query, options = {}) {
  const value = String(query || "").trim();
  if (!value) throw new Error("请输入地名");
  const fetcher = options.fetcher || fetch;
  let amapError = null;
  try {
    const results = await searchAmap(value, options.amapKey, fetcher);
    if (results.length) return results;
  } catch (error) {
    amapError = error;
  }
  try {
    return await searchNominatim(value, fetcher);
  } catch (error) {
    throw new Error(`地点搜索服务失败: ${amapError?.message || error.message}`);
  }
}
