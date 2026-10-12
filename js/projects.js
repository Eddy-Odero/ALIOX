/* The project index. Opens when Projects is chosen (button in the terminal or the menu), shows the selected
   project's picture, description and details on the left and the list on the right. Click a project to change it.
   Esc, the CLOSE button or a click on the dock menu leaves it. No backend: the content is in projects-data.js. */
(function () {
  'use strict';

  var DATA = window.PROJECTS;
  var dock = document.querySelector('.dock');
  if (!dock) return;
  var host = dock.parentNode;
  if (!Array.isArray(DATA) || !DATA.length) { console.error('projects: projects-data.js did not load or is empty.'); }
  DATA = Array.isArray(DATA) ? DATA : [];

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var view = el('section', 'pv'); view.setAttribute('aria-label', 'Selected projects'); view.setAttribute('role', 'dialog');
  var label = el('div', 'pv-label', 'SELECTED - PROJECTS'); label.appendChild(el('i'));
  var close = el('button', 'pv-close'); close.type = 'button';
  close.appendChild(el('span', null, 'ESC')); close.appendChild(document.createTextNode('CLOSE'));
  var desc = el('p', 'pv-desc');
  var mark = el('div', 'pv-mark');
  var shot = el('div', 'pv-shot');
  var meta = el('div', 'pv-meta');
  var links = el('div', 'pv-links');
  var num = el('div', 'pv-num', '00');
  var cap = el('div', 'pv-cap');
  var list = el('div', 'pv-list'); list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', 'Projects');
  [label, close, desc, mark, shot, meta, links, num, cap, list].forEach(function (n) { view.appendChild(n); });
  host.appendChild(view);

  var items = [], current = -1, isOpen = false;

  DATA.forEach(function (p, k) {
    var b = el('button', 'pv-item'); b.type = 'button'; b.style.setProperty('--i', k);
    b.setAttribute('role', 'option');
    b.appendChild(el('b', null, pad(k + 1)));
    b.appendChild(document.createTextNode(p.name));
    b.addEventListener('click', function () { select(k, true); });
    list.appendChild(b); items.push(b);
  });

  // the big number counts through random digits before it settles on the chosen project's number
  var spinId = 0;
  async function scramble(n) {
    var id = ++spinId, end = pad(n);
    for (var i = 0; i < 9; i++) {
      if (id !== spinId) return;
      num.textContent = pad(Math.floor(Math.random() * 99));
      await new Promise(function (r) { setTimeout(r, 40); });
    }
    if (id === spinId) num.textContent = end;
  }

  function restart(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }

  function select(k, animate) {
    if (k === current || !DATA[k]) return;
    var p = DATA[k]; current = k;
    items.forEach(function (b, i) { b.classList.toggle('on', i === k); b.setAttribute('aria-selected', i === k ? 'true' : 'false'); });

    cap.textContent = 'PROJECT ' + pad(k + 1) + ' OF ' + pad(DATA.length);
    if (animate !== false) scramble(k + 1); else num.textContent = pad(k + 1);
    desc.textContent = p.description || '';
    meta.textContent = '';
    (p.meta || []).forEach(function (m) {
      var r = el('div', 'pv-row'); r.appendChild(el('span', null, m[0])); r.appendChild(el('span', null, m[1])); meta.appendChild(r);
    });
    links.textContent = '';
    (p.links || []).forEach(function (l) {
      var a = el('a', null, l[0] + '  ↗'); a.href = l[1]; a.target = '_blank'; a.rel = 'noopener noreferrer'; links.appendChild(a);
    });

    shot.textContent = '';                                  // a plain card with the name sits under the picture
    var ph = el('div', 'pv-ph', p.name); ph.appendChild(el('small', null, 'PROJECT ' + pad(k + 1)));
    shot.appendChild(ph);
    if (p.image) {
      var img = new Image(); img.alt = p.name + ' preview';
      img.onload = function () { shot.appendChild(img); };   // only added if the file exists
      img.src = p.image;
    }
    if (animate !== false) {
      restart(shot, 'swap'); restart(desc, 'pv-rise'); restart(meta, 'pv-rise'); restart(links, 'pv-rise');
    }
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    current = -1; select(0, true);                           // always starts on the first project
    view.classList.add('open');
    view.setAttribute('aria-hidden', 'false');
    setTimeout(function () { if (isOpen && items[0]) items[0].focus({ preventScroll: true }); }, 450);
  }
  function shut() {
    if (!isOpen) return;
    isOpen = false; view.classList.remove('open'); view.setAttribute('aria-hidden', 'true');
  }

  close.addEventListener('click', shut);
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { if (!document.querySelector('.menu.open')) shut(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      var n = current + (e.key === 'ArrowDown' ? 1 : -1);
      n = (n + DATA.length) % DATA.length;
      select(n, true); items[n].focus({ preventScroll: true });
    }
  });
  view.setAttribute('aria-hidden', 'true');

  window.projectsView = { open: open, close: shut, isOpen: function () { return isOpen; } };
})();