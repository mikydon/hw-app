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
//   cards/{uid}              {vis, lvl, xp, streak, best, n, reps, min, prs, since, ach: {badge: tier}, av: {badge: value},
//                            rk: {exercise: best}, show: [showcase fields], ts}:
//                            the profile others can open (1.7.0, like Steam); vis = friends | all | none decides who
//   blocks/{uid}             {b: [uids], ts}: who you blocked (1.7.0, owner only); keeps them off your card; your other
//                            devices read it too
//   chatmem/{uid}            {read: {chatId: time}, clr: {chatId: time}, ts}: chats read / deleted for you (1.7.0, owner
//                            only), so every device of the account knows them
//   mod/{uid}                {hidden, n, ts}: reported by several people → out of the world top 50 (1.7.0; written by
//                            the push server only, the person can read it)
//   push/{uid}               {t: [FCM tokens of your phones], lang, off, blk: [blocked uids], ts}: phone notifications
//                            (1.6.0, owner only; the push server reads it with its own key)
//   chats/{a_b}              {m: [a, b], last: {from, text, ts}, th?: chat colour (1.5.2)} (a_b = the two uids sorted); only between friends
//   chats/{a_b}/msgs/{id}    {from, text, ts, re?: {id, from, text} (a reply, 1.5.2), ed?: ts (edited, 1.5.2: own, within 15 min), rx?: {uid: emoji} (reactions, 1.5.2)}
// Live updates (friend requests, friends, chats, messages) use Firestore listeners while the app is open
// (1.5.0, Michael: requests showed up only after switching tabs).
import { initializeApp } from "firebase/app";
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver, GoogleAuthProvider,
  signInWithPopup, signInWithCredential, signOut as fbSignOut, onAuthStateChanged, reauthenticateWithPopup, reauthenticateWithCredential,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, updatePassword,
  linkWithCredential, EmailAuthProvider } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, query, where, orderBy, limit, limitToLast, getDocs, writeBatch, addDoc, updateDoc, serverTimestamp, onSnapshot, deleteField, arrayUnion, arrayRemove } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";
import { CODE_CHARS, nickKey, cleanCode, chatId, PUSH_URL } from "./cloud-shared.js";
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
let emailPw = null;
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
const CARD_KEYS = ["lvl", "xp", "streak", "best", "n", "reps", "min", "since", "ach", "rk", "av", "show", "prs"];
async function profilesOf(uids) {
  const out = await Promise.all(uids.map(u => getDoc(d("profiles", u)).then(s => (s.exists() ? { uid: u, ...s.data() } : { uid: u, missing: true })).catch(() => ({ uid: u, missing: true }))));
  return out;
}

