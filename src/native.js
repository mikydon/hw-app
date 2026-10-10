// Everything that differs between the website and the Android app (Capacitor).
// On the website every function here falls back to the browser API, so App.jsx can call them anywhere.
import { Capacitor, CapacitorHttp, registerPlugin } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Haptics } from "@capacitor/haptics";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { Health } from "@capgo/capacitor-health";

export const isNative = Capacitor.isNativePlatform();

// ─── Android back button ───────────────────────────────────────────────────
// Open sheets, the menu etc. push a handler; the newest one runs on "back".
// With nothing open, App.jsx decides (minimize the workout, go Home, or leave the app).
const backStack = [];
let rootBack = null;
export function pushBack(fn) { const h = { fn }; backStack.push(h); return () => { const i = backStack.indexOf(h); if (i >= 0) backStack.splice(i, 1); }; }
export function setRootBack(fn) { rootBack = fn; }
export function exitApp() { if (isNative) CapApp.minimizeApp().catch(() => CapApp.exitApp()); }
if (isNative) {
  CapApp.addListener("backButton", () => {
    const top = backStack[backStack.length - 1];
    if (top) { top.fn(); return; }
    if (rootBack && rootBack()) return;
    exitApp();
  });
}

// ─── Vibration ─────────────────────────────────────────────────────────────
// pattern like navigator.vibrate: [on, off, on, …] in ms
// 1.3.0: the app's own HwVibrate plugin vibrates with the ALARM usage, so it works even when "touch feedback"
// is off in the phone's settings (Android 13+ silences vibrations without attributes then). Older APKs: Haptics.
const HwVibrate = registerPlugin("HwVibrate");
export function vibratePattern(pat) {
  if (!isNative) { try { navigator.vibrate?.(pat); } catch (_) {} return; }
  if (Capacitor.isPluginAvailable("HwVibrate")) { HwVibrate.vibrate({ pattern: (Array.isArray(pat) ? pat : [pat]).map(Number) }).catch(() => {}); return; }
  const arr = Array.isArray(pat) ? pat : [pat];
  let t = 0;
  arr.forEach((ms, i) => {
    if (i % 2 === 0) setTimeout(() => { Haptics.vibrate({ duration: ms }).catch(() => {}); }, t);
    t += ms;
  });
}

// ─── Keep the screen on ────────────────────────────────────────────────────
// Returns a release function.
export async function keepScreenOn() {
  if (isNative) {
    try { await KeepAwake.keepAwake(); } catch (_) {}
    return () => { KeepAwake.allowSleep().catch(() => {}); };
  }
  let lock = null;
  try { lock = await navigator.wakeLock?.request("screen"); } catch (_) {}
  return () => { try { lock?.release(); } catch (_) {} };
}

// ─── Links (exercise videos) ───────────────────────────────────────────────
// In the app, navigating to an outside URL is handed to Android, which opens the YouTube app
// (or the browser). On the website it opens a new tab.
export function openExternal(url) {
  if (isNative) { window.location.href = url; return; }
  try { window.open(url, "_blank"); } catch (_) {}
}

// ─── Backup file ───────────────────────────────────────────────────────────
// Website: downloads the file. App: writes it to the app cache and opens Android's share sheet
// (save to Files / Drive, or send it). Resolves to "saved", "shared" or "cancelled".
export async function saveBackupFile(name, text) {
  if (!isNative) {
    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return "saved";
  }
  const res = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
  try {
    await Share.share({ title: name, files: [res.uri] });
    return "shared";
  } catch (e) {
    if (/cancel/i.test(String(e && e.message))) return "cancelled";
    throw e;
  }
}

// ─── Updates (app only) ────────────────────────────────────────────────────
// Every GitHub release has update.json: {version, bundle:{url, sha256}, apk:{url}}.
// releases/latest/download/… always points to the newest release.
export const UPDATE_JSON = "https://github.com/mikydon/hw-app/releases/latest/download/update.json";
export const big = v => String(v || "0.0").split(".").slice(0, 2).join(".");
export const verCmp = (a, b) => {
  const x = String(a || "0").split(".").map(Number), y = String(b || "0").split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
};

// Tell the updater this bundle started fine (otherwise it rolls back to the previous one).
export function appReady() { if (isNative) CapacitorUpdater.notifyAppReady().catch(() => {}); }

export async function nativeVersion() {
  if (!isNative) return null;
  try { return (await CapApp.getInfo()).version; } catch (_) { return null; }
}

