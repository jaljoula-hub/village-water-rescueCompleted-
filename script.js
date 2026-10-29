"use strict";
const $ = s => document.querySelector(s);
const world = $('#world'), sky = $('#sky'), scenery = $('#scenery'), landscape = $('#landscape'), ground = $('#ground'), objects = $('#objects'),
  player = $('#player'), sprite = $('#sprite'), characterArt = $('#character-art'), shadow = $('#shadow'), overlay = $('#overlay'), panel = $('#panel'),
  fill = $('#fill'), bar = $('#bar'), percent = $('#percent'), timer = $('#timer'), message = $('#message'), canisterWater = $('#canister-water'), canisterMeter = $('#canister-meter'),
  villagers = $('#villagers'), clock = document.querySelector('.clock'), levelNumber = $('#level-number'), villageName = $('#village-name');

const GOAL = 100, SPEED = 240, GRAVITY = 1200, JUMP = 700, ROCK_MIN_SPACING = 380;
const A = 'assets/';
const ANIM = A + 'character-animations/';
const FRAME_W = 220, FRAME_H = 266;
// win = canister window [centre x, centre y, width, height, clockwise degrees] in frame pixels
const FRAMES = {
  idle:  { src: ANIM + 'idle.png',      win: [89, 224, 18, 49, 10] },
  walk:  { src: ANIM + 'walk.png',      win: [94, 216, 16, 51, 15] },
  run:   { src: ANIM + 'run.png',       win: [65, 191, 16, 49, 29] },
  jump:  { src: ANIM + 'jump.png',      win: [69, 188, 16, 53, -20] },
  boost: { src: ANIM + 'boost-run.png', win: [83, 116, 13, 25, 30] }
};
const WALK_CYCLE = ['walk', 'idle'], WALK_STEP = 0.2, BOOST_STEP = 0.11, LAND_TIME = 0.16;
const LEVELS = [
  { name: 'The Valley Village', duration: 90, blueDrops: 28, goldDrops: 3, rocks: 4, deliveryX: 3200, landscape: A + 'backgrounds/valley.webp', scene: 'valley', hillHeight: 6, hillPeriod: 900, challenge: 'A green valley, easy water, and four spaced rocks.' },
  { name: 'The Hillside Village', duration: 75, blueDrops: 21, goldDrops: 3, rocks: 6, deliveryX: 3650, landscape: A + 'backgrounds/hillside.webp', scene: 'hillside', hillHeight: 19, hillPeriod: 570, challenge: 'Terraced hills, fewer drops, and six rocks.' },
  { name: 'The Mountain Village', duration: 60, blueDrops: 17, goldDrops: 4, rocks: 8, deliveryX: 4200, landscape: A + 'backgrounds/mountain.webp', scene: 'mountain', hillHeight: 32, hillPeriod: 390, challenge: 'Remote mountain paths, scarce drops, and eight rocks.' }
];
// Item sizes at the 540px-high reference world (scaled by world height)
const TYPES = {
  blue:  { src: A + 'props/drop.png',       w: 36, h: 48, points: 5,   label: 'Clean water drop' },
  gold:  { src: A + 'props/gold-drop.png',  w: 56, h: 75, points: 25,  label: 'Super water drop' },
  rock:  { src: A + 'props/rock-medium.png', w: 62, h: 46, points: -10, label: 'Rock obstacle' },
  dirty: { src: A + 'props/dirty-drop.png', w: 38, h: 50, points: -10, label: 'Contaminated water' }
};
const ROCK_SRCS = [A + 'props/rock-medium.png', A + 'props/rock-small.png', A + 'props/rock-large.png'];
// Villager art (facing left, toward the arriving girl): source pixel height of each wave/cheer sprite
const VILLAGER_H = { 'valley-1': 302, 'valley-2': 256, 'valley-3': 280, 'hillside-1': 301, 'hillside-2': 231, 'hillside-3': 288 };
const VILLAGERS = {
  valley:   ['valley-2', 'valley-1', 'valley-3', 'hillside-2'],
  hillside: ['hillside-2', 'hillside-1', 'hillside-3', 'valley-2'],
  mountain: ['valley-2', 'hillside-3', 'valley-1', 'hillside-1']
};
const VILLAGER_FILES = Object.keys(VILLAGER_H).flatMap(k => [A + `villagers/${k}-wave.png`, A + `villagers/${k}-cheer.png`]);
// Decorative scenery: ref = height in px at the 540px reference world, w/h = source pixel size
const SCENERY = {
  'tree-round1':   { src: A + 'scenery/tree-round1.png',   w: 334, h: 300, ref: 270, sway: 1 },
  'tree-round2':   { src: A + 'scenery/tree-round2.png',   w: 288, h: 300, ref: 290, sway: 1 },
  'tree-acacia1':  { src: A + 'scenery/tree-acacia1.png',  w: 400, h: 197, ref: 170, sway: 1 },
  'tree-acacia2':  { src: A + 'scenery/tree-acacia2.png',  w: 400, h: 195, ref: 190, sway: 1 },
  'tree-pine1':    { src: A + 'scenery/tree-pine1.png',    w: 214, h: 300, ref: 300, sway: 1 },
  'tree-pine2':    { src: A + 'scenery/tree-pine2.png',    w: 213, h: 300, ref: 270, sway: 1 },
  'house-round':   { src: A + 'scenery/house-round.png',   w: 283, h: 320, ref: 250 },
  'house-long':    { src: A + 'scenery/house-long.png',    w: 468, h: 320, ref: 220 },
  'house-cottage': { src: A + 'scenery/house-cottage.png', w: 267, h: 320, ref: 260 },
  'delivery':      { src: A + 'scenery/delivery-point.png', w: 620, h: 358, ref: 250 },
  'bush':          { src: A + 'props/bush.png',            w: 175, h: 180, ref: 70, sway: 1 },
  'bush-flowers':  { src: A + 'props/bush-flowers.png',    w: 213, h: 180, ref: 70, sway: 1 },
  'flowers':       { src: A + 'props/flowers.png',         w: 182, h: 150, ref: 52, sway: 1 },
  'grass':         { src: A + 'props/grass-tall.png',      w: 163, h: 180, ref: 66, sway: 1 },
  'fence':         { src: A + 'props/fence.png',           w: 290, h: 130, ref: 54 }
};
const SCENE_MIX = {
  valley:   { trees: ['tree-round1', 'tree-round2'], homes: ['house-round', 'house-long'], low: ['bush-flowers', 'flowers', 'flowers', 'grass', 'fence'] },
  hillside: { trees: ['tree-acacia1', 'tree-acacia2', 'tree-round1'], homes: ['house-long', 'house-round'], low: ['bush', 'grass', 'fence', 'flowers'] },
  mountain: { trees: ['tree-pine1', 'tree-pine2', 'tree-pine1'], homes: ['house-cottage', 'house-long'], low: ['bush', 'grass', 'flowers', 'bush'] }
};
Object.values(FRAMES).map(f => f.src).concat(Object.values(TYPES).map(t => t.src), VILLAGER_FILES.concat(ROCK_SRCS, Object.values(SCENERY).map(s => s.src)))
  .forEach(src => { new Image().src = src; });

