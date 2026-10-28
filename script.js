"use strict";
const $ = s => document.querySelector(s);
const world = $('#world'), sky = $('#sky'), landscape = $('#landscape'), ground = $('#ground'), objects = $('#objects'),
  player = $('#player'), sprite = $('#sprite'), shadow = $('#shadow'), overlay = $('#overlay'), panel = $('#panel'),
  fill = $('#fill'), bar = $('#bar'), percent = $('#percent'), timer = $('#timer'), message = $('#message'),
  villagers = $('#villagers'), clock = document.querySelector('.clock');

const DURATION = 90, GOAL = 100, SPEED = 240, GRAVITY = 1200, JUMP = 530;
const A = 'assets/';
const FRAMES = { idle: A + 'player-idle.svg', run1: A + 'player-run1.svg', run2: A + 'player-run2.svg', jump: A + 'player-jump.svg' };
const RUN_CYCLE = ['run1', 'idle', 'run2', 'idle'];
// Item sizes at the 540px-high reference world (scaled by world height)
const TYPES = {
  blue:  { src: A + 'drop.svg',       w: 36, h: 48, points: 5,   label: 'Clean water drop' },
  gold:  { src: A + 'gold-drop.svg',  w: 56, h: 75, points: 25,  label: 'Super water drop' },
  rock:  { src: A + 'rock.svg',       w: 62, h: 46, points: -10, label: 'Rock obstacle' },
  dirty: { src: A + 'dirty-drop.svg', w: 38, h: 50, points: -10, label: 'Contaminated water' }
};
Object.values(FRAMES).concat(Object.values(TYPES).map(t => t.src), [A + 'villager.svg', A + 'villager-happy.svg'])
  .forEach(src => { new Image().src = src; });

let state = 'menu', score = 0, time = DURATION, playerX = 120, velocityY = 0, jumpHeight = 0, camera = 0,
  face = 1, animT = 0, frame = 'idle', hurtUntil = 0, items = [], spawnClock = 0, uid = 0, keys = new Set(), last = 0, raf = 0;

const scale = () => world.clientHeight / 540;
const groundY = () => world.clientHeight * 0.122;
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
    box.append(el('img', { src: FRAMES.idle, alt: '', className: 'sad' }));
  } else {
    for (let i = 0; i < 3; i++) box.append(el('img', { src: A + (happy ? 'villager-happy.svg' : 'villager.svg'), alt: '' }));
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
  const list = el('ol', { innerHTML: '<li>Use the <b>arrow keys</b> to move</li><li>Press <b>Space</b> to jump</li><li>Collect <b>blue water drops</b> (+5)</li><li>Find <b>golden drops</b> for extra water (+25)</li><li>Avoid rocks and dirty water (&minus;10)</li><li>Reach <b>100%</b> before the 90 seconds run out</li><li>Make the villagers happy!</li>' });
  screen('How to Play', list, [['Start Game', start, true], ['Back', menu]]);
}

function updateHUD() {
  percent.textContent = score + '%';
  fill.style.width = score + '%';
  bar.setAttribute('aria-valuenow', score);
  const t = Math.ceil(time);
  timer.textContent = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  clock.classList.toggle('low', state === 'playing' && time <= 10);
}

function start() {
  cancelAnimationFrame(raf);
  state = 'playing';
  score = 0; time = DURATION; playerX = 120; velocityY = 0; jumpHeight = 0; camera = 0; spawnClock = 0; face = 1; animT = 0;
  keys.clear(); items = []; objects.replaceChildren();
  villagers.classList.remove('happy');
  document.querySelectorAll('.villager').forEach(v => { v.src = A + 'villager.svg'; });
  $('#confetti').replaceChildren();
  overlay.classList.add('hidden');
  message.textContent = 'Collect blue and golden drops. Avoid rocks and dirty water!';
  updateHUD();
  for (let i = 0; i < 15; i++) spawn(300 + i * 180, i % 7 === 5 ? 'gold' : i % 5 === 4 ? 'rock' : 'blue');
  layout(0);
  last = performance.now();
  raf = requestAnimationFrame(tick);
  world.focus();
}

