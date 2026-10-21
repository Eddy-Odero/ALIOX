/* The project index. Opens when Projects is chosen (terminal button or the menu). The projects are windows on a helix that turns:
   the chosen one comes to the front, its description, details and links are on the right. Click a window, drag to spin the helix,
   or use the arrow keys. The empty frames higher and lower on the helix are places for projects still to come.
   Esc, the CLOSE button or the dock menu leaves it. No backend: content is in projects-data.js. */
(function () {
  'use strict';

  var DATA = window.PROJECTS;
  var dock = document.querySelector('.dock');
  if (!dock) return;
  var host = dock.parentNode;
  if (!Array.isArray(DATA) || !DATA.length) { console.error('projects: projects-data.js did not load or is empty.'); }
  DATA = Array.isArray(DATA) ? DATA : [];
  var calm = /[?&]calm\b/.test(location.search);

  var STAGE_W = 1475, CX = 737, CY = 352;
  var R = 270, STEP = 0.8, YS = 50, CARD_W = 250, CARD_H = 172, PERSP = 1000;
  var SLOTS = Math.max(9, DATA.length);

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

  var view = el('section', 'pv'); view.setAttribute('aria-label', 'Selected projects'); view.setAttribute('role', 'dialog'); view.setAttribute('aria-hidden', 'true');
  var label = el('div', 'pv-label', 'SELECTED - PROJECTS'); label.appendChild(el('i'));
  var close = el('button', 'pv-close'); close.type = 'button';
  close.appendChild(el('span', null, 'ESC')); close.appendChild(document.createTextNode('CLOSE'));
  var rails = el('canvas', 'pv-rails'); rails.setAttribute('aria-hidden', 'true');
  var stage = el('div', 'pv-stage'), helix = el('div', 'pv-helix'); stage.appendChild(helix);
  var side = el('div', 'pv-side');
  var cap = el('div', 'pv-cap'), name = el('div', 'pv-name'), desc = el('p', 'pv-desc'), meta = el('div', 'pv-meta'), links = el('div', 'pv-links');
  [cap, name, desc, meta, links].forEach(function (n) { side.appendChild(n); });
  var big = el('div', 'pv-big', 'PROJECTS'), hint = el('div', 'pv-hint', 'THE HELIX TURNS. CLICK A WINDOW, DRAG TO SPIN, OR USE THE ARROW KEYS');
  [rails, stage, label, close, side, big, hint].forEach(function (n) { view.appendChild(n); });
  host.appendChild(view);

  // ---- the windows ----
  var cards = [];
  for (var k = 0; k < SLOTS; k++) (function (k) {
    var p = DATA[k], real = !!p;
    var c = el('div', 'pv-card' + (real ? '' : ' ghost')); c.tabIndex = real ? 0 : -1;
    if (real) { c.setAttribute('role', 'button'); c.setAttribute('aria-label', p.name); } else c.setAttribute('aria-hidden', 'true');
    var bar = el('div', 'bar'); bar.appendChild(el('i')); bar.appendChild(el('i')); bar.appendChild(el('i')); bar.appendChild(el('span', null, real ? pad(k + 1) + ' / ' + pad(DATA.length) : 'SOON'));
    var body = el('div', 'body');
    body.appendChild(el('div', 'hero')); var row = el('div', 'tiles'); for (var j = 0; j < 5; j++) row.appendChild(el('b')); body.appendChild(row);
    c.appendChild(bar); c.appendChild(body); c.appendChild(el('div', 'ttl', real ? p.name : 'NEXT PROJECT'));
    if (real && p.image) {
      var img = new Image(); img.alt = '';
      img.onload = function () { body.classList.add('has'); body.appendChild(img); };    // only added if the file exists
      img.src = p.image;
    }
    if (real) {
      c.addEventListener('click', function () { if (!dragged) choose(k); });
      c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(k); } });
    }
    helix.appendChild(c); cards.push(c);
  })(k);

  // ---- state ----
  var spin = 0, spinGoal = 0, offY = 0, offGoal = 0, sel = -1, isOpen = false, raf = 0, last = 0, shown = -1;
  var dragging = false, dragged = false, dragX = 0, hoverCard = -1, scale = 1;
  var ctx = rails.getContext('2d'), pr = 1;
  var dust = [], sd = 9; function rnd() { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; }
  for (var q = 0; q < 220; q++) dust.push([rnd() * STAGE_W, 40 + rnd() * 640, 0.1 + rnd() * 0.4]);

  function sizeRails() {
    var r = view.getBoundingClientRect(); scale = r.width / STAGE_W || 1;
    pr = Math.min(Math.max(scale * (window.devicePixelRatio || 1), 1), 1.5);
    rails.width = Math.round(STAGE_W * pr); rails.height = Math.round(720 * pr);
  }
  function proj(th, y) {                                              // the same maths the browser applies to the windows
    var x = Math.sin(th) * R, z = Math.cos(th) * R, cs = Math.cos(spin), sn = Math.sin(spin);
    var x2 = x * cs + z * sn, z2 = -x * sn + z * cs, s = PERSP / (PERSP - z2);
    return [CX + x2 * s, CY + (y + offY) * s];
  }

  function applyCards() {
    cards.forEach(function (c, k) {
      var th = k * STEP, y = k * YS, co = Math.cos(th + spin), near = (co + 1) / 2;
      c.style.transform = 'translateY(' + (y + offY).toFixed(1) + 'px) rotateY(' + th.toFixed(4) + 'rad) translateZ(' + R + 'px)';
      var o = k === sel ? 1 : (0.2 + 0.62 * near) * (k >= DATA.length ? 0.35 : 1) + (k === hoverCard ? 0.2 : 0);
      c.style.opacity = Math.min(o, 1).toFixed(3);
      c.style.zIndex = String(Math.round(near * 100));
    });
    helix.style.transform = 'translate3d(' + CX + 'px,' + CY + 'px,0) rotateY(' + spin.toFixed(4) + 'rad)';
  }
  function drawRails() {
    ctx.setTransform(pr, 0, 0, pr, 0, 0); ctx.clearRect(0, 0, STAGE_W, 720);
    for (var i = 0; i < dust.length; i++) { var d = dust[i]; ctx.fillStyle = 'rgba(255,255,255,' + d[2] + ')'; ctx.fillRect(d[0], d[1], 1.4, 1.4); }
    ctx.lineWidth = 1;
    for (var rail = 0; rail < 2; rail++) {
      ctx.beginPath();
      for (var t = -STEP * 1.5; t <= STEP * (SLOTS + 0.5); t += 0.05) { var p = proj(t + rail * Math.PI, t / STEP * YS); t === -STEP * 1.5 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); }
      ctx.strokeStyle = 'rgba(255,255,255,' + (rail ? 0.12 : 0.24) + ')'; ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.moveTo(CX, 70); ctx.lineTo(CX, 660); ctx.stroke();
  }

  function restart(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }
  function show(k) {
    if (k === shown) return; shown = k;
    var p = DATA[k]; if (!p) return;
    cap.textContent = 'PROJECT ' + pad(k + 1) + ' OF ' + pad(DATA.length);
    name.textContent = p.name; desc.textContent = p.description || '';
    meta.textContent = ''; (p.meta || []).forEach(function (m) { var r = el('div', 'pv-row'); r.appendChild(el('span', null, m[0])); r.appendChild(el('span', null, m[1])); meta.appendChild(r); });
    links.textContent = '';
    (p.links || []).forEach(function (l) { var a = el('a', null, l[0] + '  >'); a.href = l[1]; a.target = '_blank'; a.rel = 'noopener noreferrer'; links.appendChild(a); });
    restart(side, 'pv-rise');
  }
  function choose(k) {
    if (!DATA[k]) return;
    sel = k; show(k);
    spinGoal = spin + wrap(-k * STEP - spin);                         // the shortest way round
    offGoal = -k * YS;
    cards.forEach(function (c, i) { c.classList.toggle('on', i === k); });
    if (calm) { spin = spinGoal; offY = offGoal; applyCards(); drawRails(); }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min((now - last) / 1000 || 0.016, 0.1); last = now;
    if (!dragging) {
      var f = Math.min(dt * 4, 1);
      spin += (spinGoal - spin) * f; offY += (offGoal - offY) * f;
    }
    applyCards(); drawRails();
  }

  // drag to spin; letting go settles on the nearest project
  stage.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    dragging = true; dragged = false; dragX = e.clientX;
  });
  window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - dragX;
    if (Math.abs(dx) > 4) dragged = true;
    if (dragged) { spin += dx / scale * 0.006; spinGoal = spin; dragX = e.clientX; }
  });
  window.addEventListener('pointerup', function () {
    if (!dragging) return; dragging = false;
    if (dragged) {
      var best = 0, bd = 9; DATA.forEach(function (p, k) { var d = Math.abs(wrap(k * STEP + spin)); if (d < bd) { bd = d; best = k; } });
      choose(best);
      setTimeout(function () { dragged = false; }, 0);
    }
  });
  stage.addEventListener('pointerover', function (e) { var c = e.target.closest && e.target.closest('.pv-card'); hoverCard = c && !c.classList.contains('ghost') ? cards.indexOf(c) : -1; });
  stage.addEventListener('pointerleave', function () { hoverCard = -1; });
  window.addEventListener('resize', function () { if (isOpen) sizeRails(); });

  function open() {
    if (isOpen) return;
    isOpen = true; sizeRails();
    spin = -STEP * 3; offY = 120; shown = -1; hoverCard = -1;          // starts turned away, then swings round to the first project
    view.classList.add('open'); view.setAttribute('aria-hidden', 'false');
    choose(0);
    if (!calm) { applyCards(); }
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    setTimeout(function () { if (isOpen && cards[0]) cards[0].focus({ preventScroll: true }); }, 500);
  }
  function shut() {
    if (!isOpen) return;
    isOpen = false; cancelAnimationFrame(raf); view.classList.remove('open'); view.setAttribute('aria-hidden', 'true');
  }

  close.addEventListener('click', shut);
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { if (!document.querySelector('.menu.open')) shut(); }
    else if (/^Arrow(Down|Right|Up|Left)$/.test(e.key) && DATA.length) {
      e.preventDefault();
      var n = (sel + (/Down|Right/.test(e.key) ? 1 : -1) + DATA.length) % DATA.length;
      choose(n); cards[n].focus({ preventScroll: true });
    }
  });

  window.projectsView = { open: open, close: shut, isOpen: function () { return isOpen; } };
})();