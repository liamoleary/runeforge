# RuneForge

A browser-based hero RPG. Pick a champion, hunt monsters, forge a weapon, dive a dungeon.

## How it plays

1. **Pick a hero** — Pebble (heavy hitter), Button (hybrid), or Luna (mage).
2. **Hunt monsters** from the hub. Each kill gives XP, gold, an essence drop, and stat training tied to that monster (slimes train Defence, wolves train Strength, wisps train Intellect, imps train Mana, etc.). Enough training levels the stat. Tougher monster tiers unlock as you level up.
3. **Forge your weapon.** You start with a single weapon. Infuse essences to shape it — pure-Fire wand if you only spend Fire essence, hybrid Fire/Water if you mix. The breakdown updates live and the weapon's name reflects its dominant element. Your weapon's dominant element also decides what your basic attacks count as against monster resistances, and boosts matching spells.
4. **Set a spell loadout.** Four slots, drawn from spells unlocked by level. In combat the strongest affordable damage spell fires each round, and any equipped heal auto-casts below 20% HP.
5. **Dive the dungeon** when ready. Auto-battle through escalating phases — three kills clears a normal phase, one kill clears a boss phase (every 5th). Clearing a phase saves a checkpoint; you can start a later run at **any phase up to that checkpoint** using the stepper on the hub, so pushing too deep never strands you.

Stats:
- **Strength** — physical weapon damage
- **Intellect** — magical weapon damage, and the main input to spell damage
- **Defence** — damage reduction & max HP
- **Mana** — max mana and mana regen per combat round

Combat details worth knowing:
- Monsters **resist or are weak to** elements (shown as badges above the foe). Weapon swings use your weapon's dominant element; spells use their own.
- Monsters also have **armour**, which is a flat reduction on weapon swings only. Spells ignore it — that's what makes casting worthwhile against War Turtles, Golems and other high-defence foes.

## Resting

HP and mana refill on their own over real time (roughly 12% of max HP and 20% of max mana per minute), and the clock keeps running while the game is closed. If you don't want to wait, **Camp** on the hub spends gold to top up instantly — the price scales with how hurt you are.

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
| `SESSION_SECRET` | no | Cookie signing secret. If unset, a random one is generated per restart (sessions won't survive restarts) and a warning is logged. Set this in production. |
| `SECURE_COOKIES` | no | `true`/`false` to force the `Secure` session-cookie flag. Defaults to on when `RAILWAY_ENVIRONMENT` is set or `NODE_ENV=production`, off otherwise — a Secure cookie is never returned over plain HTTP, so leave it off for local development. |
| `NODE_ENV` | no | `production` enables Secure cookies and caches the assembled `index.html` in memory. In development the page is re-read per request so edits show up without a restart. |
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

`/api/login` and `/api/register` are rate limited to 12 attempts per IP per 15 minutes.

## Dependencies

`package-lock.json` is committed — keep it that way. `connect-sqlite3` is pinned to an
exact version because 0.9.16 changed `options.db` from a filename to an already-open
database handle in a patch release; installing `^0.9.15` picks up the newer API and the
server throws `this.db.exec is not a function` at boot.
