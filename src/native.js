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
import { AppUpdate } from "@capawesome/capacitor-app-update";

export const isNative = Capacitor.isNativePlatform();

// ─── Android back button ───────────────────────────────────────────────────
// Open sheets, the menu etc. push a handler; the newest one runs on "back".
// With nothing open, App.jsx decides (minimize the workout, go Home, or leave the app).
const backStack = [];
let rootBack = null;
// low = the lowest layer (e.g. Home page 2 → page 1): anything opened on top of it, even later, closes first
export function pushBack(fn, low) { const h = { fn }; if (low) backStack.unshift(h); else backStack.push(h); return () => { const i = backStack.indexOf(h); if (i >= 0) backStack.splice(i, 1); }; }
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

// ─── Share a text (friend code link, 1.5.0) ────────────────────────────────
// App: Android's share sheet. Website: the browser's share sheet if it has one, otherwise the clipboard.
// Resolves to "shared", "copied" or "cancelled".
export async function shareText(text) {
  try {
    if (isNative) { await Share.share({ text }); return "shared"; }
    if (navigator.share) { await navigator.share({ text }); return "shared"; }
  } catch (e) { if (/cancel|abort/i.test(String(e && (e.name + e.message)))) return "cancelled"; }
  await copyText(text);
  return "copied";
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return; } catch (_) {}
  const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select();
  try { document.execCommand("copy"); } catch (_) {}
  t.remove();
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

