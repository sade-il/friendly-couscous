# Welcome to your Lovable project

TODO: Document your project here

## Coverage artifact verification — exit-code contract

`scripts/verify-coverage-artifact.sh` (and the matching CI round-trip step in
`.github/workflows/canonical.yml`) verify that the `redirect-canonical-coverage`
artifact is complete, untampered, and reproducible. The script exits with a
**stable, classifiable code** so CI log parsers / dashboards can route
failures automatically instead of grepping output.

### Exit codes

| Code | Meaning | What it tells you |
|-----:|---------|-------------------|
| **0**  | OK                              | Every `sha256` matches the published `manifest.sha256` and a regenerated manifest is byte-identical. |
| **2**  | Usage error                     | Bad CLI flag, or `--run-id` was used without the `gh` CLI installed. |
| **20** | Manifest files absent           | `manifest.sha256` or `manifest.json` missing from the verified directory — the upload step likely failed before the manifest was written. |
| **21** | Missing files                   | Paths exist in the published manifest but not on disk after re-download. Artifact was truncated or files were dropped during upload. |
| **22** | Extra files                     | Paths exist on disk but not in the published manifest. Usually an exclusion drift between `list_files()` in the script and the `find ! -name …` block in `canonical.yml` — keep them in sync. |
| **23** | Hash mismatches                 | Same path, different `sha256`. Byte-level corruption, post-upload mutation, or non-deterministic test output. |
| **24** | Multiple categories             | More than one of 21 / 22 / 23 fired in the same run. The mismatch report enumerates every category. |
| **25** | Unclassified diff               | `diff` showed a difference but no path/hash mismatch was detected — typically ordering, whitespace, or trailing-newline drift in the manifest generator. |
| **26** | `sha256sum -c` failed           | The initial per-file integrity check reported `FAILED` / `FAILED open or read` lines before the diff phase even ran (hash mismatch or unreadable file). |

### Recommended CI failure handling

The contract is designed so a single integer in `$?` is enough to decide what
to do. A minimal classifier:

```bash
set +e
scripts/verify-coverage-artifact.sh --run-id "$RUN_ID"
rc=$?
set -e
case "$rc" in
  0)                  echo "::notice::coverage artifact verified" ;;
  2)                  echo "::error::verifier usage error";                  exit 1 ;;
  20)                 echo "::error::artifact has no manifest (upload broke)"; exit 1 ;;
  21|22|24)           echo "::error::artifact file-set drift — fix exclusions or upload glob"; exit 1 ;;
  23|26)              echo "::error::artifact corruption — re-run job, then investigate non-determinism"; exit 1 ;;
  25)                 echo "::warning::manifest diff is unclassified (likely ordering) — inspect the report"; exit 1 ;;
  *)                  echo "::error::unknown verifier exit $rc"; exit 1 ;;
esac
```

Triage guidance per class:

- **20 / 21** → re-run the upstream `upload-artifact` step. If reproducible,
  the build is producing fewer files than the manifest expects (test crash
  before coverage finalized).
- **22** → an exclusion in `list_files()` (script) and the `find` block in
  `canonical.yml` drifted. Update both at once; they're called out with a
  cross-reference comment in each file.
- **23 / 26** → first re-run to rule out transient storage corruption. If it
  recurs on the same commit, hunt for non-determinism (timestamps,
  hostnames, PIDs) sneaking into a coverage file.
- **24** → read the human-readable mismatch report; treat each category by
  its own rule above.
- **25** → almost always a manifest-generator change (sort key, locale,
  trailing newline). Diff the published vs. regenerated `manifest.sha256`
  manually.

Codes are append-only — never renumber. New failure categories take the next
free integer.

### End-to-end CI triage flow

How a single verifier exit code becomes a notification, a side effect, and a
status check — from `verify-coverage-artifact.sh` to the `gate` job:

1. **`verify`** runs `scripts/verify-coverage-artifact.sh --run-id … --name …`
   under `set +e`, captures `$?` into `rc`, and uploads `verify.log` as an
   artifact. The script never throws — it always exits with a code from the
   contract above (`0`, `2`, `20`–`26`).
