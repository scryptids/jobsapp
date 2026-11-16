#!/usr/bin/env bash
#
# End-to-end test of the writer protocol against the local compose stack
# (two app containers + MinIO). Run from the repo root:
#
#   docker compose down -v && docker compose up --build -d
#   ./app/tools/handoff-test.sh
#
# Checks: first writer, standby refuses writes, planned handoff keeps data,
# writes during handoff get 503, crash takeover after lease expiry, and
# point-in-time restore.

# shellcheck disable=SC2015 # `ok` never fails, so A && ok || fail is safe here
set -euo pipefail

A=http://localhost:8081
B=http://localhost:8082
jar="$(mktemp)"
trap 'rm -f "$jar"' EXIT
failures=0

ok()   { printf '  ok    %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; failures=$((failures + 1)); }
check() { if [ "$2" = "$3" ]; then ok "$1 → $2"; else fail "$1: expected $3, got $2"; fi; }

role() { curl -s "$1/readyz" | sed -n 's/.*"role":"\([a-z]*\)".*/\1/p'; }
wait_role() {
  local url="$1" want="$2" tries="${3:-60}"
  for _ in $(seq 1 "$tries"); do
    [ "$(role "$url")" = "$want" ] && return 0
    sleep 2
  done
  return 1
}
post() {
  local base="$1" path="$2"; shift 2
  local args=()
  for f in "$@"; do args+=(--data-urlencode "$f"); done
  curl -s -o /dev/null -b "$jar" -c "$jar" -X POST "$base$path" ${args[@]+"${args[@]}"} -w '%{http_code}'
}
jobs_page() { curl -s -b "$jar" "$1/dash/jobs"; }
ops() { docker compose run --rm -T ops "$@" | tail -1; }

echo "First writer"
wait_role "$A" writer 60 && ok "app-a became writer" || fail "app-a never became writer"

email="handoff-$(date +%s)@example.com"
check "sign up on a" "$(post "$A" /signup type=credentials.submit "email=$email" password=handoff-password)" 302
check "create job one" "$(post "$A" /dash/jobs/new type=job.submit title=JobOne employerName=Acme)" 200

echo "Standby"
docker compose --profile b up -d app-b >/dev/null 2>&1
wait_role "$B" standby 60 && ok "app-b is standby" || fail "app-b not standby"
check "write on standby" "$(post "$B" /dash/jobs/new type=job.submit title=Nope)" 503

echo "Planned handoff"
sleep 3 # let litestream ship job one
ops handoff --reason test >/dev/null &
handoff_pid=$!
sleep 1
during="$(post "$A" /dash/jobs/new type=job.submit title=DuringHandoff)"
wait "$handoff_pid"
if [ "$during" = 503 ] || [ "$during" = 200 ]; then ok "write during handoff → $during"; else fail "write during handoff: $during"; fi
wait_role "$B" writer 30 && ok "app-b became writer" || fail "app-b not writer"
[ "$(role "$A")" = standby ] && ok "app-a is standby" || fail "app-a not standby"
jobs_page "$B" | grep -q JobOne && ok "job one survived handoff" || fail "job one missing on app-b"
check "write on a after handoff" "$(post "$A" /dash/jobs/new type=job.submit title=Nope)" 503
check "create job two on b" "$(post "$B" /dash/jobs/new type=job.submit title=JobTwo)" 200
before_three="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
sleep 3
check "create job three on b" "$(post "$B" /dash/jobs/new type=job.submit title=JobThree)" 200
sleep 3

echo "Crash takeover (waits for the 45s lease)"
docker compose kill -s KILL app-b >/dev/null 2>&1
wait_role "$A" writer 60 && ok "app-a took over" || fail "app-a did not take over"
page="$(jobs_page "$A")"
echo "$page" | grep -q JobThree && ok "job three survived crash (RPO ≈ 1s)" || fail "job three lost in crash"

echo "Point-in-time restore to before job three"
result="$(ops restore --timestamp "$before_three" --mode apply)"
echo "$result" | grep -q '"ok":true' && ok "restore ran" || fail "restore failed: $result"
wait_role "$A" writer 60 && ok "app-a writer again" || fail "app-a not writer after restore"
page="$(jobs_page "$A")"
echo "$page" | grep -q JobTwo && ok "job two present" || fail "job two missing after restore"
echo "$page" | grep -q JobThree && fail "job three still present after restore" || ok "job three rolled back"

echo
if [ "$failures" -eq 0 ]; then echo "All checks passed"; else echo "$failures check(s) failed"; exit 1; fi
