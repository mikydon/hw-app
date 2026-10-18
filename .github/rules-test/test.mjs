// Firestore security rules tests (run by .github/workflows/rules.yml inside the Firestore emulator).
// Every case says who tries what and whether the rules must allow it. Results show up as annotations on the run.
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, updateDoc, deleteField, collection, getDocs, query, where, orderBy, limit, writeBatch, addDoc, serverTimestamp, Timestamp, arrayUnion } from "firebase/firestore";

const env = await initializeTestEnvironment({ projectId: "demo-hw-app", firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
const as = u => (u ? env.authenticatedContext(u) : env.unauthenticatedContext()).firestore();
const stats = (nick, code, extra = {}) => ({ nick, pfp: null, xp: 1200, lvl: 4, streak: 3, n: 12, code, global: false, ts: serverTimestamp(), ...extra });
const board = nick => ({ nick, pfp: null, xp: 1200, lvl: 4, streak: 3, n: 12, ts: serverTimestamp() });
let pass = 0, fail = 0;
async function t(name, allow, fn) {
  try { await (allow ? assertSucceeds(fn()) : assertFails(fn())); pass++; console.log("  ✓", name); }
  catch (e) { fail++; console.log("  ✗", name, "-", e && e.message); console.log(`::error title=Rules test failed::${name}`); }
}
async function makeUser(u, nick, code) {
  const db = as(u), b = writeBatch(db);
  b.set(doc(db, "nicks", nick.toLowerCase()), { uid: u });
  b.set(doc(db, "codes", code), { uid: u });
  b.set(doc(db, "profiles", u), stats(nick, code));
  await b.commit();
}

console.log("profiles, nicknames, codes");
await t("alice creates nickname + code + profile in one batch", true, () => makeUser("alice", "Alice", "ABCDEF").then(() => null));
await t("bob creates his", true, () => makeUser("bob", "Bob_7", "BBBBBB").then(() => null));
await makeUser("carol", "Carol", "CCCCCC");
await t("signed-out visitor can't read a profile", false, () => getDoc(doc(as(null), "profiles", "alice")));
await t("bob reads alice's profile", true, () => getDoc(doc(as("bob"), "profiles", "alice")));
await t("nobody can list all profiles", false, () => getDocs(collection(as("bob"), "profiles")));
await t("bob can't take the nickname alice", false, () => setDoc(doc(as("bob"), "nicks", "alice"), { uid: "bob" }));
await t("nickname keys must be lower-case", false, () => setDoc(doc(as("bob"), "nicks", "BOBBY"), { uid: "bob" }));
await t("nickname too short", false, () => setDoc(doc(as("bob"), "nicks", "bo"), { uid: "bob" }));
await t("unicode nickname is fine", true, () => setDoc(doc(as("bob"), "nicks", "ďaľší"), { uid: "bob" }));
await t("bob can't delete alice's nickname", false, () => deleteDoc(doc(as("bob"), "nicks", "alice")));
await t("bob deletes his spare nickname", true, () => deleteDoc(doc(as("bob"), "nicks", "ďaľší")));
await t("bob can't take alice's code", false, () => setDoc(doc(as("bob"), "codes", "ABCDEF"), { uid: "bob" }));
await t("codes use the agreed letters only (no 0/O/1/I)", false, () => setDoc(doc(as("bob"), "codes", "B0B1IO"), { uid: "bob" }));
await t("bob can't use alice's code in his profile", false, () => setDoc(doc(as("bob"), "profiles", "bob"), stats("Bob_7", "ABCDEF")));
await t("bob updates his stats", true, () => setDoc(doc(as("bob"), "profiles", "bob"), stats("Bob_7", "BBBBBB", { xp: 1500 })));
await t("bob can't write alice's profile", false, () => setDoc(doc(as("bob"), "profiles", "alice"), stats("Alice", "ABCDEF")));
await t("extra fields are refused", false, () => setDoc(doc(as("bob"), "profiles", "bob"), stats("Bob_7", "BBBBBB", { email: "x@y" })));
await t("xp must be a whole number", false, () => setDoc(doc(as("bob"), "profiles", "bob"), stats("Bob_7", "BBBBBB", { xp: "999" })));
await t("timestamps come from the server", false, () => setDoc(doc(as("bob"), "profiles", "bob"), stats("Bob_7", "BBBBBB", { ts: new Date(0) })));
await t("photo must be a small JPEG data URL", false, () => setDoc(doc(as("bob"), "profiles", "bob"), stats("Bob_7", "BBBBBB", { pfp: "https://evil.example/x.png" })));
await t("a small JPEG photo is fine", true, () => setDoc(doc(as("bob"), "profiles", "bob"), stats("Bob_7", "BBBBBB", { pfp: "data:image/jpeg;base64,/9j/4AAQSkZJRg==" })));

console.log("world leaderboard");
await t("alice joins the world leaderboard", true, () => setDoc(doc(as("alice"), "board", "alice"), board("Alice")));
await t("bob can't put alice there", false, () => setDoc(doc(as("bob"), "board", "alice"), board("Alice")));
await t("bob reads the top 50", true, () => getDocs(query(collection(as("bob"), "board"), orderBy("xp", "desc"), limit(50))));
await t("reading without a limit is refused", false, () => getDocs(collection(as("bob"), "board")));
await t("signed-out visitor can't read it", false, () => getDocs(query(collection(as(null), "board"), limit(10))));
await t("alice leaves it", true, () => deleteDoc(doc(as("alice"), "board", "alice")));

console.log("friend requests and friends");
await t("bob sends alice a request", true, () => setDoc(doc(as("bob"), "inbox", "alice", "from", "bob"), { ts: serverTimestamp() }));
await t("carol can't send one in bob's name", false, () => setDoc(doc(as("carol"), "inbox", "alice", "from", "bob"), { ts: serverTimestamp() }));
await t("no request to yourself", false, () => setDoc(doc(as("bob"), "inbox", "bob", "from", "bob"), { ts: serverTimestamp() }));
await t("alice lists her requests", true, () => getDocs(collection(as("alice"), "inbox", "alice", "from")));
await t("bob can't list alice's requests", false, () => getDocs(collection(as("bob"), "inbox", "alice", "from")));
await t("carol can't make herself alice's friend without a request", false, () => {
  const db = as("carol"), b = writeBatch(db);
  b.set(doc(db, "friends", "carol", "list", "alice"), { ts: serverTimestamp() }); b.set(doc(db, "friends", "alice", "list", "carol"), { ts: serverTimestamp() });
  return b.commit();
});
await t("alice accepts bob: both lists + request removed in one batch", true, () => {
  const db = as("alice"), b = writeBatch(db);
  b.set(doc(db, "friends", "alice", "list", "bob"), { ts: serverTimestamp() }); b.set(doc(db, "friends", "bob", "list", "alice"), { ts: serverTimestamp() });
  b.delete(doc(db, "inbox", "alice", "from", "bob"));
  return b.commit();
});
await t("after that the request is gone, so it can't be used again", false, () => setDoc(doc(as("alice"), "friends", "alice", "list", "carol"), { ts: serverTimestamp() }));
await t("bob reads his friends", true, () => getDocs(collection(as("bob"), "friends", "bob", "list")));
await t("carol can't read bob's friends", false, () => getDocs(collection(as("carol"), "friends", "bob", "list")));
await t("bob removes the friendship on both sides", true, () => {
  const db = as("bob"), b = writeBatch(db);
  b.delete(doc(db, "friends", "bob", "list", "alice")); b.delete(doc(db, "friends", "alice", "list", "bob"));
  return b.commit();
});
await t("carol sends alice a request, then takes it back", true, async () => {
  await setDoc(doc(as("carol"), "inbox", "alice", "from", "carol"), { ts: serverTimestamp() });
  return deleteDoc(doc(as("carol"), "inbox", "alice", "from", "carol"));
});

console.log("cloud backup and reports");
await t("alice saves her backup", true, () => setDoc(doc(as("alice"), "backups", "alice"), { json: "{\"app\":\"hw-app\"}", n: 3, ts: serverTimestamp() }));
await t("alice reads it", true, () => getDoc(doc(as("alice"), "backups", "alice")));
await t("bob can't read alice's backup", false, () => getDoc(doc(as("bob"), "backups", "alice")));
await t("bob can't overwrite it", false, () => setDoc(doc(as("bob"), "backups", "alice"), { json: "{}", n: 0, ts: serverTimestamp() }));
await t("a backup over 900 000 characters is refused", false, () => setDoc(doc(as("alice"), "backups", "alice"), { json: "x".repeat(900001), n: 3, ts: serverTimestamp() }));
await t("bob reports a profile", true, () => addDoc(collection(as("bob"), "reports"), { by: "bob", about: "carol", reason: "nickname", ts: serverTimestamp() }));
await t("a report in someone else's name is refused", false, () => addDoc(collection(as("bob"), "reports"), { by: "alice", about: "carol", reason: "x", ts: serverTimestamp() }));
await t("reports can't be read in the app", false, () => getDocs(collection(as("bob"), "reports")));
await t("other collections are closed", false, () => setDoc(doc(as("bob"), "anything", "x"), { a: 1 }));

console.log("chats");
await setDoc(doc(as("bob"), "inbox", "alice", "from", "bob"), { ts: serverTimestamp() });
await setDoc(doc(as("alice"), "inbox", "bob", "from", "alice"), { ts: serverTimestamp() });
await t("both asked: accepting writes both lists and removes both requests in one batch", true, () => {
  const db = as("alice"), b = writeBatch(db);
  b.set(doc(db, "friends", "alice", "list", "bob"), { ts: serverTimestamp() }); b.set(doc(db, "friends", "bob", "list", "alice"), { ts: serverTimestamp() });
  b.delete(doc(db, "inbox", "alice", "from", "bob")); b.delete(doc(db, "inbox", "bob", "from", "alice"));
  return b.commit();
});
await t("accepting again when already friends only removes the request (no second write of the lists)", false, () => setDoc(doc(as("bob"), "friends", "bob", "list", "alice"), { ts: serverTimestamp() }));
const send = (u, cid, text, extra = {}) => { const db = as(u), b = writeBatch(db); b.set(doc(collection(db, "chats", cid, "msgs")), { from: u, text, ts: serverTimestamp(), ...extra }); b.set(doc(db, "chats", cid), { m: cid.split("_"), last: { from: u, text: text.slice(0, 120), ts: serverTimestamp() } }); return b.commit(); };
await t("alice writes to her friend bob", true, () => send("alice", "alice_bob", "Ahoj! 💪"));
await t("bob answers", true, () => send("bob", "alice_bob", "Čau"));
await t("bob reads the messages", true, () => getDocs(query(collection(as("bob"), "chats", "alice_bob", "msgs"), orderBy("ts"))));
// 1.5.2: replies and edits
await t("bob replies to a message (short copy of it in re)", true, () => send("bob", "alice_bob", "jasné", { re: { id: "m1", from: "alice", text: "Ahoj! 💪" } }));
await t("a reply with anything else in re is refused", false, () => send("bob", "alice_bob", "x", { re: { id: "m1", from: "alice", text: "a", extra: 1 } }));
await t("a reply quoting over 120 characters is refused", false, () => send("bob", "alice_bob", "x", { re: { id: "m1", from: "alice", text: "y".repeat(121) } }));
await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore();
  await setDoc(doc(db, "chats", "alice_bob", "msgs", "mine"), { from: "alice", text: "preklep", ts: Timestamp.fromMillis(Date.now() - 60e3) });
  await setDoc(doc(db, "chats", "alice_bob", "msgs", "old"), { from: "alice", text: "dávno", ts: Timestamp.fromMillis(Date.now() - 20 * 60e3) });
});
const edit = (u, id, data) => updateDoc(doc(as(u), "chats", "alice_bob", "msgs", id), data);
await t("alice edits her own message within 15 minutes", true, () => edit("alice", "mine", { text: "opravené", ed: serverTimestamp() }));
await t("an edit must say when (ed = now)", false, () => edit("alice", "mine", { text: "bez času" }));
await t("bob can't edit alice's message", false, () => edit("bob", "mine", { text: "hack", ed: serverTimestamp() }));
await t("an edit can't change who wrote it", false, () => edit("alice", "mine", { text: "x", from: "bob", ed: serverTimestamp() }));
await t("an edit can't be empty", false, () => edit("alice", "mine", { text: "", ed: serverTimestamp() }));
await t("after 15 minutes the message can't be edited", false, () => edit("alice", "old", { text: "neskoro", ed: serverTimestamp() }));
// 1.5.2: reactions and the chat colour
await t("bob reacts to alice's message", true, () => edit("bob", "mine", { "rx.bob": "❤️" }));
await t("alice reacts too (own key only)", true, () => edit("alice", "mine", { "rx.alice": "😂" }));
await t("bob can't change alice's reaction", false, () => edit("bob", "mine", { "rx.alice": "😡" }));
await t("bob removes his reaction", true, () => edit("bob", "mine", { "rx.bob": deleteField() }));
await t("a reaction can't be a long text", false, () => edit("bob", "mine", { "rx.bob": "x".repeat(17) }));
await t("a reaction can't change the text at the same time", false, () => edit("bob", "mine", { "rx.bob": "👍", text: "hack" }));
await t("reacting works on old messages too", true, () => edit("bob", "old", { "rx.bob": "👍" }));
await t("bob sets the chat colour", true, () => setDoc(doc(as("bob"), "chats", "alice_bob"), { m: ["alice", "bob"], th: "ocean" }, { merge: true }));
await t("only the app's colours", false, () => setDoc(doc(as("bob"), "chats", "alice_bob"), { m: ["alice", "bob"], th: "#ff0000" }, { merge: true }));
await t("a colour change can't rewrite the last message", false, () => setDoc(doc(as("bob"), "chats", "alice_bob"), { m: ["alice", "bob"], th: "sky", last: { from: "alice", text: "fake", ts: serverTimestamp() } }, { merge: true }));
await t("a message keeps the colour (merge)", true, () => { const db = as("alice"), b = writeBatch(db); b.set(doc(collection(db, "chats", "alice_bob", "msgs")), { from: "alice", text: "farba!", ts: serverTimestamp() }); b.set(doc(db, "chats", "alice_bob"), { m: ["alice", "bob"], last: { from: "alice", text: "farba!", ts: serverTimestamp() } }, { merge: true }); return b.commit(); });
await t("an older app (1.5.1) still sends in a coloured chat (writes it without the colour)", true, () => send("bob", "alice_bob", "z 1.5.1"));
await t("carol can't colour their chat", false, () => setDoc(doc(as("carol"), "chats", "alice_bob"), { m: ["alice", "bob"], th: "red" }, { merge: true }));
await t("no colour for a chat with a non-friend", false, () => setDoc(doc(as("alice"), "chats", "alice_carol"), { m: ["alice", "carol"], th: "mint" }, { merge: true }));
await t("bob lists his chats", true, () => getDocs(query(collection(as("bob"), "chats"), where("m", "array-contains", "bob"))));
await t("carol can't read their chat", false, () => getDocs(collection(as("carol"), "chats", "alice_bob", "msgs")));
await t("carol can't list chats she isn't in", false, () => getDocs(query(collection(as("carol"), "chats"), where("m", "array-contains", "alice"))));
await t("carol can't write to a non-friend", false, () => send("carol", "alice_carol", "hi"));
await t("nobody writes in someone else's name", false, () => { const db = as("bob"); return setDoc(doc(collection(db, "chats", "alice_bob", "msgs")), { from: "alice", text: "x", ts: serverTimestamp() }); });
await t("empty messages are refused", false, () => send("bob", "alice_bob", ""));
await t("messages over 1000 characters are refused", false, () => send("bob", "alice_bob", "x".repeat(1001)));
await t("chat ids must be the two uids in sorted order", false, () => send("bob", "bob_alice", "hi"));
await t("after unfriending, no more messages", false, async () => {
  const db = as("bob"), b = writeBatch(db); b.delete(doc(db, "friends", "bob", "list", "alice")); b.delete(doc(db, "friends", "alice", "list", "bob")); await b.commit();
  return send("bob", "alice_bob", "still there?");
});
await t("but the old chat stays readable for both", true, () => getDocs(collection(as("alice"), "chats", "alice_bob", "msgs")));
await t("a member can delete the chat (account deletion)", true, async () => {
  const s = await getDocs(collection(as("alice"), "chats", "alice_bob", "msgs"));
  const db = as("alice"), b = writeBatch(db); s.docs.forEach(m => b.delete(doc(db, "chats", "alice_bob", "msgs", m.id))); b.delete(doc(db, "chats", "alice_bob")); return b.commit();
});

