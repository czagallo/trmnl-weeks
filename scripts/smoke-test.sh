#!/usr/bin/env sh
# Starts the server on a spare port without any credentials and fails unless /health answers within 15 s.
set -u
PORT=${SMOKE_PORT:-3999}
PORT=$PORT node server.js > smoke-test.log 2>&1 &
pid=$!
trap 'kill $pid 2>/dev/null' EXIT
i=0
while [ $i -lt 30 ]; do
  if curl -fsS --max-time 2 "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    echo "smoke test ok: /health answered on port $PORT"
    exit 0
  fi
  i=$((i + 1)); sleep 0.5
done
echo "smoke test FAILED: /health did not answer"; cat smoke-test.log; exit 1
