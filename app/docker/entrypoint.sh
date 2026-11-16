#!/usr/bin/env bash
# Container entrypoint.
#   serve      nginx + node server (default)
#   ops ...    run the operator CLI (one-off ECS tasks from the runbooks)
#
# On SIGTERM the node server gets time to hand the writer role over (final
# Litestream sync, release in S3) before nginx stops. If either process
# dies, the container exits so ECS replaces it.
set -euo pipefail

mkdir -p /tmp/nginx

case "${1:-serve}" in
  ops)
    shift
    exec node --enable-source-maps /app/build/ops.js "$@"
    ;;
  serve)
    ;;
  *)
    exec "$@"
    ;;
esac

nginx -e stderr -g 'daemon off;' &
nginx_pid=$!
node --enable-source-maps /app/build/server.js &
node_pid=$!

term() {
  local code="${1:-0}"
  # Node first: it finishes the writer handoff, then exits.
  kill -TERM "$node_pid" 2>/dev/null || true
  wait "$node_pid" 2>/dev/null || true
  # Graceful nginx stop (finish in-flight requests).
  kill -QUIT "$nginx_pid" 2>/dev/null || true
  wait "$nginx_pid" 2>/dev/null || true
  exit "$code"
}
trap 'term 0' TERM INT

# Exit as soon as either process stops.
set +e
wait -n "$nginx_pid" "$node_pid"
status=$?
echo "{\"level\":\"error\",\"message\":\"a container process exited (status $status); stopping\"}" >&2
term 1
