#!/usr/bin/env bash
# Server-side deploy. Triggered by the GitHub Actions pipeline through an SSH key that is locked to this script
# (authorized_keys forced command), or run by hand on the server:  ./deployment/deploy.sh
# Pulls main, installs production deps, restarts the systemd service and fails unless /health answers.
#
# Everything runs inside main() and the script exits right after it: bash reads scripts lazily, and the git reset
# below rewrites this very file, so without that the old process could execute half-old, half-new lines.
set -euo pipefail

SERVICE=trmnl-weeks

main() {
  cd "$(dirname "$0")/.."

  exec 9>"/tmp/${SERVICE}-deploy.lock"
  flock -n 9 || { echo "another deploy is running"; exit 1; }

  local before port
  before=$(git rev-parse --short HEAD)
  git fetch -q origin main
  git reset -q --hard origin/main
  echo "code: $before -> $(git log --oneline -1)"

  npm ci --omit=dev --no-audit --no-fund --loglevel=error

  sudo -n systemctl restart "$SERVICE"

  port=$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 || true)
  port=${port:-3000}
  for _ in $(seq 1 20); do
    if curl -fsS --max-time 3 "http://127.0.0.1:${port}/health" >/dev/null 2>&1; then
      echo "healthy on port ${port}"
      return 0
    fi
    sleep 1
  done
  echo "NOT healthy after 20 s"
  sudo -n systemctl status "$SERVICE" --no-pager -n 30 || true
  return 1
}

main "$@"
exit $?