// ─── Backups in the phone's Documents folder (app only, 1.4.0) ─────────────
// Michael (Oct 11): an automatic backup every day (one file, the old one is replaced) and manual backups that are
// never deleted automatically, all in one folder he can find: Documents/HW App. Android 11+ needs no permission for
// files the app creates there; Android 8–10 ask once for storage access (declared in the manifest up to API 29).
// After a reinstall Android no longer counts older files as the app's own, so they can't be listed or replaced
// from here (they stay in the folder and can be restored with "Load a backup").
export const BK_DIR = "HW App";
export const BK_AUTO = "hw-app-auto-backup.json";
// 1.6.2 (Michael: two accounts on one phone): the automatic backup belongs to the account whose data is on the
// phone, so a second account never replaces the first one's file. No account = the plain name (as before).
export const bkAutoFile = id => (id ? `hw-app-auto-backup-${String(id).replace(/[^A-Za-z0-9]/g, "").slice(0, 8)}.json` : BK_AUTO);
// 1.6.4 (Michael, Oct 17: "open failed: EACCES" after reinstalling the app): Android 11+ attributes a file to the
// install that created it, so an automatic backup left by an earlier install (or the GitHub app before the Play one)
// can't be opened for writing and isn't even listed. bkWriteAuto then uses the next free name (-2 … -99) and the app
// remembers it (`file` in the autobk info). The old file stays in the folder for "Load a backup".
const AUTO_RE = /^hw-app-auto-backup(?:-([A-Za-z0-9]{8}))?(?:-([2-9]|[1-9][0-9]))?\.json$/;
const isDenied = e => /EACCES|EPERM|Permission denied|not permitted/i.test(String((e && e.message) || e));
const bkPath = name => `${BK_DIR}/${name}`;
export const bkSupported = () => isNative;
export async function bkWrite(name, text) {
  const res = await Filesystem.writeFile({ path: bkPath(name), data: text, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
  return res.uri;
}
export async function bkWriteAuto(name, text, prev) {
  const base = name.replace(/\.json$/, ""), names = [];
  if (prev && prev.startsWith(base + "-") && /^-([2-9]|[1-9][0-9])\.json$/.test(prev.slice(base.length))) names.push(prev); // the name that worked last time
  names.push(name);
  for (let i = 2; i <= 99; i++) names.push(`${base}-${i}.json`); // every reinstall locks one more name
  let err;
  for (const n of [...new Set(names)]) {
    try { await bkWrite(n, text); return n; }
    catch (e) { err = e; if (!isDenied(e)) throw e; }
  }
  throw err;
}
// Newest first: [{name, size, mtime, auto}]
export async function bkList() {
  try {
    const r = await Filesystem.readdir({ path: BK_DIR, directory: Directory.Documents });
    return (r.files || [])
      .filter(f => (f.type ? f.type === "file" : true) && /\.json$/i.test(f.name))
      .map(f => { const m = AUTO_RE.exec(f.name); return { name: f.name, size: f.size || 0, mtime: f.mtime || 0, auto: !!m, acct: m && m[1] ? m[1] : "" }; })
      .sort((a, b) => (b.auto - a.auto) || (b.mtime - a.mtime) || b.name.localeCompare(a.name));
  } catch (_) { return []; }
}
export async function bkRead(name) {
  const r = await Filesystem.readFile({ path: bkPath(name), directory: Directory.Documents, encoding: Encoding.UTF8 });
  return typeof r.data === "string" ? r.data : await r.data.text();
}
export async function bkDelete(name) { await Filesystem.deleteFile({ path: bkPath(name), directory: Directory.Documents }); }
export async function bkShare(name) {
  const { uri } = await Filesystem.getUri({ path: bkPath(name), directory: Directory.Documents });
  try { await Share.share({ title: name, files: [uri] }); return "shared"; }
  catch (e) { if (/cancel/i.test(String(e && e.message))) return "cancelled"; throw e; }
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

// Which build this is (1.6.1): "web", "direct" (the APK from GitHub) or "play" (Google Play). The Play build never
// updates itself (Play policy: only Play updates an app from Play): no update.json, no web bundles, no APKs.
const HwBuild = registerPlugin("HwBuild");
let store = isNative ? null : "web";
export async function buildStore() {
  if (store) return store;
  if (!Capacitor.isPluginAvailable("HwBuild")) return (store = "direct"); // APKs before 1.6.1
  try { store = (await HwBuild.info()).store === "play" ? "play" : "direct"; } catch (_) { store = "direct"; }
  return store;
}
export const isPlay = () => store === "play";

export async function checkForUpdate(appVersion, busy = false, onState = () => {}) {
  if (!isNative || (await buildStore()) === "play") return null;
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
export const apkSupported = () => isNative && store !== "play" && Capacitor.isPluginAvailable("ApkInstaller");
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
// ─── Updates from Google Play (app 1.7.0) ──────────────────────────────────
// Michael (Oct 17): an app from Google Play showed no update at all (1.6.1 turned the GitHub check off there, as Play
// requires) and must never send people to GitHub. Play's own in-app updates (Play Core, through
// @capawesome/capacitor-app-update) say whether Play has a newer version for this user. "Update" opens Play's small
// dialog, Play downloads it in the background (progress events), and "Restart" (completeFlexibleUpdate) installs it
// and starts the new version. Same states as the GitHub APK (apkState), so the same card and top-bar line show it.
// Play reports a version code; ours is major·1000000 + minor·10000 + patch·100 + 4th (.github/scripts/version.mjs).
export const verFromCode = c => {
  const n = Number(c) || 0, a = Math.floor(n / 1e6), b = Math.floor(n / 1e4) % 100, p = Math.floor(n / 100) % 100, q = n % 100;
  return n ? (q ? `${a}.${b}.${p}.${q}` : `${a}.${b}.${p}`) : "";
};
const PLAY = { avail: 2, inProgress: 3, pending: 1, downloading: 2, installing: 3, installed: 4, failed: 5, canceled: 6, downloaded: 11, ok: 0, canceledRes: 1 };
let playSub = null, playPoll = null, playV = "";
const playOn = async () => isNative && (await buildStore()) === "play" && Capacitor.isPluginAvailable("AppUpdate");
function playState(st, bytes, total) {
  const v = playV;
  if (st === PLAY.downloaded) { stopPlayPoll(); apkSet({ kind: "ready", v, play: true }); }
  else if (st === PLAY.downloading || st === PLAY.pending) apkSet({ kind: "downloading", v, play: true, pct: total > 0 ? Math.min(100, (bytes / total) * 100) : (apk.kind === "downloading" ? apk.pct || 0 : 0) });
  else if (st === PLAY.failed) { stopPlayPoll(); apkSet({ kind: "error", v, play: true, err: "Google Play" }); }
  else if (st === PLAY.canceled) { stopPlayPoll(); apkSet({ kind: "idle" }); }
}
function playListen() {
  if (playSub) return;
  playSub = AppUpdate.addListener("onFlexibleUpdateStateChange", e => { if (e) playState(e.installStatus, Number(e.bytesDownloaded) || 0, Number(e.totalBytesToDownload) || 0); });
}
function stopPlayPoll() { if (playPoll) { clearInterval(playPoll); playPoll = null; } }
// A download Play started before this app start has no progress events: ask Play every few seconds until it is done.
function startPlayPoll() {
  if (playPoll) return;
  playPoll = setInterval(() => { AppUpdate.getAppUpdateInfo().then(i => playState(i.installStatus, 0, 0)).catch(() => {}); }, 4000);
}
// Once per start: {version, play: true} when Play has a newer version for this user, else null.
export async function playCheck() {
  if (!(await playOn())) return null;
  try {
    const i = await AppUpdate.getAppUpdateInfo();
    const v = verFromCode(i.availableVersionCode);
    if (!v) return null;
    playV = v;
    if (i.installStatus === PLAY.downloaded) { apkSet({ kind: "ready", v, play: true }); return { version: v, play: true }; }
    if (i.updateAvailability === PLAY.avail || i.updateAvailability === PLAY.inProgress) {
      if (i.installStatus === PLAY.downloading || i.installStatus === PLAY.pending) { playListen(); playState(i.installStatus, 0, 0); startPlayPoll(); }
      return { version: v, play: true };
    }
  } catch (_) {}
  return null;
}
// "Update": Play's dialog, then the download in the background. If Play doesn't allow an in-app update for this
// install, its store page opens instead (never GitHub).
export async function playStart() {
  if (!(await playOn()) || apk.kind === "downloading") return;
  playListen();
  try {
    await AppUpdate.getAppUpdateInfo(); // the plugin needs fresh info right before starting
    const r = await AppUpdate.startFlexibleUpdate();
    const code = r ? r.code : -1;
    if (code === PLAY.ok) { if (apk.kind !== "ready") apkSet({ kind: "downloading", v: playV, play: true, pct: apk.kind === "downloading" ? apk.pct || 0 : 0 }); }
    else if (code === PLAY.canceledRes) apkSet({ kind: "idle" });
    else { apkSet({ kind: "idle" }); await AppUpdate.openAppStore(); }
  } catch (e) { apkSet({ kind: "error", v: playV, play: true, err: errMsg(e) }); }
}
// "Restart": Play installs the downloaded version and starts it.
export async function playComplete() {
  if (apk.kind !== "ready" || !apk.play) return;
  try { await AppUpdate.completeFlexibleUpdate(); } catch (e) { apkSet({ ...apk, err: errMsg(e) }); }
}
export async function playOpenStore() { try { await AppUpdate.openAppStore(); } catch (_) {} }

// 1.7.0: links the app owns (App Links: https://mikydon.github.io/hw-app/add/…). A link tapped while the app runs
// arrives as appUrlOpen; a link that started the app is its launch URL (handled once, a reload doesn't repeat it).
export function onAppUrl(fn) {
  if (!isNative) return () => {};
  let h = null, gone = false;
  CapApp.addListener("appUrlOpen", e => { if (e && e.url) fn(e.url); }).then(x => { h = x; if (gone) x.remove(); }).catch(() => {});
  CapApp.getLaunchUrl().then(r => {
    const u = r && r.url;
    if (gone || !u) return;
    try { if (sessionStorage.getItem("hw-launch-url") === u) return; sessionStorage.setItem("hw-launch-url", u); } catch (_) {}
    fn(u);
  }).catch(() => {});
  return () => { gone = true; if (h) h.remove(); };
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
      // app = the package that wrote it (1.5.5: shown as the app's name, never the raw id); src = what the plugin calls the
      // source (the package again, or a device like "Samsung SM-S911B")
      (out[k] = out[k] || []).push({ ts: d.getTime(), kcal, src: String(s.sourceName || "").slice(0, 40), app: String(s.sourceId || "").slice(0, 80) });
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

// ── Phone notifications (1.6.0) ────────────────────────────────────────────────────────────────────────────────
// Firebase Cloud Messaging through @capacitor-firebase/messaging (native side only: registered by name, so its web
// part, which would pull Firebase into the main bundle, is never loaded). Older APKs (before 1.6.0) don't have it.
const FcmPlugin = registerPlugin("FirebaseMessaging");
export const pushSupported = () => isNative && Capacitor.isPluginAvailable("FirebaseMessaging");
// "granted" | "denied" | "prompt" (Android 13+ asks; older Android always allows)
export async function pushPermission(ask) {
  if (!pushSupported()) return "denied";
  try { const r = ask ? await FcmPlugin.requestPermissions() : await FcmPlugin.checkPermissions(); return r.receive || "denied"; } catch (_) { return "denied"; }
}
// The "Friends and messages" channel (Android 8+); its name follows the app's language.
export async function pushChannel(name) {
  if (!pushSupported()) return;
  try { await FcmPlugin.createChannel({ id: "social", name, importance: 4, visibility: 1, vibration: true, lights: true, lightColor: "#FFD23F" }); } catch (_) {}
}
export async function pushToken() { if (!pushSupported()) return null; try { return (await FcmPlugin.getToken()).token || null; } catch (_) { return null; } }
// The same, but says why it failed (for the test button): {token} | {err}
export async function pushTokenWhy() {
  if (!pushSupported()) return { err: "no-plugin" };
  try { const t = (await FcmPlugin.getToken()).token; return t ? { token: t } : { err: "no-token" }; } catch (e) { return { err: "token " + String((e && (e.code || e.message)) || e).slice(0, 60) }; }
}
export async function pushDeleteToken() { if (!pushSupported()) return; try { await FcmPlugin.deleteToken(); } catch (_) {} }
// A tap on a notification (also when it started the app): fn({kind, uid, cid}) (uid = the sender; "from" is reserved by FCM)
export function onPushTap(fn) {
  if (!pushSupported()) return () => {};
  const h = FcmPlugin.addListener("notificationActionPerformed", e => { const d = (e && e.notification && e.notification.data) || {}; if (d.kind) fn(d); });
  return () => { Promise.resolve(h).then(x => x && x.remove && x.remove()).catch(() => {}); };
}
// A notification that arrived while the app is open (Android shows nothing then): fn({kind, uid, cid})
export function onPushReceived(fn) {
  if (!pushSupported()) return () => {};
  const h = FcmPlugin.addListener("notificationReceived", e => { const d = (e && e.notification && e.notification.data) || {}; fn(d); });
  return () => { Promise.resolve(h).then(x => x && x.remove && x.remove()).catch(() => {}); };
}
// A new token from Firebase (it can change now and then)
export function onPushToken(fn) {
  if (!pushSupported()) return () => {};
  const h = FcmPlugin.addListener("tokenReceived", e => e && e.token && fn(e.token));
  return () => { Promise.resolve(h).then(x => x && x.remove && x.remove()).catch(() => {}); };
}

// ── Screen refresh rate (1.6.0) ─────────────────────────────────────────────────────────────────────────────────
// The app's own plugin (HwDisplayPlugin.java): "max" = the highest the phone allows, "60" = 60 Hz.
const HwDisplay = registerPlugin("HwDisplay");
export const hzSupported = () => isNative && Capacitor.isPluginAvailable("HwDisplay");
export async function hzInfo() { if (!hzSupported()) return null; try { return await HwDisplay.info(); } catch (_) { return null; } }
export async function hzSet(mode) { if (!hzSupported()) return; try { await HwDisplay.set({ mode: mode === "60" ? "60" : "max" }); } catch (_) {} }
