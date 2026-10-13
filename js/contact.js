/* The contact view. Opens from the menu (Contact). A trail of channel nodes, like a workflow canvas:
   choose a node (click, or the arrow keys) and the big button below does its job: copy the address or open the link.
   The CV button on the left opens your CV. Esc or CLOSE leaves it. No backend: content is in contact-data.js. */
(function () {
  'use strict';

  var DATA = window.CONTACT || {};
  var CH = Array.isArray(DATA.channels) ? DATA.channels : [];
  var dock = document.querySelector('.dock');
  if (!dock) return;
  var host = dock.parentNode;
  if (!CH.length) console.error('contact: contact-data.js did not load or is empty.');

  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function svg(tag, attrs) { var e = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); return e; }

  // small line icons, drawn here so nothing depends on a font. Anything unknown falls back to short text.
  var ICONS = {
    mail:  ['M3 6h18v12H3z', 'M3 7l9 6 9-6'],
    phone: ['M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z']
  };
  var TEXT = { whatsapp: 'WA', dev: 'DEV', linkedin: 'IN', github: '</>' };
  function icon(id) {
    if (ICONS[id]) {
      var s = svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'aria-hidden': 'true' });
      ICONS[id].forEach(function (d) { s.appendChild(svg('path', { d: d })); });
      return s;
    }
    return document.createTextNode(TEXT[id] || id.slice(0, 2).toUpperCase());
  }

  // ---- layout: the first five on the top row, the rest on the lower row (positions match the design) ----
  var ROW1_X = [440, 590, 710, 830, 950], ROW1_Y = 170, ROW2_Y = 345, ROW2_X0 = 830, STEP2 = 120;
  var pos = CH.map(function (c, i) { return i < 5 ? { x: ROW1_X[i], y: ROW1_Y } : { x: ROW2_X0 + (i - 5) * STEP2, y: ROW2_Y }; });
  var n1 = Math.min(CH.length, 5), n2 = Math.max(CH.length - 5, 0);

  // ---- build ----
  var view = el('section', 'cv'); view.setAttribute('role', 'dialog'); view.setAttribute('aria-label', 'Contact'); view.setAttribute('aria-hidden', 'true');
  var label = el('div', 'cv-label', 'SELECTED - CONTACT'); label.appendChild(el('i'));
  var close = el('button', 'cv-close'); close.type = 'button';
  close.appendChild(el('span', null, 'ESC')); close.appendChild(document.createTextNode('CLOSE'));
  view.appendChild(label); view.appendChild(close);
  view.appendChild(el('div', 'cv-dots'));

  // left column: CONNECT (this view) and CV, then the channel boxes
  var sb = el('div', 'cv-sb');
  sb.appendChild(el('div', 'cv-hv cv-hatch'));
  var connect = el('div', 'cv-mode on', 'CONNECT'); connect.style.top = '0';
  var cvBtn = el('a', 'cv-mode', (DATA.cv && DATA.cv.label) || 'CV'); cvBtn.style.top = '46px';
  cvBtn.href = (DATA.cv && DATA.cv.href) || '#'; cvBtn.target = '_blank'; cvBtn.rel = 'noopener noreferrer';
  sb.appendChild(connect); sb.appendChild(cvBtn);
  sb.appendChild(el('div', 'cv-t', 'CHANNELS'));
  var boxes = [];
  CH.forEach(function (c, i) {
    var b = el('button', 'cv-ic'); b.type = 'button'; b.setAttribute('aria-label', c.label);
    b.style.left = (64 + (i % 3) * 48) + 'px'; b.style.top = (144 + Math.floor(i / 3) * 48) + 'px';
    b.appendChild(icon(c.id));
    b.addEventListener('click', function () { select(i); });
    sb.appendChild(b); boxes.push(b);
  });
  var add = el('div', 'cv-ic add', '+'); add.style.left = (64 + (CH.length % 3) * 48) + 'px'; add.style.top = (144 + Math.floor(CH.length / 3) * 48) + 'px';
  sb.appendChild(add);
  sb.appendChild(el('div', 'cv-vl'));
  sb.appendChild(el('div', 'cv-corner'));
  sb.appendChild(el('div', 'cv-auto', 'AUTO'));
  sb.appendChild(el('div', 'cv-hb cv-hatch'));
  view.appendChild(sb);

  // the wires: group outlines and the dashed trail that winds from the top row down to the lower row
  var wires = svg('svg', { 'class': 'cv-wires', viewBox: '0 0 1475 720', 'aria-hidden': 'true' });
  function C(i) { return { x: pos[i].x, y: pos[i].y + 24, w: i === 0 ? 56 : 48 }; }
  if (n1 >= 5) wires.appendChild(svg('path', { 'class': 'grp', d: 'M800 150 H1036 Q1048 150 1048 162 V264 Q1048 276 1036 276 H812 Q800 276 800 264 Z' }));
  var lastX2 = ROW2_X0 + Math.max(n2 - 1, 0) * STEP2;
  if (n2) wires.appendChild(svg('path', { 'class': 'grp', d: 'M806 322 H' + (lastX2 + 270) + ' Q' + (lastX2 + 282) + ' 322 ' + (lastX2 + 282) + ' 334 V434 Q' + (lastX2 + 282) + ' 446 ' + (lastX2 + 270) + ' 446 H818 Q806 446 806 434 Z' }));
  function wire(d) { wires.appendChild(svg('path', { 'class': 'wire', d: d })); }
  for (var i = 0; i < CH.length - 1; i++) {
    if (i === 4 && n2) {
      wire('M998 194 H1070 Q1082 194 1082 206 V292 Q1082 304 1070 304 H770 Q758 304 758 316 V357 Q758 369 770 369 H830');   // the winding turn
    } else {
      var a = C(i), b = C(i + 1), same = a.y === b.y;
      if (same) wire('M' + (a.x + a.w + 2) + ' ' + a.y + ' H' + (b.x));
    }
  }
  // the plus node after the last channel
  var last = C(CH.length - 1), px = last.x + last.w + 94;
  wire('M' + (last.x + last.w + 2) + ' ' + last.y + ' H' + (px - 12));
  wires.appendChild(svg('circle', { 'class': 'plus', cx: px, cy: last.y, r: 11 }));
  wires.appendChild(svg('path', { 'class': 'plus', d: 'M' + (px - 5) + ' ' + last.y + ' H' + (px + 5) + ' M' + px + ' ' + (last.y - 5) + ' V' + (last.y + 5) }));
  view.appendChild(wires);

  var nodes = [];
  CH.forEach(function (c, i) {
    var n = el('button', 'cv-n' + (i === 0 ? ' first' : '')); n.type = 'button';
    n.style.left = pos[i].x + 'px'; n.style.top = pos[i].y + 'px'; n.style.setProperty('--i', i);
    n.setAttribute('aria-label', c.label + ' - ' + c.sub);
    if (i) n.appendChild(el('span', 'cv-pi'));
    n.appendChild(icon(c.id)); n.appendChild(el('span', 'cv-p'));
    n.addEventListener('click', function () { select(i); });
    view.appendChild(n); nodes.push(n);
    var lb = el('div', 'cv-lb'); lb.style.left = (pos[i].x - 6) + 'px'; lb.style.top = (pos[i].y + 60) + 'px'; lb.style.setProperty('--i', i);
    lb.appendChild(document.createTextNode(c.label)); var sub = el('small', null, c.sub); lb.appendChild(sub);
    c._sub = sub; view.appendChild(lb);
  });
  var ed = el('div', 'cv-ed', '1 click'); ed.style.left = '530px'; ed.style.top = '178px';
  view.appendChild(ed);

  var go = el('button', 'cv-go'); go.type = 'button';
  view.appendChild(go);
  host.appendChild(view);

  var current = -1, isOpen = false, timers = {};

  function select(i) {
    if (!CH[i]) return;
    current = i;
    nodes.forEach(function (n, k) { n.classList.toggle('sel', k === i); n.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    boxes.forEach(function (b, k) { b.classList.toggle('on', k === i); });
    go.textContent = CH[i].button || (CH[i].kind === 'copy' ? 'COPY' : 'OPEN');
  }

  // copy with the clipboard API, or the old way where that is blocked (plain http, older browsers)
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); } finally { document.body.removeChild(t); }
    });
  }
  function flash(c, text) {                                           // the small line under the node tells what happened, then goes back
    clearTimeout(timers[c.id]); c._sub.textContent = text;
    timers[c.id] = setTimeout(function () { c._sub.textContent = c.sub; }, 1800);
  }
  function run() {
    var c = CH[current]; if (!c) return;
    if (c.kind === 'copy') {
      copy(c.value).then(function () { flash(c, 'Copied: ' + c.value); }, function () { flash(c, c.value); });   // if copying is blocked, show it so it can be copied by hand
      var old = go.textContent; go.textContent = 'COPIED';
      setTimeout(function () { if (current >= 0 && CH[current] === c) go.textContent = c.button || old; }, 1400);
    } else if (c.href) {
      window.open(c.href, '_blank', 'noopener');
    }
  }
  go.addEventListener('click', run);

  function open() {
    if (isOpen) return;
    isOpen = true;
    view.classList.add('open'); view.setAttribute('aria-hidden', 'false');
    select(0);                                                         // always starts on the first channel
    setTimeout(function () { if (isOpen && nodes[0]) nodes[0].focus({ preventScroll: true }); }, 450);
  }
  function shut() {
    if (!isOpen) return;
    isOpen = false; view.classList.remove('open'); view.setAttribute('aria-hidden', 'true');
  }

  close.addEventListener('click', shut);
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { if (!document.querySelector('.menu.open')) shut(); }
    else if (/^Arrow(Down|Right|Up|Left)$/.test(e.key)) {
      e.preventDefault();
      var step = /Down|Right/.test(e.key) ? 1 : -1, n = (current + step + CH.length) % CH.length;
      select(n); nodes[n].focus({ preventScroll: true });
    }
  });

  window.contactView = { open: open, close: shut, isOpen: function () { return isOpen; } };
})();
