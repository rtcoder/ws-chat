#!/usr/bin/env bash
set -euo pipefail

uid="$(id -u)"

for label in com.ws-chat.server com.ws-chat.client; do
  echo "== $label =="
  if launchctl print "gui/$uid/$label" >/dev/null 2>&1; then
    launchctl print "gui/$uid/$label" | sed -n '1,35p'
  else
    echo "Not loaded"
  fi
done
