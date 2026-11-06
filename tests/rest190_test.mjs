// 1.9.0 rest timer with the screen off: on the website a line says it needs the app; with the (faked) native plugin the
// first rest asks for "Physical activity" once, then every rest starts the service with its end time, +30 s updates it,
// Ready stops it.
import { start, T, entry } from "./harness.mjs";
for (const mode of ["web", "app"]) {
  const h = await start({ clock: new Date(2026, 10, 4, 18).getTime() });
  const p = h.page;
  if (mode === "app") await p.evaluate(() => {
    window.__restLog = []; let perm = "prompt";
    window.__hwRest = { state: async () => ({ activity: perm }), ask: async () => { window.__restLog.push(["ask"]); perm = "granted"; return { activity: perm }; },
      start: async o => { window.__restLog.push(["start", o.endAt, o.title]); }, stop: async () => { window.__restLog.push(["stop"]); } };
  });
  await p.click("[data-fstart-go]"); await p.click("[data-warmup-go]");
  await p.click("[data-done-btn]");
  if (mode === "web") {
    T.ok(await p.locator("[data-rest-web]").count() === 1, "web: line that the screen-off beep needs the app");
    T.ok(await p.locator("[data-rest-perm]").count() === 0, "web: no permission card");
  } else {
    T.ok(await p.locator("[data-rest-web]").count() === 0, "app: no web line");
    T.ok(await p.locator("[data-rest-perm]").count() === 1, "app: first rest asks for Physical activity");
    await p.click("[data-rest-perm-yes]"); await p.waitForTimeout(300);
    let log = await p.evaluate(() => window.__restLog);
    T.ok(log.some(x => x[0] === "ask") && log.some(x => x[0] === "start"), "allowed → service started for this rest");
    const first = log.filter(x => x[0] === "start").pop();
    await p.click('[data-rest-add="30"]'); await p.waitForTimeout(300);
    log = await p.evaluate(() => window.__restLog);
    T.ok(log.filter(x => x[0] === "start").pop()[1] === first[1] + 30000, "+30 s moves the service's end time");
    await p.click("[data-rest-ready]"); await p.waitForTimeout(300);
    log = await p.evaluate(() => window.__restLog);
    T.eq(log[log.length - 1][0], "stop", "Ready stops the service");
    await p.click("[data-side-next]"); await p.click("[data-done-btn]"); await p.waitForTimeout(300);
    T.ok(await p.locator("[data-rest-perm]").count() === 0, "asked only once");
    log = await p.evaluate(() => window.__restLog);
    T.eq(log[log.length - 1][0], "start", "next rest starts the service again");
    T.ok(log[log.length - 1][2].includes("ATG squat") || log[log.length - 1][2].includes("Rest"), "notification title names the next exercise");
  }
  T.eq(h.errors, [], `${mode}: no page errors`);
  await h.close();
}
T.done();
