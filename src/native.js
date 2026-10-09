// Everything that differs between the website and the Android app (Capacitor).
// On the website every function here falls back to the browser API, so App.jsx can call them anywhere.
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Haptics } from "@capacitor/haptics";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { CapacitorUpdater } from "@capgo/capacitor-updater";

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
export function vibratePattern(pat) {
  if (!isNative) { try { navigator.vibrate?.(pat); } catch (_) {} return; }
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
export async function checkForUpdate(appVersion) {
  if (!isNative) return null;
  const nv = await nativeVersion();
  let info;
  try {
    const r = await CapacitorHttp.get({ url: UPDATE_JSON + "?t=" + Date.now(), headers: { Accept: "application/json" } });
    if (r.status !== 200) return null;
    info = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
  } catch (_) { return null; }
  if (!info || !info.version) return null;
  if (nv && verCmp(big(info.version), big(nv)) > 0) return { apk: { version: info.version, url: info.apk && info.apk.url } };
  if (verCmp(info.version, appVersion) <= 0 || !info.bundle || !info.bundle.url) return null;
  if (nv && big(info.version) !== big(nv)) return null; // a bundle only runs in the APK it was built for
  try {
    const list = await CapacitorUpdater.list();
    let b = (list.bundles || []).find(x => x.version === info.version && x.status !== "error");
    if (!b) b = await CapacitorUpdater.download({ url: info.bundle.url, version: info.version, checksum: info.bundle.sha256 });
    await CapacitorUpdater.next({ id: b.id });
    await CapacitorUpdater.setMultiDelay({ delayConditions: [{ kind: "kill" }] });
    return { staged: info.version };
  } catch (_) { return null; }
}
