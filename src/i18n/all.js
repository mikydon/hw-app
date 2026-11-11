// Every language except English, by code. The app build (build.mjs) swaps this file for one that reads the
// language from a JSON block in index.html only when it is used (1.10.0: 14 languages no longer run at start).
// Node tools and tests that import index.js directly get the plain modules below.
import sk from "./sk.js";
import cs from "./cs.js";
import pl from "./pl.js";
import hu from "./hu.js";
import uk from "./uk.js";
import de from "./de.js";
import es from "./es.js";
import fr from "./fr.js";
import it from "./it.js";
import pt from "./pt.js";
import zh from "./zh.js";
import ja from "./ja.js";
import ko from "./ko.js";
import id from "./id.js";
const ALL = { sk, cs, pl, hu, uk, de, es, fr, it, pt, zh, ja, ko, id };
export const CODES = Object.keys(ALL);
export const source = code => ALL[code] || null;
