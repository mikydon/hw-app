// Small helpers shared by the app and the cloud code (1.5.0). The cloud code itself (Firebase) is loaded only
// when someone uses an account: see cloud-lazy.js.
export const SHARE_BASE = "https://mikydon.github.io/hw-app/";
export const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
export const NICK_RE = /^[\p{L}\p{N}_.-]{3,20}$/u;
// 1.10.0 (Michael, Nov 14): names nobody may take, so no one looks like the app's own account (HW App's plans in the
// Library carry an official mark) or like staff. Separators don't help: "HW_App", "hw.app" are reserved too. Same rule
// in firestore.rules (nickFree) for NEW nicknames only; someone who already has such a name keeps it.
export const nickReserved = n => { const s = String(n || "").toLowerCase().replace(/[\s_.-]/g, ""); return s.includes("hwapp") || /^(official|admin|support|moderator|staff|hwteam|hwsupport)/.test(s); };
// 1.10.0 (Michael, Nov 14: "a simple filter for known swear words"): names that are refused for nicknames and for
// plans shown to others (Library, profile). Simple on purpose: letters only, accents and 0/1/3/4/5/7/@/$ read as
// letters, separators ignored. BAD_IN = words refused anywhere inside a name; BAD_ALONE = short or ambiguous words
// refused only as a whole word (so "class", "Scunthorpe", "therapist", "computadora", "Faszination" stay fine).
// Reports + hiding by the Worker remain the real safety net. firestore.rules (nickClean) repeats BAD_IN for nicks.
export const BAD_IN = ["fuck", "shit", "nigger", "nigga", "faggot", "retard", "whore", "bitch", "pussy", "asshole", "slut", "hitler", "porn", "vagina", "wank", "dildo", "motherf",
  "kurva", "kurve", "kurwa", "kokot", "jebat", "jebac", "jeban", "chuj", "pizda", "debil", "zmrd", "buzerant", "hovno", "prdel", "curak", "mrdat", "spierdal", "pierdol", "dziwka", "cwel",
  "geci", "picsa", "bazdmeg", "baszd", "scheiss", "scheis", "fotze", "hurensohn", "arschloch", "wichser", "schwuchtel", "nutte",
  "pendejo", "cabron", "maricon", "joder", "culero", "chinga", "gilipollas", "putain", "connard", "salope", "encule", "niquer",
  "cazzo", "stronzo", "vaffanculo", "puttana", "minchia", "frocio", "coglion", "caralho", "buceta", "cuzao", "porra",
  "блять", "блядь", "хуй", "хуе", "пизд", "ебать", "заеб", "уеба", "мудак", "пидор", "пидар", "підар", "гандон", "залуп", "курва",
  "kontol", "memek", "ngentot", "bangsat", "jancok", "bajingan"];
export const BAD_ALONE = ["cunt", "rapist", "nazi", "dick", "cock", "fag", "ass", "twat", "cum", "fick", "fasz", "szar", "buzi", "puta", "puto", "verga", "troia", "viado", "foder", "pute", "jeb", "pica", "picu", "pici", "сука", "бля", "хер", "goblok", "tolol", "kreten", "idiot"];
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s" };
const flat = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[013457@$]/g, c => LEET[c]);
// a nickname (one word: separators and digit runs split it into parts, the whole is also checked)
export const nickBad = n => { const f = flat(n), whole = f.replace(/[^\p{L}]/gu, ""); return BAD_IN.some(w => whole.includes(w)) || f.split(/[^\p{L}]+/u).some(t => BAD_ALONE.includes(t)) || BAD_ALONE.includes(whole); };
// a free text (plan name): every word on its own
export const textBad = t => { const f = flat(t); return BAD_IN.some(w => f.replace(/[^\p{L}]/gu, "").includes(w)) || f.split(/[^\p{L}]+/u).some(w => BAD_ALONE.includes(w)); };
export const nickKey = n => String(n || "").normalize("NFC").trim().toLowerCase();
export const cleanCode = c => String(c || "").toUpperCase().replace(/^HW-?/, "").replace(/[^A-Z0-9]/g, "");
export const fmtCode = c => (c ? `HW-${c}` : "");
export const chatId = (a, b) => [a, b].sort().join("_");
// The push notification server (1.6.0, worker/): a Cloudflare Worker. Empty = not set up yet (nothing is sent).
export const PUSH_URL = "https://hw-app-push.hw-app.workers.dev";
