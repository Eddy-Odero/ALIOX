/* Sound. Everything is made in the browser with the Web Audio API (no audio files): a servo whine that follows ALIOX's neck while it
   moves, typing blips, a power-up when ALIOX starts, a whoosh when the text flies off, a click on buttons and a sound for each page
   as it opens. Turned on and off, and set to a volume, in the settings panel (settings.js). Browsers only allow sound after the
   visitor has clicked or pressed a key once, so nothing plays before that. window.sfx holds the sounds if you want to call them. */
(function () {
  'use strict';

  var S = window.settings, AC = window.AudioContext || window.webkitAudioContext;
  var noop = function () {};
  var sfx = window.sfx = { click: noop, tick: noop, select: noop, type: noop, menu: noop, close: noop, page: noop, demo: noop, process: noop, power: noop, glitch: noop };
  if (!S || !AC) return;

  var ctx = null, master = null, noiseBuf = null, servo = null, unlocked = false;

  function ensure() {
    if (ctx) return true;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain(); master.gain.value = gainFor(S.volume());
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6;
    master.connect(comp); comp.connect(ctx.destination);
    var len = ctx.sampleRate, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = b;
    buildServo();
    return true;
  }
  function gainFor(v) { return v * v * 0.9; }                       // the slider feels even to the ear
  function on() { return !!ctx && ctx.state === 'running' && S.soundOn(); }
  S.onChange(function (k) { if (k === 'volume' && master) master.gain.setTargetAtTime(gainFor(S.volume()), ctx.currentTime, 0.02); });

  // browsers need a click or key first
  function unlock() {
    if (unlocked) return;
    if (!ensure()) return;
    var p = ctx.resume(); if (p && p.then) p.then(function () { unlocked = ctx.state === 'running'; }); else unlocked = true;
    if (ctx.state === 'running') unlocked = true;
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, unlock, { capture: true, passive: true }); });

  // ---- building blocks ----
  function tone(o) {
    if (!on()) return;
    var t = ctx.currentTime + (o.delay || 0), osc = ctx.createOscillator(), g = ctx.createGain(), dur = o.dur || 0.1, out = g;
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(o.vol || 0.1, 0.0002), t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    if (o.lp) { var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); out = f; }
    out.connect(master); osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(o) {
    if (!on()) return;
    var t = ctx.currentTime + (o.delay || 0), src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), dur = o.dur || 0.2;
    src.buffer = noiseBuf; src.loop = true;
    f.type = o.kind || 'bandpass'; f.Q.value = o.q || 1; f.frequency.setValueAtTime(o.f0 || 1000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    var peak = o.vol || 0.1, att = o.attack || Math.min(0.02, dur / 3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + att);
    if (o.swell) { g.gain.exponentialRampToValueAtTime(peak * 1.0, t + dur * 0.8); }
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  // ---- the servo whine: always running, silent until the neck moves ----
  function buildServo() {
    var a = ctx.createOscillator(), b = ctx.createOscillator(), mix = ctx.createGain(), lp = ctx.createBiquadFilter(), gS = ctx.createGain();
    a.type = 'sine'; b.type = 'triangle'; a.frequency.value = 180; b.frequency.value = 362;
    mix.gain.value = 0.5; lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.7; gS.gain.value = 0;
    a.connect(mix); b.connect(mix); mix.connect(lp); lp.connect(gS); gS.connect(master); a.start(); b.start();
    var n = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), gN = ctx.createGain();
    n.buffer = noiseBuf; n.loop = true; nf.type = 'bandpass'; nf.frequency.value = 1800; nf.Q.value = 1.2; gN.gain.value = 0;
    n.connect(nf); nf.connect(gN); gN.connect(master); n.start();
    var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5; lg.gain.value = 2; lfo.connect(lg); lg.connect(a.frequency); lg.connect(b.frequency); lfo.start();
    servo = { a: a, b: b, lp: lp, gS: gS, gN: gN };
  }
  function anyViewOpen() {
    return ['about', 'skills', 'projects', 'contact'].some(function (n) { var v = window[n + 'View']; return v && v.isOpen && v.isOpen(); });
  }
  setInterval(function () {
    if (!servo) return;
    var t = ctx.currentTime, lvl = 0, run = false;
    if (on() && !document.hidden && !anyViewOpen() && window.robot && window.robot.motion) {
      var m = window.robot.motion(), sp = Math.abs(m.yaw) + 0.8 * Math.abs(m.pitch);
      lvl = Math.min(sp / 1.5, 1); run = m.mode === 'run';
    }
    var hum = 0;                    // a low hum while ALIOX is "thinking"
    servo.gS.gain.setTargetAtTime(lvl * 0.014, t, 0.08);
    servo.gN.gain.setTargetAtTime(lvl * 0.008, t, 0.08);
    var f = 150 + lvl * 120;
    servo.a.frequency.setTargetAtTime(f, t, 0.06); servo.b.frequency.setTargetAtTime(f * 2.01, t, 0.06);
    servo.lp.frequency.setTargetAtTime(500 + lvl * 700, t, 0.08);
  }, 60);

  // ---- the sounds ----
  var lastType = 0, lastTick = 0;
  sfx.click = function () { tone({ f: 1900, to: 700, dur: 0.05, type: 'triangle', vol: 0.12 }); noise({ dur: 0.03, f0: 4000, q: 0.7, vol: 0.05 }); };
  sfx.tick = function () { var n = performance.now(); if (n - lastTick < 40) return; lastTick = n; tone({ f: 2700, dur: 0.02, type: 'sine', vol: 0.05 }); };
  sfx.select = function () { tone({ f: 640, to: 1100, dur: 0.07, type: 'triangle', vol: 0.1 }); tone({ f: 1500, dur: 0.05, type: 'sine', vol: 0.05, delay: 0.05 }); };
  sfx.type = function () {                                          // ALIOX typing
    var n = performance.now(); if (n - lastType < 38 || Math.random() < 0.3) return; lastType = n;
    tone({ f: 750 + Math.random() * 700, dur: 0.022, type: 'square', vol: 0.03, lp: 2600 });
  };
  sfx.menu = function () { noise({ dur: 0.28, f0: 500, f1: 3200, q: 0.9, vol: 0.09 }); tone({ f: 160, to: 70, dur: 0.14, type: 'sine', vol: 0.14 }); };
  sfx.close = function () { noise({ dur: 0.2, f0: 2600, f1: 400, q: 0.9, vol: 0.07 }); tone({ f: 520, to: 220, dur: 0.12, type: 'triangle', vol: 0.07 }); };
  sfx.whoosh = function () { noise({ dur: 0.6, f0: 300, f1: 3600, q: 1.1, vol: 0.12, attack: 0.15 }); };
  var booted = false;
  sfx.power = function () {                                         // ALIOX starts up
    tone({ f: 70, to: 520, dur: 0.7, type: 'sawtooth', vol: 0.09, lp: 900, attack: 0.1 });
    tone({ f: 140, to: 1040, dur: 0.7, type: 'square', vol: 0.03, lp: 1500, attack: 0.1 });
    noise({ dur: 0.7, f0: 400, f1: 4000, q: 1.2, vol: 0.09, attack: 0.2 });
    tone({ f: 1320, dur: 0.12, type: 'sine', vol: 0.08, delay: 0.72 }); tone({ f: 1760, dur: 0.16, type: 'sine', vol: 0.07, delay: 0.82 });
  };
  sfx.process = function () {                                       // ALIOX starts working on an answer
    noise({ dur: 0.45, f0: 500, f1: 2800, q: 1.2, vol: 0.08, attack: 0.1 });
    for (var i = 0; i < 4; i++) tone({ f: 500 + Math.random() * 900, dur: 0.03, type: 'square', vol: 0.03, lp: 2400, delay: 0.1 + i * 0.07 });
  };
  sfx.glitch = function () {
    for (var i = 0; i < 5; i++) noise({ dur: 0.03 + Math.random() * 0.04, f0: 1500 + Math.random() * 4000, q: 3, vol: 0.06, delay: i * 0.035 });
  };
  // one signature for each page
  sfx.page = function (name) {
    if (name === 'about') {                                         // a soft low note
      tone({ f: 196, dur: 1.4, type: 'sine', vol: 0.05, attack: 0.15 }); tone({ f: 294, dur: 1.2, type: 'sine', vol: 0.025, attack: 0.2, delay: 0.1 });
    } else if (name === 'skills') {                                 // the layers of the stack drop into place
      for (var k = 0; k < 7; k++) { tone({ f: 190 - k * 12, to: 60, dur: 0.14, type: 'triangle', vol: 0.13, delay: k * 0.085 }); noise({ dur: 0.04, f0: 1200, q: 1, vol: 0.05, delay: k * 0.085 }); }
      tone({ f: 1500, dur: 0.12, type: 'sine', vol: 0.05, delay: 0.7 });
    } else if (name === 'projects') {                               // the helix swings round and settles
      noise({ dur: 0.9, f0: 250, f1: 3000, q: 1, vol: 0.1, attack: 0.25 });
      for (var j = 0; j < 5; j++) tone({ f: 900 + j * 90, dur: 0.03, type: 'square', vol: 0.035, lp: 2400, delay: 0.1 + j * 0.13 });
      tone({ f: 220, to: 110, dur: 0.25, type: 'triangle', vol: 0.1, delay: 0.85 });
    } else if (name === 'contact') {                                // a sonar ping, then each channel arrives
      tone({ f: 880, dur: 0.9, type: 'sine', vol: 0.1 }); tone({ f: 1320, dur: 0.7, type: 'sine', vol: 0.04, delay: 0.02 });
      for (var c = 0; c < 7; c++) tone({ f: 1100 + c * 140, to: 1500 + c * 160, dur: 0.06, type: 'triangle', vol: 0.05, delay: 0.95 + c * 0.13 });
    }
  };
  sfx.demo = function () {
    if (!ensure()) return; unlock();
    tone({ f: 120, to: 420, dur: 0.5, type: 'sawtooth', vol: 0.08, lp: 1000, attack: 0.08 });
    noise({ dur: 0.5, f0: 1800, q: 5, vol: 0.05 });
    for (var i = 0; i < 6; i++) tone({ f: 800 + Math.random() * 700, dur: 0.025, type: 'square', vol: 0.04, lp: 2600, delay: 0.55 + i * 0.07 });
    tone({ f: 1320, dur: 0.14, type: 'sine', vol: 0.09, delay: 1.05 }); tone({ f: 1760, dur: 0.2, type: 'sine', vol: 0.08, delay: 1.15 });
  };

  // ---- connecting the sounds to the page ----
  // pages: the sound plays when one opens, and a soft one when it closes
  ['about', 'skills', 'projects', 'contact'].forEach(function (name) {
    var v = window[name + 'View']; if (!v || !v.open) return;
    var o = v.open, c = v.close;
    v.open = function () { var was = v.isOpen(); var r = o.apply(v, arguments); if (!was) sfx.page(name); return r; };
    v.close = function () { var was = v.isOpen(); var r = c.apply(v, arguments); if (was) sfx.close(); return r; };
  });
  // ALIOX
  var rb = window.robot;
  if (rb) {
    var pulse = rb.pulse, setMode = rb.setMode, glitch = rb.glitch, lastMode = 'idle';
    rb.pulse = function () { sfx.type(); return pulse.apply(rb, arguments); };
    rb.setMode = function (m) {
      var prev = lastMode; lastMode = m;
      if (m === 'run' && prev !== 'run') { if (!booted) { booted = true; sfx.power(); } else sfx.process(); }
      return setMode.apply(rb, arguments);
    };
    rb.glitch = function () { sfx.glitch(); return glitch.apply(rb, arguments); };
  }
  // the menu
  var menu = document.querySelector('.menu');
  if (menu && window.MutationObserver) {
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        var was = (m.oldValue || '').indexOf('open') > -1, now = menu.classList.contains('open');
        if (now && !was) sfx.menu(); else if (!now && was) sfx.close();
      });
    }).observe(menu, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  }
  // buttons, choices and hovering
  var PICK = '.tb, .menu-item, .sv-lab, .cv-node, .pv-card:not(.ghost), .cv-btn, .pv-links a, .menu-social, .cv-item a';
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest(PICK); if (!t) return;
    if (t.matches('.sv-lab, .cv-node, .pv-card')) sfx.select(); else sfx.click();
  }, true);
  document.addEventListener('pointerover', function (e) {
    var t = e.target.closest && e.target.closest('.tb, .menu-item, .sv-lab, .cv-node, .pv-card:not(.ghost)'); if (t && !t.contains(e.relatedTarget)) sfx.tick();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (/^Arrow(Up|Down|Left|Right)$/.test(e.key) && anyViewOpen() && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) sfx.select();
  }, true);
})();