#!/usr/bin/env bash
#
# Smoke-test the main use cases with raw HTTP requests against a running app
# (no browser). Needs Hasura running and the app started with real login:
#
#   DEV_AUTOLOGIN=false npm run dev
#   npm run smoke                       # or: tools/smoke.sh http://localhost:5173
#
# Each step submits the same form fields a browser would, including the
# machine event `type`, and checks the status code and redirect target.

set -euo pipefail

base="${1:-http://localhost:5173}"
jar_dir="$(mktemp -d)"
trap 'rm -rf "$jar_dir"' EXIT

email="smoke-$(date +%s)-$RANDOM@example.com"
password="smoke-test-password"
failures=0

# post <jar> <path> <field=value>... ; prints "<status> <location>"
post() {
  local jar="$1" path="$2"
  shift 2
  local args=()
  for field in "$@"; do args+=(--data-urlencode "$field"); done
  # ${args[@]+...} keeps bash 3.2 (macOS) happy when there are no fields.
  curl -s -o /dev/null -b "$jar" -c "$jar" -X POST "$base$path" ${args[@]+"${args[@]}"} \
    -w '%{http_code} %{redirect_url}'
}

# get <jar> <path> ; prints "<status> <location>"
get() {
  curl -s -o /dev/null -b "$1" -c "$1" "$base$2" -w '%{http_code} %{redirect_url}'
}

# expect <description> <actual "status location"> <status> [location suffix]
expect() {
  local what="$1" actual="$2" status="$3" location="${4:-}"
  local got_status="${actual%% *}" got_location="${actual#* }"
  if [[ "$got_status" == "$status" && ( -z "$location" || "$got_location" == *"$location" ) ]]; then
    printf '  ok    %s\n' "$what"
  else
    printf '  FAIL  %s: expected %s %s, got %s\n' "$what" "$status" "$location" "$actual"
    failures=$((failures + 1))
  fi
}

user="$jar_dir/user"
echo "Sign-up"
expect "invalid input → 400" \
  "$(post "$user" /signup type=credentials.submit email=nope password=short)" 400
expect "new account → 302 /dash" \
  "$(post "$user" /signup type=credentials.submit "email=$email" "password=$password")" 302 /dash
expect "same email again → 409" \
  "$(post "$jar_dir/other" /signup type=credentials.submit "email=$email" "password=$password")" 409

echo "Jobs"
expect "dashboard → 200" "$(get "$user" /dash)" 200
expect "invalid job → 400" \
  "$(post "$user" /dash/jobs/new type=job.submit title=)" 400
# The .data endpoint returns the action result, so we can read the new id.
job_id="$(curl -s -b "$user" -c "$user" -X POST "$base/dash/jobs/new.data" \
  --data-urlencode type=job.submit --data-urlencode "title=Smoke test job" \
  --data-urlencode "employerName=Smoke Co" | grep -oE '"id",[0-9]+' | cut -d, -f2 || true)"
if [[ -n "$job_id" ]]; then
  printf '  ok    create job → id %s\n' "$job_id"
  expect "delete job → 200" "$(post "$user" "/dash/jobs/$job_id/delete")" 200
  expect "delete again → 404" "$(post "$user" "/dash/jobs/$job_id/delete")" 404
else
  printf '  FAIL  create job: no id in response\n'
  failures=$((failures + 1))
fi
expect "malformed job id → 400" "$(post "$user" /dash/jobs/abc/delete)" 400

echo "Log out / log in"
expect "log out → 302 /" "$(post "$user" /logout)" 302 /
expect "dashboard signed out → 302 /login" "$(get "$user" /dash)" 302 /login
login="$jar_dir/login"
expect "wrong password → 401" \
  "$(post "$login" /login type=credentials.submit "email=$email" password=wrong)" 401
expect "right password → 302 /dash" \
  "$(post "$login" /login type=credentials.submit "email=$email" "password=$password")" 302 /dash

echo "Lockout"
locked="$jar_dir/locked"
for i in 1 2 3 4; do
  expect "wrong password #$i → 401" \
    "$(post "$locked" /login type=credentials.submit "email=$email" password=wrong)" 401
done
expect "wrong password #5 → 429" \
  "$(post "$locked" /login type=credentials.submit "email=$email" password=wrong)" 429
expect "right password while locked → 429" \
  "$(post "$locked" /login type=credentials.submit "email=$email" "password=$password")" 429

echo
if ((failures)); then
  echo "$failures check(s) failed"
  exit 1
fi
echo "All checks passed"