2. **`classify`** maps `rc` → `class` via a single `case` statement (the only
   place exit codes live in YAML):
   - `0` → `ok` (no downstream jobs run)
   - `2` → `usage` (workflow bug — fails fast in `gate`)
   - `20` → `upload-broken` → Slack `#ci-infra` (P2)
   - `21|22|24` → `fileset-drift` → Slack `#ci-infra` **and** a `p3`-labelled
     GitHub issue (workflow/exclusion mismatch; non-paging)
   - `23|26` → `corruption` → Slack on-call `#oncall-coverage` (P1, pages)
   - `25` → `unclassified-diff` → Slack `#ci-infra` (P2, manifest-generator drift)
   - `*` → `unknown` → email digest via `notify-soft` (P3)
3. **`slack-payload`** runs once on any non-OK class and builds the Block Kit
   message (header, severity, class, rc, commit, run link, triage hint) so every
   leaf job posts an identical layout — only the destination channel changes.
4. **`notify-*` leaf jobs** fan out in parallel, each `if`-gated on its class so
   exactly one Slack channel receives each failure (no double-paging). They all
   call the shared `./.github/actions/notify-slack` composite action, which
   wraps `curl` with per-request timeouts, exponential backoff with jitter, and
   Slack-aware retry rules (retry `5xx`/`429`/network; never retry `4xx`). It
   defaults to `fail-on-error: false`, so a Slack outage **never** blocks the
   GitHub-issue side effect or the `gate` job.
5. **`notify-fileset-drift`** additionally opens a `p3`-labelled GitHub issue
   via `gh issue create` so drift has a durable tracking artifact even if the
   Slack post is dropped.
6. **`gate`** runs `if: always()` after every notify-* job and re-fails the
   workflow whenever `needs.classify.outputs.class != 'ok'`. This keeps the
   required status check honest: notifications are best-effort, but a non-OK
   class always turns the commit red and blocks merge via branch protection.

Net effect: one exit code → one Slack channel (correct severity) → optional
durable side effect (GitHub issue / email) → guaranteed red status check.
Changing routing means editing the `case` in `classify`; changing the message
means editing `slack-payload`; changing retry policy means editing the
composite action. No other file needs to move.

#### Behavior with matrix jobs, re-runs, and cancellations

The triage flow is designed so the same failure never pages twice. Three edge
cases matter and each has an explicit guard:

- **Matrix jobs (same workflow, N shards).** If `verify` runs as a matrix
  (e.g. across OSes or artifact names), each shard produces its own `rc` and
  its own `classify` output. Without coalescing, a corruption failure on 3
  shards would page on-call 3 times. Two options, pick one:
  1. *Preferred — single coalescer job.* Make `slack-payload` depend on the
     entire matrix (`needs: [verify]` with `strategy` upstream), then inside
     it compute the **worst class** across `needs.verify.outputs.*` (severity
     order: `corruption` > `upload-broken` > `unclassified-diff` >
     `fileset-drift` > `usage` > `unknown` > `ok`). Leaf `notify-*` jobs gate
     on that single worst class. Result: one Slack post, one GitHub issue,
     listing every failing shard in the payload's `context` block.
  2. *Per-shard with dedupe key.* Keep one notification per shard but include
     `${{ matrix.shard }}` in the Block Kit `block_id` and in the GitHub
     issue title (`coverage drift: <shard> @ <sha>`). `gh issue create
     --search` first and append a comment instead of opening a duplicate.
  Never fan out matrix shards to leaf `notify-*` jobs without one of these —
  it is the most common source of pager spam in this pipeline.

- **Manual re-runs (`Re-run failed jobs` / `Re-run all jobs`).** GitHub
  re-uses the same `run_id` but bumps `run_attempt`. The triage flow is
  intentionally **not** idempotent on re-run: a re-run that still fails
  *should* re-page, because on-call needs to know the failure persists.
  However, to avoid noisy duplicates on flapping infrastructure:
  - Include `${{ github.run_attempt }}` in the Slack payload header
    (`Attempt #2`) so responders see at a glance this is a re-run, not a new
    incident.
  - For `notify-fileset-drift`, the GitHub issue lookup keys on commit SHA
    (not run ID), so re-runs append a comment to the existing issue instead
    of opening a second one. Closed issues are reopened with a comment.
  - `notify-soft` (email digest) suppresses sends when
    `github.run_attempt > 1` — the original digest already covered it.

