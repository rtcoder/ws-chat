#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
release_dir="$repo_dir/release/ws-chat"
build_dir="$repo_dir/.build/binary"
bundle_file="$build_dir/ws-chat.cjs"
blob_file="$build_dir/ws-chat.blob"
binary_file="$release_dir/ws-chat"
esbuild_bin="$repo_dir/client/node_modules/.bin/esbuild"
node_bin="$(command -v node)"

if [[ ! -x "$esbuild_bin" ]]; then
  echo "Missing esbuild. Run: cd client && npm install"
  exit 1
fi

rm -rf "$build_dir" "$release_dir"
mkdir -p "$build_dir" "$release_dir/uploads"

(cd "$repo_dir/client" && npm run build)
cp -R "$repo_dir/client/dist" "$release_dir/public"
cp "$repo_dir/server/.env.example" "$release_dir/.env.example"

"$esbuild_bin" "$repo_dir/server/server.js" \
  --bundle \
  --platform=node \
  --format=cjs \
  --target=node22 \
  --outfile="$bundle_file"

cat > "$build_dir/sea-config.json" <<JSON
{
  "main": "$bundle_file",
  "output": "$blob_file",
  "disableExperimentalSEAWarning": true
}
JSON

"$node_bin" --experimental-sea-config "$build_dir/sea-config.json"
cp "$node_bin" "$binary_file"
chmod +x "$binary_file"

if ! command -v postject >/dev/null 2>&1; then
  cat <<MSG
Prepared release files in: $release_dir
Created SEA blob: $blob_file

Missing "postject", so the Node SEA blob was not injected into the executable yet.
Install it once, then rerun this script:
  npm install -g postject

After a successful build run:
  cd "$release_dir"
  cp .env.example .env
  ./ws-chat
MSG
  exit 0
fi

if command -v codesign >/dev/null 2>&1; then
  codesign --remove-signature "$binary_file" >/dev/null 2>&1 || true
fi

postject_args=(
  "$binary_file"
  NODE_SEA_BLOB
  "$blob_file"
  --sentinel-fuse
  NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
)

if [[ "$(uname -s)" == "Darwin" ]]; then
  postject_args+=(--macho-segment-name NODE_SEA)
fi

postject "${postject_args[@]}"

if command -v codesign >/dev/null 2>&1; then
  codesign --sign - "$binary_file" >/dev/null 2>&1 || true
fi

cat <<MSG
Built binary release in: $release_dir

Run it with:
  cd "$release_dir"
  cp .env.example .env
  ./ws-chat
MSG
