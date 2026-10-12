// Small helpers shared by the app and the cloud code (1.5.0). The cloud code itself (Firebase) is loaded only
// when someone uses an account: see cloud-lazy.js.
export const SHARE_BASE = "https://mikydon.github.io/hw-app/";
export const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
export const NICK_RE = /^[\p{L}\p{N}_.-]{3,20}$/u;
export const nickKey = n => String(n || "").normalize("NFC").trim().toLowerCase();
export const cleanCode = c => String(c || "").toUpperCase().replace(/^HW-?/, "").replace(/[^A-Z0-9]/g, "");
export const fmtCode = c => (c ? `HW-${c}` : "");
export const chatId = (a, b) => [a, b].sort().join("_");