// Checks GitHub for a newer version.
// - a newer big version (second number) needs a new APK → returns {apk: {version, url}}
// - a newer small version of the same big version is downloaded in the background and switched to
//   on the next start (never in the middle of a session) → returns {staged: version}
const KILL = { delayConditions: [{ kind: "kill" }] };
let latest = null; // the APK of the newest release, from update.json: {version, url, size}
export const latestApk = () => latest;
// The last update check, saved so the menu can show it (helps to see why an update didn't arrive).
export const UPD_KEY = "domaci-trening-v1-upd";
function updLog(o) { try { localStorage.setItem(UPD_KEY, JSON.stringify({ ts: Date.now(), ...o })); } catch (_) {} return o; }
export function lastGh() { try { return JSON.parse(localStorage.getItem(UPD_KEY + "-gh") || "null"); } catch (_) { return null; } }
export function lastUpdate() { try { return JSON.parse(localStorage.getItem(UPD_KEY) || "null"); } catch (_) { return null; } }
const errMsg = e => String((e && (e.message || e.errorMessage)) || e || "?").slice(0, 120);

export async function checkForUpdate(appVersion, busy = false, onState = () => {}) {
  if (!isNative) return null;
  let failed = null;
  try { const f = await CapacitorUpdater.getFailedUpdate(); if (f && f.bundle && f.bundle.version) failed = f.bundle.version; } catch (_) {}
  // A small update downloaded on an earlier start: switch to it right now, at the start.
  // (The updater itself would only switch when the app goes to the background, i.e. a 3rd start,
  // and a version switched on in the background may not start in time and gets rolled back.)
  // Not while a workout is running: then it waits for the next start again.
  try {
    const nx = await CapacitorUpdater.getNextBundle();
    if (nx && nx.id && nx.version && nx.status !== "error" && verCmp(nx.version, appVersion) > 0) {
      if (busy) { await CapacitorUpdater.setMultiDelay(KILL); return updLog({ kind: "waiting", v: nx.version, failed, staged: nx.version }); }
      updLog({ kind: "switching", v: nx.version, failed });
      await CapacitorUpdater.set({ id: nx.id }); // reloads into the new version
      return { switching: nx.version };
    }
  } catch (e) { updLog({ kind: "error", err: "set: " + errMsg(e), failed }); }
  const nv = await nativeVersion();
  let info;
  try {
    const r = await CapacitorHttp.get({ url: UPDATE_JSON + "?t=" + Date.now(), headers: { Accept: "application/json" } });
    if (r.status !== 200) { updLog({ kind: "net", err: "HTTP " + r.status, failed }); return null; }
    info = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
  } catch (e) { updLog({ kind: "net", err: errMsg(e), failed }); return null; }
  if (!info || !info.version) { updLog({ kind: "net", err: "update.json?", failed }); return null; }
  // The newest version on GitHub, shown in the menu right away (Michael, Oct 10), before any download.
  try { localStorage.setItem(UPD_KEY + "-gh", JSON.stringify({ v: info.version, ts: Date.now() })); } catch (_) {}
  onState({ kind: "gh", v: info.version });
  latest = info.apk && info.apk.url ? { version: info.version, url: info.apk.url, size: Number(info.apk.size) || 0 } : null;
  if (nv && verCmp(big(info.version), big(nv)) > 0) return updLog({ kind: "apk", v: info.version, failed, apk: latest || { version: info.version, url: "" } });
  if (verCmp(info.version, appVersion) <= 0 || !info.bundle || !info.bundle.url) { updLog({ kind: "latest", v: info.version, failed }); return null; }
  if (nv && big(info.version) !== big(nv)) { updLog({ kind: "latest", v: info.version, failed }); return null; } // a bundle only runs in the APK it was built for
  try {
    const list = await CapacitorUpdater.list();
    let b = (list.bundles || []).find(x => x.version === info.version && x.status !== "error");
    if (!b) {
      // Show it on Home, so nobody closes the app halfway (Michael, Oct 10).
      onState({ kind: "downloading", v: info.version, pct: 0 });
      updLog({ kind: "downloading", v: info.version, failed });
      let sub = null;
      try { sub = await CapacitorUpdater.addListener("download", e => { if (e && typeof e.percent === "number") onState({ kind: "downloading", v: info.version, pct: e.percent }); }); } catch (_) {}
      try { b = await CapacitorUpdater.download({ url: info.bundle.url, version: info.version, checksum: info.bundle.sha256 }); }
      finally { try { sub && sub.remove(); } catch (_) {} }
    }
    await CapacitorUpdater.next({ id: b.id });
    await CapacitorUpdater.setMultiDelay(KILL);
    onState({ kind: "ready", v: info.version, id: b.id });
    return updLog({ kind: "staged", v: info.version, failed, staged: info.version });
  } catch (e) { onState(null); updLog({ kind: "error", v: info.version, err: errMsg(e), failed }); return null; }
}
// "Switch on now" on the ready banner: reloads into the downloaded version right away (in the foreground).
export async function applyUpdateNow(id) { if (isNative && id) { try { await CapacitorUpdater.set({ id }); } catch (_) {} } }

