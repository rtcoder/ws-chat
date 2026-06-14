#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
template_dir="$repo_dir/ops/launchd"
launch_agents_dir="$HOME/Library/LaunchAgents"
log_dir="$HOME/Library/Logs/ws-chat"
npm_bin="$(command -v npm)"
uid="$(id -u)"
should_start="${1:-}"

mkdir -p "$launch_agents_dir" "$log_dir"

REPO_DIR="$repo_dir" \
NPM_BIN="$npm_bin" \
LOG_DIR="$log_dir" \
TEMPLATE_DIR="$template_dir" \
OUT_DIR="$launch_agents_dir" \
node <<'NODE'
const fs = require('fs');
const path = require('path');

const replacements = {
  __REPO_DIR__: process.env.REPO_DIR,
  __NPM_BIN__: process.env.NPM_BIN,
  __LOG_DIR__: process.env.LOG_DIR,
};

for (const name of ['com.ws-chat.server.plist', 'com.ws-chat.client.plist']) {
  const template = fs.readFileSync(path.join(process.env.TEMPLATE_DIR, `${name}.template`), 'utf8');
  const rendered = Object.entries(replacements).reduce(
    (content, [token, value]) => content.replaceAll(token, value),
    template
  );
  fs.writeFileSync(path.join(process.env.OUT_DIR, name), rendered);
}
NODE

echo "Installed launch agents:"
echo "  $launch_agents_dir/com.ws-chat.server.plist"
echo "  $launch_agents_dir/com.ws-chat.client.plist"

port_busy() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

if [[ "$should_start" != "--start" ]]; then
  echo "Not starting services now. Run: npm run service:install -- --start"
  exit 0
fi

busy_ports=()
for port in 4001 5173 8001; do
  if port_busy "$port"; then
    busy_ports+=("$port")
  fi
done

if (( ${#busy_ports[@]} )); then
  echo "Cannot start services because these ports are already in use: ${busy_ports[*]}"
  echo "Stop current dev processes first, then run: npm run service:install -- --start"
  exit 0
fi

(cd "$repo_dir/client" && "$npm_bin" run build)
launchctl bootout "gui/$uid" "$launch_agents_dir/com.ws-chat.server.plist" >/dev/null 2>&1 || true
launchctl bootout "gui/$uid" "$launch_agents_dir/com.ws-chat.client.plist" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$uid" "$launch_agents_dir/com.ws-chat.server.plist"
launchctl bootstrap "gui/$uid" "$launch_agents_dir/com.ws-chat.client.plist"
echo "Services started."
