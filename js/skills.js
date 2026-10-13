/* The skills view. Opens from the menu (Skills). Each circle is a category; choosing one writes the command
   (> ls ./back-end) and then lists its technologies line by line on the right, ending with a blinking cursor.
   Esc, the CLOSE button or another menu choice leaves it. No backend: content is in skills-data.js. */
(function () {
  'use strict';

  var DATA = Array.isArray(window.SKILLS) ? window.SKILLS : [];
  var dock = document.querySelector('.dock');
  if (!dock) return;
  var host = dock.parentNode;
  if (!DATA.length) console.error('skills: skills-data.js did not load or is empty.');

  // where each circle sits inside the 480px ring: [x from the centre, y from the centre, diameter]
  var POSITIONS = [[-100, -105, 120], [60, -130, 104], [120, -5, 140], [-140, 70, 112], [-20, -5, 96], [-5, 125, 112], [110, 130, 100]];
  var R_OUT = 238, CENTRE = 240;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function svg(tag, attrs) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // ---- build ----
  var view = el('section', 'sv'); view.setAttribute('role', 'dialog'); view.setAttribute('aria-label', 'Skills'); view.setAttribute('aria-hidden', 'true');
  var label = el('div', 'sv-label', 'SELECTED - SKILLS'); label.appendChild(el('i'));
  var close = el('button', 'sv-close'); close.type = 'button';
  close.appendChild(el('span', null, 'ESC')); close.appendChild(document.createTextNode('CLOSE'));
  view.appendChild(label); view.appendChild(close);

  var orb = el('div', 'sv-orb');
  var rings = svg('svg', { 'class': 'sv-rings', viewBox: '0 0 480 480', 'aria-hidden': 'true' });
  rings.appendChild(svg('circle', { 'class': 'r1', cx: CENTRE, cy: CENTRE, r: R_OUT }));
  rings.appendChild(svg('circle', { 'class': 'r2', cx: CENTRE, cy: CENTRE, r: 222 }));
  var ticks = svg('g', { 'class': 'ticks' });
  for (var t = 0; t < 72; t++) {                                       // fine tick marks between the two rings
    var a = t * 5 * Math.PI / 180;
    ticks.appendChild(svg('line', { 'class': 'tick', x1: CENTRE + Math.cos(a) * 227, y1: CENTRE + Math.sin(a) * 227, x2: CENTRE + Math.cos(a) * (t % 6 ? 231 : 235), y2: CENTRE + Math.sin(a) * (t % 6 ? 231 : 235) }));
  }
  rings.appendChild(ticks);
  var arcs = svg('g', { 'class': 'arcs' });
  function arcPath(a0, a1) {
    var p0 = [CENTRE + R_OUT * Math.cos(a0 * Math.PI / 180), CENTRE + R_OUT * Math.sin(a0 * Math.PI / 180)];
    var p1 = [CENTRE + R_OUT * Math.cos(a1 * Math.PI / 180), CENTRE + R_OUT * Math.sin(a1 * Math.PI / 180)];
    return 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A' + R_OUT + ' ' + R_OUT + ' 0 0 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2);
  }
  arcs.appendChild(svg('path', { 'class': 'arc', d: arcPath(-6, 6) }));      // points at the chosen circle
  arcs.appendChild(svg('path', { 'class': 'arc', d: arcPath(150, 172) }));
  rings.appendChild(arcs);
  orb.appendChild(rings);
  view.appendChild(orb);

  var num = el('div', 'sv-num', '00');
  var cap = el('div', 'sv-cap');
  var about = el('div', 'sv-about');
  var cmd = el('div', 'sv-cmd');
  var list = el('ul', 'sv-list'); list.setAttribute('aria-live', 'polite');
  var prompt = el('div', 'sv-prompt');
  var track = el('div', 'sv-track'), thumb = el('div', 'sv-thumb'); track.appendChild(thumb);
  var cur = el('span', 'sv-cur');
  [num, cap, about, cmd, list, prompt, track].forEach(function (n) { view.appendChild(n); });
  host.appendChild(view);

  var bubbles = [], current = -1, isOpen = false, run = 0, spin = 0;

  DATA.slice(0, POSITIONS.length).forEach(function (c, k) {
    var p = POSITIONS[k];
    var b = el('button', 'sv-bub'); b.type = 'button';
    b.style.width = b.style.height = p[2] + 'px';
    b.style.left = (CENTRE + p[0] - p[2] / 2) + 'px'; b.style.top = (CENTRE + p[1] - p[2] / 2) + 'px';
    b.style.setProperty('--i', k);
    b.style.setProperty('--dur', rand(5.5, 9).toFixed(1) + 's'); b.style.setProperty('--dl', (-rand(0, 6)).toFixed(1) + 's');
    b.style.setProperty('--fx', rand(-4, 4).toFixed(1) + 'px'); b.style.setProperty('--fy', rand(-5, 5).toFixed(1) + 'px');
    b.appendChild(document.createTextNode(c.name));
    b.appendChild(el('small', null, pad(k + 1)));
    b.addEventListener('click', function () { select(k); });
    orb.appendChild(b); bubbles.push(b);
  });

  // ---- the big number flickers through random digits before it settles on the category number ----
  async function scramble(target, token) {
    var end = pad(target);
    for (var i = 0; i < 9; i++) {
      if (token !== run) return;
      num.textContent = pad(Math.floor(rand(0, 99)));
      await sleep(40);
    }
    if (token === run) num.textContent = end;
  }

  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  function placeCursor(parent, typing) { cur.classList.toggle('typing', !!typing); parent.appendChild(cur); }

  async function select(k) {
    if (k === current || !DATA[k] || !bubbles[k]) return;
    var c = DATA[k], token = ++run; current = k;
    bubbles.forEach(function (b, i) { b.classList.toggle('on', i === k); b.setAttribute('aria-pressed', i === k ? 'true' : 'false'); });

    // the white arcs on the ring turn to point at the chosen circle (extra full turns so it always spins forward)
    var p = POSITIONS[k], ang = Math.atan2(p[1], p[0]) * 180 / Math.PI;
    spin += 360; arcs.style.transform = 'rotate(' + (spin + ang) + 'deg)';
    thumb.style.height = (100 / bubbles.length) + '%'; thumb.style.top = (k * 100 / bubbles.length) + '%';

    cap.textContent = 'CATEGORY ' + pad(k + 1) + ' OF ' + pad(bubbles.length) + '  -  ' + c.items.length + ' ' + (c.items.length === 1 ? 'TECHNOLOGY' : 'TECHNOLOGIES');
    about.textContent = c.about || '';
    list.textContent = ''; prompt.textContent = ''; cmd.textContent = '';
    scramble(k + 1, token);                                            // the big number is the category's number, from 01

    // the command is typed, then each line of the list is written
    var text = '> ls ./' + slug(c.name), node = document.createTextNode('');
    cmd.appendChild(node); placeCursor(cmd, true);
    for (var i = 0; i < text.length; i++) {
      node.data += text.charAt(i);
      await sleep(rand(14, 32));
      if (token !== run) return;
    }
    await sleep(220); if (token !== run) return;
    for (var r = 0; r < c.items.length; r++) {
      var row = el('li', 'sv-row'); row.appendChild(el('span', null, c.items[r][0])); row.appendChild(el('span', null, c.items[r][1]));
      list.appendChild(row);
      await sleep(rand(130, 230)); if (token !== run) return;
    }
    // a prompt line under the list, with the blinking cursor at the end of the text
    prompt.style.top = (292 + 1 + c.items.length * 48 + 14) + 'px';
    prompt.appendChild(document.createTextNode('> '));
    placeCursor(prompt, false);
  }

  function open() {
    if (isOpen) return;
    isOpen = true; current = -1;
    view.classList.add('open'); view.setAttribute('aria-hidden', 'false');
    select(0);                                                         // always starts on the first category
    setTimeout(function () { if (isOpen && bubbles[0]) bubbles[0].focus({ preventScroll: true }); }, 450);
  }
  function shut() {
    if (!isOpen) return;
    isOpen = false; run++; view.classList.remove('open'); view.setAttribute('aria-hidden', 'true');
  }

  close.addEventListener('click', shut);
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { if (!document.querySelector('.menu.open')) shut(); }
    else if (/^Arrow(Down|Right|Up|Left)$/.test(e.key)) {
      e.preventDefault();
      var step = /Down|Right/.test(e.key) ? 1 : -1, n = (current + step + bubbles.length) % bubbles.length;
      select(n); bubbles[n].focus({ preventScroll: true });
    }
  });

  window.skillsView = { open: open, close: shut, isOpen: function () { return isOpen; } };
})();