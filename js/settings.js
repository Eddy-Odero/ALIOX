/* Settings. The tab on the right edge of the window opens a small panel: sound (on or off, volume, a test button) and ALIOX's
   typing speed. Choices are kept in this browser (localStorage), so they stay after a refresh. Nothing is sent anywhere.
   Other scripts read them through window.settings: sound.js (sound) and chat.js (speed). */
(function () {
  'use strict';

  var KEY = 'portfolio-settings';
  var DEFAULTS = { sound: false, volume: 0.6, speed: 'normal' };
  var SPEEDS = [['slow', 'SLOW', 1.8], ['normal', 'NORMAL', 1], ['fast', 'FAST', 0.45], ['instant', 'INSTANT', 0]];
  var state = {}, listeners = [];

  function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
    state.sound = typeof s.sound === 'boolean' ? s.sound : DEFAULTS.sound;
    state.volume = typeof s.volume === 'number' && s.volume >= 0 && s.volume <= 1 ? s.volume : DEFAULTS.volume;
    state.speed = SPEEDS.some(function (x) { return x[0] === s.speed; }) ? s.speed : DEFAULTS.speed;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function set(k, v) { state[k] = v; save(); listeners.forEach(function (fn) { try { fn(k, v); } catch (e) {} }); sync(); }
  load();

  window.settings = {
    soundOn: function () { return state.sound; },
    volume: function () { return state.volume; },
    speed: function () { return state.speed; },
    speedFactor: function () { var m = SPEEDS.filter(function (x) { return x[0] === state.speed; })[0]; return m ? m[2] : 1; },
    onChange: function (fn) { listeners.push(fn); },
    set: set
  };

  var tab = document.querySelector('.edge-tab');
  var stage = document.getElementById('stage');
  if (!tab || !stage) return;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // ---- the panel ----
  var panel = el('aside', 'st'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Settings'); panel.setAttribute('aria-hidden', 'true');
  var head = el('div', 'st-head');
  var ht = el('div'); ht.appendChild(el('h2', 'st-title', 'Settings')); ht.appendChild(el('span', 'st-sub', 'SAVED IN THIS BROWSER'));
  var x = el('button', 'st-x', 'ESC'); x.type = 'button'; x.setAttribute('aria-label', 'Close settings');
  head.appendChild(ht); head.appendChild(x); panel.appendChild(head);

  // sound
  var sSound = el('section', 'st-sec');
  sSound.appendChild(el('h3', null, 'SOUND'));
  var row1 = el('div', 'st-row'); row1.appendChild(el('span', null, 'Sound effects'));
  var sw = el('button', 'st-sw'); sw.type = 'button'; sw.setAttribute('role', 'switch'); sw.appendChild(el('i')); row1.appendChild(sw);
  var row2 = el('div', 'st-row st-vol'); row2.appendChild(el('span', null, 'Volume'));
  var vol = el('input'); vol.type = 'range'; vol.min = '0'; vol.max = '100'; vol.step = '1'; vol.setAttribute('aria-label', 'Volume');
  var volv = el('b', 'st-val'); row2.appendChild(vol); row2.appendChild(volv);
  var test = el('button', 'st-btn', 'PLAY A TEST SOUND'); test.type = 'button';
  var note = el('p', 'st-note', 'Servo whine when ALIOX moves, typing blips, and a sound as each page opens.');
  [row1, row2, test, note].forEach(function (n) { sSound.appendChild(n); });
  panel.appendChild(sSound);

  // speed
  var sSpeed = el('section', 'st-sec');
  sSpeed.appendChild(el('h3', null, 'ALIOX SPEED'));
  var seg = el('div', 'st-seg'); seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', 'Typing speed');
  var segBtns = SPEEDS.map(function (s) {
    var b = el('button', null, s[1]); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = s[0];
    b.addEventListener('click', function () { set('speed', s[0]); if (window.sfx) window.sfx.tick(); });
    seg.appendChild(b); return b;
  });
  sSpeed.appendChild(seg);
  sSpeed.appendChild(el('p', 'st-note', 'How fast ALIOX writes. Instant shows the whole answer at once. Applies to the next thing it says.'));
  panel.appendChild(sSpeed);

  var reset = el('button', 'st-reset', 'RESET TO DEFAULTS'); reset.type = 'button';
  panel.appendChild(reset);
  stage.appendChild(panel);

  function sync() {
    sw.setAttribute('aria-checked', state.sound ? 'true' : 'false'); sw.classList.toggle('on', state.sound);
    vol.value = String(Math.round(state.volume * 100)); volv.textContent = Math.round(state.volume * 100) + '%';
    row2.classList.toggle('off', !state.sound); vol.disabled = !state.sound; test.disabled = !state.sound;
    segBtns.forEach(function (b) { var on = b.dataset.v === state.speed; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
  }
  sync();

  sw.addEventListener('click', function () { set('sound', !state.sound); if (state.sound && window.sfx) window.sfx.click(); });
  vol.addEventListener('input', function () { set('volume', (+vol.value) / 100); });
  vol.addEventListener('change', function () { if (window.sfx) window.sfx.click(); });
  test.addEventListener('click', function () { if (window.sfx) window.sfx.demo(); });
  reset.addEventListener('click', function () { set('sound', DEFAULTS.sound); set('volume', DEFAULTS.volume); set('speed', DEFAULTS.speed); if (window.sfx) window.sfx.click(); });

  // ---- open and close ----
  var open = false;
  function show() { open = true; panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); tab.classList.add('on'); tab.setAttribute('aria-expanded', 'true'); if (window.sfx) window.sfx.menu(); setTimeout(function () { if (open) sw.focus({ preventScroll: true }); }, 350); }
  function hide() { if (!open) return; open = false; panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); tab.classList.remove('on'); tab.setAttribute('aria-expanded', 'false'); if (window.sfx) window.sfx.close(); }
  tab.setAttribute('aria-label', 'Settings'); tab.setAttribute('aria-haspopup', 'dialog'); tab.setAttribute('aria-expanded', 'false');
  tab.addEventListener('click', function () { open ? hide() : show(); });
  x.addEventListener('click', hide);
  document.addEventListener('keydown', function (e) { if (open && e.key === 'Escape') { e.stopPropagation(); hide(); } }, true);
  document.addEventListener('pointerdown', function (e) { if (open && !panel.contains(e.target) && !tab.contains(e.target)) hide(); });
})();