// A tiny stand-in for the Firebase code (src/cloud.js) in browser tests (1.9.0, Nov 7): Firebase hosts are blocked
// in the sandbox. Signed in as "me" with the nickname Michael; every watcher answers with what __fake holds; every
// call is logged in window.__fakeLog. Tests set window.__fake before the app runs (addInitScript).
(function () {
  const F = (window.__fake = Object.assign({
    uid: "me", prof: { nick: "Michael", code: "HWABCDEF" }, friends: [], reqs: [], chats: [], promo: {},
  }, window.__fake || {}));
  const log = (window.__fakeLog = []);
  const ok = v => Promise.resolve(v);
  const watch = key => (cb) => { setTimeout(() => cb(F[key] || []), 0); return () => {}; };
  const known = {
    init: () => ok(F.out ? null : { uid: F.uid }),
    signIn: () => { F.out = false; return ok({ uid: F.uid, name: F.gname || "" }); },
    signOut: () => { F.out = true; return ok(); },
    saveBackup: (json, n) => { F.backup = { json, n, ts: Date.now() }; return ok(); },
    snapshotBackup: today => { const b = F.backup; if (!b) return ok(false); const t = new Date(b.ts), day = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; if (day >= today) return ok(false); F.points = { ...(F.points || {}), [day]: { json: b.json, n: b.n, ts: b.ts } }; return ok(true); },
    listPoints: () => ok(Object.entries(F.points || {}).map(([day, v]) => ({ day, ...v })).sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, 4)),
    onUser: cb => { return () => {}; },
    getProfile: () => ok(F.prof),
    watchRequests: watch("reqs"), watchFriends: watch("friends"), watchChats: watch("chats"),
    watchBlocks: cb => { setTimeout(() => cb([]), 0); return () => {}; },
    watchChatMem: cb => { setTimeout(() => cb({}), 0); return () => {}; },
    watchFStreaks: cb => { setTimeout(() => cb([]), 0); return () => {}; },
    watchBackup: cb => { if (F.backup) setTimeout(() => cb(F.backup), 0); return () => {}; },
    loadBackup: () => ok(F.backup || null),
    getMod: () => ok(null),
    authInfo: () => ({ email: "m@x.sk", google: false, password: true, verified: true }),
    getPromo: code => ok(F.promo[code] || null),
    getGift: () => ok(F.gift || 0),
  };
  window.__hwCloud = new Proxy(known, {
    get(t, k) {
      if (k in t) return (...a) => { log.push([k, ...a]); return t[k](...a); };
      if (typeof k !== "string" || k === "then") return undefined;
      return (...a) => { log.push([k, ...a]); return ok(null); };
    },
  });
  // the app reads this before it starts Firebase
  try { const m = JSON.parse(localStorage.getItem("domaci-trening-v1-cloud") || "{}"); if (!m.uid && !F.out) localStorage.setItem("domaci-trening-v1-cloud", JSON.stringify({ ...m, uid: F.uid, prof: F.prof, owner: F.uid, memUid: F.uid })); } catch (_) {}
})();