- **Canceled workflows (`workflow_dispatch` cancel, branch deletion, newer
  push via concurrency).** A canceled job has no meaningful `rc` and must
  not notify. Every notification job (including `slack-payload`, every
  `notify-*`, and the GitHub-issue step) must gate on:
  ```yaml
  if: >-
    always()
    && needs.classify.result == 'success'
    && needs.classify.outputs.class != 'ok'
    && !cancelled()
  ```
  The `!cancelled()` guard is load-bearing — `always()` alone runs on
  cancellation too. Pair the workflow with a `concurrency` group keyed on
  ref so superseded pushes are auto-canceled before they can page:
  ```yaml
  concurrency:
    group: coverage-verify-${{ github.ref }}
    cancel-in-progress: true
  ```
  The `gate` job intentionally keeps `if: always()` **without** the
  `!cancelled()` guard so a canceled run still reports a non-green status
  check — but it explicitly treats `cancelled` as a soft failure (exit 0 if
  every needed job was canceled, exit 1 only if any classified as non-OK).

Rule of thumb: **notifications gate on `!cancelled()` and dedupe on
(class, commit SHA, shard); the `gate` job does neither**, so the status
check remains the single source of truth and Slack/email stay quiet.



#### Tunable parameters (retry, concurrency, cancellation)

All knobs that affect notification volume and dedupe live in three files. Tune
these first before adding new code paths.

**`./.github/actions/notify-slack` composite action inputs** — control retry
behavior of individual Slack webhook calls:

| Input | Default | Effect when increased | Effect when decreased |
| --- | --- | --- | --- |
| `max-attempts` | `5` | Survives longer Slack outages; more runner minutes burned per failure | Fails faster; more `::warning::` lines on flapping Slack |
| `initial-backoff-seconds` | `1` | Lighter load on Slack during incidents | Faster recovery on single-blip 5xx |
| `max-backoff-seconds` | `30` | Smooths out long outages (caps tail latency) | Tighter retry cadence; risk of `429` rate-limit |
| `request-timeout-seconds` | `10` | Tolerates slow Slack edges | Frees runners sooner on hung connections |
| `fail-on-error` | `false` | `true` → Slack outage fails the job and blocks `gate`; `false` → outage logs `::warning::` and exits 0 | — |

Set `fail-on-error: true` **only** for notifications where missing the page is
worse than a red build (e.g. `notify-corruption`). Keep `false` for
`notify-soft` and `notify-fileset-drift` so digest/issue side-effects survive
Slack downtime.

**Workflow-level concurrency** — controls whether superseded runs notify at
all:

```yaml
concurrency:
  group: coverage-verify-${{ github.ref }}   # one in-flight run per ref
  cancel-in-progress: true                   # newer push cancels older run
```

| Knob | Effect |
| --- | --- |
| `group` | Narrower key (e.g. `…-${{ github.ref }}-${{ matrix.shard }}`) → more parallelism, more notifications. Broader key (e.g. `coverage-verify`) → serializes across branches, fewer notifications |
| `cancel-in-progress: true` | Older run is canceled → `!cancelled()` guard suppresses its Slack post. Set to `false` to let every push notify independently (noisy on rapid pushes) |

**Per-job dedupe / re-run knobs:**

