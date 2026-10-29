"use strict";
// Synthesized with the Web Audio API, so no audio files are needed.
const Sound = (() => {
  let ctx = null, master = null, muted = false;
  try { muted = localStorage.getItem('vwr-muted') === '1'; } catch (e) {}

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
  }
  let primed = false;
  // iOS mutes Web Audio under the silent switch unless an <audio> element has played.
  function prime() {
    if (primed) return;
    primed = true;
    try {
      const a = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQAAAAA=');
      a.setAttribute('playsinline', ''); a.volume = 0.01;
      const p = a.play(); if (p && p.catch) p.catch(() => {});
    } catch (e) {}
    try {
      const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    } catch (e) {}
  }
  function unlock() {
    try {
      init();
      if (!ctx) return Promise.resolve();
      prime();
      return ctx.state === 'running' ? Promise.resolve() : ctx.resume();
    } catch (e) { return Promise.resolve(); }
  }
  for (const ev of ['pointerdown', 'touchend', 'keydown', 'click'])
    window.addEventListener(ev, unlock, { passive: true });
  document.addEventListener('visibilitychange', () => { if (ctx && !document.hidden && !muted) ctx.resume().catch(() => {}); });

  function tone(freq, start, dur, { type = 'sine', vol = 0.4, to = null } = {}) {
    const t = ctx.currentTime + start;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(start, dur, vol, freq) {
    const t = ctx.currentTime + start, n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t);
  }

  const effects = {
    drop() { tone(700, 0, 0.14, { to: 1400, vol: 0.35 }); tone(1400, 0.08, 0.16, { vol: 0.2 }); },
    gold() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.25, { type: 'triangle', vol: 0.3 })); tone(2349, 0.3, 0.4, { vol: 0.15 }); },
    jump() { tone(280, 0, 0.18, { type: 'square', to: 620, vol: 0.12 }); },
    splash() { noise(0, 0.35, 0.5, 1200); tone(400, 0, 0.2, { to: 120, vol: 0.25 }); },
    win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.12, 0.3, { type: 'triangle', vol: 0.3 })); },
    fail() { [392, 330, 262].forEach((f, i) => tone(f, i * 0.22, 0.4, { vol: 0.25 })); }
  };

  return {
    play(name) {
      if (muted || !effects[name]) return;
      try {
        unlock().then(() => { if (ctx && !muted && ctx.state === 'running') effects[name](); }).catch(() => {});
      } catch (e) {}
    },
    isMuted: () => muted,
    setMuted(m) {
      muted = m;
      try { localStorage.setItem('vwr-muted', m ? '1' : '0'); } catch (e) {}
      unlock();
      if (master) master.gain.value = m ? 0 : 0.9;
    }
  };
})();