let decor = [], lastScale = 0, state = 'menu', levelIndex = 0, score = 0, time = LEVELS[0].duration, playerX = 120, velocityY = 0, jumpHeight = 0, camera = 0,
  face = 1, animT = 0, frame = '', hurtUntil = 0, stumbleUntil = 0, tripCooldownUntil = 0, spillUntil = 0,
  speedBoostUntil = 0, landUntil = 0, animRate = 1, items = [], uid = 0, lastRockX = -Infinity, keys = new Set(), last = 0, raf = 0;

const scale = () => world.clientHeight / 540;
const groundY = () => world.clientHeight * 0.122;
const terrainOffset = x => Math.sin(x / LEVELS[levelIndex].hillPeriod) * LEVELS[levelIndex].hillHeight;
const groundAt = x => groundY() + terrainOffset(x);
const width = () => world.clientWidth;

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  e.append(...kids);
  return e;
}

function screen(title, body, buttons, opts = {}) {
  overlay.classList.remove('hidden');
  panel.className = 'panel' + (opts.wood ? ' wood' : '');
  panel.replaceChildren(el('h1', { className: opts.titleClass || '', textContent: title }));
  if (opts.cast) panel.append(opts.cast);
  if (body) panel.append(typeof body === 'string' ? el('p', { innerHTML: body }) : body);
  buttons.forEach(([label, fn, primary]) => {
    const b = el('button', { textContent: label, className: (primary ? 'primary ' : '') + (opts.wood ? 'menu-btn' : '') });
    b.addEventListener('click', fn);
    panel.append(b);
  });
}