| Where | Knob | Default | Effect |
| --- | --- | --- | --- |
| Every `notify-*` job | `if: … && !cancelled()` | required | Remove → canceled runs page (don't do this) |
| `slack-payload` | worst-class coalescer across `needs.verify.*` | enabled | Disable → one Slack post per matrix shard |
| `notify-fileset-drift` | issue lookup key | commit SHA | Change to `run_id` → every re-run opens a new issue |
| `notify-fileset-drift` | issue `state` filter on lookup | `all` (reopen closed) | `open` → closed issues spawn duplicates |
| `notify-soft` | `if: github.run_attempt == 1` | enabled | Remove → every manual re-run re-sends the digest |
| Slack payload header | `Attempt #${{ github.run_attempt }}` | shown | Hide → responders can't tell re-runs from new incidents |
| `gate` job | `if: always()` (no `!cancelled()`) | required | Add `!cancelled()` → canceled runs stay green and bypass branch protection |

**Sensible profiles:**

- **Low-volume (small team, quiet pager).** `max-attempts: 3`,
  `cancel-in-progress: true`, worst-class coalescer on, all dedupe defaults.
- **High-fidelity (large team, want every shard surfaced).** `max-attempts: 5`,
  per-shard `block_id` + per-shard issue lookup, narrower concurrency `group`
  including `matrix.shard`.
- **Incident-mode (Slack flaky, don't lose pages).** Temporarily set
  `notify-corruption` to `fail-on-error: true` and add a backup `notify-email`
  step with `if: failure()` on the Slack job. Revert once Slack stabilizes.

Rule of thumb: tune **retry** to match Slack's current SLA, tune
**concurrency** to match how often you push to the same ref, and tune
**dedupe keys** to match how you want re-runs and matrix shards counted —
one incident or many.

### Example GitHub Actions job: route failures by exit code

Drop-in workflow snippet that runs the verifier against a published artifact
and fans the result out to **distinct notification channels** depending on
the exit-code class. Each branch is independently `if`-gated on the
classified `outputs.class`, so a corruption failure pings the on-call Slack
while an exclusion-drift failure only opens a low-priority GitHub issue.

```yaml
# .github/workflows/coverage-artifact-verify.yml
name: Verify coverage artifact

on:
  workflow_run:
    workflows: ["Canonical SEO check"]
    types: [completed]

jobs:
  verify:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    outputs:
      class: ${{ steps.classify.outputs.class }}
      rc:    ${{ steps.classify.outputs.rc }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: latest }

      - name: Run verifier (capture exit code, never fail the step)
        id: verify
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          set +e
          scripts/verify-coverage-artifact.sh \
            --run-id "${{ github.event.workflow_run.id }}" \
            --name redirect-canonical-coverage \
            2>&1 | tee verify.log
          echo "rc=${PIPESTATUS[0]}" >> "$GITHUB_OUTPUT"

      - name: Classify exit code
        id: classify
        run: |
          rc="${{ steps.verify.outputs.rc }}"
          case "$rc" in
            0)        cls=ok ;;
            2)        cls=usage ;;
            20)       cls=upload-broken ;;
            21|22|24) cls=fileset-drift ;;
            23|26)    cls=corruption ;;
            25)       cls=unclassified-diff ;;
            *)        cls=unknown ;;
          esac
          echo "class=$cls" >> "$GITHUB_OUTPUT"
          echo "rc=$rc"     >> "$GITHUB_OUTPUT"
          {
            echo "## Coverage artifact verification"
            echo ""
            echo "- Exit code: \`$rc\`"
            echo "- Class: \`$cls\`"
          } >> "$GITHUB_STEP_SUMMARY"

      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: verify-log, path: verify.log }

  # ─────────────────────────────────────────────────────────────
  # Reusable Slack payload builder.
  #
  # Every notify-* job below `needs: [verify, slack-payload]` and reads
  # `needs.slack-payload.outputs.payload` so all Slack messages share
  # the same Block Kit structure (severity emoji + class + rc + commit
  # + run link + triage hint), differing only in `channel`. To change
  # the message layout, edit this one job — never the leaf notify-* jobs.
  # ─────────────────────────────────────────────────────────────
  slack-payload:
    needs: verify
    if: needs.verify.outputs.class != 'ok'
    runs-on: ubuntu-latest
    outputs:
      payload:  ${{ steps.build.outputs.payload }}
      severity: ${{ steps.build.outputs.severity }}
      emoji:    ${{ steps.build.outputs.emoji }}
      hint:     ${{ steps.build.outputs.hint }}
    steps:
      - id: build
        env:
          CLASS:   ${{ needs.verify.outputs.class }}
          RC:      ${{ needs.verify.outputs.rc }}
          SHA:     ${{ github.event.workflow_run.head_sha }}
          RUN_URL: ${{ github.event.workflow_run.html_url }}
          REPO:    ${{ github.repository }}
        run: |
          # Class → (severity, emoji, triage hint). Single source of truth
          # for how a class is presented in chat, mirroring the README
          # exit-code contract.
          case "$CLASS" in
            corruption)         sev=P1; emoji=":rotating_light:"; hint="Re-run to rule out transient corruption; if it recurs on the same commit, hunt for non-determinism." ;;
            upload-broken)      sev=P2; emoji=":construction:";    hint="Upload step produced no manifest — investigate the upstream upload-artifact step." ;;
            fileset-drift)      sev=P3; emoji=":warning:";         hint="Sync list_files() in scripts/verify-coverage-artifact.sh with the find block in .github/workflows/canonical.yml." ;;
            unclassified-diff)  sev=P4; emoji=":memo:";            hint="Manifest diff present but unclassified — usually ordering/whitespace in the manifest generator." ;;
            usage|unknown|*)    sev=P4; emoji=":grey_question:";   hint="Verifier returned an unexpected/usage exit code — check the run log." ;;
          esac
          echo "severity=$sev"   >> "$GITHUB_OUTPUT"
          echo "emoji=$emoji"    >> "$GITHUB_OUTPUT"
          echo "hint=$hint"      >> "$GITHUB_OUTPUT"

          # Build the shared Block Kit payload. `channel` is intentionally
          # omitted here and injected per-job so the leaf jobs only differ
          # by routing target. Use jq so quoting in $hint / $SHA is safe.
          payload=$(jq -nc \
            --arg sev   "$sev" \
            --arg emoji "$emoji" \
            --arg class "$CLASS" \
            --arg rc    "$RC" \
            --arg sha   "$SHA" \
            --arg repo  "$REPO" \
            --arg url   "$RUN_URL" \
            --arg hint  "$hint" '
            {
              text: "\($emoji) [\($sev)] coverage-verify \($class) (rc=\($rc)) on \($repo)@\($sha[0:7])",
              blocks: [
                { type: "header", text: { type: "plain_text",
                    text: "\($emoji) \($sev) — coverage-verify: \($class)" } },
                { type: "section", fields: [
                    { type: "mrkdwn", text: "*Class:*\n`\($class)`" },
                    { type: "mrkdwn", text: "*Exit code:*\n`\($rc)`" },
                    { type: "mrkdwn", text: "*Repo:*\n`\($repo)`" },
                    { type: "mrkdwn", text: "*Commit:*\n`\($sha[0:7])`" }
                  ] },
                { type: "section", text: { type: "mrkdwn",
                    text: "*Triage:* \($hint)" } },
                { type: "actions", elements: [
                    { type: "button",
                      text: { type: "plain_text", text: "Open workflow run" },
                      url: $url }
                  ] }
              ]
            }')
          # Multi-line outputs require the heredoc form.
          {
            echo "payload<<__PAYLOAD_EOF__"
            echo "$payload"
            echo "__PAYLOAD_EOF__"
          } >> "$GITHUB_OUTPUT"

  # 🚨 P1 — corruption: page on-call.
  notify-corruption:
    needs: [verify, slack-payload]
    if: needs.verify.outputs.class == 'corruption'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/notify-slack
        with:
          channel: "#oncall-ci"
          payload: ${{ needs.slack-payload.outputs.payload }}
          webhook: ${{ secrets.SLACK_ONCALL_WEBHOOK }}

  # 🛠 P2 — upload step produced no manifest: ci-infra channel.
  notify-upload-broken:
    needs: [verify, slack-payload]
    if: needs.verify.outputs.class == 'upload-broken'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/notify-slack
        with:
          channel: "#ci-infra"
          payload: ${{ needs.slack-payload.outputs.payload }}
          webhook: ${{ secrets.SLACK_CI_INFRA_WEBHOOK }}

  # ⚠️ P3 — exclusion drift: tracking channel + GitHub issue (no paging).
  notify-fileset-drift:
    needs: [verify, slack-payload]
    if: needs.verify.outputs.class == 'fileset-drift'
    runs-on: ubuntu-latest
    permissions: { issues: write }
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/notify-slack
        with:
          channel: "#ci-noise"
          payload: ${{ needs.slack-payload.outputs.payload }}
          webhook: ${{ secrets.SLACK_CI_NOISE_WEBHOOK }}
      - uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo:  context.repo.repo,
              title: `Coverage artifact file-set drift (rc=${{ needs.verify.outputs.rc }})`,
              labels: ['ci', 'coverage-artifact', 'p3'],
              body:  `${{ needs.slack-payload.outputs.hint }}\n\nRun: ${{ github.event.workflow_run.html_url }}`
            });

  # 📝 P4 — unclassified diff / usage / unknown: ci-noise only.
  notify-soft:
    needs: [verify, slack-payload]
    if: contains(fromJSON('["unclassified-diff","usage","unknown"]'), needs.verify.outputs.class)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/notify-slack
        with:
          channel: "#ci-noise"
          payload: ${{ needs.slack-payload.outputs.payload }}
          webhook: ${{ secrets.SLACK_CI_NOISE_WEBHOOK }}

  # ❌ Final gate: fail the workflow on any non-OK class so branch
  # protection / required-check status reflects reality. Notifications
  # above have already fired in parallel.
  gate:
    needs: verify
    if: always() && needs.verify.outputs.class != 'ok'
    runs-on: ubuntu-latest
    steps:
      - run: |
          echo "Verifier failed: class=${{ needs.verify.outputs.class }} rc=${{ needs.verify.outputs.rc }}" >&2
          exit 1
```

### Reusable Slack notification composite action (with retry + timeouts)

Drop this at `.github/actions/notify-slack/action.yml`. Every leaf
`notify-*` job above calls it, so retry/timeout policy lives in one place
and a transient Slack outage never blocks the rest of CI triage (the
GitHub issue, the gate job, the workflow summary). The defaults are tuned
to ride out a typical Slack incident window (~1 minute of 5xx /
rate-limiting) while still failing fast enough to keep the workflow under
its `timeout-minutes`.

```yaml
# .github/actions/notify-slack/action.yml
name: Notify Slack (with retry + timeout)
description: >
  POSTs a Block Kit payload to a Slack incoming webhook with a hard
  per-request timeout, exponential backoff with jitter, and Slack-aware
  retry rules (honor Retry-After on 429; retry 5xx and network errors;
  never retry on 4xx other than 429). Designed for CI triage notifications
  where dropping a message is acceptable but blocking the workflow on a
  Slack outage is not.

inputs:
  channel:
    description: "Target Slack channel (e.g. #oncall-ci). Spliced into the shared payload."
    required: true
  payload:
    description: "Shared Block Kit JSON from the slack-payload job (no `channel` field)."
    required: true
  webhook:
    description: "Slack incoming webhook URL (pass via `secrets.*`)."
    required: true
  max-attempts:
    description: "Total attempts including the first try."
    required: false
    default: "5"
  initial-backoff-seconds:
    description: "Backoff for the 1st retry. Doubles each retry (1, 2, 4, 8, 16...) with ±25% jitter."
    required: false
    default: "1"
  max-backoff-seconds:
    description: "Cap on the per-retry sleep so we don't sit idle for minutes."
    required: false
    default: "30"
  request-timeout-seconds:
    description: "Per-attempt curl timeout (connect + total). Slack normally responds in <1s."
    required: false
    default: "10"
  fail-on-error:
    description: "If 'true', the action fails the step when all retries are exhausted. Default 'false' so a Slack outage never blocks CI."
    required: false
    default: "false"

runs:
  using: composite
  steps:
    - name: POST to Slack with retry + timeout
      shell: bash
      env:
        CHANNEL:          ${{ inputs.channel }}
        PAYLOAD:          ${{ inputs.payload }}
        WEBHOOK:          ${{ inputs.webhook }}
        MAX_ATTEMPTS:     ${{ inputs.max-attempts }}
        INITIAL_BACKOFF:  ${{ inputs.initial-backoff-seconds }}
        MAX_BACKOFF:      ${{ inputs.max-backoff-seconds }}
        REQ_TIMEOUT:      ${{ inputs.request-timeout-seconds }}
        FAIL_ON_ERROR:    ${{ inputs.fail-on-error }}
      run: |
        set -uo pipefail

        if [ -z "$WEBHOOK" ]; then
          echo "::warning::notify-slack: webhook input is empty — skipping."
          exit 0
        fi

        # Splice the channel into the shared payload. jq guarantees valid JSON
        # even when $CHANNEL contains characters Slack treats literally.
        body=$(jq -c --arg ch "$CHANNEL" '. + {channel: $ch}' <<<"$PAYLOAD") || {
          echo "::error::notify-slack: payload is not valid JSON"
          [ "$FAIL_ON_ERROR" = "true" ] && exit 1 || exit 0
        }

        attempt=0
        backoff="$INITIAL_BACKOFF"
        while : ; do
          attempt=$((attempt + 1))
          # --max-time bounds the entire request (connect + transfer). --retry 0
          # disables curl's own retry so our loop is the single source of truth.
          # -w writes the HTTP status on its own line after the body.
          out=$(curl --silent --show-error \
                     --connect-timeout 5 \
                     --max-time "$REQ_TIMEOUT" \
                     --retry 0 \
                     -X POST -H 'Content-Type: application/json' \
                     -D /tmp/slack.hdr \
                     -w '\n%{http_code}' \
                     --data "$body" \
                     "$WEBHOOK" 2>&1) || true
          status="${out##*$'\n'}"
          response="${out%$'\n'*}"

          # Success: Slack returns 200 with body "ok".
          if [ "$status" = "200" ]; then
            echo "notify-slack: delivered to $CHANNEL on attempt $attempt"
            exit 0
          fi

          # Classify the failure to decide whether to retry.
          # - 429: rate-limited; honor Retry-After if present.
          # - 5xx / 000 (curl timeout / network error): retry.
          # - other 4xx (400 invalid_payload, 403 channel_not_found, 404 no_service):
          #   permanent — retrying will never help.
          case "$status" in
            429)
                ra=$(awk 'BEGIN{IGNORECASE=1} /^retry-after:/ {print $2}' /tmp/slack.hdr | tr -d '\r')
                if [ -n "$ra" ] && [ "$ra" -gt 0 ] 2>/dev/null; then
                  sleep_for="$ra"
                else
                  sleep_for="$backoff"
                fi
                retry=1 ;;
            5*|000)
                sleep_for="$backoff"; retry=1 ;;
            *)
                echo "::error::notify-slack: permanent failure (HTTP $status): $response"
                [ "$FAIL_ON_ERROR" = "true" ] && exit 1 || exit 0 ;;
          esac

          if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
            echo "::warning::notify-slack: gave up after $attempt attempts (last HTTP $status). Body: $response"
            [ "$FAIL_ON_ERROR" = "true" ] && exit 1 || exit 0
          fi

          # ±25% jitter to avoid thundering-herd retries when several jobs
          # backoff in lockstep against the same Slack outage.
          jitter=$(awk -v s="$sleep_for" 'BEGIN{srand(); printf "%.2f", s * (0.75 + rand() * 0.5)}')
          echo "notify-slack: HTTP $status on attempt $attempt — sleeping ${jitter}s then retrying"
          sleep "$jitter"

          # Exponential growth, capped.
          backoff=$(( backoff * 2 ))
          if [ "$backoff" -gt "$MAX_BACKOFF" ]; then backoff="$MAX_BACKOFF"; fi
        done
```

Retry/timeout behavior at a glance:

- **Per-request timeout** — `--connect-timeout 5` + `--max-time 10` so a
  hung Slack edge never holds a runner; the default 5-attempt budget caps
  the whole step at well under a minute even worst-case.
- **Exponential backoff with jitter** — sleeps `1s, 2s, 4s, 8s, 16s` (capped
  at `max-backoff-seconds`, ±25% jitter) between attempts; tunable per call.
- **Slack-aware retry rules** — retries on `5xx`, network errors (curl
  `000`), and `429` (honoring `Retry-After`); never retries on `4xx`
  permanent errors like `invalid_payload` / `channel_not_found`, which
  surface immediately so misconfiguration is loud.
- **Non-blocking by default** — `fail-on-error: false` (default) means
  exhausting retries logs a `::warning::` and exits 0, so a Slack outage
  never breaks the `gate` job or the GitHub-issue side effect. Flip to
  `true` for the on-call P1 channel if you want delivery to be a hard
  requirement.


Key properties of this routing layout:

- **One source of truth for exit codes** — the `case` in `classify` is the
  only place where exit-code → class mapping lives. Adding a new code
  (e.g. `27`) means editing one `case` arm and one `if:` guard.
- **One source of truth for Slack messages** — the `slack-payload` job
  builds the Block Kit payload (header, severity, class, rc, commit, run
  link, triage hint) once. Leaf notify-* jobs only choose a channel and a
  webhook secret, so every Slack message looks identical across classes.
- **Parallel fan-out** — each notification job is independent; a Slack
  outage doesn't block the GitHub issue or the gate.
- **Status check stays honest** — the `gate` job re-fails the workflow so
  branch protection still blocks merges, even though the verifier step
  swallowed its own exit code to allow classification.
- **No double-paging** — classes are mutually exclusive, so exactly one
  Slack channel receives each failure (drift additionally opens an issue).


