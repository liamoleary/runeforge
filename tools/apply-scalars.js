#!/usr/bin/env node
// Bakes the per-dungeon scalars from tools/boon-calibrate.js into game.js.
//
//   node tools/apply-scalars.js warren=1.4 crypt=1.9 spire=2.1 ...
//   node tools/apply-scalars.js crypt=1.0,0.5        # hp x1.0, maxHit x0.5
//
// Multiplies each monster's hp and maxHit for the named dungeons, in place.
// One value scales both; two scale them separately, which is what you want
// when the board has more bodies on it than it used to — more enemies each
// hitting for less is a longer fight, not a harder one.
// Accuracy (`atk`) and armour (`def`) are left alone — those set hit chance,
// which tune.js owns.
const fs = require('fs');
const path = require('path');

const GAME = path.join(__dirname, '..', 'game.js');

// Which monsters belong to which dungeon, in file order.
const DUNGEON_MONSTERS = {
  warren: ['Giant Rat', 'Cave Slime', 'Warren Brood-Mother'],
  crypt:  ['Frost Ghoul', 'Ice Wraith', 'The Hoarfrost Knight'],
  spire:  ['Storm Sprite', 'Thunder Golem', 'Skyfather Vool'],
  roost:  ['Whelp', 'Ember Drake', 'Ashmaw the Elder'],
  abyss:  ['Abyssal Leech', 'Void Stalker', 'The Hollow King']
};

const args = process.argv.slice(2);
if (!args.length) {
  console.error('usage: node tools/apply-scalars.js warren=1.4 crypt=1.9 ...');
  process.exit(1);
}

const scalars = {};
args.forEach(a => {
  const [k, v] = a.split('=');
  if (!DUNGEON_MONSTERS[k]) { console.error(`unknown dungeon: ${k}`); process.exit(1); }
  const parts = String(v).split(',').map(parseFloat);
  const hp = parts[0], hit = parts.length > 1 ? parts[1] : parts[0];
  if (!(hp > 0) || !(hit > 0)) { console.error(`bad scalar for ${k}: ${v}`); process.exit(1); }
  scalars[k] = { hp: hp, hit: hit };
});

let src = fs.readFileSync(GAME, 'utf8');
const changes = [];

Object.keys(scalars).forEach(dungeon => {
  const scale = scalars[dungeon];
  DUNGEON_MONSTERS[dungeon].forEach(name => {
    // Match the single-line monster/boss literal by its name.
    const re = new RegExp(`(\\{ name: '${name.replace(/'/g, "\\\\'")}',[^}]*?\\})`);
    const m = src.match(re);
    if (!m) { console.error(`  ! could not find ${name}`); return; }
    let body = m[1];
    const before = body;
    body = body.replace(/hp: (\d+)/, (_, n) =>
      'hp: ' + Math.max(1, Math.round(+n * scale.hp)));
    body = body.replace(/maxHit: (\d+)/, (_, n) =>
      'maxHit: ' + Math.max(1, Math.round(+n * scale.hit)));
    if (body !== before) {
      src = src.replace(before, body);
      changes.push(`${dungeon.padEnd(8)} ${name.padEnd(22)} hp ×${scale.hp}  hit ×${scale.hit}`);
    }
  });
});

if (!changes.length) { console.error('nothing changed'); process.exit(1); }
fs.writeFileSync(GAME, src);
console.log('Applied:');
changes.forEach(c => console.log('  ' + c));
console.log('\nRe-run tools/boon-calibrate.js to confirm the scalars are now ~1.0.');