function cast(happy, sad) {
  const box = el('div', { className: 'cast' });
  if (sad) {
    box.append(el('img', { src: FRAMES.idle.src, alt: '', className: 'sad' }));
  } else {
    for (const k of ['valley-2', 'valley-1', 'valley-3']) box.append(el('img', { src: A + `villagers/${k}-${happy ? 'cheer' : 'wave'}.png`, alt: '' }));
  }
  return box;
}

function menu() {
  cancelAnimationFrame(raf);
  state = 'menu';
  screen('Village Water Rescue', 'Run through the village, collect clean water, and help the villagers before time runs out!',
    [['Start Game', start, true], ['Instructions', instructions],
     ['Exit', () => screen('Thanks for playing!', 'Close this browser tab to exit. Every drop matters!', [['Back', menu, true]])]],
    { wood: true, titleClass: 'logo' });
}

function instructions() {
  const list = el('ol', { innerHTML: '<li>Use the <b>arrow keys</b> to run and <b>Space</b> to jump</li><li>Walk through blue drops (+5%) and golden drops (+25% plus a 10-second speed boost)</li><li>Jump over rocks or spill 15% of your water</li><li>Fill the canister, then reach the village before time runs out</li><li>Each village has a different timer and obstacle course</li>' });
  screen('How to Play', list, [['Start Game', start, true], ['Back', menu]]);
}

function updateHUD() {
  const displayScore = Number(score.toFixed(2));
  percent.textContent = displayScore + '%';
  fill.style.width = score + '%';
  canisterWater.style.height = score + '%';
  bar.setAttribute('aria-valuenow', score);
  levelNumber.textContent = `LEVEL ${levelIndex + 1}`;
  villageName.textContent = LEVELS[levelIndex].name;
  const t = Math.ceil(time);
  timer.textContent = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  clock.classList.toggle('low', state === 'playing' && time <= 10);
}

function start() {
  startLevel(0);
}

function startLevel(index) {
  cancelAnimationFrame(raf);
  levelIndex = index;
  const level = LEVELS[levelIndex];
  state = 'playing';
  score = 0; time = level.duration; playerX = 120; velocityY = 0; jumpHeight = 0; camera = 0; face = 1; animT = 0; lastRockX = -Infinity; speedBoostUntil = 0; landUntil = 0; animRate = 1;
  stumbleUntil = 0; tripCooldownUntil = 0; spillUntil = 0;
  player.classList.remove('stumble', 'spill');
  keys.clear(); items = []; objects.replaceChildren();
  world.dataset.scene = level.scene;
  landscape.style.backgroundImage = `url('${level.landscape}')`;
  villagers.classList.remove('happy');
  setVillagers(false);
  buildScenery(level);
  $('#confetti').replaceChildren();
  overlay.classList.add('hidden');
  message.textContent = 'Collect blue and golden drops. Avoid rocks and dirty water!';
  updateHUD();
  for (let i = 0; i < level.rocks; i++) {
    const interval = (level.deliveryX - 450) / (level.rocks + 1);
    const jitter = Math.min(100, Math.max(0, (interval - ROCK_MIN_SPACING) * 0.45));
    spawn(350 + interval * (i + 1) + (Math.random() * 2 - 1) * jitter, 'rock');
  }
  for (let i = 0; i < level.blueDrops; i++) {
    const interval = (level.deliveryX - 560) / (level.blueDrops + 1);
    spawn(280 + interval * (i + 1) + (Math.random() * 2 - 1) * Math.min(45, interval * 0.15), 'blue');
  }
  for (let i = 0; i < level.goldDrops; i++) {
    spawn(450 + Math.random() * (level.deliveryX - 800), 'gold');
  }
  ensureWinnable(level);
  layout(0);
  last = performance.now();
  raf = requestAnimationFrame(tick);
  world.focus();
}