// ─── A new APK, downloaded inside the app (app 1.2.0) ──────────────────────
// Michael (Oct 10): the download must not leave the app (no browser), show its progress, and never install
// by itself: the APK waits in the app's cache until the user taps "Install" (not during a workout).
// Download: Filesystem.downloadFile with progress events. Install: ApkInstaller, a small plugin of this app
// (android/app/src/main/java/…/ApkInstallerPlugin.java) that opens Android's installer for the cached file.
const ApkInstaller = registerPlugin("ApkInstaller");
const APK_KEY = "domaci-trening-v1-upd-apk"; // {v, size} once a download finished
let apk = { kind: "idle" };
const apkSubs = new Set();
function apkSet(s) { apk = s; apkSubs.forEach(f => { try { f(s); } catch (_) {} }); }
export const apkState = () => apk;
export function onApk(fn) { apkSubs.add(fn); return () => { apkSubs.delete(fn); }; }
const apkName = v => `hw-app-${v}.apk`;
export const apkSupported = () => isNative && Capacitor.isPluginAvailable("ApkInstaller");
let testBuild = null;
// The test APK ("HW App Test", id ….test) may download the newest release even when it isn't newer, to try the flow.
export async function isTestBuild() {
  if (!isNative) return false;
  if (testBuild === null) { try { testBuild = /\.test$/.test((await CapApp.getInfo()).id || ""); } catch (_) { testBuild = false; } }
  return testBuild;
}
// At start: a finished download of version v is ready again; every other cached APK (older, or already installed) is deleted.
export async function apkRestore(v) {
  if (!apkSupported()) return;
  let m = null; try { m = JSON.parse(localStorage.getItem(APK_KEY) || "null"); } catch (_) {}
  const keep = m && v && m.v === v ? apkName(v) : null;
  try {
    const r = await Filesystem.readdir({ path: "", directory: Directory.Cache });
    for (const f of (r && r.files) || []) {
      const n = typeof f === "string" ? f : f.name;
      if (/^hw-app-.*\.apk$/.test(n) && n !== keep) await Filesystem.deleteFile({ path: n, directory: Directory.Cache }).catch(() => {});
    }
  } catch (_) {}
  if (!keep) { try { localStorage.removeItem(APK_KEY); } catch (_) {} return; }
  try {
    const st = await Filesystem.stat({ path: keep, directory: Directory.Cache });
    if (st && st.size === m.size) { if (apk.kind !== "downloading") apkSet({ kind: "ready", v, path: st.uri }); return; }
  } catch (_) {}
  try { localStorage.removeItem(APK_KEY); } catch (_) {}
}
export async function apkDownload(info) {
  if (!apkSupported() || !info || !info.url || apk.kind === "downloading") return;
  const v = info.version, path = apkName(v);
  apkSet({ kind: "downloading", v, pct: 0 });
  let sub = null;
  try {
    sub = await Filesystem.addListener("progress", e => {
      if (!e || (e.url && e.url !== info.url)) return;
      const total = Number(e.contentLength) > 0 ? Number(e.contentLength) : info.size || 0;
      if (total > 0) apkSet({ kind: "downloading", v, pct: Math.min(100, (Number(e.bytes) / total) * 100) });
    });
    await Filesystem.downloadFile({ url: info.url, path, directory: Directory.Cache, progress: true, connectTimeout: 20000, readTimeout: 30000 });
    const st = await Filesystem.stat({ path, directory: Directory.Cache });
    if (!st || !st.size || (info.size && st.size !== info.size)) throw new Error("incomplete file (" + (st && st.size) + " B)");
    try { localStorage.setItem(APK_KEY, JSON.stringify({ v, size: st.size })); } catch (_) {}
    apkSet({ kind: "ready", v, path: st.uri });
  } catch (e) {
    try { await Filesystem.deleteFile({ path, directory: Directory.Cache }); } catch (_) {}
    apkSet({ kind: "error", v, err: errMsg(e) });
  } finally { try { sub && sub.remove(); } catch (_) {} }
}
// Android 8+: the user allows "install unknown apps" for HW App once (Settings opens on that switch).
export async function apkCanInstall() { try { const r = await ApkInstaller.canInstall(); return !!(r && r.allowed); } catch (_) { return true; } }
export function apkAllow() { if (apkSupported()) ApkInstaller.openSettings().catch(() => {}); }
export async function apkInstall() {
  if (apk.kind !== "ready") return false;
  try { await ApkInstaller.install({ path: apk.path }); return true; }
  catch (e) { apkSet({ ...apk, err: errMsg(e) }); return false; }
}
export function onAppResume(fn) {
  if (!isNative) return () => {};
  let h = null, gone = false;
  CapApp.addListener("resume", fn).then(x => { h = x; if (gone) x.remove(); }).catch(() => {});
  return () => { gone = true; if (h) h.remove(); };
}

