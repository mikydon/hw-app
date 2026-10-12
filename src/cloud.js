// Accounts, friends, leaderboard and the cloud backup (1.5.0), on Firebase's free Spark plan:
// Authentication (Google sign-in) + Firestore (Standard edition, the one free "(default)" database).
// Built as its own bundle (build.mjs → HWCloud) and loaded by cloud-lazy.js only when an account is used, so the
// ~700 KB of Firebase isn't parsed at every start. Everything goes through cloud() so the tests can swap in a fake
// (window.__hwCloud): the real servers can't be reached from the test sandbox. The Firestore security rules (firestore.rules) are what really protects the data;
// the Firebase config below is public by design.
//
// Data (see firestore.rules):
//   profiles/{uid}           nick, pfp (small JPEG), xp, lvl, streak, n (workouts), code, global, ts   (read: signed-in)
//   board/{uid}              the same for people who joined the world leaderboard                      (list: signed-in)
//   nicks/{nick lower-case}  {uid}: makes nicknames unique, lets people find you by nickname
//   codes/{CODE}             {uid}: your friend code (also in the share link)
//   inbox/{to}/from/{from}   a friend request {ts}
//   friends/{me}/list/{uid}  {ts}: written for both people in one batch when a request is accepted
//   backups/{uid}            {json, ts, n}: the automatic cloud backup (owner only)
//   reports/{auto id}        {by, about, reason, ts}: a reported profile (create only; read in the console)
//   chats/{a_b}              {m: [a, b], last: {from, text, ts}} (a_b = the two uids sorted); only between friends
//   chats/{a_b}/msgs/{id}    {from, text, ts}
// Live updates (friend requests, friends, chats, messages) use Firestore listeners while the app is open
// (1.5.0, Michael: requests showed up only after switching tabs).
import { initializeApp } from "firebase/app";
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver, GoogleAuthProvider,
  signInWithPopup, signInWithCredential, signOut as fbSignOut, onAuthStateChanged, reauthenticateWithPopup, reauthenticateWithCredential } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, query, where, orderBy, limit, limitToLast, getDocs, writeBatch, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";
import { CODE_CHARS, nickKey, cleanCode, chatId } from "./cloud-shared.js";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

const CONFIG = {
  apiKey: "AIzaSyCWHFZnTIBpuiKN-QCVRWoMsc7_nnIMAmE",
  authDomain: "hw-app-mikydon.firebaseapp.com",
  projectId: "hw-app-mikydon",
  storageBucket: "hw-app-mikydon.firebasestorage.app",
  messagingSenderId: "95035642551",
  appId: "1:95035642551:web:5e5f232ed6503c15a2f332",
};
const native = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("FirebaseAuthentication");

let app = null, auth = null, db = null, user = null;
const subs = new Set();
function boot() {
  if (app) return;
  app = initializeApp(CONFIG);
  // In the Android WebView the popup resolver isn't needed (sign-in is native) and IndexedDB keeps the session.
  auth = initializeAuth(app, native() ? { persistence: indexedDBLocalPersistence } : { persistence: [indexedDBLocalPersistence, browserLocalPersistence], popupRedirectResolver: browserPopupRedirectResolver });
  db = getFirestore(app);
  onAuthStateChanged(auth, u => { user = u ? { uid: u.uid } : null; subs.forEach(f => f(user)); });
}
const d = (...p) => doc(db, ...p);
const uid = () => { if (!user) throw Object.assign(new Error("signed out"), { code: "signed-out" }); return user.uid; };
async function googleCredential() {
  const r = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
  const tok = r && r.credential && r.credential.idToken;
  if (!tok) throw Object.assign(new Error("no token"), { code: "cancelled" });
  return GoogleAuthProvider.credential(tok);
}
// The native Google sign-out can take a while (or never answer when nobody is signed in natively): wait at most 3 s.
const nativeSignOut = () => (native() ? Promise.race([FirebaseAuthentication.signOut().catch(() => {}), new Promise(r => setTimeout(r, 3000))]) : Promise.resolve());
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
const PROFILE_KEYS = ["nick", "pfp", "xp", "lvl", "streak", "n", "code", "global"];
async function profilesOf(uids) {
  const out = await Promise.all(uids.map(u => getDoc(d("profiles", u)).then(s => (s.exists() ? { uid: u, ...s.data() } : { uid: u, missing: true })).catch(() => ({ uid: u, missing: true }))));
  return out;
}

