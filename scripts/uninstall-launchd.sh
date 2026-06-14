#!/usr/bin/env bash
set -euo pipefail

uid="$(id -u)"
launch_agents_dir="$HOME/Library/LaunchAgents"

for label in com.ws-chat.server com.ws-chat.client; do
  launchctl bootout "gui/$uid/$label" >/dev/null 2>&1 || true
done

rm -f "$launch_agents_dir/com.ws-chat.server.plist"
rm -f "$launch_agents_dir/com.ws-chat.client.plist"

echo "Removed ws-chat launch agents."
