#!/usr/bin/env python3
"""Checks the exercise library data: python3 tools/exlib/check.py

- every <lang>.json has exactly the ids of list.json, each with a name and at least one alias
- no name or alias twice inside one exercise, no two exercises with the same name
- an alias never equals another exercise's name (search would point to the wrong one)
- the name the app uses today (src/i18n/<lang>.js ex.<id>.name) is the name or an alias
- no letters from the wrong script (e.g. a Cyrillic "а" inside a Hungarian word)
- groups.json gives every exercise one known body-part group and one equipment kind
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LANGS = "en sk cs pl hu uk de es fr it pt zh ja ko id".split()
GROUPS = {"chest", "back", "shoulders", "arms", "legs", "glutes", "calves", "core"}
EQUIP = {"none", "free", "machine"}
CYR = re.compile(r"[Ѐ-ӿ]")
CJK = re.compile(r"[぀-ヿ㐀-鿿가-힯]")

ids = [e["id"] for e in json.load(open(os.path.join(HERE, "list.json")))]
errs = []

def today(lang):
    js = ('const m=(await import(%r)).default;'
          'console.log(JSON.stringify(Object.fromEntries(Object.entries(m.ex).map(([k,v])=>[k,v.name]))))'
          % os.path.join(ROOT, "src/i18n", lang + ".js"))
    out = subprocess.check_output(["node", "--input-type=module", "-e", js], stderr=subprocess.DEVNULL)
    return json.loads(out)

for l in LANGS:
    d = json.load(open(os.path.join(HERE, l + ".json"), encoding="utf-8"))
    if sorted(d) != sorted(ids):
        errs.append(f"{l}: ids differ (missing {set(ids) - set(d)}, extra {set(d) - set(ids)})")
    names = {}
    for i, v in d.items():
        if not v or len(v) < 2 or any(not str(x).strip() for x in v):
            errs.append(f"{l} {i}: needs a name and at least one alias, no empty strings")
        low = [x.casefold() for x in v]
        if len(set(low)) != len(low):
            errs.append(f"{l} {i}: a value is written twice")
        if low and low[0] in names:
            errs.append(f"{l} {i}: same name as {names[low[0]]}")
        if low: names[low[0]] = i
        for x in v:
            if l != "uk" and CYR.search(x): errs.append(f"{l} {i}: Cyrillic letter in '{x}'")
            if l not in ("zh", "ja", "ko") and CJK.search(x): errs.append(f"{l} {i}: CJK letter in '{x}'")
    for i, v in d.items():
        for a in v[1:]:
            j = names.get(a.casefold())
            if j and j != i: errs.append(f"{l} {i}: alias '{a}' is the name of {j}")
    for i, n in today(l).items():
        if i in d and n.casefold() not in [x.casefold() for x in d[i]]:
            errs.append(f"{l} {i}: today's app name '{n}' is missing")

g = json.load(open(os.path.join(HERE, "groups.json")))
if sorted(g) != sorted(ids): errs.append("groups.json: ids differ")
for i, (grp, eq) in g.items():
    if grp not in GROUPS or eq not in EQUIP: errs.append(f"groups.json {i}: {grp}/{eq}")

print("\n".join(errs) if errs else f"ok: {len(ids)} exercises x {len(LANGS)} languages, groups ok")
sys.exit(1 if errs else 0)
