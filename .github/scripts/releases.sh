#!/usr/bin/env bash
# Keeps GitHub releases in sync with CHANGELOG.md:
# - creates a release (and its tag) for every "## x.y.z (date)" section that has none yet,
#   oldest first, so the newest ends up "Latest";
# - updates the title and notes of existing releases when the changelog text changed.
# A section may pin its commit with "<!-- commit: <sha> -->"; otherwise the pushed commit is used.
# Every release starts with WEB_NOTE: the app is a web app, and the "Source code" zip/tar.gz that
# GitHub adds to every release (it can't be turned off) is only for developers.
set -euo pipefail
existing=$(gh release list --limit 200 --json tagName --jq '.[].tagName' || true)
python3 - <<'PY' > /tmp/sections.tsv
import re
WEB_NOTE = ("> **Web app, nothing to download.** Open https://mikydon.github.io/hw-app/ "
            "(or install it to your home screen); it updates by itself. "
            "The \"Source code\" files below are added by GitHub to every release and are only for developers.\n\n")
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
    open(path, "w", encoding="utf-8").write(WEB_NOTE + body + "\n")
    out.append((ver, date, c.group(1) if c else "-", path))  # "-" = no pinned commit (bash read drops empty tab fields)
for ver, date, c, path in reversed(out):
    print("\t".join([ver, date, c, path]))
PY
norm() { tr -d '\r' | sed -e 's/[[:space:]]*$//' | sed -e '/./,$!d' | sed -e ':a' -e '/^\n*$/{$d;N;ba' -e '}'; }
while IFS=$'\t' read -r ver date commit notes; do
  tag="v$ver"
  title="HW App $ver ($date)"
  if grep -qx "$tag" <<<"$existing"; then
    cur_title=$(gh release view "$tag" --json name --jq .name)
    cur_body=$(gh release view "$tag" --json body --jq .body | norm)
    new_body=$(norm < "$notes")
    if [ "$cur_body" != "$new_body" ] || [ "$cur_title" != "$title" ]; then
      echo "updating $tag"
      gh release edit "$tag" --title "$title" --notes-file "$notes"
    else
      echo "$tag up to date"
    fi
    continue
  fi
  [ "$commit" = "-" ] && commit=""
  target="${commit:-$GITHUB_SHA}"
  target=$(git rev-parse "$target^{commit}")
  echo "creating $tag at $target"
  gh release create "$tag" --target "$target" --title "$title" --notes-file "$notes"
done < /tmp/sections.tsv