// y is the item's centre height above the bottom of the world (as before)
function spawn(x, type) {
  if (type === 'rock' && Math.random() < 0.4) type = 'dirty';
  const def = TYPES[type];
  const y = type === 'gold' || type === 'blue' ? groundY() + 55 + Math.random() * 45 : groundY() + 20;
  const img = el('img', { src: def.src, alt: def.label, className: 'item ' + type, draggable: false });
  const item = { id: uid++, x, y, type, el: img, taken: false, def };
  if (def.points > 0) img.addEventListener('pointerdown', e => { e.preventDefault(); collect(item); });
  objects.append(img);
  items.push(item);
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
  popText(item, (points > 0 ? '+' : '\u2212') + Math.abs(points), points < 0);
  if (points < 0) {
    player.classList.remove('hurt'); void player.offsetWidth; player.classList.add('hurt');
  }
  message.textContent = points > 0 ? `Clean water collected! +${points}%` : 'Ouch! A hazard! \u221210%';
  updateHUD();
  if (score >= GOAL) finish(true);
}

function jump() {
  if (state === 'playing' && jumpHeight === 0) velocityY = JUMP;
}

function setFrame(name) {
  if (frame !== name) { frame = name; sprite.src = FRAMES[name]; }
}

// Visual update only: sprite direction, animation frame, parallax and item positions
function layout(dir) {
  const s = scale(), px = playerX - camera;
  player.style.left = px + 'px';
  player.style.transform = `translateX(-50%) translateY(${-jumpHeight}px) scaleX(${face})`;
  const mode = jumpHeight > 0 ? 'jump' : dir ? 'run' : 'idle';
  player.classList.toggle('run', mode === 'run');
  player.classList.toggle('idle', mode === 'idle');
  setFrame(mode === 'jump' ? 'jump' : mode === 'run' ? RUN_CYCLE[Math.floor(animT / 0.09) % 4] : 'idle');
  shadow.style.left = px + 'px';
  shadow.style.bottom = (groundY() - world.clientHeight * 0.013) + 'px';
  shadow.style.opacity = Math.max(0.2, 1 - jumpHeight / 160);
  sky.style.backgroundPosition = `${-camera * 0.1}px bottom`;
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
  const dt = Math.min((now - last) / 1000, 0.045);
  last = now;
  time = Math.max(0, time - dt);
  if (time <= 0) { updateHUD(); finish(false); return; }
  const dir = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
  if (dir) { face = dir; animT += dt; } else animT = 0;
  playerX = Math.max(30, playerX + dir * SPEED * dt);
  velocityY -= GRAVITY * dt;
  jumpHeight = Math.max(0, jumpHeight + velocityY * dt);
  if (jumpHeight === 0) velocityY = 0;
  camera = Math.max(0, playerX - width() * 0.24);
  for (const item of items) {
    if (item.taken) continue;
    if (Math.abs(item.x - playerX) < 32 && Math.abs(item.y - (groundY() + jumpHeight + 25)) < 42) collect(item);
  }
  spawnClock += dt;
  if (spawnClock > 1.15) {
    spawnClock = 0;
    const maxX = Math.max(playerX + width(), ...items.slice(-1).map(i => i.x));
    spawn(maxX + 120, Math.random() < 0.13 ? 'gold' : Math.random() < 0.22 ? 'rock' : 'blue');
  }
  items = items.filter(i => !i.taken && i.x > camera - 200);
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
    document.querySelectorAll('.villager').forEach(v => { v.src = A + 'villager-happy.svg'; });
    confetti();
    screen('You Saved the Village!', '<span class="stat">Water Collected: 100%</span><br>The villagers have clean water!',
      [['Play Again', start, true], ['Main Menu', menu]], { titleClass: 'ribbon', cast: cast(true) });
  } else {
    screen('Time\u2019s Up!', `You didn\u2019t collect enough water.<br><span class="stat">Water Collected: ${score}%</span>`,
      [['Try Again', start, true], ['Main Menu', menu]], { titleClass: 'lose', cast: cast(false, true) });
  }
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
