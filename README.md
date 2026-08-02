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
3. **Dive a dungeon.** Waves of monsters, then a boss, fought on a board you
   give orders to. Damage dealt trains Attack, Strength, Defence and Hitpoints.
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

## Delving: the board

Skilling is the idle half of the game. Dungeons are the part you play.

A wave is a board, not a duel. **Enemies stand at the top, you at the bottom,
and anything you summon lines up in front of you.** Each round you assign a
target to every attacker you control — yourself and each risen unit — then hit
**FIGHT** and your orders play out, each attacker leaning into whatever you
pointed it at.

Tap an ally to select it, tap an enemy to aim it; the selection walks to the
next attacker so a run of taps sets the whole board. Double-tap an enemy to
aim everything at it. There is always a legal default — anything without a live
target falls back to the wave's main enemy — so FIGHT alone is a valid move and
the tactics stay optional until they matter.

**AUTO** plays each round with your standing orders, and while it runs a single
tap on an enemy focuses *everything* on it until that enemy is dead. So you can
let a run play and still call the shots that matter, without stepping through
every round.

### Reading the board

Every enemy telegraphs its next move above its head, decided before you give
orders and honoured when the round resolves:

| | |
|---|---|
| ⚔ **7** | it will attack, for up to 7 |
| 💀 **calling** | it will summon — kill it now or fight two |
| 😤 **ENRAGE** | a boss at half health, about to hit far harder |
| 🧊 **frozen** | it loses the turn |

That is what makes targeting a decision rather than a formality: a summoner
winding up is worth more than the boss's health bar this round.

### Both sides bring an army

**Neither side walks in alone.** Every wave opens with the enemy leader and an
escort, and you with a Skeleton of your own — the Necromancy path is what turns
that one servant into a host, but you are never standing there by yourself.

Their minions are built from whatever called them — 60% of its health, 70% of
its hit — so a Void Warden is as far above a Brood Warden as its master is.
And they come in the same five shapes, each with a keyword you have to answer:

| | | |
|---|---|---|
| 🛡️ **Warden** | Taunt | every blow you aim past it lands on it instead |
| 🌫️ **Shade** | Warded | shrugs off the first hit it takes |
| ⚔️ **Reaver** | Doubled | strikes twice a round |
| ☠️ **Rotling** | Withering | leaves you bleeding for two rounds |
| 🩸 **Leech** | Draining | drinks back half of what it deals |

That is where the counterplay lives. A Warden walls off the leader, so you
either grind through it or bind a **Sweeping** form whose splash goes straight
past. A Shade eats your Power Strike if you lead with it. A Reaver hits twice,
so a **Taunt** wall of your own is worth more than damage that round. Rotlings
punish you for taking hits at all, which is what a **Draining** form answers.

You read their board, then choose orders and shapes against it. Everything
they can do, you can do — that is the whole design.

**Callers keep calling.** Nearly every monster can summon, bosses most of all;
four minions cap the board, a summon costs the caller its turn, each caller
has a per-wave budget, and summons drop nothing — so a caller buys time rather
than farming you.

Dungeons run 12 to 20 waves. That is a campaign rather than a scrap: a delve
level per wave means a build matures fully, and there is room for the board to
swing several times before it is over.

### Boons

Clear a wave and you gain a **delve level** — pick one of three **boons**. Boons
come in lines that escalate, so taking one opens its next tier as a future
offer, and a run grows into an identity:

> 🔥 Kindling *(30% chance of bonus fire damage)* → 🔥 Wildfire *(fire also
> burns)* → 🔥 Immolation *(a burning corpse detonates onto the next foe)*

**Every dungeon draws from its own pool**, so each one makes a different kind of
character — the Frozen Crypt offers Frostbite, the Storm Spire offers
Stormcaller. The plain lines are Emberbrand, Frostbite, Stormcaller,
Stoneblood, Bloodlust, Voidtouched and Scavenger.