console.log("phone notifications (1.6.0)");
const pushDoc = (over = {}) => ({ t: ["tok1"], lang: "sk", off: false, blk: [], ts: serverTimestamp(), ...over });
await t("alice saves her phone's token", true, () => setDoc(doc(as("alice"), "push", "alice"), pushDoc()));
await t("alice adds a second phone (merge)", true, () => setDoc(doc(as("alice"), "push", "alice"), { t: arrayUnion("tok2"), ts: serverTimestamp(), lang: "sk", off: false, blk: [] }, { merge: true }));
await t("alice reads hers", true, () => getDoc(doc(as("alice"), "push", "alice")));
await t("bob can't read alice's tokens", false, () => getDoc(doc(as("bob"), "push", "alice")));
await t("bob can't write alice's tokens", false, () => setDoc(doc(as("bob"), "push", "alice"), pushDoc({ t: ["evil"] })));
await t("more than 5 phones is refused", false, () => setDoc(doc(as("alice"), "push", "alice"), pushDoc({ t: ["1", "2", "3", "4", "5", "6"] })));
await t("unknown fields are refused", false, () => setDoc(doc(as("alice"), "push", "alice"), pushDoc({ x: 1 })));
await t("off must be true/false", false, () => setDoc(doc(as("alice"), "push", "alice"), pushDoc({ off: "no" })));
await t("alice switches notifications off and blocks carol", true, () => setDoc(doc(as("alice"), "push", "alice"), { off: true, blk: ["carol"], lang: "sk", ts: serverTimestamp() }, { merge: true }));
await t("alice deletes it", true, () => deleteDoc(doc(as("alice"), "push", "alice")));

