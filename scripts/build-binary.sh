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
use_defaults="false"

for arg in "$@"; do
  case "$arg" in
    --defaults | --non-interactive)
      use_defaults="true"
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: npm run binary:build -- [--defaults]"
      exit 1
      ;;
  esac
done

random_token() {
  "$node_bin" -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
}

prompt_value() {
  local label="$1"
  local default_value="$2"
  local value

  if [[ "$use_defaults" == "true" || ! -t 0 ]]; then
    printf '%s' "$default_value"
    return
  fi

  read -r -p "$label [$default_value]: " value
  printf '%s' "${value:-$default_value}"
}

prompt_secret() {
  local label="$1"
  local default_value="$2"
  local value

  if [[ "$use_defaults" == "true" || ! -t 0 ]]; then
    printf '%s' "$default_value"
    return
  fi

  read -r -s -p "$label [leave empty to generate/use default]: " value
  printf '\n' >&2
  printf '%s' "${value:-$default_value}"
}

validate_port() {
  local label="$1"
  local value="$2"

  if ! [[ "$value" =~ ^[0-9]+$ ]] || (( value < 1 || value > 65535 )); then
    echo "$label must be a port number between 1 and 65535"
    exit 1
  fi
}

escape_env_value() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//\$/\\\$}"
  value="${value//\`/\\\`}"
  printf '%s' "$value"
}

write_env_line() {
  local key="$1"
  local value="$2"
  printf '%s="%s"\n' "$key" "$(escape_env_value "$value")"
}

if [[ ! -x "$esbuild_bin" ]]; then
  echo "Missing esbuild. Run: cd client && npm install"
  exit 1
fi

echo "WS Chat binary installer"
echo

api_port="$(prompt_value "API port" "${API_PORT:-4001}")"
ws_port="$(prompt_value "WebSocket port" "${WS_PORT:-8001}")"
pg_host="$(prompt_value "PostgreSQL host" "${PGHOST:-localhost}")"
pg_port="$(prompt_value "PostgreSQL port" "${PGPORT:-5432}")"
pg_database="$(prompt_value "PostgreSQL database" "${PGDATABASE:-ws_chat}")"
pg_user="$(prompt_value "PostgreSQL user" "${PGUSER:-postgres}")"
pg_password="$(prompt_secret "PostgreSQL password" "${PGPASSWORD:-postgres}")"
token_key="$(prompt_secret "JWT token key" "${TOKEN_KEY:-$(random_token)}")"

validate_port "API port" "$api_port"
validate_port "WebSocket port" "$ws_port"
validate_port "PostgreSQL port" "$pg_port"

rm -rf "$build_dir" "$release_dir"
mkdir -p "$build_dir" "$release_dir/uploads"

{
  write_env_line API_PORT "$api_port"
  write_env_line WS_PORT "$ws_port"
  printf '\n'
  write_env_line PGHOST "$pg_host"
  write_env_line PGPORT "$pg_port"
  write_env_line PGDATABASE "$pg_database"
  write_env_line PGUSER "$pg_user"
  write_env_line PGPASSWORD "$pg_password"
  write_env_line TOKEN_KEY "$token_key"
} > "$release_dir/.env"

{
  write_env_line API_PORT "$api_port"
  write_env_line WS_PORT "$ws_port"
  printf '\n'
  write_env_line PGHOST "$pg_host"
  write_env_line PGPORT "$pg_port"
  write_env_line PGDATABASE "$pg_database"
  write_env_line PGUSER "$pg_user"
  write_env_line PGPASSWORD "change-me"
  write_env_line TOKEN_KEY "change-me"
} > "$release_dir/.env.example"

(cd "$repo_dir/client" && VITE_API_PORT="$api_port" VITE_WS_PORT="$ws_port" npm run build)
cp -R "$repo_dir/client/dist" "$release_dir/public"

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
  ./ws-chat
MSG
