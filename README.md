# RuneForge

A browser-based idle/skilling RPG with a Cinzel-fonted dungeon flavour.

## Running locally

```bash
npm install
npm start
```

Defaults to port `3000`. Override with `PORT`.

## Environment variables

| Var | Required | Notes |
|---|---|---|
| `PORT` | no | Listen port (default `3000`) |
| `SESSION_SECRET` | no | Cookie signing secret. If unset, a random one is generated per restart (sessions won't survive restarts). Set this in production. |
| `ADMIN_RESET_SECRET` | no | Enables `POST /api/admin-reset`. **The endpoint is disabled and returns 503 if this is unset.** Set it to a long random string and never commit it. |
| `RAILWAY_VOLUME_MOUNT_PATH` | no | Path to the SQLite store on Railway. Falls back to `/tmp` on Railway, otherwise the repo root. |

## Admin reset

When `ADMIN_RESET_SECRET` is set, you can wipe a single user's save:

```bash
curl -X POST https://YOUR-DOMAIN/api/admin-reset \
  -H "Content-Type: application/json" \
  -d '{"username":"someone","secret":"YOUR_SECRET"}'
```

This deletes the row from `saves` for that user. The account itself stays.