// Ask the push server to tell `to` about what just happened (1.6.0). It checks everything itself in Firestore, so
// this only names the event; never waits, never fails the action that called it.
function notify(kind, to) {
  if (!PUSH_URL || !auth || !auth.currentUser || !to) return;
  auth.currentUser.getIdToken().then(t => fetch(PUSH_URL + "/notify", { method: "POST", headers: { authorization: "Bearer " + t, "content-type": "application/json" }, body: JSON.stringify({ kind, to }) })).catch(() => {});
}
export const impl = {
  available: true,
  // Resolves with the signed-in user ({uid}) or null once Firebase knows (it restores the session itself).
  init() { boot(); return new Promise(res => { const off = onAuthStateChanged(auth, u => { off(); res(u ? { uid: u.uid } : null); }); }); },
  onUser(fn) { subs.add(fn); return () => subs.delete(fn); },
  user: () => user,
  // 1.7.1 (Michael, Oct 18: Google Play's reviewer couldn't sign in, a Google account always asks a new device for a
  // code; then "for everyone"): e-mail + password next to Google: sign in, or create an account (`create`, a
  // confirmation e-mail goes out in the app's language). Firebase keeps only a hash of the password; the app keeps it
  // in memory for this session only, to confirm "delete account"; never saved.
  async signIn(cred) {
    boot();
    if (cred && cred.email) {
      const em = String(cred.email).trim();
      if (cred.lang) auth.languageCode = cred.lang;
      if (cred.create) { const r = await createUserWithEmailAndPassword(auth, em, cred.pw || ""); sendEmailVerification(r.user).catch(() => {}); }
      else await signInWithEmailAndPassword(auth, em, cred.pw || "");
      emailPw = cred.pw || "";
    }
    else if (native()) await signInWithCredential(auth, await googleCredential());
    // 1.7.5 (Michael, Oct 23: after signing out on the website, signing in again quietly took the old Google
    // account): always show Google's account chooser
    else { const gp = new GoogleAuthProvider(); gp.setCustomParameters({ prompt: "select_account" }); await signInWithPopup(auth, gp); }
    user = { uid: auth.currentUser.uid };
    // the Google name only fills in the nickname field at the first start (it isn't stored in the cloud)
    return { ...user, name: auth.currentUser.displayName || "" };
  },
  // How this account signs in (Settings → Password)
  authInfo() {
    const cu = auth && auth.currentUser; if (!cu) return null;
    const ps = cu.providerData.map(x => x.providerId);
    return { email: cu.email || "", google: ps.includes("google.com"), password: ps.includes("password"), verified: !!cu.emailVerified };
  },
  // "Forgot password": Firebase e-mails a link to its page where a new password is set (also sent for unknown
  // addresses' sake silently: the answer never says whether an account exists).
  async resetPw(email, lang) { boot(); if (lang) auth.languageCode = lang; await sendPasswordResetEmail(auth, String(email).trim()); },
  async resendVerify(lang) { boot(); if (lang) auth.languageCode = lang; await sendEmailVerification(auth.currentUser); },
  // Change: the old password confirms it first. Add (Google-only account): a password for the same e-mail.
  async changePw(oldPw, newPw) {
    const cu = auth.currentUser;
    await reauthenticateWithCredential(cu, EmailAuthProvider.credential(cu.email, oldPw));
    await updatePassword(cu, newPw); emailPw = newPw;
  },
  async addPw(newPw) {
    const cu = auth.currentUser, cred = () => EmailAuthProvider.credential(cu.email, newPw);
    try { await linkWithCredential(cu, cred()); }
    catch (e) {
      if (!/requires-recent-login/.test(String(e && e.code))) throw e;
      if (native()) await reauthenticateWithCredential(cu, await googleCredential());
      else await reauthenticateWithPopup(cu, new GoogleAuthProvider());
      await linkWithCredential(cu, cred());
    }
    emailPw = newPw;
  },
  async signOut() { boot(); emailPw = null; await nativeSignOut(); await fbSignOut(auth); user = null; subs.forEach(f => f(null)); },
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
    // hidden after reports (1.7.0): the rules refuse a world entry, so the rest is saved without it
    const hidden = p.global ? await impl.getMod().then(m => m.hidden).catch(() => false) : false;
    const b = writeBatch(db);
    b.set(d("profiles", me), data);
    if (p.global && !hidden) b.set(d("board", me), { nick: p.nick, pfp: null, xp: p.xp, lvl: p.lvl, streak: p.streak, n: p.n, ts: serverTimestamp() });
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
    notify("req", to);
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
    if (!already) notify("acc", from);
  },
  async decline(from) { await deleteDoc(d("inbox", uid(), "from", from)); },
  async friends() { const s = await getDocs(collection(db, "friends", uid(), "list")); return profilesOf(s.docs.map(x => x.id)); },
  async removeFriend(other) { const me = uid(), b = writeBatch(db); b.delete(d("friends", me, "list", other)); b.delete(d("friends", other, "list", me)); await b.commit(); },
  async world(n = 50) { const s = await getDocs(query(collection(db, "board"), orderBy("xp", "desc"), limit(n))); return s.docs.map(x => ({ uid: x.id, ...x.data(), pfp: null })); },
  // Live lists. Each returns a function that stops listening. Errors go to onErr (offline, rules…).
  watchRequests(cb, onErr) { return onSnapshot(collection(db, "inbox", uid(), "from"), s => profilesOf(s.docs.map(x => x.id)).then(cb), onErr); },
  watchFriends(cb, onErr) { return onSnapshot(collection(db, "friends", uid(), "list"), s => profilesOf(s.docs.map(x => x.id)).then(cb), onErr); },
  watchChats(cb, onErr) {
    const me = uid();
    return onSnapshot(query(collection(db, "chats"), where("m", "array-contains", me)), s => cb(s.docs.map(x => {
      const v = x.data(), l = v.last || {};
      // a chat that only has a colour so far (no message yet) has no "last": ts 0, so it is neither listed nor unread
      return { cid: x.id, other: (v.m || []).find(u => u !== me), th: v.th || "", last: { from: l.from || null, text: l.text || "", ts: l.ts && l.ts.toMillis ? l.ts.toMillis() : l.from ? Date.now() : 0 } };
    })), onErr);
  },
  watchMsgs(other, cb, onErr) {
    const cid = chatId(uid(), other);
    return onSnapshot(query(collection(db, "chats", cid, "msgs"), orderBy("ts"), limitToLast(150)), s => cb(s.docs.map(x => {
      const v = x.data(), ms = t => (t && t.toMillis ? t.toMillis() : t ? Date.now() : 0);
      return { id: x.id, from: v.from, text: v.text, ts: ms(v.ts) || Date.now(), ed: ms(v.ed), rx: v.rx && typeof v.rx === "object" ? v.rx : null, re: v.re && v.re.id ? { id: v.re.id, from: v.re.from, text: v.re.text || "" } : null,
        // "pending" = still being sent (its server time isn't there yet); a reaction or an edit on its way doesn't count
        // (1.5.2, Michael: reacting dimmed the message and blocked it for a moment)
        pending: x.metadata.hasPendingWrites && !v.ts };
    })), onErr);
  },
  async sendMsg(other, text, re) {
    const me = uid(), cid = chatId(me, other), t = String(text).slice(0, 1000), b = writeBatch(db);
    const m = { from: me, text: t, ts: serverTimestamp() };
    if (re && re.id) m.re = { id: String(re.id).slice(0, 40), from: String(re.from || "").slice(0, 128), text: String(re.text || "").slice(0, 120) };
    b.set(doc(collection(db, "chats", cid, "msgs")), m);
    b.set(d("chats", cid), { m: cid.split("_"), last: { from: me, text: t.slice(0, 120), ts: serverTimestamp() } }, { merge: true }); // keeps the chat colour
    await b.commit();
    notify("msg", other);
  },
  // Own messages can be edited for 15 minutes (like Instagram); the chat list keeps the first text.
  async editMsg(other, id, text) {
    const cid = chatId(uid(), other);
    await updateDoc(doc(db, "chats", cid, "msgs", id), { text: String(text).slice(0, 1000), ed: serverTimestamp() });
  },
  // Reactions (1.5.2): one emoji per person per message; null takes yours away.
  async react(other, id, emoji) {
    const me = uid(), cid = chatId(me, other);
    await updateDoc(doc(db, "chats", cid, "msgs", id), { [`rx.${me}`]: emoji ? String(emoji).slice(0, 16) : deleteField() });
  },
  // The chat's colour (1.5.2): both people see it, like a chat theme on Instagram.
  async setChatTheme(other, th) {
    const cid = chatId(uid(), other);
    await setDoc(d("chats", cid), { m: cid.split("_"), th }, { merge: true });
  },
  // This phone's notification token and choices (1.6.0). token null = only update lang/off/blk.
  // At most 5 phones: a new token pushes out the oldest (old phones also drop out when FCM says they're gone).
  async savePush({ token, lang, off, blk }) {
    const v = { lang: String(lang || "en").slice(0, 5), off: !!off, blk: (blk || []).slice(0, 500), ts: serverTimestamp() };
    if (token) {
      const cur = await getDoc(d("push", uid())).then(x => (x.exists() && Array.isArray(x.data().t) ? x.data().t : [])).catch(() => []);
      if (!cur.includes(token)) v.t = cur.length < 5 ? arrayUnion(String(token)) : [...cur.slice(-4), String(token)];
    }
    await setDoc(d("push", uid()), v, { merge: true });
  },
  // The Settings test button (1.6.0): the server sends a notification to my own phones and says what happened:
  // {sent, why: ok|no-phone|off|fcm|dup, err?} or {why: "auth"|"server"|"net", err}
  async pushTest() {
    if (!PUSH_URL) return { why: "net", err: "no server" };
    const t = await auth.currentUser.getIdToken();
    let r;
    try { r = await fetch(PUSH_URL + "/notify", { method: "POST", headers: { authorization: "Bearer " + t, "content-type": "application/json" }, body: JSON.stringify({ kind: "test", to: uid() }) }); }
    catch (e) { return { why: "net", err: String((e && e.message) || e).slice(0, 60) }; }
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) return { why: "auth", err: j.detail || "401" };
    if (!r.ok) return { why: "server", err: j.detail || String(r.status) };
    return j;
  },
  async dropPush(token) { if (token) await setDoc(d("push", uid()), { t: arrayRemove(String(token)), ts: serverTimestamp() }, { merge: true }); },
  // 1.7.0: the push server then counts the reports about that person (several different people → hidden from the
  // world top 50, mod/{uid})
  async report(about, reason) { await addDoc(collection(db, "reports"), { by: uid(), about, reason: String(reason || "").slice(0, 300), ts: serverTimestamp() }); notify("rep", about); },
  async getMod() { const s = await getDoc(d("mod", uid())); return { hidden: s.exists() && s.data().hidden === true }; },
  // Profile cards (1.7.0). getCard: the card, or null when there is none; a card you may not open (friends only,
  // only me, blocked) fails with permission-denied, like one that doesn't exist (older app).
  async getCard(u) { const s = await getDoc(d("cards", u)); if (!s.exists()) return null; const v = s.data(); return { ...v, ts: v.ts && v.ts.toMillis ? v.ts.toMillis() : 0 }; },
  // The stats part. mergeFields: these fields are replaced whole (a badge or rank that went away after editing the
  // history goes away here too; plain merge would keep old keys inside the maps), vis stays as it is (it may have been
  // set on another phone).
  async saveCard(c) { const v = { ...pick(c, CARD_KEYS), ts: serverTimestamp() }; await setDoc(d("cards", uid()), v, { mergeFields: Object.keys(v) }); },
  async setCardVis(vis) { await setDoc(d("cards", uid()), { vis, ts: serverTimestamp() }, { merge: true }); },
  async saveBlocks(list) { await setDoc(d("blocks", uid()), { b: (list || []).slice(-500), ts: serverTimestamp() }); },
  watchBlocks(cb, onErr) { return onSnapshot(d("blocks", uid()), s => cb(s.exists() ? { b: s.data().b || [], local: s.metadata.hasPendingWrites } : null), onErr); },
  // only the chats that changed are sent; merge keeps the others
  async saveChatMem(part) { await setDoc(d("chatmem", uid()), { ...part, ts: serverTimestamp() }, { merge: true }); },
  watchChatMem(cb, onErr) { return onSnapshot(d("chatmem", uid()), s => cb(s.exists() ? { read: s.data().read || {}, clr: s.data().clr || {}, local: s.metadata.hasPendingWrites } : null), onErr); },
  async saveBackup(json, n) { await setDoc(d("backups", uid()), { json, n, ts: serverTimestamp() }); },
  // The backup live (1.7.0 sync): another device's change arrives here; local = this device's own write not yet on the server.
  watchBackup(cb, onErr) {
    return onSnapshot(d("backups", uid()), { includeMetadataChanges: false }, s => {
      if (!s.exists()) return cb(null);
      const v = s.data();
      cb({ json: v.json, n: v.n, ts: v.ts && v.ts.toMillis ? v.ts.toMillis() : 0, local: s.metadata.hasPendingWrites });
    }, onErr);
  },
  async loadBackup() { const s = await getDoc(d("backups", uid())); if (!s.exists()) return null; const v = s.data(); return { json: v.json, n: v.n, ts: v.ts && v.ts.toMillis ? v.ts.toMillis() : 0 }; },
  // Everything about this account, then the account itself. Google asks again if the last sign-in is too old.
  // 1.5.0 (Michael: after deleting, the account buttons stayed): Google is asked to confirm FIRST (Firebase only deletes
  // a sign-in that is recent, and asking later could leave the data gone but the account still signed in when the
  // confirmation was cancelled). Then the data, then the account, then signed out here, whatever the native side does.
  async deleteAccount(p) {
    const me = uid(), cu = auth.currentUser, ps = cu.providerData.map(x => x.providerId), pw = (p && p.pw) || emailPw;
    // confirm first: the password (typed again after a restart) or Google; nothing is deleted without it
    if (ps.includes("password") && (pw || !ps.includes("google.com"))) {
      if (!pw) throw Object.assign(new Error("password needed"), { code: "need-pw" });
      await reauthenticateWithCredential(cu, EmailAuthProvider.credential(cu.email, pw));
    } else if (native()) await reauthenticateWithCredential(cu, await googleCredential());
    else await reauthenticateWithPopup(cu, new GoogleAuthProvider());
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
    ["profiles", "board", "backups", "push", "cards", "blocks", "chatmem"].forEach(c => b.delete(d(c, me)));
    await b.commit();
    try { await auth.currentUser.delete(); }
    finally { await nativeSignOut(); try { await fbSignOut(auth); } catch (_) {} user = null; subs.forEach(f => f(null)); }
  },
};

