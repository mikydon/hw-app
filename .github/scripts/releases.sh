#!/usr/bin/env bash
# Creates a GitHub release (and its tag) for every "## x.y.z (date)" section of
# CHANGELOG.md that has no release yet. Oldest first, so the newest ends up "Latest".
# A section may pin its commit with "<!-- commit: <sha> -->"; otherwise the pushed commit is used.
set -euo pipefail
existing=$(gh release list --limit 200 --json tagName --jq '.[].tagName' || true)
python3 - <<'PY' > /tmp/sections.tsv
import re, json
s = open("CHANGELOG.md", encoding="utf-8").read()
parts = re.split(r"^## ", s, flags=re.M)[1:]
out = []
for p in parts:
    head, _, body = p.partition("\n")
    m = re.match(r"(\d+(?:\.\d+){2,3})\s*\(([^)]*)\)", head)
    if not m: continue
    ver, date = m.groups()
    c = re.search(r"<!-- commit: ([0-9a-f]{7,40}) -->", body)
    body = re.sub(r"<!--.*?-->\n?", "", body, flags=re.S).strip()
    path = f"/tmp/notes-{ver}.md"
    open(path, "w", encoding="utf-8").write(body + "\n")
    out.append((ver, date, c.group(1) if c else "-", path))  # "-" = no pinned commit (bash read drops empty tab fields)
for ver, date, c, path in reversed(out):
    print("\t".join([ver, date, c, path]))
PY
while IFS=$'\t' read -r ver date commit notes; do
  tag="v$ver"
  if grep -qx "$tag" <<<"$existing"; then echo "$tag exists"; continue; fi
  [ "$commit" = "-" ] && commit=""
  target="${commit:-$GITHUB_SHA}"
  target=$(git rev-parse "$target^{commit}")
  echo "creating $tag at $target"
  gh release create "$tag" --target "$target" --title "HW App $ver ($date)" --notes-file "$notes"
done < /tmp/sections.tsv
