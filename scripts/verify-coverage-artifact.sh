#!/usr/bin/env bash
# Verify a redirect-canonical coverage artifact end-to-end, mirroring
# the CI "Re-hash downloaded artifact and compare to published manifest"
# step exactly. Run this BEFORE pushing to catch manifest regressions
# (non-determinism, stray temp files, missing GRANTs in exclusions) that
# would otherwise only surface in CI.
#
# Modes:
#   1. Local (default): rebuild coverage/ from scratch via the same
#      `bun run test:coverage` command CI runs, regenerate the manifest
#      using the same logic, then re-hash and diff round-trip — proves
#      determinism on your machine.
#
#        scripts/verify-coverage-artifact.sh
#
#   2. Remote: download the artifact published by a specific GitHub
#      Actions run (requires `gh` CLI authenticated against the repo),
#      then verify it the same way CI does.
#
#        scripts/verify-coverage-artifact.sh --run-id <github-run-id>
#        scripts/verify-coverage-artifact.sh --run-id 1234567890 \
#          --name redirect-canonical-coverage
#
#   3. Existing dir: point at any extracted artifact directory and
#      verify it without rebuilding or downloading.
#
#        scripts/verify-coverage-artifact.sh --dir ./some/coverage-dir
#
# Exit codes (stable contract — CI log parsers depend on these):
#   0  OK — every sha256 matches AND regenerated manifest is byte-identical
#   2  Usage error (bad CLI arg, gh CLI missing in --run-id mode)
#  20  Manifest files (manifest.sha256 / manifest.json) absent from dir
#  21  Missing files — paths in published manifest but not on disk
#  22  Extra files   — paths on disk but not in published manifest
#                      (usually an exclusion gap vs. the workflow)
#  23  Hash mismatches — same path, different sha256 (corruption /
#                        post-upload mutation / non-deterministic output)
#  24  Multiple categories above triggered in a single run
#  25  Round-trip diff is non-empty but none of 21/22/23 classified it
#      (ordering, whitespace, or trailing-newline drift)
#  26  Initial `sha256sum -c` reported FAILED lines (hash mismatch or
#      unreadable file) before the diff phase
#
# These codes are combinable conceptually but reported as a single
# integer — when more than one of {missing, extra, hash} fires, the
# script exits 24 and the human-readable report lists every category.

set -euo pipefail

# Exit-code constants — keep in sync with the comment block above.
EXIT_OK=0
EXIT_USAGE=2
EXIT_NO_MANIFEST=20
EXIT_MISSING=21
EXIT_EXTRA=22
EXIT_HASH=23
EXIT_MULTI=24
EXIT_DIFF_UNCLASSIFIED=25
EXIT_SHA256SUM_C=26

ARTIFACT_NAME="redirect-canonical-coverage"
RUN_ID=""
EXISTING_DIR=""
MODE="local"

while [ $# -gt 0 ]; do
  case "$1" in
    --run-id)   RUN_ID="$2"; MODE="remote"; shift 2 ;;
    --name)     ARTIFACT_NAME="$2"; shift 2 ;;
    --dir)      EXISTING_DIR="$2"; MODE="dir"; shift 2 ;;
    -h|--help)
      sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit "$EXIT_USAGE" ;;
  esac
done

# Keep this EXACTLY in sync with the find-call in
# .github/workflows/canonical.yml ("Generate coverage artifact manifest"
# step). If you add/remove an exclusion there, mirror it here.
list_files() {
  find . -type f \
    ! -name 'manifest.json' \
    ! -name 'manifest.sha256' \
    ! -name '.DS_Store' \
    ! -name 'Thumbs.db' \
    ! -name 'desktop.ini' \
    ! -name '*.swp' \
    ! -name '*.swo' \
    ! -name '*~' \
    ! -name '.#*' \
    ! -name '*.tmp' \
    ! -name '*.temp' \
    ! -name '*.bak' \
    ! -name '*.log' \
    ! -name '*.partial' \
    ! -name '*.crdownload' \
    -printf '%P\n' | LC_ALL=C sort -u
}

