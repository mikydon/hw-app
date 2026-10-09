#!/usr/bin/env bash
# Keeps GitHub releases in sync with CHANGELOG.md (runs on every push to main, see build.yml).
#
# Two kinds of sections:
#   "## Browser beta 1.4.2 (date)"  the web version from before the Android app; tag beta-v1.4.2
#   "## 1.0.0 (date)"               the Android app; tag v1.0.0, with the APK, the live-update zip
#                                   and update.json attached ($DIST, built by the build job)
# A section may pin its commit with "<!-- commit: <sha> -->"; otherwise the pushed commit is used.
#
# 1. Migration (once): betas used to be tagged v1.x.y. Each one moves to beta-v1.x.y and the old
#    tag is deleted, so v1.0.0 is free for the first Android app.
# 2. Every section gets a release (oldest first); titles and notes of existing ones are updated
#    when the changelog text changed. Only the current app version ($APP_VERSION) gets files, and
#    only when it was signed with the real key ($SIGNED=true); it becomes "Latest".
# GitHub adds "Source code" zip/tar.gz to every release by itself (can't be turned off).
set -euo pipefail
exec 3>&1  # annotations always reach the log, even from commands whose stdout is discarded
trap 'echo "::error::releases.sh stopped at line $LINENO: $BASH_COMMAND" >&3' ERR
# Runs a command; on failure shows its output as an annotation (readable without the log).
run() {
  local out
  if ! out=$("$@" 2>&1); then
    out=${out//$'\n'/ }
    echo "::error::$1 $2 $3 failed: ${out:0:600}" >&3
    return 1
  fi
  [ -n "$out" ] && echo "$out"
  return 0
}
REPO="${GITHUB_REPOSITORY:-mikydon/hw-app}"
DIST="${DIST:-dist}"
APP_VERSION="${APP_VERSION:-}"
SIGNED="${SIGNED:-false}"

python3 - <<'PY' > /tmp/sections.tsv
import re
BETA_NOTE = ("> **Browser beta:** the web version from before the Android app. Nothing to download; "
             "the website https://mikydon.github.io/hw-app/ still works. "
             "The \"Source code\" files below are added by GitHub to every release and are only for developers.\n\n")
APP_NOTE = ("> **Android app.** On your phone, download **HW-App-{v}.apk** below and open it to install "
            "(if Android asks, allow installing apps from your browser). To update, install the new APK over the old one; "
            "your data stays. Small updates arrive inside the app by themselves. "
            "`hw-app-web-{v}.zip` and `update.json` are for those automatic updates; the \"Source code\" files are only for developers.\n\n")
s = open("CHANGELOG.md", encoding="utf-8").read()
out = []
for p in re.split(r"^## ", s, flags=re.M)[1:]:
    head, _, body = p.partition("\n")
    m = re.match(r"(Browser beta )?(\d+(?:\.\d+){2,3})\s*\(([^)]*)\)", head)
    if not m: continue
    beta, ver, date = bool(m.group(1)), m.group(2), m.group(3)
    c = re.search(r"<!-- commit: ([0-9a-f]{7,40}) -->", body)
    body = re.sub(r"<!--.*?-->\n?", "", body, flags=re.S).strip()
    kind = "beta" if beta else "app"
    path = f"/tmp/notes-{kind}-{ver}.md"
    open(path, "w", encoding="utf-8").write((BETA_NOTE if beta else APP_NOTE.format(v=ver)) + body + "\n")
    tag = f"beta-v{ver}" if beta else f"v{ver}"
    title = f"HW App Browser beta {ver} ({date})" if beta else f"HW App {ver} ({date})"
    out.append((kind, ver, tag, title, c.group(1) if c else "-", path))  # "-": bash read drops empty tab fields
for row in reversed(out):
    print("\t".join(row))
PY

has_release() { gh release view "$1" --repo "$REPO" --json tagName >/dev/null 2>&1; }
tag_commit() {
  local obj type
  obj=$(run gh api "repos/$REPO/git/ref/tags/$1" --jq '.object.sha + " " + .object.type')
  type=${obj#* }; obj=${obj% *}
  if [ "$type" = "tag" ]; then gh api "repos/$REPO/git/tags/$obj" --jq .object.sha; else echo "$obj"; fi
}
norm() { tr -d '\r' | sed -e 's/[[:space:]]*$//' | sed -e '/./,$!d' | sed -e ':a' -e '/^\n*$/{$d;N;ba' -e '}'; }
sync_text() {  # tag title notes-file
  local cur_title cur_body
  cur_title=$(gh release view "$1" --repo "$REPO" --json name --jq .name)
  cur_body=$(gh release view "$1" --repo "$REPO" --json body --jq .body | norm)
  if [ "$cur_body" != "$(norm < "$3")" ] || [ "$cur_title" != "$2" ]; then
    echo "updating $1"; run gh release edit "$1" --repo "$REPO" --title "$2" --notes-file "$3"
  else
    echo "$1 up to date"
  fi
}

# 1. move old beta tags v1.x.y → beta-v1.x.y
while IFS=$'\t' read -r kind ver tag title commit notes; do
  [ "$kind" = "beta" ] || continue
  if ! has_release "$tag" && has_release "v$ver"; then
    sha=$(tag_commit "v$ver")
    echo "moving v$ver → $tag ($sha)"
    # Creating the tag directly can be refused for commits that change .github/workflows (the
    # workflow token has no "workflows" permission); then the Releases API creates it from --target.
    if ! gh api -X POST "repos/$REPO/git/refs" -f ref="refs/tags/$tag" -f sha="$sha" >/dev/null 2>/tmp/ref.err; then
      echo "::notice::direct tag $tag refused ($(tr '\n' ' ' < /tmp/ref.err | cut -c1-200)); letting the release create it"
    fi
    run gh release edit "v$ver" --repo "$REPO" --tag "$tag" --target "$sha" --title "$title" --notes-file "$notes" --latest=false
    run gh api "repos/$REPO/git/ref/tags/$tag" --jq .object.sha >/dev/null
    gh api -X DELETE "repos/$REPO/git/refs/tags/v$ver" || true
  fi
done < /tmp/sections.tsv

# 2. create / update
while IFS=$'\t' read -r kind ver tag title commit notes; do
  [ "$commit" = "-" ] && commit=""
  if [ "$kind" = "beta" ]; then
    if has_release "$tag"; then sync_text "$tag" "$title" "$notes"; continue; fi
    target=$(git rev-parse "${commit:-$GITHUB_SHA}^{commit}")
    echo "creating $tag at $target"
    run gh release create "$tag" --repo "$REPO" --target "$target" --title "$title" --notes-file "$notes" --latest=false
    continue
  fi
  if [ "$ver" != "$APP_VERSION" ]; then
    if has_release "$tag"; then sync_text "$tag" "$title" "$notes"; else echo "::warning::$tag has no release and isn't the current version ($APP_VERSION); skipped"; fi
    continue
  fi
  if [ "$SIGNED" != "true" ]; then
    echo "::warning::$tag not released: the APK isn't signed yet (add the ANDROID_KEYSTORE_* secrets)"
    continue
  fi
  files=("$DIST/HW-App-$ver.apk" "$DIST/hw-app-web-$ver.zip" "$DIST/update.json")
  for f in "${files[@]}"; do [ -f "$f" ] || { echo "::error::missing $f"; exit 1; }; done
  if has_release "$tag"; then
    sync_text "$tag" "$title" "$notes"
    run gh release upload "$tag" --repo "$REPO" --clobber "${files[@]}"
    run gh release edit "$tag" --repo "$REPO" --latest
  else
    target=$(git rev-parse "${commit:-$GITHUB_SHA}^{commit}")
    echo "creating $tag at $target with the APK"
    run gh release create "$tag" --repo "$REPO" --target "$target" --title "$title" --notes-file "$notes" --latest "${files[@]}"
  fi
done < /tmp/sections.tsv