export const impl = {
  available: true,
  // Resolves with the signed-in user ({uid}) or null once Firebase knows (it restores the session itself).
  init() { boot(); return new Promise(res => { const off = onAuthStateChanged(auth, u => { off(); res(u ? { uid: u.uid } : null); }); }); },
  onUser(fn) { subs.add(fn); return () => subs.delete(fn); },
  user: () => user,
  async signIn() {
    boot();
    if (native()) await signInWithCredential(auth, await googleCredential());
    else await signInWithPopup(auth, new GoogleAuthProvider());
    user = { uid: auth.currentUser.uid };
    // the Google name only fills in the nickname field at the first start (it isn't stored in the cloud)
    return { ...user, name: auth.currentUser.displayName || "" };
  },
  async signOut() { boot(); await nativeSignOut(); await fbSignOut(auth); user = null; subs.forEach(f => f(null)); },
  async getProfile(u = uid()) { const s = await getDoc(d("profiles", u)); return s.exists() ? { uid: u, ...s.data() } : null; },
  // First time: reserve the nickname and a friend code, then the profile. Nickname taken → error code "nick-taken".
  async createProfile(p) {
    const me = uid(), key = nickKey(p.nick);
    const n = await getDoc(d("nicks", key));
    if (n.exists() && n.data().uid !== me) throw Object.assign(new Error("taken"), { code: "nick-taken" });
    let code = "";
    for (let i = 0; i < 6 && !code; i++) {
      const c = Array.from(crypto.getRandomValues(new Uint8Array(6)), x => CODE_CHARS[x % CODE_CHARS.length]).join("");
      if (!(await getDoc(d("codes", c))).exists()) code = c;
    }
    const b = writeBatch(db);
    if (!n.exists()) b.set(d("nicks", key), { uid: me });
    b.set(d("codes", code), { uid: me });
    b.set(d("profiles", me), { ...pick(p, PROFILE_KEYS), code, global: !!p.global, ts: serverTimestamp() });
    await b.commit();
    return { uid: me, ...p, code };
  },
  async renameNick(oldNick, nick) {
    const me = uid(), key = nickKey(nick), oldKey = nickKey(oldNick);
    if (key !== oldKey) {
      const n = await getDoc(d("nicks", key));
      if (n.exists() && n.data().uid !== me) throw Object.assign(new Error("taken"), { code: "nick-taken" });
    }
    const b = writeBatch(db);
    if (key !== oldKey) { b.set(d("nicks", key), { uid: me }); b.delete(d("nicks", oldKey)); }
    await b.commit();
  },
  // Stats and photo; the world leaderboard copy exists only while "global" is on.
  async saveProfile(p) {
    const me = uid(), data = { ...pick(p, PROFILE_KEYS), global: !!p.global, ts: serverTimestamp() };
    const b = writeBatch(db);
    b.set(d("profiles", me), data);
    if (p.global) b.set(d("board", me), { nick: p.nick, pfp: p.pfp || null, xp: p.xp, lvl: p.lvl, streak: p.streak, n: p.n, ts: serverTimestamp() });
    else b.delete(d("board", me));
    await b.commit();
  },
  async findNick(nick) { const s = await getDoc(d("nicks", nickKey(nick))); return s.exists() ? s.data().uid : null; },
  async findCode(code) { const s = await getDoc(d("codes", cleanCode(code))); return s.exists() ? s.data().uid : null; },
  // If they already asked me, sending a request accepts theirs instead (both wanted it). Resolves "sent" | "accepted".
  async sendRequest(to) {
    const me = uid(); if (to === me) return "self";
    const theirs = await getDoc(d("inbox", me, "from", to));
    if (theirs.exists()) { await impl.accept(to); return "accepted"; }
    await setDoc(d("inbox", to, "from", me), { ts: serverTimestamp() });
    return "sent";
  },
  async requests() { const s = await getDocs(collection(db, "inbox", uid(), "from")); return profilesOf(s.docs.map(x => x.id)); },
  // Both lists in one batch, and both requests go away (also the one I may have sent them). Already friends
  // (they accepted my request first): only the leftover request is removed.
  async accept(from) {
    const me = uid(), b = writeBatch(db);
    const already = (await getDoc(d("friends", me, "list", from))).exists();
    if (!already) { b.set(d("friends", me, "list", from), { ts: serverTimestamp() }); b.set(d("friends", from, "list", me), { ts: serverTimestamp() }); }
    b.delete(d("inbox", me, "from", from));
    b.delete(d("inbox", from, "from", me));
    await b.commit();
  },
  async decline(from) { await deleteDoc(d("inbox", uid(), "from", from)); },
  async friends() { const s = await getDocs(collection(db, "friends", uid(), "list")); return profilesOf(s.docs.map(x => x.id)); },
  async removeFriend(other) { const me = uid(), b = writeBatch(db); b.delete(d("friends", me, "list", other)); b.delete(d("friends", other, "list", me)); await b.commit(); },
  async world(n = 50) { const s = await getDocs(query(collection(db, "board"), orderBy("xp", "desc"), limit(n))); return s.docs.map(x => ({ uid: x.id, ...x.data() })); },
  // Live lists. Each returns a function that stops listening. Errors go to onErr (offline, rules…).
  watchRequests(cb, onErr) { return onSnapshot(collection(db, "inbox", uid(), "from"), s => profilesOf(s.docs.map(x => x.id)).then(cb), onErr); },
  watchFriends(cb, onErr) { return onSnapshot(collection(db, "friends", uid(), "list"), s => profilesOf(s.docs.map(x => x.id)).then(cb), onErr); },
  watchChats(cb, onErr) {
    const me = uid();
    return onSnapshot(query(collection(db, "chats"), where("m", "array-contains", me)), s => cb(s.docs.map(x => {
      const v = x.data(), l = v.last || {};
      return { cid: x.id, other: (v.m || []).find(u => u !== me), last: { from: l.from, text: l.text || "", ts: l.ts && l.ts.toMillis ? l.ts.toMillis() : Date.now() } };
    })), onErr);
  },
  watchMsgs(other, cb, onErr) {
    const cid = chatId(uid(), other);
    return onSnapshot(query(collection(db, "chats", cid, "msgs"), orderBy("ts"), limitToLast(150)), s => cb(s.docs.map(x => {
      const v = x.data(); return { id: x.id, from: v.from, text: v.text, ts: v.ts && v.ts.toMillis ? v.ts.toMillis() : Date.now(), pending: x.metadata.hasPendingWrites };
    })), onErr);
  },
  async sendMsg(other, text) {
    const me = uid(), cid = chatId(me, other), t = String(text).slice(0, 1000), b = writeBatch(db);
    b.set(doc(collection(db, "chats", cid, "msgs")), { from: me, text: t, ts: serverTimestamp() });
    b.set(d("chats", cid), { m: cid.split("_"), last: { from: me, text: t.slice(0, 120), ts: serverTimestamp() } });
    await b.commit();
  },
  async report(about, reason) { await addDoc(collection(db, "reports"), { by: uid(), about, reason: String(reason || "").slice(0, 300), ts: serverTimestamp() }); },
  async saveBackup(json, n) { await setDoc(d("backups", uid()), { json, n, ts: serverTimestamp() }); },
  async loadBackup() { const s = await getDoc(d("backups", uid())); if (!s.exists()) return null; const v = s.data(); return { json: v.json, n: v.n, ts: v.ts && v.ts.toMillis ? v.ts.toMillis() : 0 }; },
  // Everything about this account, then the account itself. Google asks again if the last sign-in is too old.
  // 1.5.0 (Michael: after deleting, the account buttons stayed): Google is asked to confirm FIRST (Firebase only deletes
  // a sign-in that is recent, and asking later could leave the data gone but the account still signed in when the
  // confirmation was cancelled). Then the data, then the account, then signed out here, whatever the native side does.
  async deleteAccount(p) {
    const me = uid();
    if (native()) await reauthenticateWithCredential(auth.currentUser, await googleCredential());
    else await reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider());
    const fr = await getDocs(collection(db, "friends", me, "list")).catch(() => ({ docs: [] }));
    const inbox = await getDocs(collection(db, "inbox", me, "from")).catch(() => ({ docs: [] }));
    // Chats: every message and the chat itself (members may delete; the other person loses the chat too).
    const chats = await getDocs(query(collection(db, "chats"), where("m", "array-contains", me))).catch(() => ({ docs: [] }));
    for (const c of chats.docs) {
      const msgs = await getDocs(collection(db, "chats", c.id, "msgs")).catch(() => ({ docs: [] }));
      for (let i = 0; i < msgs.docs.length; i += 450) { const mb = writeBatch(db); msgs.docs.slice(i, i + 450).forEach(m => mb.delete(m.ref)); await mb.commit(); }
    }
    const b = writeBatch(db);
    chats.docs.forEach(c => b.delete(c.ref));
    fr.docs.forEach(x => { b.delete(d("friends", me, "list", x.id)); b.delete(d("friends", x.id, "list", me)); });
    inbox.docs.forEach(x => b.delete(d("inbox", me, "from", x.id)));
    (p && p.sent || []).forEach(t => b.delete(d("inbox", t, "from", me)));
    if (p && p.nick) b.delete(d("nicks", nickKey(p.nick)));
    if (p && p.code) b.delete(d("codes", p.code));
    ["profiles", "board", "backups"].forEach(c => b.delete(d(c, me)));
    await b.commit();
    try { await auth.currentUser.delete(); }
    finally { await nativeSignOut(); try { await fbSignOut(auth); } catch (_) {} user = null; subs.forEach(f => f(null)); }
  },
};