// y is the item's centre height above the bottom of the world (as before)
function spawn(x, type) {
  if (type === 'rock') {
    x = Math.max(x, lastRockX + ROCK_MIN_SPACING);
    lastRockX = x;
  }
  const def = TYPES[type];
  const y = type === 'gold' || type === 'blue'
    ? groundAt(x) + def.h * scale() / 2 + 18
    : type === 'rock' ? groundAt(x) + def.h * scale() / 2 : groundAt(x) + 20;
  const src = type === 'rock' ? ROCK_SRCS[uid % ROCK_SRCS.length] : def.src;
  const img = el('img', { src, alt: def.label, className: 'item ' + type, draggable: false });
  const item = { id: uid++, x, y, type, el: img, taken: false, def };
  objects.append(img);
  items.push(item);
}

function setVillagers(happy) {
  const set = VILLAGERS[LEVELS[levelIndex].scene];
  villagers.querySelectorAll('.villager').forEach((v, i) => {
    v.src = A + `villagers/${set[i]}-${happy ? 'cheer' : 'wave'}.png`;
    v.style.setProperty('--sh', VILLAGER_H[set[i]]);
  });
}

// Purely visual scenery in world coordinates; it is never added to `items`, so collisions are unaffected
function buildScenery(level) {
  scenery.replaceChildren();
  decor = [];
  const mix = SCENE_MIX[level.scene];
  let seed = (levelIndex + 1) * 7919;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const pick = list => list[Math.floor(rnd() * list.length)];
  const add = (key, x, flip) => {
    const def = SCENERY[key];
    const img = el('img', { src: def.src, alt: '', draggable: false, className: 'deco' + (def.sway ? ' sway' : '') });
    img.style.height = `calc(${def.ref}px * var(--s, 1))`;
    img.style.animationDelay = -(rnd() * 4).toFixed(2) + 's';
    if (flip) img.style.scale = '-1 1';
    scenery.append(img);
    decor.push({ el: img, x, w: def.ref * def.w / def.h, shown: false });
  };
  const end = level.deliveryX;
  for (let x = 150; x < end - 250; x += 230 + rnd() * 260) add(pick(mix.trees), x + rnd() * 80, rnd() < 0.5);
  for (let x = 700; x < end - 400; x += 1100 + rnd() * 500) add(pick(mix.homes), x, rnd() < 0.5);
  for (let x = 120; x < end + 700; x += 110 + rnd() * 190) add(pick(mix.low), x, rnd() < 0.5);
  // village: homes and the delivery area behind the waiting villagers
  add(mix.homes[0], end + 130);
  add('delivery', end + 330);
  add(mix.homes[1], end + 620);
  add(pick(mix.trees), end + 800);
  add('fence', end - 20);
  add('flowers', end + 40); add('bush-flowers', end + 520);
}

function popText(item, text, bad) {
  const p = el('div', { className: 'pop' + (bad ? ' bad' : ''), textContent: text });
  p.style.left = (item.x - camera) + 'px';
  p.style.bottom = (item.y + 30) + 'px';
  world.append(p);
  setTimeout(() => p.remove(), 800);
}

function collect(item) {
  if (state !== 'playing' || item.taken) return;
  item.taken = true;
  item.el.remove();
  const points = item.def.points;
  score = Math.max(0, Math.min(100, score + points));
  if (item.type === 'gold') speedBoostUntil = Math.max(speedBoostUntil, performance.now() + 10000);
  popText(item, (points > 0 ? '+' : '\u2212') + Math.abs(points), points < 0);
  if (points < 0) {
    player.classList.remove('hurt'); void player.offsetWidth; player.classList.add('hurt');
  }
  message.textContent = item.type === 'gold'
    ? 'Golden water! +25% and a 10-second speed boost!'
    : points > 0 ? `Clean water collected! +${points}%` : 'Ouch! A hazard! \u221210%';
  updateHUD();
}

function trip(item, now) {
  if (item.taken || now < tripCooldownUntil) return;
  item.taken = true;
  item.el.remove();
  const spilled = score * 0.15;
  score = Math.max(0, score - spilled);
  tripCooldownUntil = now + 1000;
  stumbleUntil = now + 850;
  spillUntil = now + 550;
  player.classList.add('stumble');
  if (spilled > 0) player.classList.add('spill');
  popText(item, '\u2212' + Number(spilled.toFixed(2)) + '%', true);
  message.textContent = spilled > 0
    ? `You tripped! ${Number(spilled.toFixed(2))}% of your water spilled.`
    : 'You tripped, but your canister was empty.';
  updateHUD();
}