The one exception is the **Necromancy path**, which is offered everywhere. It
is the headline build, so no dungeon gets to hide it: the root turns up in
54–76% of offers depending on the dungeon, which over a run's worth of delve
levels means you will always be given the chance to take it.

**None of it persists.** Boons live and die with the run — walk out and they're
gone. Your eight skills stay purely about gear, so the two halves of the game
never entangle.

The tension is depth versus breadth: three first tiers is a weak spread, while
committing to one line gets you a capstone that changes how fights resolve.

### The Necromancy path

Necromancy isn't a line, it's a **faction** — the first one, built on the old
Might and Magic shape: a mastery ladder that opens specialisations you can only
reach by committing to it first. Take the root and two branches unlock and
start appearing in your offers.

```
              💀 NECROMANCY
    Raise Dead → Dark Mastery → Lord of Bones
                     │
        ┌────────────┴────────────┐
   🦴 BONE LEGION           🕯️ DEATH MAGIC
   Grave Rot                Death Ripple
   Wight Lords              Animate Dead
   Bone Dragon              Unholy Bargain
```

**The root raises the dead.** Taking Raise Dead puts a Skeleton on the board
straight away, and from then on a slain foe has a 40% chance to get back up on
your side; Dark Mastery takes that to three quarters and guarantees bosses;
Lord of Bones raises everything, in pairs. Risen units form your **host**, up
to six strong, laid out three to a rank in front of you. Each takes its own
turn after you, against whatever you aimed it at, rolling to hit off your own
accuracy — and the host is a wall as well as a weapon, soaking blows that
would otherwise land on you, more often the bigger it gets.

**Bone Legion decides what you raise.** Skeleton → Ghoul → Wight, with the
eldest of the host rising again as a **Bone Dragon** at the capstone. Taking a
tier remakes the host you're already standing with, on the spot — it doesn't
wait for the next kill. Wights also drain a quarter of their damage back to you.

**Death Magic spends the host.** Death Ripple washes decay across *every*
enemy on the board for 2 per unit every third round; Animate Dead brings back
half your fallen between waves; and Unholy Bargain lets a killing blow crumble
your host instead of you, each unit spent buying back 20% health.

#### The Rite of Binding

Three of a kind standing at once can be **fused into one of the next kind** —
and *what* they become is your choice. The rite offers three forms, each
trading stats against a keyword:

| Tier | Forms |
|---|---|
| Ghoul | 🪦 **Gravewarden** *(Taunt)* · 🧟 **Plague Ghoul** *(Withering)* · 🩸 **Ravener** *(Draining)* |
| Wight | 🛡️ **Barrow Knight** *(Taunt, Warded)* · ⚡ **Storm Wight** *(Doubled)* · 👑 **Grave Tyrant** *(Sweeping)* |
| Dragon | 🐉 **Bone Dragon** *(Sweeping, Warded)* · 💀 **Lich Dragon** *(Withering, Doubled)* · 🦴 **Bulwark Wyrm** *(Taunt, Undying)* |

The keywords:

- 🛡 **Taunt** — every blow aimed at you hits this instead, while it stands
- ✨ **Warded** — ignores the first hit it takes each wave
- ☠ **Withering** — its strikes rot, 3 a round for 2 rounds
- ⚡ **Doubled** — strikes twice a round
- 🌊 **Sweeping** — half its damage splashes onto every other enemy
- 🩸 **Draining** — heals you for half of what it deals
- 🔁 **Undying** — the first time it falls, it gets back up at 1 health

A bound unit keeps the strength that went into it — a quarter more than all
three together, then shaped by its form — so a Gravewarden is a wall and a
Ravener is a knife made from the same three bodies. Binding bound units
compounds, and Bone Legion leaves them alone: once a thing has been through
the rite it keeps its shape.

