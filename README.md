# RuneForge

A browser-based hero RPG. Pick a champion, hunt monsters, forge a weapon, dive a dungeon.

## How it plays

1. **Pick a hero** — Pebble (heavy hitter), Button (hybrid), or Luna (mage).
2. **Hunt monsters** from the hub. Each kill gives XP, gold, an essence drop, and a stat bump tied to that monster (slimes train Defence, wolves train Strength, wisps train Intellect, imps train Mana, etc.). Tougher monster tiers unlock as you level up.
3. **Forge your weapon.** You start with a single weapon. Infuse essences to shape it — pure-Fire wand if you only spend Fire essence, hybrid Fire/Water if you mix. The breakdown updates live and the weapon's name reflects its dominant element.
4. **Dive the dungeon** when ready. Auto-battle through escalating phases until you fall, then return to the hub with everything you gathered.

Stats:
- **Strength** — physical weapon damage
- **Intellect** — magical weapon damage
- **Defence** — damage reduction & max HP
- **Mana** — currently lifted by mage-type kills (room to grow into spells)

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
