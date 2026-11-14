// Small helpers shared by the app and the cloud code (1.5.0). The cloud code itself (Firebase) is loaded only
// when someone uses an account: see cloud-lazy.js.
export const SHARE_BASE = "https://mikydon.github.io/hw-app/";
export const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
export const NICK_RE = /^[\p{L}\p{N}_.-]{3,20}$/u;
// 1.10.0 (Michael, Nov 14): names nobody may take, so no one looks like the app's own account (HW App's plans in the
// Library carry an official mark) or like staff. Separators don't help: "HW_App", "hw.app" are reserved too. Same rule
// in firestore.rules (nickFree) for NEW nicknames only; someone who already has such a name keeps it.
export const nickReserved = n => { const s = String(n || "").toLowerCase().replace(/[\s_.-]/g, ""); return s.includes("hwapp") || /^(official|admin|support|moderator|staff|hwteam|hwsupport)/.test(s); };
export const nickKey = n => String(n || "").normalize("NFC").trim().toLowerCase();
export const cleanCode = c => String(c || "").toUpperCase().replace(/^HW-?/, "").replace(/[^A-Z0-9]/g, "");
export const fmtCode = c => (c ? `HW-${c}` : "");
export const chatId = (a, b) => [a, b].sort().join("_");
// The push notification server (1.6.0, worker/): a Cloudflare Worker. Empty = not set up yet (nothing is sent).
export const PUSH_URL = "https://hw-app-push.hw-app.workers.dev";
