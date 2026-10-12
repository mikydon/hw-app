// Firestore security rules tests (run by .github/workflows/rules.yml inside the Firestore emulator).
// Every case says who tries what and whether the rules must allow it. Results show up as annotations on the run.
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, orderBy, limit, writeBatch, addDoc, serverTimestamp } from "firebase/firestore";

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

console.log("deleting an account");
await t("deleting a nickname that doesn't exist is harmless", true, () => deleteDoc(doc(as("carol"), "nicks", "never_was")));
await t("carol deletes everything of hers", true, () => {
  const db = as("carol"), b = writeBatch(db);
  ["profiles", "board", "backups"].forEach(c => b.delete(doc(db, c, "carol")));
  b.delete(doc(db, "nicks", "carol")); b.delete(doc(db, "codes", "CCCCCC"));
  return b.commit();
});

await env.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
console.log(fail ? `::error title=Firestore rules::${fail} of ${pass + fail} rules tests failed` : `::notice title=Firestore rules::all ${pass} rules tests passed`);
process.exit(fail ? 1 : 0);
