# WS Chat

Realtime chat built with a vanilla TypeScript/Vite frontend, an Express backend, PostgreSQL, Drizzle ORM and WebSockets.

## Stack

- Frontend: vanilla TypeScript + Vite
- Backend: Express.js
- Realtime: WebSocket server on a separate port
- Database: PostgreSQL
- ORM/query layer: Drizzle ORM
- Runtime packaging: Node SEA binary build
- Local service support: macOS `launchd`

## Ports

Default local ports:

- Client dev server: `5173`
- API server: `4001`
- WebSocket server: `8001`
- PostgreSQL: `5432`

## Install

Install dependencies for both apps:

```bash
npm install
```

The root `install` script installs backend and frontend dependencies.

## Environment

Backend env lives in `server/.env`.

Create it from the example:

```bash
cp server/.env.example server/.env
```

Backend variables:

```bash
PGHOST=localhost
PGPORT=5432
PGDATABASE=ws_chat
PGUSER=postgres
PGPASSWORD=postgres
TOKEN_KEY=change-me
API_PORT=4001
WS_PORT=8001
```

Frontend env lives in `client/.env.local`.

Create it from the example:

```bash
cp client/.env.example client/.env.local
```

Frontend variables:

```bash
VITE_API_PORT=4001
VITE_WS_PORT=8001
```

Keep `API_PORT` and `VITE_API_PORT` in sync. Keep `WS_PORT` and `VITE_WS_PORT` in sync.

## Database

Create a PostgreSQL database matching `server/.env`, then run migrations:

```bash
cd server
npm run migrate
```

Migrations are stored in:

```bash
server/db/migrations
```

## Development

Run backend:

```bash
cd server
npm start
```

Run frontend:

```bash
cd client
npm run dev
```

Open:

```bash
http://localhost:5173
```

## Production Build

Build the frontend:

```bash
cd client
npm run build
```

Preview the built frontend:

```bash
cd client
npm run preview
```

## macOS Service

The project can install macOS LaunchAgents for local service mode.

Install service plist files:

```bash
npm run service:install
```

Start services during install:

```bash
npm run service:install -- --start
```

Check service status:

```bash
npm run service:status
```

Remove services:

```bash
npm run service:uninstall
```

Logs are written to:

```bash
~/Library/Logs/ws-chat
```

Service files are installed to:

```bash
~/Library/LaunchAgents/com.ws-chat.server.plist
~/Library/LaunchAgents/com.ws-chat.client.plist
```

## Binary Release

Build a portable binary release:

```bash
npm run binary:build
```

The installer asks for:

- API port
- WebSocket port
- PostgreSQL host
- PostgreSQL port
- PostgreSQL database
- PostgreSQL user
- PostgreSQL password
- JWT token key

The script then:

- generates `release/ws-chat/.env`
- generates `release/ws-chat/.env.example`
- builds the frontend with selected `VITE_API_PORT` and `VITE_WS_PORT`
- bundles the backend
- creates the Node SEA executable at `release/ws-chat/ws-chat`

Non-interactive build using env values or defaults:

```bash
npm run binary:build -- --defaults
```

Example non-interactive build:

```bash
API_PORT=4001 \
WS_PORT=8001 \
PGHOST=localhost \
PGPORT=5432 \
PGDATABASE=ws_chat \
PGUSER=postgres \
PGPASSWORD=postgres \
TOKEN_KEY=change-me \
npm run binary:build -- --defaults
```

Run the binary release:

```bash
cd release/ws-chat
./ws-chat
```

In binary release mode, the backend serves the built frontend from `release/ws-chat/public`, so the app is available from the API port:

```bash
http://localhost:4001
```

Uploads are stored next to the binary in:

```bash
release/ws-chat/uploads
```

## Useful Commands

```bash
npm install
npm run service:install
npm run service:install -- --start
npm run service:status
npm run service:uninstall
npm run binary:build
npm run binary:build -- --defaults
```

```bash
cd server && npm run migrate
cd server && npm start
cd client && npm run dev
cd client && npm run build
cd client && npm run preview
```