console.log("profile cards and blocks (1.7.0)");
const cardDoc = (over = {}) => ({ vis: "friends", lvl: 5, xp: 1800, streak: 4, best: 9, n: 21, reps: 2300, min: 400, since: "2026-09-01", ach: { workouts: 3, streak: 2 }, rk: { k1: 22, b5: 60 }, ts: serverTimestamp(), ...over });
await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore();
  await setDoc(doc(db, "friends", "erin", "list", "frank"), { ts: Timestamp.now() });
  await setDoc(doc(db, "friends", "frank", "list", "erin"), { ts: Timestamp.now() });
});
const card = u => doc(as(u), "cards", "erin");
await t("erin saves her card", true, () => setDoc(doc(as("erin"), "cards", "erin"), cardDoc()));
await t("erin reads her own card", true, () => getDoc(card("erin")));
await t("only the stats, no vis (merge) is fine", true, () => setDoc(doc(as("erin"), "cards", "erin"), { lvl: 6, xp: 2100, ts: serverTimestamp() }, { merge: true }));
await t("only vis (merge) is fine", true, () => setDoc(doc(as("erin"), "cards", "erin"), { vis: "friends", ts: serverTimestamp() }, { merge: true }));
await t("a card that is only {vis, ts} is fine (vis set before the first stats)", true, () => setDoc(doc(as("gina"), "cards", "gina"), { vis: "none", ts: serverTimestamp() }));
await t("vis must be friends, all or none", false, () => setDoc(doc(as("erin"), "cards", "erin"), cardDoc({ vis: "public" })));
await t("unknown fields are refused", false, () => setDoc(doc(as("erin"), "cards", "erin"), cardDoc({ pfp: "data:image/jpeg;base64,AAAA" })));
await t("level must be a whole number", false, () => setDoc(doc(as("erin"), "cards", "erin"), cardDoc({ lvl: "99" })));
await t("since must be a date (YYYY-MM-DD)", false, () => setDoc(doc(as("erin"), "cards", "erin"), cardDoc({ since: "yesterday" })));
await t("since may be empty (no workouts yet)", true, () => setDoc(doc(as("erin"), "cards", "erin"), cardDoc({ since: null })));
await t("badges must be a small map", false, () => setDoc(doc(as("erin"), "cards", "erin"), cardDoc({ ach: Object.fromEntries(Array.from({ length: 41 }, (_, i) => ["a" + i, 1])) })));
await t("timestamps come from the server", false, () => setDoc(doc(as("erin"), "cards", "erin"), cardDoc({ ts: new Date(0) })));
await t("showcase + badge values + records are fine", true, () => setDoc(doc(as("erin"), "cards", "erin"), cardDoc({ av: { workouts: 13, streak: 9 }, show: ["rk:k1", "ach3:workouts,streak,reps", "st:reps", ""], prs: 4 })));
await t("a showcase over 10 fields is refused", false, () => setDoc(doc(as("erin"), "cards", "erin"), cardDoc({ show: Array.from({ length: 11 }, () => "st:reps") })));
await t("badge values must be a small map", false, () => setDoc(doc(as("erin"), "cards", "erin"), cardDoc({ av: Object.fromEntries(Array.from({ length: 41 }, (_, i) => ["a" + i, 1])) })));
await t("records must be a whole number", false, () => setDoc(doc(as("erin"), "cards", "erin"), cardDoc({ prs: "4" })));
await t("frank can't write erin's card", false, () => setDoc(doc(as("frank"), "cards", "erin"), cardDoc()));
await t("signed-out visitor can't read a card", false, () => getDoc(card(null)));
await t("vis friends: her friend frank reads it", true, () => getDoc(card("frank")));
await t("vis friends: gina (not a friend) can't", false, () => getDoc(card("gina")));
await t("erin opens it to everyone", true, () => setDoc(doc(as("erin"), "cards", "erin"), { vis: "all", ts: serverTimestamp() }, { merge: true }));
await t("vis all: gina reads it", true, () => getDoc(card("gina")));
await t("erin blocks gina", true, () => setDoc(doc(as("erin"), "blocks", "erin"), { b: ["gina"], ts: serverTimestamp() }));
await t("blocked: gina can't read it any more", false, () => getDoc(card("gina")));
await t("frank still can", true, () => getDoc(card("frank")));
await t("gina can't read erin's block list", false, () => getDoc(doc(as("gina"), "blocks", "erin")));
await t("erin reads her block list", true, () => getDoc(doc(as("erin"), "blocks", "erin")));
await t("gina can't change erin's block list", false, () => setDoc(doc(as("gina"), "blocks", "erin"), { b: [], ts: serverTimestamp() }));
await t("a block list over 500 is refused", false, () => setDoc(doc(as("erin"), "blocks", "erin"), { b: Array.from({ length: 501 }, (_, i) => "u" + i), ts: serverTimestamp() }));
await t("erin's other phone learns what she read and deleted (chatmem)", true, () => setDoc(doc(as("erin"), "chatmem", "erin"), { read: { a_b: 1 }, clr: { a_c: 2 }, ts: serverTimestamp() }, { merge: true }));
await t("a merge adds one chat to it", true, () => setDoc(doc(as("erin"), "chatmem", "erin"), { read: { a_d: 3 }, ts: serverTimestamp() }, { merge: true }));
await t("erin reads her chat memory", true, () => getDoc(doc(as("erin"), "chatmem", "erin")));
await t("gina can't read erin's chat memory", false, () => getDoc(doc(as("gina"), "chatmem", "erin")));
await t("gina can't write erin's chat memory", false, () => setDoc(doc(as("gina"), "chatmem", "erin"), { read: {}, ts: serverTimestamp() }, { merge: true }));
await t("other fields in chat memory are refused", false, () => setDoc(doc(as("erin"), "chatmem", "erin"), { x: 1, ts: serverTimestamp() }, { merge: true }));
await t("chat memory without the server time is refused", false, () => setDoc(doc(as("erin"), "chatmem", "erin"), { read: { a_e: 4 } }, { merge: true }));
await t("erin hides it (only me)", true, () => setDoc(doc(as("erin"), "cards", "erin"), { vis: "none", ts: serverTimestamp() }, { merge: true }));
await t("vis none: even her friend frank can't read it", false, () => getDoc(card("frank")));
await t("vis none: erin still can", true, () => getDoc(card("erin")));
await t("a card that doesn't exist can't be read by others", false, () => getDoc(doc(as("gina"), "cards", "frank")));
await t("nobody can list the cards", false, () => getDocs(query(collection(as("erin"), "cards"), limit(10))));

