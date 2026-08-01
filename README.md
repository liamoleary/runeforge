# RuneForge

A browser skilling RPG in the Old School RuneScape mould. One character, eight
skills, and a loop that runs: **gather → forge → dive → repeat**.

## How it plays

You start at level 1 with nothing but an axe and a pick.

1. **Chop and mine.** Tap a tree or a rock once and your character keeps working
   it — logs and ore pile up, Woodcutting and Mining tick over. Better nodes
   unlock as those skills rise.
2. **Smelt and smith.** Ore becomes bars; bars plus logs become a sword, a
   platebody and a shield. Smithing gates what you can make, Attack and Defence
   gate what you can wear.
3. **Dive a dungeon.** Waves of monsters, then a boss, fought automatically.
   Damage dealt trains Attack, Strength, Defence and Hitpoints.
4. **Come back with the good stuff.** Each dungeon drops the reagent the *next*
   metal tier needs, plus gems for Crafting. No Ember Cores, no steel gear.

That's the ratchet: you can't smith the next tier until you've cleared the
dungeon before it, and you can't clear the next dungeon in the gear you have.
When a dungeon starts killing you, that's the game telling you to go grind.

## Feedback while you work

The bar under the header is contextual. Idle or in a dungeon it's your health;
the moment you start chopping, mining or forging it becomes that skill's
progress — xp remaining to the next level, and a live estimate of **how long
that will actually take** at your current rate. It ticks down as you work.

Levelling up gets a proper fanfare: a burst, rotating light shafts, sparks and
the new level, over a dimmed screen, with the skill tile pulsing behind it.
Multiple level-ups queue rather than stomping each other, and the whole thing
respects `prefers-reduced-motion`.

### Crafting takes time

Smelting and smithing are timed jobs with a progress bar, not instant taps, and
they repeat while materials last. Two things drive the duration:

- **What you're making.** A platebody is slower than a sword, and each metal
  tier is slower than the last. At Smithing 50 a rune platebody takes ~16s
  against ~8s for a rune sword.
- **How good you are.** Every level above a recipe's requirement shaves 2.2%
  off, down to a floor of 35%. That same rune platebody drops to ~9s twenty
  levels later and ~5.7s at 99 — old recipes get dramatically snappier as you
  outgrow them.

Materials are taken when a piece starts and refunded if you stop partway, so a
mistimed tap never costs you a bar.

The active job is visible wherever you are: the strip sticks below the header
while you scroll, *and* the row you tapped grows its own progress bar with a
FORGING / CHOPPING badge. Tapping a row that's already working says so rather
than silently cancelling it — stopping is always the explicit STOP button.

### Knowing what to wear

The pack sorts upgrades to the top and labels them. Each wearable shows its
stats, a **▲ UPGRADE +n** badge when it beats what's in that slot, **★ BEST**
when it's the best you own for the slot, or the requirement you're missing if
you can't wear it yet. Equipment slots with something better waiting in the
pack are outlined in green.

### Disenchanting

Any piece in your pack can be broken down with the ♻ button. Each unit of its
original recipe rolls independently at a **40%** chance to come back, so
salvage is always lossy — it's a way to recover from a misbuild or reclaim
outgrown gear, never a cheaper source of materials than mining. It asks for
confirmation first, and equipped items can't be salvaged without unequipping.

Note that crafting an item and breaking it down is a slightly more
xp-efficient use of bars than smelting alone — that's an intentional trade
against the bench time it costs.

## Skills

| | Skill | What it does |
|---|---|---|
| ⚔️ | **Attack** | Gates weapon tiers, improves accuracy |
| 💪 | **Strength** | Raises your maximum hit |
| 🛡️ | **Defence** | Gates armour tiers, reduces incoming hits |
| ❤️ | **Hitpoints** | Your life total — starts at 10, as in OSRS |
| 🪓 | **Woodcutting** | Better logs for weapon handles and shields |
| ⛏️ | **Mining** | Better ore for better bars |
| 🔨 | **Smithing** | Smelt bars, forge weapons and armour |
| 💍 | **Crafting** | Cut dungeon gems into amulets |

Your **total level** is the sum of all eight. Combat level is derived from the
four combat skills.

### Experience

Levels use the genuine OSRS experience table — 83 xp for level 2, 13,034,431 for
level 99, via `floor(¼ · Σ floor(l + 300 · 2^(l/7)))`. Level 92 really is the
halfway point.

Two deliberate departures from OSRS, both for pacing: life is `10 + 2 ×
Hitpoints level` rather than the Hitpoints level itself, so a big hit is
dangerous instead of instantly lethal; and every combat skill takes a share of
the damage you deal rather than making you pick an attack style.

## Progression

| Tier | Smithing | Wield | Logs | Dungeon reagent |
|---|---|---|---|---|
| Bronze | 1 | 1 | Logs | — |
| Iron | 10 | 5 | Oak | — |
| Steel | 20 | 10 | Willow | Ember Core — Rat Warren |
| Mithril | 30 | 20 | Maple | Frost Shard — Frozen Crypt |
| Adamant | 40 | 30 | Yew | Storm Crystal — Storm Spire |
| Rune | 50 | 40 | Magic | Dragon Ash — Dragon's Roost |

Five dungeons: Rat Warren → Frozen Crypt → Storm Spire → Dragon's Roost → The
Abyss. Clearing one unlocks the next; cleared dungeons can be re-run for
materials and combat xp.

Hitpoints regenerate in real time, including while the game is closed, so dying
costs you the run rather than your evening.

### Balance

The numbers aren't guesswork. `tools/tune.js` solves for each dungeon's
monster stats given the player state that dungeon expects — picking defence for
a target hit chance, hp for a target fight length, then binary-searching
attack and max hit until the run wins ~60% of the time. `tools/journey.js`
then plays a bot from level 1 to the last boss using the game's own combat and
recipe functions. A full clear currently runs about **105 minutes**, most of it
gathering and smithing rather than combat farming.

`tools/ui-test.js` drives the real UI through the whole loop. All three need a
local server and Playwright:

```bash
npm start &
node tools/tune.js       # re-solve monster stats
node tools/journey.js    # measure end-to-end playtime
node tools/ui-test.js    # end-to-end UI checks
```

They point at `localhost:3111` by default — edit the URL at the top if you run
on another port.

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

## Saves

Saves carry a `version`. The current format is **2**; the pre-skilling game was
version 1 and nothing in it maps onto skills, so a v1 save is ignored and the
character starts fresh rather than loading as a broken hybrid.

## Dependencies

`package-lock.json` is committed — keep it that way. `connect-sqlite3` is pinned to an
exact version because 0.9.16 changed `options.db` from a filename to an already-open
database handle in a patch release; installing `^0.9.15` picks up the newer API and the
server throws `this.db.exec is not a function` at boot.
