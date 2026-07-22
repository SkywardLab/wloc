export function getPageHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>WLOC 虚拟定位</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="WLOC">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="anonymous"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="anonymous"><\/script>
<style>
:root { --blue:#007aff; --green:#34c759; --red:#ff3b30; --gray:#8e8e93; --bg:#f2f2f7; --orange:#ff9500; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,system-ui,"SF Pro","Helvetica Neue",sans-serif; background:var(--bg); }
#map { height:50vh; width:100%; min-height:250px; }
.panel { padding:16px; max-width:600px; margin:0 auto; }
.card { background:#fff; border-radius:12px; padding:16px; margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,.08); }
.card h3 { font-size:15px; font-weight:600; margin-bottom:10px; }
.coords { font-family:"SF Mono",monospace; font-size:14px; color:#333; padding:8px 12px; background:var(--bg); border-radius:8px; word-break:break-all; }
.row { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
.btn { flex:1; min-width:100px; padding:12px 16px; border:none; border-radius:10px; font-size:14px; font-weight:500; cursor:pointer; transition:all .15s; }
.btn-primary { background:var(--blue); color:#fff; }
.btn-primary:active { background:#005bb5; transform:scale(.97); }
.btn-secondary { background:#e5e5ea; color:#333; }
.btn-secondary:active { background:#d1d1d6; transform:scale(.97); }
.btn-danger { background:var(--red); color:#fff; }
.btn-danger:active { background:#d63027; transform:scale(.97); }
.btn.success { background:var(--green); color:#fff; }
.btn-sm { flex:none; min-width:auto; padding:6px 12px; font-size:12px; border-radius:8px; }
.input-row { display:flex; gap:8px; margin-top:10px; }
.input-row input { flex:1; padding:10px 12px; border:1px solid #d1d1d6; border-radius:8px; font-size:14px; outline:none; min-width:0; }
.input-row input:focus { border-color:var(--blue); }
.status { font-size:12px; color:var(--gray); margin-top:8px; text-align:center; }
.error-banner { background:var(--red); color:#fff; padding:14px 16px; border-radius:12px; margin-bottom:12px; font-size:14px; line-height:1.5; display:none; }
.error-banner b { display:block; margin-bottom:4px; }
.toast { position:fixed; top:60px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,.8); color:#fff; padding:10px 20px; border-radius:20px; font-size:14px; opacity:0; transition:opacity .3s; pointer-events:none; z-index:9999; max-width:90vw; text-align:center; }
.toast.show { opacity:1; }
.active-loc { background:var(--bg); border-radius:8px; padding:10px 12px; font-size:13px; color:#333; }
.active-loc .label { font-size:11px; color:var(--gray); margin-bottom:4px; }
.active-loc .value { font-family:"SF Mono",monospace; font-size:13px; }
.fav-list { max-height:240px; overflow-y:auto; }
.fav-item { display:flex; align-items:center; gap:8px; padding:10px 12px; background:var(--bg); border-radius:8px; margin-bottom:6px; cursor:pointer; transition:background .15s; }
.fav-item:active { background:#e0e0e5; }
.fav-item .fav-info { flex:1; min-width:0; }
.fav-item .fav-name { font-size:14px; font-weight:500; color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fav-item .fav-coords { font-size:11px; color:var(--gray); font-family:"SF Mono",monospace; margin-top:2px; }
.fav-item .fav-active { font-size:10px; color:var(--green); font-weight:600; }
.fav-item .fav-del { flex:none; width:28px; height:28px; border:none; border-radius:50%; background:transparent; color:var(--red); font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .15s; }
.fav-item .fav-del:hover { background:rgba(255,59,48,.1); }
.fav-empty { text-align:center; color:var(--gray); font-size:13px; padding:16px 0; }
.search-results { margin-top:10px; display:grid; gap:6px; }
.search-result { width:100%; border:none; background:var(--bg); border-radius:9px; padding:10px 12px; text-align:left; cursor:pointer; }
.search-result:active { background:#e0e0e5; }
.search-result-name { font-size:14px; font-weight:600; color:#222; }
.search-result-address { margin-top:3px; font-size:11px; color:var(--gray); line-height:1.35; }
.device-credential { margin-top:8px; padding:10px; border-radius:8px; background:#fff7e6; color:#6d4700; font:11px/1.5 "SF Mono",monospace; word-break:break-all; display:none; }
.fav-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.fav-header h3 { margin-bottom:0; }
.modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,.4); z-index:10000; display:none; align-items:center; justify-content:center; padding:20px; }
.modal-overlay.show { display:flex; }
.modal { background:#fff; border-radius:16px; padding:20px; width:100%; max-width:340px; }
.modal h3 { font-size:17px; font-weight:600; margin-bottom:16px; text-align:center; }
.modal input { width:100%; padding:12px; border:1px solid #d1d1d6; border-radius:10px; font-size:15px; outline:none; margin-bottom:12px; }
.modal input:focus { border-color:var(--blue); }
.modal .modal-btns { display:flex; gap:8px; }
.modal .modal-btns .btn { padding:12px; }
.layer-switch { position:absolute; top:10px; right:10px; z-index:1000; display:flex; gap:4px; background:rgba(255,255,255,.92); border-radius:8px; padding:4px; box-shadow:0 2px 8px rgba(0,0,0,.15); }
.layer-btn { border:none; background:transparent; padding:6px 10px; border-radius:6px; font-size:12px; font-weight:500; color:#333; cursor:pointer; transition:all .15s; white-space:nowrap; }
.layer-btn.active { background:var(--blue); color:#fff; }
.layer-btn:active { transform:scale(.95); }
@media(max-width:480px) { #map { height:44vh; } .panel { padding:12px; } .layer-btn { padding:5px 7px; font-size:11px; } }
</style>
</head>
<body>
<div style="position:relative">
<div id="map"></div>
<div class="layer-switch">
  <button class="layer-btn active" data-layer="satellite" onclick="switchLayer('satellite')">卫星</button>
  <button class="layer-btn" data-layer="wgs84" onclick="switchLayer('wgs84')">WGS84</button>
  <button class="layer-btn" data-layer="amap" onclick="switchLayer('amap')">高德</button>
  <button class="layer-btn" data-layer="voyager" onclick="switchLayer('voyager')">彩色</button>
  <button class="layer-btn" data-layer="standard" onclick="switchLayer('standard')">标准</button>
  <button class="layer-btn" data-layer="dark" onclick="switchLayer('dark')">暗色</button>
</div>
</div>
<div class="panel">
  <div class="error-banner" id="errorBanner">
    <b>模块未生效</b>
    请检查以下配置：<br>
    1. 已安装并启用 WLOC 定位模块<br>
    2. MITM 已开启且信任证书<br>
    3. MITM 主机名包含 gs-loc.apple.com<br>
    4. 当前网络已走代理
  </div>
  <div class="card">
    <h3>远程设备</h3>
    <div class="input-row">
      <input id="adminToken" type="password" placeholder="Cloudflare ADMIN_TOKEN" />
      <button class="btn btn-secondary" style="flex:none;min-width:64px" onclick="unlockDevices()">连接</button>
    </div>
    <div class="input-row">
      <select id="deviceSelect" onchange="selectDevice()" style="flex:1;padding:10px 12px;border:1px solid #d1d1d6;border-radius:8px;background:#fff;min-width:0"><option value="">本机设置</option></select>
      <button class="btn btn-secondary btn-sm" onclick="createRemoteDevice()">新增</button>
      <button class="btn btn-secondary btn-sm" onclick="renameRemoteDevice()">改名</button>
      <button class="btn btn-danger btn-sm" onclick="deleteRemoteDevice()">删除</button>
    </div>
    <div class="device-credential" id="deviceCredential"></div>
  </div>
  <div class="card">
    <h3>选择目标位置</h3>
    <div class="coords" id="coords">点击地图或使用下方工具选择位置</div>
    <div class="row">
      <button class="btn btn-primary" id="saveBtn" onclick="save()">储存到设备</button>
      <button class="btn btn-secondary" onclick="addFav()">收藏位置</button>
      <button class="btn btn-secondary" id="currentLocation" onclick="locateMe()">当前位置</button>
    </div>
    <details style="margin-top:10px">
      <summary style="font-size:13px;color:var(--blue);cursor:pointer">高级定位参数</summary>
      <div class="input-row"><input id="horizontalAccuracy" type="number" min="0" max="10000" value="25" placeholder="水平精度(米)" /></div>
      <div class="input-row"><input id="verticalAccuracy" type="number" min="0" max="10000" value="30" placeholder="垂直精度(米)" /></div>
      <div class="input-row"><input id="altitude" type="number" min="-12000" max="100000" placeholder="海拔(米，自动查询)" /></div>
    </details>
  </div>
  <div class="card">
    <div class="fav-header">
      <h3>收藏的位置</h3>
      <button class="btn btn-sm btn-secondary" onclick="clearAllFav()" id="clearAllBtn" style="display:none">清空全部</button>
    </div>
    <div id="favList" class="fav-list"></div>
  </div>
  <div class="card">
    <h3>当前生效坐标</h3>
    <div class="active-loc" id="activeLoc">
      <div class="label">设备持久化数据 (wloc_settings)</div>
      <div class="value" id="activeValue">查询中...</div>
    </div>
    <div class="row">
      <button class="btn btn-sm btn-secondary" onclick="queryActive()">刷新</button>
      <button class="btn btn-sm btn-primary" id="enableLocation" onclick="setActiveState('enable')">启用</button>
      <button class="btn btn-sm btn-secondary" id="pauseLocation" onclick="setActiveState('disable')">暂停</button>
      <button class="btn btn-sm btn-danger" id="clearLocation" onclick="clearActive()">清除</button>
    </div>
  </div>
  <div class="card">
    <h3>粘贴地图链接</h3>
    <div class="input-row">
      <input id="urlInput" placeholder="Apple/Google/高德地图链接 或 经纬度" />
      <button class="btn btn-secondary" style="flex:none;min-width:56px" onclick="parseUrl()">解析</button>
    </div>
    <div style="font-size:11px;color:var(--gray);margin-top:6px">支持 Apple Maps · Google Maps · 高德 · 百度 · 坐标文本</div>
  </div>
  <div class="card">
    <h3>搜索地点</h3>
    <div class="input-row">
      <input id="searchInput" placeholder="输入地名（如: 上海外滩）" />
      <button class="btn btn-secondary" style="flex:none;min-width:56px" onclick="searchPlace()">搜索</button>
    </div>
    <div id="searchResults" class="search-results"></div>
  </div>
  <div class="status" id="status">选好位置后点击「储存到设备」写入代理工具</div>
</div>
<div class="toast" id="toast"></div>
<div class="modal-overlay" id="favModal">
  <div class="modal">
    <h3>收藏此位置</h3>
    <input id="favNameInput" placeholder="输入备注名称（如: 公司、家）" maxlength="30" />
    <div style="font-size:12px;color:var(--gray);margin-bottom:12px;text-align:center" id="favModalCoords"></div>
    <div class="modal-btns">
      <button class="btn btn-secondary" onclick="closeFavModal()">取消</button>
      <button class="btn btn-primary" onclick="confirmFav()">保存</button>
    </div>
  </div>
</div>
<script>
const SAVE_API = 'https://gs-loc.apple.com/wloc-settings/save';
const FAV_KEY = 'wloc_favorites';
let lat = 22.544577, lon = 113.94114;
let altitude = null;
let selected = false;
let activeLon = null, activeLat = null;
let activeEnabled = false;
let activeStateLoaded = false;
let searchResults = [];
let adminToken = sessionStorage.getItem('wloc_admin_token') || '';
let remoteDevices = [];
let selectedDeviceId = '';

const map = L.map('map').setView([lat, lon], 13);
const tiles = {
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom:19, attribution:'ArcGIS'}),
  wgs84: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {maxZoom:19, attribution:'ArcGIS WGS84'}),
  standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'\\u00a9 OSM'}),
  dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {maxZoom:19, attribution:'\\u00a9 Carto'}),
  amap: L.tileLayer('https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {maxZoom:18, subdomains:'1234', attribution:'\\u00a9 高德'}),
  voyager: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {maxZoom:19, attribution:'\\u00a9 Carto'})
};
let currentLayer = tiles.satellite;
currentLayer.addTo(map);
function switchLayer(name) {
  map.removeLayer(currentLayer);
  currentLayer = tiles[name];
  currentLayer.addTo(map);
  document.querySelectorAll('.layer-btn').forEach(b => b.classList.toggle('active', b.dataset.layer === name));
}
let marker = L.marker([lat, lon], {draggable:true}).addTo(map);

marker.on('dragend', e => { const p=e.target.getLatLng(); setPos(p.lat, p.lng); });
map.on('click', e => { setPos(e.latlng.lat, e.latlng.lng); });

function setPos(newLat, newLon) {
  lat = newLat; lon = newLon; selected = true;
  marker.setLatLng([lat, lon]);
  document.getElementById('coords').textContent = '经度 ' + lon.toFixed(6) + '  纬度 ' + lat.toFixed(6);
}

function setAltitude(newAltitude) {
  if (newAltitude == null || newAltitude === '') {
    altitude = null;
    const input = document.getElementById('altitude');
    if (input) input.value = '';
    return;
  }
  const n = Number(newAltitude);
  altitude = Number.isFinite(n) ? n : null;
  const input = document.getElementById('altitude');
  if (input) input.value = altitude == null ? '' : String(altitude);
}

function readNumber(id, fallback, min, max) {
  const value = Number(document.getElementById(id).value);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}
function readAccuracy() { return readNumber('horizontalAccuracy', 25, 0, 10000); }
function readVerticalAccuracy() { return readNumber('verticalAccuracy', 30, 0, 10000); }
function setAdvancedFields(value) {
  document.getElementById('horizontalAccuracy').value = String(Number.isFinite(Number(value.accuracy)) ? Number(value.accuracy) : 25);
  document.getElementById('verticalAccuracy').value = String(Number.isFinite(Number(value.verticalAccuracy)) ? Number(value.verticalAccuracy) : 30);
  setAltitude(value.altitude);
}

function formatAltitude(value) {
  return Number.isFinite(value) ? '  海拔 ' + value.toFixed(0) + 'm' : '';
}

function formatFavoriteAltitude(value) {
  if (value == null || value === '') return '';
  const favAltitude = Number(value);
  return Number.isFinite(favAltitude) && favAltitude !== 0 ? ' · 海拔 ' + favAltitude.toFixed(0) + 'm' : '';
}

async function fetchElevation(newLat, newLon) {
  try {
    const r = await fetch('https://api.open-meteo.com/v1/elevation?latitude=' + encodeURIComponent(String(newLat)) + '&longitude=' + encodeURIComponent(String(newLon)), { cache:'no-store' });
    const d = await r.json();
    const elevation = d && d.elevation && d.elevation.length ? d.elevation[0] : null;
    if (elevation == null || elevation === '') return null;
    const n = Number(elevation);
    return Number.isFinite(n) ? Math.round(n) : null;
  } catch(e) {
    return null;
  }
}

async function updateAltitudeForPosition(newLat, newLon) {
  const value = await fetchElevation(newLat, newLon);
  setAltitude(value);
  return altitude;
}

function moveTo(newLat, newLon, zoom) {
  setPos(newLat, newLon);
  map.setView([lat, lon], zoom || 15);
  updateAltitudeForPosition(lat, lon);
}

function toast(msg, ms) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), ms || 2500);
}

function showError(show) {
  document.getElementById('errorBanner').style.display = show ? 'block' : 'none';
}

/* ---- Favorites (localStorage) ---- */
function getFavs() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch(e) { return []; }
}
function saveFavs(favs) {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}

function renderFavs() {
  const favs = getFavs();
  const el = document.getElementById('favList');
  const clearBtn = document.getElementById('clearAllBtn');
  clearBtn.style.display = favs.length ? '' : 'none';
  if (!favs.length) {
    el.innerHTML = '<div class="fav-empty">暂无收藏，选好位置后点击「收藏位置」</div>';
    return;
  }
  el.innerHTML = favs.map((f, i) => {
    const isActive = activeLon !== null && Math.abs(f.lon - activeLon) < 0.000001 && Math.abs(f.lat - activeLat) < 0.000001;
    return '<div class="fav-item" onclick="loadFav(' + i + ')">' +
      '<div class="fav-info">' +
        '<div class="fav-name">' + escHtml(f.name) + '<\\/div>' +
        '<div class="fav-coords">' + f.lon.toFixed(6) + ', ' + f.lat.toFixed(6) + formatFavoriteAltitude(f.altitude) + '<\\/div>' +
        (isActive ? '<div class="fav-active">\\u2713 当前生效<\\/div>' : '') +
      '<\\/div>' +
      '<button class="fav-del" onclick="event.stopPropagation();delFav(' + i + ')" title="删除">\\u00d7<\\/button>' +
    '<\\/div>';
  }).join('');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function addFav() {
  if (!selected) { toast('请先在地图上选择一个位置'); return; }
  if (!document.getElementById('altitude').value) await updateAltitudeForPosition(lat, lon);
  document.getElementById('favModalCoords').textContent = lon.toFixed(6) + ', ' + lat.toFixed(6) + formatFavoriteAltitude(altitude);
  document.getElementById('favNameInput').value = '';
  document.getElementById('favModal').classList.add('show');
  setTimeout(() => document.getElementById('favNameInput').focus(), 100);
}

function closeFavModal() {
  document.getElementById('favModal').classList.remove('show');
}

function confirmFav() {
  const name = document.getElementById('favNameInput').value.trim();
  if (!name) { toast('请输入备注名称'); return; }
  const favs = getFavs();
  favs.push({ name, lon, lat, accuracy: readAccuracy(), verticalAccuracy: readVerticalAccuracy(), altitude: Number.isFinite(altitude) ? altitude : null, time: new Date().toISOString() });
  saveFavs(favs);
  closeFavModal();
  renderFavs();
  toast('已收藏: ' + name);
}

function loadFav(i) {
  const favs = getFavs();
  if (!favs[i]) return;
  setPos(favs[i].lat, favs[i].lon);
  map.setView([lat, lon], 15);
  setAdvancedFields(favs[i]);
  toast(favs[i].name + ' (' + favs[i].lon.toFixed(4) + ', ' + favs[i].lat.toFixed(4) + ')');
}

function delFav(i) {
  const favs = getFavs();
  if (!favs[i]) return;
  const name = favs[i].name;
  favs.splice(i, 1);
  saveFavs(favs);
  renderFavs();
  toast('已删除: ' + name);
}

function clearAllFav() {
  if (!confirm('确定清空所有收藏？')) return;
  saveFavs([]);
  renderFavs();
  toast('已清空所有收藏');
}

function adminHeaders(json) {
  const headers = { Authorization:'Bearer ' + adminToken };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

async function apiJson(url, options) {
  const response = await fetch(url, options || {});
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || '远程设备请求失败');
  return body;
}

function renderDeviceSelect() {
  const select = document.getElementById('deviceSelect');
  select.innerHTML = '<option value="">本机设置<\/option>' + remoteDevices.map(device =>
    '<option value="' + escHtml(device.id) + '">' + escHtml(device.name) + '<\/option>'
  ).join('');
  select.value = selectedDeviceId;
}

async function loadDevices() {
  const body = await apiJson('/api/devices', { headers:adminHeaders(), cache:'no-store' });
  remoteDevices = body.devices || [];
  if (selectedDeviceId && !remoteDevices.some(device => device.id === selectedDeviceId)) selectedDeviceId = '';
  renderDeviceSelect();
}

async function unlockDevices() {
  adminToken = document.getElementById('adminToken').value.trim();
  if (!adminToken) return toast('请输入 ADMIN_TOKEN');
  sessionStorage.setItem('wloc_admin_token', adminToken);
  try { await loadDevices(); toast('远程设备已连接'); }
  catch (error) { toast(error.message, 3500); }
}

async function createRemoteDevice() {
  if (!adminToken) return toast('请先连接远程设备');
  const name = prompt('设备名称');
  if (!name) return;
  try {
    const body = await apiJson('/api/devices', { method:'POST', headers:adminHeaders(true), body:JSON.stringify({name}) });
    const el = document.getElementById('deviceCredential');
    el.style.display = 'block';
    el.textContent = '仅显示一次，请保存：\\ndeviceId=' + body.device.id + '\\ndeviceToken=' + body.token;
    await loadDevices();
    selectedDeviceId = body.device.id;
    renderDeviceSelect();
    queryActive();
  } catch (error) { toast(error.message, 3500); }
}

async function renameRemoteDevice() {
  if (!selectedDeviceId) return toast('请选择远程设备');
  const current = remoteDevices.find(device => device.id === selectedDeviceId);
  const name = prompt('新设备名称', current ? current.name : '');
  if (!name) return;
  try { await apiJson('/api/devices/' + encodeURIComponent(selectedDeviceId), { method:'PATCH', headers:adminHeaders(true), body:JSON.stringify({name}) }); await loadDevices(); }
  catch (error) { toast(error.message, 3500); }
}

async function deleteRemoteDevice() {
  if (!selectedDeviceId) return toast('请选择远程设备');
  if (!confirm('确定删除该远程设备？')) return;
  try { await apiJson('/api/devices/' + encodeURIComponent(selectedDeviceId), { method:'DELETE', headers:adminHeaders() }); selectedDeviceId=''; await loadDevices(); queryActive(); }
  catch (error) { toast(error.message, 3500); }
}

function selectDevice() {
  selectedDeviceId = document.getElementById('deviceSelect').value;
  queryActive();
}

/* ---- Active location query ---- */
function queryActive() {
  const el = document.getElementById('activeValue');
  el.textContent = '查询中...';
  const request = selectedDeviceId
    ? apiJson('/api/devices/' + encodeURIComponent(selectedDeviceId) + '/location', { headers:adminHeaders(), cache:'no-store' }).then(body => ({success:true, ...body.device}))
    : fetch(SAVE_API + '?action=query', { method:'GET', mode:'cors', cache:'no-store' }).then(r => r.json());
  request
    .then(d => {
      if (d.success && d.longitude != null && d.latitude != null) {
        activeStateLoaded = true;
        activeLon = parseFloat(d.longitude);
        activeLat = parseFloat(d.latitude);
        activeEnabled = d.enabled !== false;
        setAdvancedFields(d);
        const savedAltitude = Number(d.altitude);
        el.textContent = (activeEnabled ? '已启用 · ' : '已暂停 · ') + '经度 ' + activeLon.toFixed(6) + '  纬度 ' + activeLat.toFixed(6) + (d.accuracy != null ? '  水平精度 ' + d.accuracy + 'm' : '') + (d.verticalAccuracy != null ? '  垂直精度 ' + d.verticalAccuracy + 'm' : '') + (Number.isFinite(savedAltitude) ? '  海拔 ' + savedAltitude.toFixed(0) + 'm' : '');
        renderFavs();
      } else {
        activeStateLoaded = true;
        activeLon = null; activeLat = null; activeEnabled = false;
        el.textContent = '无已保存的坐标';
        renderFavs();
      }
    })
    .catch(() => {
      activeStateLoaded = false;
      el.textContent = '查询失败 (需要代理模块支持)';
    });
}

function setActiveState(action) {
  const request = selectedDeviceId
    ? apiJson('/api/devices/' + encodeURIComponent(selectedDeviceId) + '/enable', { method:'POST', headers:adminHeaders(true), body:JSON.stringify({enabled:action==='enable'}) }).then(body => ({success:true, ...body.device}))
    : fetch(SAVE_API + '?action=' + action, { method:'GET', mode:'cors', cache:'no-store' }).then(r => r.json());
  request
    .then(d => {
      if (!d.success) throw new Error(d.error || '状态更新失败');
      activeEnabled = d.enabled !== false;
      queryActive();
      toast(activeEnabled ? '已启用虚拟定位' : '已暂停，坐标已保留');
    })
    .catch(e => toast(e.message || '状态更新失败', 3000));
}

function clearActive() {
  if (!confirm('确定清除设备上已保存的坐标？清除后将使用模块默认参数或停止修改定位。')) return;
  const request = selectedDeviceId
    ? apiJson('/api/devices/' + encodeURIComponent(selectedDeviceId) + '/location', { method:'DELETE', headers:adminHeaders() }).then(() => ({success:true}))
    : fetch(SAVE_API + '?action=clear', { method:'GET', mode:'cors', cache:'no-store' }).then(r => r.json());
  request
    .then(d => {
      if (d.success) {
        activeLon = null; activeLat = null; activeEnabled = false;
        document.getElementById('activeValue').textContent = '已清除';
        renderFavs();
        toast('已清除设备坐标');
      } else { toast('清除失败: ' + (d.error || ''), 3000); }
    })
    .catch(() => { toast('清除失败 - 请检查模块配置', 3000); });
}

/* ---- Save to device ---- */
async function save() {
  if (!selected) { toast('请先在地图上选择一个位置'); return; }
  const btn = document.getElementById('saveBtn');
  btn.textContent = '储存中...'; btn.disabled = true;
  showError(false);
  try {
    setAltitude(document.getElementById('altitude').value);
    const previousAltitude = altitude;
    await updateAltitudeForPosition(lat, lon);
    if (altitude == null) setAltitude(previousAltitude);
    if (altitude == null) throw new Error('海拔查询失败');
    altitude = readNumber('altitude', altitude, -12000, 100000);
    const accuracy = readAccuracy();
    const verticalAccuracy = readVerticalAccuracy();
    let d;
    if (selectedDeviceId) {
      const body = await apiJson('/api/devices/' + encodeURIComponent(selectedDeviceId) + '/location', { method:'PUT', headers:adminHeaders(true), body:JSON.stringify({longitude:lon,latitude:lat,accuracy,verticalAccuracy,altitude}) });
      d = { success:true, ...body.device };
    } else {
      const r = await fetch(SAVE_API + '?lon=' + lon + '&lat=' + lat + '&acc=' + encodeURIComponent(String(accuracy)) + '&verticalAccuracy=' + encodeURIComponent(String(verticalAccuracy)) + '&altitude=' + encodeURIComponent(String(altitude)), { method:'GET', mode:'cors', cache:'no-store' });
      d = await r.json();
    }
    if (d.success) {
      activeLon = lon; activeLat = lat; activeEnabled = true;
      btn.textContent = '\\u2713 已储存'; btn.className = 'btn btn-primary success';
      document.getElementById('status').textContent = '\\u2713 已写入: ' + lon.toFixed(6) + ', ' + lat.toFixed(6) + ' · 海拔 ' + altitude.toFixed(0) + 'm · ' + new Date().toLocaleTimeString('zh-CN');
      document.getElementById('activeValue').textContent = '已启用 · 经度 ' + lon.toFixed(6) + '  纬度 ' + lat.toFixed(6) + '  水平精度 ' + accuracy + 'm  垂直精度 ' + verticalAccuracy + 'm' + formatAltitude(altitude);
      renderFavs();
      toast('\\u2713 坐标已写入设备，下次定位生效');
      setTimeout(() => { btn.textContent='储存到设备'; btn.className='btn btn-primary'; btn.disabled=false; }, 2500);
    } else {
      throw new Error(d.error || '写入失败');
    }
  } catch(e) {
    btn.textContent = '储存到设备'; btn.className = 'btn btn-primary'; btn.disabled = false;
    showError(true);
    toast('\\u2717 储存失败 - 请检查模块配置', 4000);
  }
}

function locateMe() {
  if (!activeStateLoaded) { toast('正在读取虚拟定位状态，请稍候', 2500); return; }
  if (activeEnabled) { toast('请先暂停虚拟定位并刷新定位服务', 3500); return; }
  if (!navigator.geolocation) return toast('浏览器不支持定位');
  toast('获取位置中...');
  navigator.geolocation.getCurrentPosition(
    async pos => { moveTo(pos.coords.latitude, pos.coords.longitude, 16); setAltitude(pos.coords.altitude); if (altitude == null) await updateAltitudeForPosition(lat, lon); toast('已获取当前位置'); },
    err => toast('定位失败: ' + err.message, 3000),
    { enableHighAccuracy:true, maximumAge:0, timeout:12000 }
  );
}

function parseMapUrl(text) {
  let m;
  m = text.match(/ll=([0-9.-]+),([0-9.-]+)/);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
  m = text.match(/@([0-9.-]+),([0-9.-]+)/);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
  m = text.match(/lnglat=([0-9.-]+),([0-9.-]+)/);
  if (m) return { lat: parseFloat(m[2]), lon: parseFloat(m[1]) };
  m = text.match(/(?:location|center)=([0-9.-]+),([0-9.-]+)/);
  if (m) return { lat: parseFloat(m[2]), lon: parseFloat(m[1]) };
  m = text.match(/([0-9]+\\.[0-9]+)[,\\s]+([0-9]+\\.[0-9]+)/);
  if (m) {
    const a = parseFloat(m[1]), b = parseFloat(m[2]);
    if (a < 90 && b > 90) return { lat: a, lon: b };
    if (b < 90 && a > 90) return { lat: b, lon: a };
    return { lat: a, lon: b };
  }
  return null;
}

function parseUrl() {
  const input = document.getElementById('urlInput').value.trim();
  if (!input) return toast('请粘贴地图链接或坐标');
  const result = parseMapUrl(input);
  if (!result) { toast('无法解析坐标，请检查链接格式', 3000); return; }
  moveTo(result.lat, result.lon, 15);
  toast('已解析: ' + result.lon.toFixed(4) + ', ' + result.lat.toFixed(4));
}

function renderSearchResults() {
  const el = document.getElementById('searchResults');
  if (!searchResults.length) { el.innerHTML = ''; return; }
  el.innerHTML = searchResults.map((item, index) =>
    '<button class="search-result" onclick="selectSearchResult(' + index + ')">' +
      '<div class="search-result-name">' + escHtml(item.name || '未命名地点') + '<\/div>' +
      '<div class="search-result-address">' + escHtml(item.address || (item.lon + ', ' + item.lat)) + '<\/div>' +
    '<\/button>'
  ).join('');
}

function selectSearchResult(index) {
  const item = searchResults[index];
  if (!item) return;
  moveTo(Number(item.lat), Number(item.lon), 16);
  searchResults = [];
  renderSearchResults();
  toast('已选择: ' + (item.name || '地点'));
}

async function searchPlace() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return toast('请输入地名');
  toast('搜索中...');
  try {
    const r = await fetch('/api/search?q=' + encodeURIComponent(q), { cache:'no-store' });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || '搜索服务失败');
    searchResults = body.results || [];
    renderSearchResults();
    if (!searchResults.length) { toast('未找到: ' + q, 3000); return; }
    if (searchResults.length === 1) selectSearchResult(0);
    else toast('找到 ' + searchResults.length + ' 个地点，请选择');
  } catch(e) { toast(e.message || '搜索失败', 3000); }
}

document.addEventListener('paste', e => {
  const text = (e.clipboardData||window.clipboardData).getData('text');
  if (text && (text.includes('map') || text.includes('loc') || text.includes('lnglat') || /[0-9]+\\.[0-9]+/.test(text))) {
    document.getElementById('urlInput').value = text;
    setTimeout(parseUrl, 200);
  }
});
document.getElementById('searchInput').addEventListener('keydown', e => { if(e.key==='Enter') searchPlace(); });
document.getElementById('urlInput').addEventListener('keydown', e => { if(e.key==='Enter') parseUrl(); });
document.getElementById('favNameInput').addEventListener('keydown', e => { if(e.key==='Enter') confirmFav(); });

renderFavs();
document.getElementById('adminToken').value = adminToken;
if (adminToken) loadDevices().catch(() => {});
queryActive();
<\/script>
</body>
</html>`;
}