console.log("hidden after reports (1.7.0)");
await env.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), "mod", "erin"), { hidden: true, n: 3, ts: Timestamp.now() }); });
await t("erin reads why she is hidden", true, () => getDoc(doc(as("erin"), "mod", "erin")));
await t("gina can't read erin's mod note", false, () => getDoc(doc(as("gina"), "mod", "erin")));
await t("nobody can write a mod note from the app (not even herself)", false, () => setDoc(doc(as("erin"), "mod", "erin"), { hidden: false }));
await t("nobody can remove it from the app", false, () => deleteDoc(doc(as("erin"), "mod", "erin")));
await t("hidden: erin can't join the world top 50", false, () => setDoc(doc(as("erin"), "board", "erin"), board("Erin")));
await t("hidden: she can still leave it (delete)", true, () => deleteDoc(doc(as("erin"), "board", "erin")));
await t("erin opens her card to everyone again", true, () => setDoc(doc(as("erin"), "cards", "erin"), { vis: "all", ts: serverTimestamp() }, { merge: true }));
await t("hidden: a stranger (bob) can't open her card even with vis all", false, () => getDoc(card("bob")));
await t("hidden: her friend frank still can", true, () => getDoc(card("frank")));
await t("not hidden: carol joins the world top 50", true, () => setDoc(doc(as("carol"), "board", "carol"), board("Carol")));

console.log("deleting an account");
await t("deleting a nickname that doesn't exist is harmless", true, () => deleteDoc(doc(as("carol"), "nicks", "never_was")));
await t("erin deletes her card, block list and chat memory", true, () => { const db = as("erin"), b = writeBatch(db); b.delete(doc(db, "cards", "erin")); b.delete(doc(db, "blocks", "erin")); b.delete(doc(db, "chatmem", "erin")); return b.commit(); });
await t("carol deletes everything of hers", true, () => {
  const db = as("carol"), b = writeBatch(db);
  ["profiles", "board", "backups", "push", "cards", "blocks", "chatmem"].forEach(c => b.delete(doc(db, c, "carol")));
  b.delete(doc(db, "nicks", "carol")); b.delete(doc(db, "codes", "CCCCCC"));
  return b.commit();
});

await env.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
console.log(fail ? `::error title=Firestore rules::${fail} of ${pass + fail} rules tests failed` : `::notice title=Firestore rules::all ${pass} rules tests passed`);
process.exit(fail ? 1 : 0);
