// 1.9.0: exercise names and aliases in every language (tools/exlib/<lang>.json: {id: [name, alias, …]}).
// The first entry is the exercise's name in the app (official wording, Michael Nov 1: Slovak "Kľuk", not "Klik");
// the rest are other names people use, so the search finds them. Edited by hand there, checked by tools/exlib/check.py.
import en from "../tools/exlib/en.json";
import sk from "../tools/exlib/sk.json";
import cs from "../tools/exlib/cs.json";
import pl from "../tools/exlib/pl.json";
import hu from "../tools/exlib/hu.json";
import uk from "../tools/exlib/uk.json";
import de from "../tools/exlib/de.json";
import es from "../tools/exlib/es.json";
import fr from "../tools/exlib/fr.json";
import it from "../tools/exlib/it.json";
import pt from "../tools/exlib/pt.json";
import zh from "../tools/exlib/zh.json";
import ja from "../tools/exlib/ja.json";
import ko from "../tools/exlib/ko.json";
import id from "../tools/exlib/id.json";
export const EX_NAMES = { en, sk, cs, pl, hu, uk, de, es, fr, it, pt, zh, ja, ko, id };