rebuild_manifest() {
  # Mirrors the workflow's manifest generation. Used only in --local
  # mode after `bun run test:coverage` produces a fresh coverage/.
  local dir="$1"
  ( cd "$dir"
    mapfile -t FILES < <(list_files)
    if [ "${#FILES[@]}" -eq 0 ]; then
      echo "No files under $dir — nothing to hash" >&2
      exit 1
    fi
    : > manifest.sha256.unsorted
    for f in "${FILES[@]}"; do
      sha256sum "$f" >> manifest.sha256.unsorted
    done
    LC_ALL=C sort -k2 manifest.sha256.unsorted > manifest.sha256
    rm -f manifest.sha256.unsorted
    {
      printf '{\n'
      printf '  "schemaVersion": 1,\n'
      printf '  "commit": "%s",\n' "${GITHUB_SHA:-local}"
      printf '  "workflowRun": "%s",\n' "${GITHUB_RUN_ID:-local}"
      printf '  "fileCount": %d,\n' "${#FILES[@]}"
      printf '  "files": [\n'
      last=$((${#FILES[@]} - 1))
      for i in "${!FILES[@]}"; do
        f="${FILES[$i]}"
        size=$(stat -c '%s' "$f" 2>/dev/null || stat -f '%z' "$f")
        hash=$(sha256sum "$f" | awk '{print $1}')
        sep=","
        [ "$i" -eq "$last" ] && sep=""
        printf '    {"path": "%s", "size": %d, "sha256": "%s"}%s\n' \
          "$f" "$size" "$hash" "$sep"
      done
      printf '  ]\n'
      printf '}\n'
    } > manifest.json
    echo "Local manifest covers ${#FILES[@]} files"
  )
}

print_mismatch_report() {
  # Args: <published manifest> <roundtrip manifest>
  # Both files are `sha256sum` format: "<hash>  <path>", sorted by path.
  # Side effect: writes the classified exit code into MISMATCH_EXIT_CODE
  # so the caller can `exit "$MISMATCH_EXIT_CODE"`.
  local pub="$1" rt="$2"
  echo ""
  echo "──────── Round-trip mismatch report ────────"

  # Build path→hash maps via awk join. Files in only one side are
  # missing/extra; files in both with different hashes are corrupt.
  local missing extra changed
  missing=$(LC_ALL=C comm -23 \
    <(awk '{print $2}' "$pub"  | LC_ALL=C sort -u) \
    <(awk '{print $2}' "$rt"   | LC_ALL=C sort -u))
  extra=$(LC_ALL=C comm -13 \
    <(awk '{print $2}' "$pub"  | LC_ALL=C sort -u) \
    <(awk '{print $2}' "$rt"   | LC_ALL=C sort -u))
  changed=$(LC_ALL=C join -j 2 -o '0,1.1,2.1' \
      <(LC_ALL=C sort -k2 "$pub") \
      <(LC_ALL=C sort -k2 "$rt") \
    | awk '$2 != $3 {printf "  %s\n    published: %s\n    on-disk:   %s\n", $1, $2, $3}')

  local categories=0
  if [ -n "$missing" ]; then
    echo "Missing on disk (in published manifest, not produced by re-hash):"
    printf '  - %s\n' $missing
    categories=$((categories + 1))
    MISMATCH_EXIT_CODE="$EXIT_MISSING"
  fi
  if [ -n "$extra" ]; then
    echo "Extra on disk (re-hashed but not in published manifest):"
    printf '  + %s\n' $extra
    echo "  → likely an exclusion gap in list_files() — keep it in sync with .github/workflows/canonical.yml"
    categories=$((categories + 1))
    MISMATCH_EXIT_CODE="$EXIT_EXTRA"
  fi
  if [ -n "$changed" ]; then
    echo "Hash mismatches (same path, different sha256):"
    echo "$changed"
    echo "  → bytes on disk differ from what was originally hashed (corruption or post-upload mutation)"
    categories=$((categories + 1))
    MISMATCH_EXIT_CODE="$EXIT_HASH"
  fi
  if [ "$categories" -gt 1 ]; then
    MISMATCH_EXIT_CODE="$EXIT_MULTI"
  fi
  if [ "$categories" -eq 0 ]; then
    echo "(No path/hash differences detected — check ordering/whitespace in the unified diff above.)"
    MISMATCH_EXIT_CODE="$EXIT_DIFF_UNCLASSIFIED"
  fi
  echo ""
  echo "Exit code: $MISMATCH_EXIT_CODE  (21=missing, 22=extra, 23=hash, 24=multi, 25=unclassified)"
  echo "────────────────────────────────────────────"
}

verify_dir() {
  local dir="$1"
  if [ ! -f "$dir/manifest.sha256" ] || [ ! -f "$dir/manifest.json" ]; then
    echo "Missing manifest files in $dir" >&2
    exit "$EXIT_NO_MANIFEST"
  fi
  # `( ... )` subshell — `exit N` inside terminates the subshell with N,
  # which becomes the subshell's exit status. We capture it explicitly so
  # the classified exit code (21/22/23/24/25/26) propagates out.
  set +e
  (
    set -e
    cd "$dir"
    echo "→ sha256sum -c manifest.sha256"
    if ! sha256sum -c manifest.sha256 > sha256sum.check.log 2>&1; then
      cat sha256sum.check.log
      echo ""
      echo "❌ sha256sum -c failed. Per-file status:"
      grep -E ': (FAILED|FAILED open or read)$' sha256sum.check.log \
        | sed 's/^/  /' || true
      rm -f sha256sum.check.log
      exit "$EXIT_SHA256SUM_C"
    fi
    cat sha256sum.check.log
    rm -f sha256sum.check.log

    mapfile -t FILES < <(list_files)
    : > manifest.sha256.roundtrip.unsorted
    for f in "${FILES[@]}"; do
      sha256sum "$f" >> manifest.sha256.roundtrip.unsorted
    done
    LC_ALL=C sort -k2 manifest.sha256.roundtrip.unsorted > manifest.sha256.roundtrip
    rm -f manifest.sha256.roundtrip.unsorted
    echo "→ diff manifest.sha256 manifest.sha256.roundtrip"
    if ! diff -u manifest.sha256 manifest.sha256.roundtrip; then
      echo ""
      echo "❌ Round-trip manifest differs from published manifest" >&2
      MISMATCH_EXIT_CODE="$EXIT_DIFF_UNCLASSIFIED"
      print_mismatch_report manifest.sha256 manifest.sha256.roundtrip >&2
      rm -f manifest.sha256.roundtrip
      exit "$MISMATCH_EXIT_CODE"
    fi
    rm -f manifest.sha256.roundtrip
    echo "✅ ${#FILES[@]} files match manifest byte-for-byte"
  )
  local rc=$?
  set -e
  if [ "$rc" -ne 0 ]; then
    exit "$rc"
  fi
}

case "$MODE" in
  local)
    echo "== Local mode: rebuilding coverage/ via bun run test:coverage =="
    bun run test:coverage
    rebuild_manifest coverage
    verify_dir coverage
    ;;
  remote)
    if ! command -v gh >/dev/null 2>&1; then
      echo "gh CLI not found — install https://cli.github.com or use --dir mode" >&2
      exit "$EXIT_USAGE"
    fi
    TMP="$(mktemp -d)"
    trap 'rm -rf "$TMP"' EXIT
    echo "== Remote mode: downloading artifact '$ARTIFACT_NAME' from run $RUN_ID =="
    gh run download "$RUN_ID" --name "$ARTIFACT_NAME" --dir "$TMP"
    verify_dir "$TMP"
    ;;
  dir)
    echo "== Dir mode: verifying $EXISTING_DIR =="
    verify_dir "$EXISTING_DIR"
    ;;
esac
