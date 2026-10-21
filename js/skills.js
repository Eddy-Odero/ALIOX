/* The skills view. Opens from the menu (Skills). Each category is a glass layer in an isometric stack, drawn on a canvas (no libraries).
   Choosing a layer lifts the ones above it away, brightens it and lists its technologies on the right; each technology is also a
   numbered block on the layer, and pointing at a row lights its block. Click a layer or its name, or use the arrow keys.
   Esc, the CLOSE button or another menu choice leaves it. No backend: content is in skills-data.js (first category = top layer). */
(function () {
  'use strict';

  var DATA = Array.isArray(window.SKILLS) ? window.SKILLS.slice(0, 7) : [];
  var dock = document.querySelector('.dock');
  if (!dock) return;
  var host = dock.parentNode;
  if (!DATA.length) console.error('skills: skills-data.js did not load or is empty.');
  var calm = /[?&]calm\b/.test(location.search);
  var tier = 'med';
  try { var sv = localStorage.getItem('tier'); if (/^(high|med|saver)$/.test(sv)) tier = sv; } catch (e) {}

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  // the stack, in stage units
  var STAGE_W = 1475, STAGE_H = 720, CX = 560, CY = 548, S = 110, GAP = 40, LIFT = 150, THICK = 8;
  var N = DATA.length;                                   // layer k=0 is the top; level (from the bottom) is N-1-k
  function iso(x, y, z, ox) { return [CX + (ox || 0) + (x - y) * 0.866, CY + (x + y) * 0.5 - z]; }

  var view = el('section', 'sv'); view.setAttribute('role', 'dialog'); view.setAttribute('aria-label', 'Skills'); view.setAttribute('aria-hidden', 'true');
  var label = el('div', 'sv-label', 'SELECTED - SKILLS'); label.appendChild(el('i'));
  var close = el('button', 'sv-close'); close.type = 'button';
  close.appendChild(el('span', null, 'ESC')); close.appendChild(document.createTextNode('CLOSE'));
  var canvas = el('canvas', 'sv-canvas'); canvas.setAttribute('aria-hidden', 'true');
  view.appendChild(canvas); view.appendChild(label); view.appendChild(close);
  view.appendChild(el('div', 'sv-big', 'SKILLS'));
  view.appendChild(el('div', 'sv-hint', 'CLICK A LAYER TO LIFT IT OUT, OR USE THE ARROW KEYS'));

  // the names on the left, one per layer, real buttons so the keyboard works
  var labs = DATA.map(function (c, k) {
    var b = el('button', 'sv-lab'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
    b.appendChild(el('b', null, pad(k + 1))); b.appendChild(document.createTextNode(c.name));
    b.addEventListener('click', function () { select(k); });
    b.addEventListener('pointerenter', function () { hoverLayer = k; });
    b.addEventListener('pointerleave', function () { hoverLayer = -1; });
    view.appendChild(b); return b;
  });

  // the panel on the right
  var panel = el('div', 'sv-panel');
  var cmd = el('div', 'sv-cmd'), title = el('div', 'sv-title'), about = el('p', 'sv-about'), list = el('ul', 'sv-list');
  [cmd, title, about, list].forEach(function (n) { panel.appendChild(n); });
  view.appendChild(panel);
  host.appendChild(view);

  var ctx = canvas.getContext('2d'), pr = 1, isOpen = false, raf = 0, last = 0, t0 = 0;
  var sel = 0, hoverLayer = -1, hoverItem = -1, lifts = [], build = 0, mx = 0.5;
  for (var q = 0; q < N; q++) lifts.push(0);
  var dust = [], sd = 21; function rnd() { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; }
  for (q = 0; q < 200; q++) dust.push([rnd() * STAGE_W, rnd() * STAGE_H, 0.08 + rnd() * 0.35]);

  function sizeCanvas() {
    var r = view.getBoundingClientRect(), s = r.width / STAGE_W || 1;
    pr = Math.min(Math.max(s * (window.devicePixelRatio || 1), 1), tier === 'high' ? 2 : 1.5);
    canvas.width = Math.round(STAGE_W * pr); canvas.height = Math.round(STAGE_H * pr);
  }

  // geometry of layer k right now
  function zOf(k) { var lv = N - 1 - k; return lv * GAP * build + lifts[k]; }
  function oxOf(k) { return (mx - 0.5) * 26 * ((N - 1 - k) / Math.max(N - 1, 1)); }
  function corners(k, s) { var z = zOf(k), ox = oxOf(k); s = s || S; return [iso(-s, -s, z, ox), iso(s, -s, z, ox), iso(s, s, z, ox), iso(-s, s, z, ox)]; }
  function inside(poly, x, y) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      if (((poly[i][1] > y) !== (poly[j][1] > y)) && (x < (poly[j][0] - poly[i][0]) * (y - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])) c = !c;
    }
    return c;
  }
  function chipRect(j) { var col = j % 3, row = Math.floor(j / 3); return [-S * 0.78 + col * 62, -S * 0.5 + row * 62, 48, 48]; }

  function path(pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }

  function drawLayer(k) {
    var on = k === sel, hov = k === hoverLayer && !on, z = zOf(k), ox = oxOf(k), a = on ? 1 : hov ? 0.8 : 0.5;
    var p = corners(k);
    path(p); ctx.fillStyle = on ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.74)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = on ? 2 : 1.2; ctx.stroke(); ctx.lineWidth = 1;
    // the edge of the glass
    var b = [iso(-S, S, z - THICK, ox), iso(S, S, z - THICK, ox), iso(S, -S, z - THICK, ox)];
    ctx.beginPath(); ctx.moveTo(p[3][0], p[3][1]); ctx.lineTo(b[0][0], b[0][1]); ctx.lineTo(b[1][0], b[1][1]); ctx.lineTo(b[2][0], b[2][1]); ctx.lineTo(p[1][0], p[1][1]);
    ctx.moveTo(p[2][0], p[2][1]); ctx.lineTo(b[1][0], b[1][1]); ctx.strokeStyle = 'rgba(255,255,255,' + (on ? 0.9 : 0.4) + ')'; ctx.stroke();
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,' + (on ? 0.22 : 0.09) + ')';
    for (var g = -S + 37; g < S - 1; g += 37) {
      var u = iso(g, -S, z, ox), v = iso(g, S, z, ox); ctx.beginPath(); ctx.moveTo(u[0], u[1]); ctx.lineTo(v[0], v[1]); ctx.stroke();
      u = iso(-S, g, z, ox); v = iso(S, g, z, ox); ctx.beginPath(); ctx.moveTo(u[0], u[1]); ctx.lineTo(v[0], v[1]); ctx.stroke();
    }
    // one block per technology, numbered like the rows on the right
    var items = DATA[k].items || [];
    items.forEach(function (it, j) {
      var r = chipRect(j), x = r[0], y = r[1], w = r[2], h = r[3], lit = on && j === hoverItem, ht = on ? (lit ? 16 : 11) : 5;
      var t = [iso(x, y, z + ht, ox), iso(x + w, y, z + ht, ox), iso(x + w, y + h, z + ht, ox), iso(x, y + h, z + ht, ox)];
      var bs = [iso(x, y + h, z, ox), iso(x + w, y + h, z, ox), iso(x + w, y, z, ox)];
      ctx.beginPath(); ctx.moveTo(t[3][0], t[3][1]); ctx.lineTo(bs[0][0], bs[0][1]); ctx.lineTo(bs[1][0], bs[1][1]); ctx.lineTo(t[2][0], t[2][1]); ctx.closePath();
      ctx.fillStyle = on ? 'rgba(200,200,200,0.75)' : 'rgba(255,255,255,0.12)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(t[1][0], t[1][1]); ctx.lineTo(bs[1][0], bs[1][1]); ctx.lineTo(bs[2][0], bs[2][1]); ctx.lineTo(t[1][0], t[1][1]); ctx.lineTo(t[2][0], t[2][1]); ctx.closePath();
      ctx.fillStyle = on ? 'rgba(150,150,150,0.8)' : 'rgba(255,255,255,0.08)'; ctx.fill();
      path(t); ctx.fillStyle = on ? (lit ? '#fff' : 'rgba(255,255,255,0.9)') : 'rgba(255,255,255,0.22)'; ctx.fill();
      if (on) { var m = iso(x + w / 2, y + h / 2, z + ht, ox); ctx.font = '700 10px "Roboto Mono",monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(pad(j + 1), m[0], m[1] + 3.5); }
    });
  }

  function draw() {
    ctx.setTransform(pr, 0, 0, pr, 0, 0); ctx.clearRect(0, 0, STAGE_W, STAGE_H);
    for (var i = 0; i < dust.length; i++) { var d = dust[i]; ctx.fillStyle = 'rgba(255,255,255,' + d[2] + ')'; ctx.fillRect(d[0], d[1], 1.4, 1.4); }
    for (var lv = 0; lv < N; lv++) drawLayer(N - 1 - lv);                   // bottom to top
    // a line from each name to its layer
    for (var k = 0; k < N; k++) {
      var c = iso(-S, S, zOf(k), oxOf(k)), on = k === sel;
      ctx.beginPath(); ctx.moveTo(268, c[1] + 4); ctx.lineTo(c[0] - 6, c[1]); ctx.strokeStyle = 'rgba(255,255,255,' + (on ? 0.9 : 0.28) + ')'; ctx.stroke();
    }
  }
  function placeLabels() {
    for (var k = 0; k < N; k++) { var c = iso(-S, S, zOf(k), oxOf(k)); labs[k].style.transform = 'translateY(' + (c[1] - 12).toFixed(1) + 'px)'; labs[k].style.opacity = String(Math.min(build * 1.4, 1)); }
  }

  function select(k) {
    if (k < 0 || k >= N) return;
    sel = k; hoverItem = -1;
    labs.forEach(function (b, i) { b.classList.toggle('on', i === k); b.setAttribute('aria-pressed', i === k ? 'true' : 'false'); });
    var c = DATA[k];
    cmd.textContent = '> open ./' + slug(c.name); title.textContent = c.name; about.textContent = c.about || '';
    list.textContent = '';
    (c.items || []).forEach(function (it, j) {
      var li = el('li', 'sv-row'); li.style.setProperty('--r', j);
      var d = el('div'); d.appendChild(el('span', 'sv-k', it[0])); d.appendChild(el('span', 'sv-v', it[1]));
      li.appendChild(d); li.appendChild(el('span', 'sv-n', pad(j + 1)));
      li.addEventListener('pointerenter', function () { hoverItem = j; });
      li.addEventListener('pointerleave', function () { hoverItem = -1; });
      list.appendChild(li);
    });
    panel.classList.remove('swap'); void panel.offsetWidth; panel.classList.add('swap');
    if (calm) { for (var i = 0; i < N; i++) lifts[i] = i < k ? LIFT : 0; build = 1; placeLabels(); draw(); }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min((now - last) / 1000 || 0.016, 0.1); last = now;
    build = calm ? 1 : Math.min(build + dt / 1.1, 1);
    var e = 1 - Math.pow(1 - build, 3); build = build;                     // the stack closes up from flat, easing out
    var bz = calm ? 1 : 1 - Math.pow(1 - build, 3);
    var f = Math.min(dt * 5, 1);
    for (var i = 0; i < N; i++) lifts[i] += ((i < sel ? LIFT : 0) - lifts[i]) * f;
    var saved = build; build = bz; placeLabels(); draw(); build = saved;
  }

  canvas.style.pointerEvents = 'none';
  function toStage(e) { var r = view.getBoundingClientRect(), s = r.width / STAGE_W || 1; return [(e.clientX - r.left) / s, (e.clientY - r.top) / s]; }
  function layerAt(x, y) { for (var lv = N - 1; lv >= 0; lv--) { var k = N - 1 - lv; if (inside(corners(k), x, y)) return k; } return -1; }
  view.addEventListener('pointermove', function (e) {
    var p = toStage(e); mx = Math.max(0, Math.min(1, p[0] / STAGE_W));
    var k = layerAt(p[0], p[1]);
    if (k !== hoverLayer && !(e.target.closest && e.target.closest('.sv-lab'))) hoverLayer = k;
    view.style.cursor = k >= 0 ? 'pointer' : '';
  });
  view.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.sv-lab, .sv-close, .sv-panel')) return;
    var p = toStage(e), k = layerAt(p[0], p[1]); if (k >= 0) select(k);
  });
  window.addEventListener('resize', function () { if (isOpen) sizeCanvas(); });

  function open() {
    if (isOpen) return;
    isOpen = true; view.classList.add('open'); view.setAttribute('aria-hidden', 'false');
    sizeCanvas(); build = calm ? 1 : 0; for (var i = 0; i < N; i++) lifts[i] = 0; hoverLayer = hoverItem = -1;
    select(0); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    setTimeout(function () { if (isOpen && labs[sel]) labs[sel].focus({ preventScroll: true }); }, 500);
  }
  function shut() {
    if (!isOpen) return;
    isOpen = false; cancelAnimationFrame(raf); view.classList.remove('open'); view.setAttribute('aria-hidden', 'true');
  }

  close.addEventListener('click', shut);
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { if (!document.querySelector('.menu.open')) shut(); }
    else if (/^Arrow(Down|Right|Up|Left)$/.test(e.key) && N) {
      e.preventDefault();
      var n = (sel + (/Down|Right/.test(e.key) ? 1 : -1) + N) % N; select(n); labs[n].focus({ preventScroll: true });
    }
  });

  window.skillsView = { open: open, close: shut, isOpen: function () { return isOpen; } };
})();