function jump() {
  if (state === 'playing' && jumpHeight === 0) velocityY = JUMP;
}

function overlapsPlayer(item, previousX, previousJumpHeight, currentX, currentJumpHeight) {
  const characterHeight = world.clientHeight * 0.27;
  const characterHalfWidth = characterHeight * (220 / 266) * 0.34;
  const playerLeft = Math.min(previousX, currentX) - characterHalfWidth;
  const playerRight = Math.max(previousX, currentX) + characterHalfWidth;
  const previousFeet = groundAt(previousX) + previousJumpHeight;
  const currentFeet = groundAt(currentX) + currentJumpHeight;
  const playerBottom = Math.min(previousFeet, currentFeet) - 8;
  const playerTop = Math.max(previousFeet, currentFeet) + characterHeight;
  const itemHalfWidth = item.def.w * scale() / 2;
  const itemHalfHeight = item.def.h * scale() / 2;
  return item.x + itemHalfWidth >= playerLeft && item.x - itemHalfWidth <= playerRight &&
    item.y + itemHalfHeight >= playerBottom && item.y - itemHalfHeight <= playerTop;
}

function overlapsRock(item, previousX, currentX, jumpHeight) {
  const characterHeight = world.clientHeight * 0.27;
  const footHalfWidth = characterHeight * (220 / 266) * 0.2;
  const rockHalfWidth = item.def.w * scale() / 2;
  const rockBottom = item.y - item.def.h * scale() / 2;
  const rockTop = item.y + item.def.h * scale() / 2;
  const feet = groundAt(currentX) + jumpHeight;
  const playerLeft = Math.min(previousX, currentX) - footHalfWidth;
  const playerRight = Math.max(previousX, currentX) + footHalfWidth;
  return item.x + rockHalfWidth >= playerLeft && item.x - rockHalfWidth <= playerRight &&
    feet >= rockBottom && feet <= rockTop;
}

function setFrame(name) {
  if (frame === name) return;
  frame = name;
  const f = FRAMES[name], [cx, cy, w, h, rot] = f.win;
  sprite.src = f.src;
  Object.assign(canisterMeter.style, {
    left: cx / FRAME_W * 100 + '%', top: cy / FRAME_H * 100 + '%',
    width: (w + 2) / FRAME_W * 100 + '%', height: (h + 2) / FRAME_H * 100 + '%',
    transform: `translate(-50%, -50%) rotate(${rot}deg)`
  });
}