It is never free. The host is your wall as well as your weapon, and the chance
a blow lands on a unit instead of you scales with how many are standing — so
every rite trades bodies for quality. That is the whole decision, and it runs
the other way depending on whether you are being ground down or racing a
boss's health bar.

The three units the rite would consume pulse before you commit, and it always
takes your most damaged ones.

The two branches pull against each other: Bone Legion wants a big host kept
alive, Death Magic is happy to burn it down. Nine nodes, and a run only hands
out six or seven delve levels — you will never take them all.

Everything on this page dies with the run, the same as every other boon.

#### Watching it escalate

Your risen stand on the board in front of you, each with its own health and its
own order badge, and a strip under the fight reads the host's size and its max
hit against your own. Units claw up out of the floor when they rise, the strip
shudders when one shatters, and promotions flare through every unit at once
when Bone Legion deepens. The board itself greens over as the host grows, and
crossing three, five and six units throws a proclamation across the screen.
All of it respects `prefers-reduced-motion`.

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
attack and max hit until the run wins ~60% of the time.

Boons changed that picture — a roguelite's content has to assume you build, so
`tools/boon-calibrate.js` re-tunes difficulty around them. It drives the **real
`combatRound()`** with pacing scaled to zero rather than re-implementing the
logic, binary-searching a monster scalar until a middling (random-pick) build
wins ~60%. `tools/apply-scalars.js` bakes the result into the monster table;
monsters currently sit at roughly 1.4–1.6× their pre-boon hp and max hit.

That gap is stark. A run that declines every boon wins **0–10%**; a run that
takes them at random wins **48–73%** depending on the dungeon. The choices, not
the gear, are what carry a delve.

There's no single right way to spend them. Deepening one line beats spreading
in some dungeons and loses to it in others — a dungeon of frequent small hits
rewards a second damage-reduction line more than a third tier of the first,
and which is true flips when the monster table moves. That's the design
working: the pool is what makes each dungeon a different puzzle.

A faction has to earn its place without taking over, so `boon-balance.js`
carries a `necro` strategy that commits to the Necromancy path wherever it is
offered. In the two dungeons that offer it, a committed necromancer wins 60%
(Crypt) and 54% (Abyss) against 58% and 44% for random picks — competitive,
not dominant, and inside the same band as everything else. The path needed no
retune, and the dungeon scalars stay calibrated against non-faction builds
rather than bending around one path.

**Don't over-tune this.** An 11% change to a dungeon's hp and max hit swings
its win rate by roughly 25 points, and 60 trials only resolves to about ±6.
Corrections smaller than ~10% are inside the noise, and the shipped 48–73%
band is a deliberate stopping point rather than a target anyone hit exactly.
The Abyss sits at the bottom of it, which is the right shape for a last
dungeon.

`tools/journey.js` plays a bot from level 1 to the last boss using the game's
own combat and recipe functions, farming until each dungeon looks winnable. It
takes **no boons at all**, so its **132 minutes** is the pessimistic floor — the
time it takes if you throw every delve level away. A player who actually builds
spends less of that on combat farming.

`tools/ui-test.js` drives the real UI through the whole loop. All of these need
a local server and Playwright:

```bash
npm start &
node tools/tune.js            # solve monster stats for a target hit chance
node tools/boon-calibrate.js  # re-tune difficulty around the boon system
node tools/apply-scalars.js warren=1.4 crypt=1.9 …   # bake the result in
node tools/boon-balance.js    # measure what boons are worth
node tools/journey.js         # measure end-to-end playtime
node tools/ui-test.js         # end-to-end UI checks
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

## Builds

`game.js` and `auth.js` are served with a content hash in the query string, so
a deploy can never be answered out of a stale browser cache. The same hash is
printed at the bottom of the screen as `build xxxxxxxx` and exposed as
`__rf.BUILD` — if a change appears to be missing, compare that against
`git rev-parse` output for the deployed commit before looking anywhere else.

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