// ─── Health Connect (app 1.1.0) ────────────────────────────────────────────
// Read: steps and eaten calories (nutrition energy); the manifest removes every other health permission the plugin declares.
const HC_READ = ["steps", "dietaryEnergyConsumed"];
const HC_BODY = ["weight", "height"]; // 1.3.0 (Michael, Oct 10): weight and height come from Health Connect too
export async function healthState() {
  if (!isNative) return { available: false, web: true };
  try {
    const a = await Health.isAvailable();
    if (!a || !a.available) return { available: false, reason: (a && a.reason) || "" };
    const s = await Health.checkAuthorization({ read: [...HC_READ, ...HC_BODY] });
    const ok = (s && s.readAuthorized) || [];
    return { available: true, granted: ok.includes("steps"), food: ok.includes("dietaryEnergyConsumed"), body: ok.includes("weight") || ok.includes("height") };
  } catch (e) { return { available: false, reason: errMsg(e) }; }
}
// Steps first; eaten calories only when the user also wants them (Michael, Oct 10: food is optional).
// Steps, weight and height together; food only when asked for (withFood).
export async function healthConnect(withFood = false) {
  try {
    const s = await Health.requestAuthorization({ read: withFood ? [...HC_READ, ...HC_BODY] : ["steps", ...HC_BODY] });
    const ok = (s && s.readAuthorized) || [];
    return { steps: ok.includes("steps"), food: ok.includes("dietaryEnergyConsumed"), body: ok.includes("weight") || ok.includes("height") };
  } catch (_) { return { steps: false, food: false, body: false }; }
}
// The newest weight (kg) and height (cm) in Health Connect, with their times: {weight: {v, ts}, height: {v, ts}}.
// Records are read oldest first, so a long window is read and the newest one picked here.
export async function healthBody() {
  if (!isNative) return null;
  const out = {};
  for (const [type, years] of [["weight", 2], ["height", 10]]) {
    try {
      const start = new Date(); start.setFullYear(start.getFullYear() - years);
      const r = await Health.readSamples({ dataType: type, startDate: start.toISOString(), endDate: new Date().toISOString(), limit: 2000 });
      let best = null;
      for (const x of (r && r.samples) || []) { const ts = new Date(x.startDate).getTime(), v = Number(x.value); if (v > 0 && (!best || ts > best.ts)) best = { v, ts }; }
      if (best) out[type] = { v: Math.round(best.v), ts: best.ts }; // whole kg / cm, like the app's own fields
    } catch (_) {}
  }
  return out;
}
export function healthSettings() { if (isNative) Health.openHealthConnectSettings().catch(() => {}); }
// Per local day for the last `days` days (today included): { "2026-10-10": 8123, … }
// type: "steps" or "dietaryEnergyConsumed" (kcal eaten, logged in Samsung Health, MyFitnessPal…)
// Each food entry from other apps (Michael, Oct 10: show them in the calorie history, with the time):
// { "2026-10-10": [{ts, kcal, src}], … } for the last `days` days. src = the app that wrote it (e.g. Samsung Health).
export async function healthFoodItems(days = 7) {
  if (!isNative) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
  try {
    const r = await Health.readSamples({ dataType: "dietaryEnergyConsumed", startDate: start.toISOString(), endDate: new Date().toISOString(), limit: 1000, ascending: true });
    const out = {};
    for (const s of (r && r.samples) || []) {
      const d = new Date(s.startDate), kcal = Math.round(Number(s.value) || 0);
      if (!kcal) continue;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      (out[k] = out[k] || []).push({ ts: d.getTime(), kcal, src: String(s.sourceName || "").slice(0, 40) });
    }
    return out;
  } catch (_) { return null; }
}
export async function healthSteps(days = 7, type = "steps") {
  if (!isNative) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
  try {
    const r = await Health.queryAggregated({ dataType: type, startDate: start.toISOString(), endDate: new Date().toISOString(), bucket: "day", aggregation: "sum" });
    const out = {};
    for (const s of (r && r.samples) || []) {
      const d = new Date(s.startDate);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out[k] = Math.max(0, Math.round(Number(s.value) || 0));
    }
    return out;
  } catch (_) { return null; }
}