// Visual update only: sprite direction, animation frame, parallax and item positions
function layout(dir) {
  const s = scale(), px = playerX - camera;
  player.style.left = px + 'px';
  const now = performance.now();
  const landing = Math.max(0, (landUntil - now) / 1000 / LAND_TIME);
  const squash = Math.sin(landing * Math.PI) * 0.09;
  player.style.transform = `translateX(-50%) translateY(${-(terrainOffset(playerX) + jumpHeight)}px) scaleX(${face}) scale(${1 + squash * 0.6}, ${1 - squash})`;
  villagers.style.left = (LEVELS[levelIndex].deliveryX - camera + 70 * s) + 'px';
  villagers.style.bottom = groundAt(LEVELS[levelIndex].deliveryX) + 'px';
  villagers.style.right = 'auto';
  if (s !== lastScale) { lastScale = s; villagers.style.setProperty('--s', s); scenery.style.setProperty('--s', s); }
  for (const d of decor) {
    const sx = d.x - camera, vis = sx > -d.w * s && sx < width() + d.w * s;
    if (!vis) { if (d.shown) { d.el.style.display = 'none'; d.shown = false; } continue; }
    if (!d.shown) { d.el.style.display = 'block'; d.shown = true; }
    d.el.style.left = (sx - d.w * s / 2) + 'px';
  }
  player.classList.toggle('stumble', performance.now() < stumbleUntil);
  player.classList.toggle('spill', performance.now() < spillUntil);
  const boosted = now < speedBoostUntil;
  const mode = jumpHeight > 0 ? 'jump' : landing > 0 ? 'land' : dir ? (boosted ? 'boost' : 'walk') : 'idle';
  const step = (boosted ? BOOST_STEP : WALK_STEP) / animRate;
  player.classList.toggle('walk', mode === 'walk');
  player.classList.toggle('boost', mode === 'boost');
  player.classList.toggle('idle', mode === 'idle');
  player.style.setProperty('--step', step * 2 + 's');
  setFrame(mode === 'jump' ? 'jump' : mode === 'boost' ? 'boost'
    : mode === 'walk' ? WALK_CYCLE[Math.floor(animT / WALK_STEP) % 2]
    : mode === 'land' ? (dir ? 'walk' : 'idle') : 'idle');
  shadow.style.left = px + 'px';
  shadow.style.bottom = (groundAt(playerX) - world.clientHeight * 0.013) + 'px';
  shadow.style.opacity = Math.max(0.2, 1 - jumpHeight / 160);
  landscape.style.backgroundPosition = `${-camera * 0.45}px bottom`;
  ground.style.backgroundPosition = `${-camera}px 0`;
  for (const it of items) {
    if (it.taken) continue;
    const sx = it.x - camera, iw = it.def.w * s, ih = it.def.h * s;
    const visible = !(sx < -60 || sx > width() + 60);
    it.el.style.display = visible ? 'block' : 'none';
    if (!visible) continue;
    it.el.style.width = iw + 'px';
    it.el.style.height = ih + 'px';
    it.el.style.left = (sx - iw / 2) + 'px';
    it.el.style.bottom = (it.y - ih / 2) + 'px';
  }
}

function tick(now) {
  if (state !== 'playing') return;
  const dt = Math.min(Math.max((now - last) / 1000, 0), 0.045);
  last = now;
  time = Math.max(0, time - dt);
  if (time <= 0) { updateHUD(); finish(false); return; }
  const dir = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
  const previousX = playerX, previousJumpHeight = jumpHeight;
  const weightMultiplier = 1 - Math.min(score, GOAL) / GOAL * 0.3;
  const boostMultiplier = now < speedBoostUntil ? 1.5 : 1;
  const stumbleMultiplier = now < stumbleUntil ? 0.35 : 1;
  const speed = SPEED * weightMultiplier * boostMultiplier * stumbleMultiplier;
  // Animation speed follows movement speed: slower as the canister fills, faster when boosted
  animRate = weightMultiplier * stumbleMultiplier;
  if (dir) { face = dir; animT += dt * animRate; } else animT = 0;
  // The village entrance is a hard stop: the player can never walk past it
  playerX = Math.min(LEVELS[levelIndex].deliveryX, Math.max(30, playerX + dir * speed * dt));
  velocityY -= GRAVITY * dt;
  jumpHeight = Math.max(0, jumpHeight + velocityY * dt);
  if (jumpHeight === 0) velocityY = 0;
  if (previousJumpHeight > 0 && jumpHeight === 0) landUntil = now + LAND_TIME * 1000;
  camera = Math.max(0, playerX - width() * 0.24);
  for (const item of items) {
    if (item.taken) continue;
    if (item.type === 'rock') {
      if (now >= tripCooldownUntil && overlapsRock(item, previousX, playerX, jumpHeight)) trip(item, now);
    } else if (overlapsPlayer(item, previousX, previousJumpHeight, playerX, jumpHeight)) collect(item);
  }
  items = items.filter(i => !i.taken);
  if (state === 'playing' && playerX >= LEVELS[levelIndex].deliveryX) {
    if (score >= GOAL) completeLevel(); else notEnoughWater();
    return;
  }
  layout(dir);
  updateHUD();
  if (state === 'playing') raf = requestAnimationFrame(tick);
}

function finish(won) {
  state = 'finished';
  cancelAnimationFrame(raf);
  keys.clear();
  updateHUD();
  if (won) {
    villagers.classList.add('happy');
    setVillagers(true);
    confetti();
    screen('You Saved the Village!', '<span class="stat">Water Collected: 100%</span><br>The villagers have clean water!',
      [['Play Again', start, true], ['Main Menu', menu]], { titleClass: 'ribbon', cast: cast(true) });
  } else {
    screen('Time\u2019s Up!', `${LEVELS[levelIndex].name} still needs clean water.<br><span class="stat">Water Collected: ${Number(score.toFixed(2))}%</span>`,
      [['Retry This Level', () => startLevel(levelIndex), true], ['Main Menu', menu]], { titleClass: 'lose', cast: cast(false, true) });
  }
}

function notEnoughWater() {
  if (state !== 'playing') return;
  state = 'blocked';
  cancelAnimationFrame(raf);
  keys.clear();
  layout(0);
  updateHUD();
  message.textContent = 'Not enough water! Try again.';
  screen('\uD83D\uDCA7 Not Enough Water!',
    'Oh no! Your village still needs clean water. Try again and collect enough water to complete your delivery!',
    [['\uD83D\uDD04 Try Again', () => { if (state === 'blocked') startLevel(levelIndex); }, true]],
    { titleClass: 'lose', cast: cast(false, true) });
  const retry = panel.querySelector('button');
  if (retry) retry.focus();
}

// Worst case (every rock hit, every drop taken, in order) must still be able to reach 100%
function worstCaseScore() {
  let s = 0;
  for (const it of items.slice().sort((a, b) => a.x - b.x)) {
    if (it.type === 'rock') s -= s * 0.15; else s = Math.min(GOAL, s + it.def.points);
  }
  return s;
}

function ensureWinnable(level) {
  const end = level.deliveryX - 40;
  for (let k = 0; k < 40 && worstCaseScore() < GOAL; k++) spawn(end - k * 50, 'blue');
}

function completeLevel() {
  state = 'transition';
  cancelAnimationFrame(raf);
  keys.clear();
  villagers.classList.add('happy');
  setVillagers(true);
  if (levelIndex === LEVELS.length - 1) {
    finish(true);
    return;
  }
  const next = LEVELS[levelIndex + 1];
  screen(`${LEVELS[levelIndex].name} supplied!`,
    `The villagers have clean water.<br><span class="stat">Next: Level ${levelIndex + 2}, ${next.name}</span><br>${next.challenge}<br>${next.duration} seconds to fill and deliver the canister.`,
    [[`Continue to Level ${levelIndex + 2}`, () => startLevel(levelIndex + 1), true], ['Main Menu', menu]],
    { titleClass: 'ribbon', cast: cast(true) });
}

function confetti() {
  const root = $('#confetti');
  const colors = ['#ffc907', '#22bbec', '#f9687d', '#8cdb4a'];
  for (let i = 0; i < 110; i++) {
    const piece = el('i', { className: 'confetti-piece' });
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[i % 4];
    piece.style.animationDelay = Math.random() * 1.2 + 's';
    root.append(piece);
  }
  setTimeout(() => root.replaceChildren(), 4800);
}

function pause() {
  if (state === 'playing') {
    state = 'paused';
    cancelAnimationFrame(raf);
    keys.clear();
    layout(0);
    screen('Paused', 'Take a break! Your progress is saved.', [['Resume', resume, true], ['Restart', start], ['Main Menu', menu]]);
  } else if (state === 'paused') resume();
}

function resume() {
  if (state !== 'paused') return;
  state = 'playing';
  overlay.classList.add('hidden');
  last = performance.now();
  raf = requestAnimationFrame(tick);
  world.focus();
}

const KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', Spacebar: 'jump' };
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.preventDefault(); pause(); return; }
  const k = KEYMAP[e.key];
  if (!k) return;
  if (state !== 'playing') return;
  e.preventDefault();
  if (k === 'jump') jump(); else keys.add(k);
});
document.addEventListener('keyup', e => { const k = KEYMAP[e.key]; if (k && k !== 'jump') keys.delete(k); });
window.addEventListener('blur', () => { keys.clear(); if (state === 'playing') pause(); });
window.addEventListener('resize', () => { if (state !== 'playing') layout(0); });

document.querySelectorAll('[data-control]').forEach(b => {
  const k = b.dataset.control;
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { b.setPointerCapture(e.pointerId); } catch (_) {}
    if (k === 'jump') jump(); else keys.add(k);
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => keys.delete(k));
});
$('#pause').addEventListener('click', pause);
$('#pauseMobile').addEventListener('click', pause);
$('#reset').addEventListener('click', start);

menu();
updateHUD();
layout(0);
