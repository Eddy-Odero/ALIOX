/* The contact view. Opens from the menu (Contact). Channels sit on a trail in groups; choosing one fills the panel on the right:
   the address and a mail form, a CV preview, the latest Dev.to articles, the latest GitHub repositories, and so on.
   Esc or CLOSE leaves it. No backend and no key: the only outside requests are two read-only public APIs (Dev.to, GitHub),
   kept for the visit in sessionStorage, and the page shows a plain link if they fail. Content is in contact-data.js. */
(function () {
  'use strict';

  var DATA = window.CONTACT || {};
  var GROUPS = Array.isArray(DATA.groups) ? DATA.groups : [];
  var CH = DATA.channels || {};
  var dock = document.querySelector('.dock');
  if (!dock) return;
  var host = dock.parentNode;

  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function svg(tag, attrs) { var e = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); return e; }

  // line icons drawn here so nothing depends on a font; the rest show short text
  var ICONS = {
    email: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'],
    phone: ['M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z'],
    cv:    ['M6 3h8l4 4v14H6z', 'M14 3v4h4', 'M9 12h6M9 16h6']
  };
  var TEXT = { whatsapp: 'WA', devto: 'DEV', linkedin: 'IN', github: '</>' };
  function icon(id) {
    if (ICONS[id]) {
      var s = svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'aria-hidden': 'true' });
      ICONS[id].forEach(function (d) { s.appendChild(svg('path', { d: d })); });
      return s;
    }
    return document.createTextNode(TEXT[id] || id.slice(0, 2).toUpperCase());
  }

  // only ever open links that point where we expect (the data file, or addresses the public APIs return)
  function safe(url, prefixes) {
    return typeof url === 'string' && prefixes.some(function (p) { return url.indexOf(p) === 0; }) ? url : null;
  }

  // ---- the scene: tilted rings around a particle core, one channel sitting on a ring each ----
  var STAGE_W = 1475, STAGE_H = 720, CX = 470, CY = 372, TILT = 0.6;
  var RADII = [92, 160, 228, 296, 364];
  var calm = /[?&]calm\b/.test(location.search);
  var tier = 'med';
  try { var sv = localStorage.getItem('tier'); if (/^(high|med|saver)$/.test(sv)) tier = sv; } catch (e) {}

  var view = el('section', 'cv'); view.setAttribute('role', 'dialog'); view.setAttribute('aria-label', 'Contact'); view.setAttribute('aria-hidden', 'true');
  var label = el('div', 'cv-label', 'SELECTED - CONTACT'); label.appendChild(el('i'));
  var close = el('button', 'cv-close'); close.type = 'button';
  close.appendChild(el('span', null, 'ESC')); close.appendChild(document.createTextNode('CLOSE'));
  view.appendChild(label); view.appendChild(close);
  var canvas = el('canvas', 'cv-canvas'); canvas.setAttribute('aria-hidden', 'true'); view.appendChild(canvas);
  view.appendChild(el('div', 'cv-title2', 'CONTACT'));
  view.appendChild(el('div', 'cv-hint', 'EACH RING IS A WAY IN. CHOOSE ONE, OR USE THE ARROW KEYS'));

  var order = [], cells = {}, nodes = [];
  GROUPS.forEach(function (g) {
    (g.ids || []).filter(function (id) { return CH[id]; }).forEach(function (id) {
      var i = order.length, c = CH[id];
      var b = el('button', 'cv-node', c.label); b.type = 'button'; b.setAttribute('aria-label', c.label);
      (function (n) { b.addEventListener('click', function () { select(n); }); })(i);
      view.appendChild(b); cells[id] = b; order.push(id);
      var ring = [1, 2, 3, 4, 2, 3, 4][i % 7];   // fixed spots, chosen so no two boxes meet; only the light moves round the rings
      nodes.push({ id: id, el: b, ring: ring, ang: [-2.5, -0.5, 0.9, 2.4, 2.2, -1.4, -2.8][i] != null ? [-2.5, -0.5, 0.9, 2.4, 2.2, -1.4, -2.8][i] : i * 2.05, x: 0, y: 0 });
    });
  });
  var ctx = canvas.getContext('2d'), pr = 1, W2 = STAGE_W, H2 = STAGE_H;
  var core = [], seed0 = 5;
  function rnd() { seed0 = (seed0 * 1664525 + 1013904223) >>> 0; return seed0 / 4294967296; }
  for (var q = 0; q < (tier === 'saver' ? 420 : 900); q++) { var a1 = rnd() * 6.2832, b1 = Math.acos(2 * rnd() - 1); core.push([Math.sin(b1) * Math.cos(a1), Math.cos(b1), Math.sin(b1) * Math.sin(a1)]); }
  var dust = []; for (q = 0; q < 140; q++) dust.push([rnd() * STAGE_W, rnd() * STAGE_H, 0.1 + rnd() * 0.45]);
  var hovering = false, raf = 0, last = 0, t0 = 0, spinT = 0, pulse = 0;
  var SPEED = [0.14, 0.11, 0.085, 0.065, 0.05];

  function sizeCanvas() {
    var r = view.getBoundingClientRect(), s = r.width / STAGE_W || 1;
    pr = Math.min(Math.max(s * (window.devicePixelRatio || 1), 1), tier === 'high' ? 2 : 1.5);
    canvas.width = Math.round(STAGE_W * pr); canvas.height = Math.round(STAGE_H * pr);
  }
  function ell(R, a) { return [CX + Math.cos(a) * R, CY + Math.sin(a) * R * TILT]; }

  function draw(dt) {
    var t = spinT;
    ctx.setTransform(pr, 0, 0, pr, 0, 0); ctx.clearRect(0, 0, STAGE_W, STAGE_H);
    var sel = current >= 0 ? nodes[current] : null;
    // dust
    for (var i = 0; i < dust.length; i++) { var d = dust[i]; ctx.fillStyle = 'rgba(255,255,255,' + (d[2] * (0.6 + 0.4 * Math.sin(t * 0.6 + i))) + ')'; ctx.fillRect(d[0], d[1], 1.4, 1.4); }
    // rings
    ctx.lineWidth = 1;
    RADII.forEach(function (R, k) {
      ctx.beginPath(); ctx.ellipse(CX, CY, R, R * TILT, 0, 0, 6.2832);
      var on = sel && sel.ring === k;
      ctx.strokeStyle = 'rgba(255,255,255,' + (on ? 0.7 : 0.38 - k * 0.05) + ')';
      ctx.setLineDash(k % 2 ? [2, 6] : []); ctx.stroke(); ctx.setLineDash([]);
    });
    // a bright arc travelling round the chosen ring, and a quieter one on each of the others
    RADII.forEach(function (R, k) {
      var on = sel && sel.ring === k, a0 = t * SPEED[k] * 2.2 + k * 1.7, len = on ? 1.5 : 0.7;
      ctx.beginPath(); for (var a = a0; a < a0 + len; a += 0.04) { var p = ell(R, a); a === a0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); }
      ctx.strokeStyle = 'rgba(255,255,255,' + (on ? 1 : 0.55) + ')'; ctx.lineWidth = on ? 2.6 : 1.8; ctx.stroke();
    });
    ctx.lineWidth = 1;
    // lines from the core to every channel; the chosen one is bright
    nodes.forEach(function (n, k) {
      var on = sel === n;
      ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(n.x, n.y);
      ctx.strokeStyle = 'rgba(255,255,255,' + (on ? 0.9 : 0.18) + ')'; ctx.lineWidth = on ? 1.6 : 1; ctx.stroke();
      if (on) { var f = (t * 0.7) % 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(CX + (n.x - CX) * f, CY + (n.y - CY) * f, 3, 0, 6.2832); ctx.fill(); }
    });
    ctx.lineWidth = 1;
    // core: a turning ball of points
    var ca = Math.cos(t * 0.35), sa = Math.sin(t * 0.35);
    for (i = 0; i < core.length; i++) {
      var c3 = core[i], x = c3[0] * ca + c3[2] * sa, z = -c3[0] * sa + c3[2] * ca, s = 1 / (1 - z * 0.25);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + 0.7 * (z + 1) / 2) + ')'; ctx.fillRect(CX + x * 52 * s, CY + c3[1] * 52 * s, 1.7, 1.7);
    }
    ctx.beginPath(); ctx.arc(CX, CY, 58, 0, 6.2832); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(CX, CY, 58 + 8 + ((t * 14) % 22), 0, 6.2832); ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 * (1 - ((t * 14) % 22) / 22)) + ')'; ctx.stroke();
    ctx.font = '700 11px "Roboto Mono",monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('YOU', CX, CY + 4);
  }
  function place() {
    nodes.forEach(function (n) {
      var p = ell(RADII[n.ring], n.ang); n.x = p[0]; n.y = p[1];
      var depth = (Math.sin(n.ang) + 1) / 2;                       // nearer (lower on the screen) nodes sit a touch larger
      n.el.style.transform = 'translate(' + (n.x - 46).toFixed(1) + 'px,' + (n.y - 16).toFixed(1) + 'px) scale(' + (0.92 + 0.14 * depth).toFixed(3) + ')';
    });
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < (tier === 'saver' ? 33 : 15)) return;
    var dt = Math.min((now - last) / 1000, 0.1); last = now;
    if (!calm) spinT += dt;
    place(); draw(dt);
  }
  view.addEventListener('pointerover', function (e) { hovering = !!(e.target.closest && e.target.closest('.cv-node, .cv-panel')); });
  view.addEventListener('pointerout', function (e) { if (!e.relatedTarget || !(e.relatedTarget.closest && e.relatedTarget.closest('.cv-node, .cv-panel'))) hovering = false; });
  window.addEventListener('resize', function () { if (isOpen) sizeCanvas(); });

  // the panel
  var panel = el('div', 'cv-panel');
  var ph = el('div', 'cv-ph'), phl = el('div');
  var cmd = el('div', 'cv-cmd'), title = el('div', 'cv-title'), cap = el('div', 'cv-cap');
  phl.appendChild(cmd); phl.appendChild(title); ph.appendChild(phl); ph.appendChild(cap);
  var body = el('div', 'cv-body');
  panel.appendChild(ph); panel.appendChild(body);
  view.appendChild(panel);
  host.appendChild(view);

  var current = -1, isOpen = false, token = 0;
  // (current, isOpen are used by the scene above only after they exist)

  // ---- helpers ----
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); } finally { document.body.removeChild(t); }
    });
  }
  function copyBtn(text, what) {
    var b = el('button', 'cv-btn', 'COPY ' + what); b.type = 'button';
    b.addEventListener('click', function () {
      copy(text).then(function () { b.textContent = 'COPIED'; }, function () { b.textContent = 'SELECT AND COPY'; });
      setTimeout(function () { b.textContent = 'COPY ' + what; }, 1500);
    });
    return b;
  }
  function linkBtn(text, href, main, extra) {
    var a = el('a', 'cv-btn' + (main ? ' main' : ''), text); a.href = href;
    if (!/^(mailto|tel):/.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    if (extra) Object.keys(extra).forEach(function (k) { a.setAttribute(k, extra[k]); });
    return a;
  }
  function field(parent, labelText, node) { parent.appendChild(el('label', 'cv-lab', labelText)); parent.appendChild(node); }
  function fetchJSON(url, key) {
    try { var c = sessionStorage.getItem(key); if (c) return Promise.resolve(JSON.parse(c)); } catch (e) {}
    var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).then(function (j) { try { sessionStorage.setItem(key, JSON.stringify(j)); } catch (e) {} return j; });
  }
  function fmtDate(s) {
    var d = new Date(s); if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function listItem(r, href, t, sub, hint) {
    var li = el('li', 'cv-item'); li.style.setProperty('--r', r);
    var a = el('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
    var d = el('div'); d.appendChild(el('span', 'cv-it', t)); d.appendChild(el('span', 'cv-is', sub));
    a.appendChild(d); a.appendChild(el('span', 'cv-go', hint));
    li.appendChild(a); return li;
  }

  // ---- what each kind of channel shows ----
  var BUILD = {
    email: function (c) {
      cap.textContent = 'MAIL APP OPENS - NOTHING IS SENT FROM HERE';
      body.appendChild(el('div', 'cv-big', c.value));
      var row = el('div', 'cv-row'); row.appendChild(copyBtn(c.value, 'EMAIL')); body.appendChild(row);
      var subj = el('input', 'cv-in'); subj.type = 'text'; subj.maxLength = 120; subj.placeholder = 'What is it about?'; subj.setAttribute('autocomplete', 'off');
      var msg = el('textarea', 'cv-in'); msg.rows = 4; msg.maxLength = 1500; msg.placeholder = 'Write your message';
      field(body, 'SUBJECT', subj); field(body, 'MESSAGE', msg);
      var send = el('button', 'cv-btn main', 'SEND EMAIL'); send.type = 'button'; send.style.marginTop = '16px';
      send.addEventListener('click', function () {
        var a = el('a'); a.href = 'mailto:' + c.value + '?subject=' + encodeURIComponent(subj.value) + '&body=' + encodeURIComponent(msg.value);
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      });
      body.appendChild(send);
    },
    phone: function (c) {
      cap.textContent = 'CALL OR COPY';
      body.appendChild(el('div', 'cv-big', c.value));
      var row = el('div', 'cv-row');
      row.appendChild(linkBtn('CALL', 'tel:' + c.value.replace(/[^+\d]/g, ''), true)); row.appendChild(copyBtn(c.value, 'NUMBER'));
      body.appendChild(row);
      body.appendChild(el('div', 'cv-note', 'East Africa Time, UTC+3. Messages on WhatsApp are usually quicker.'));
    },
    whatsapp: function (c) {
      cap.textContent = 'OPENS A CHAT WITH THE MESSAGE FILLED IN';
      body.appendChild(el('div', 'cv-big', '+' + c.number));
      var msg = el('textarea', 'cv-in'); msg.rows = 5; msg.maxLength = 1000; msg.value = c.message || '';
      field(body, 'MESSAGE', msg);
      var go = el('button', 'cv-btn main', 'OPEN WHATSAPP'); go.type = 'button'; go.style.marginTop = '16px';
      go.addEventListener('click', function () { window.open('https://wa.me/' + c.number.replace(/\D/g, '') + '?text=' + encodeURIComponent(msg.value), '_blank', 'noopener'); });
      body.appendChild(go);
    },
    cv: function (c) {
      cap.textContent = 'PDF';
      var frame = el('iframe', 'cv-pdf'); frame.title = 'CV preview';
      var src = c.href + '#toolbar=0&navpanes=0&view=FitH';
      if (/^https?:$/.test(location.protocol)) {                                  // only where we can check: say so if the file is missing
        fetch(c.href, { method: 'HEAD' }).then(function (r) { if (r.ok) frame.src = src; else missing(); }, missing);
      } else frame.src = src;
      var row = el('div', 'cv-row');
      function missing() { var m = el('div', 'cv-wait', 'No CV found yet. Put your PDF at ' + c.href + '.'); frame.replaceWith(m); row.remove(); }
      body.appendChild(frame);
      row.style.marginTop = '14px';
      row.appendChild(linkBtn('DOWNLOAD', c.href, true, { download: c.file || '' })); row.appendChild(linkBtn('OPEN IN NEW TAB', c.href));
      body.appendChild(row);
    },
    devto: function (c, t) {
      cap.textContent = 'LATEST ARTICLES';
      var wait = el('div', 'cv-wait', 'fetching articles'); wait.appendChild(el('span', 'cv-cur')); body.appendChild(wait);
      var profile = 'https://dev.to/' + encodeURIComponent(c.username);
      function fallback(text) {
        if (t !== token) return;
        wait.textContent = text; var row = el('div', 'cv-row'); row.appendChild(linkBtn('OPEN DEV.TO PROFILE', profile, true)); body.appendChild(row);
      }
      fetchJSON('https://dev.to/api/articles?username=' + encodeURIComponent(c.username) + '&per_page=' + (c.count || 3), 'cv-devto').then(function (list) {
        if (t !== token) return;
        var items = (Array.isArray(list) ? list : []).filter(function (a) { return safe(a.url, ['https://dev.to/']); }).slice(0, c.count || 3);
        if (!items.length) return fallback('No articles to show yet.');
        wait.remove();
        var ul = el('ul', 'cv-list');
        items.forEach(function (a, r) {
          var sub = [fmtDate(a.published_at), a.reading_time_minutes ? a.reading_time_minutes + ' min read' : '', typeof a.public_reactions_count === 'number' ? a.public_reactions_count + ' reactions' : ''].filter(Boolean).join('  -  ');
          ul.appendChild(listItem(r, a.url, a.title || 'Untitled', sub, 'READ'));
        });
        body.appendChild(ul);
        var row = el('div', 'cv-row'); row.appendChild(linkBtn('ALL ARTICLES', profile, true)); body.appendChild(row);
      }, function () { fallback('Could not load the articles right now.'); });
    },
    github: function (c, t) {
      cap.textContent = 'RECENT REPOSITORIES';
      var wait = el('div', 'cv-wait', 'fetching repositories'); wait.appendChild(el('span', 'cv-cur')); body.appendChild(wait);
      var profile = 'https://github.com/' + encodeURIComponent(c.username);
      function fallback(text) {
        if (t !== token) return;
        wait.textContent = text; var row = el('div', 'cv-row'); row.appendChild(linkBtn('OPEN GITHUB PROFILE', profile, true)); body.appendChild(row);
      }
      fetchJSON('https://api.github.com/users/' + encodeURIComponent(c.username) + '/repos?sort=pushed&per_page=12', 'cv-github').then(function (list) {
        if (t !== token) return;
        var items = (Array.isArray(list) ? list : []).filter(function (r) { return !r.fork && safe(r.html_url, ['https://github.com/']); }).slice(0, c.count || 4);
        if (!items.length) return fallback('No public repositories to show yet.');
        wait.remove();
        var ul = el('ul', 'cv-list');
        items.forEach(function (r, k) {
          var sub = [r.description, r.language, r.stargazers_count ? r.stargazers_count + ' stars' : ''].filter(Boolean).join('  -  ');
          ul.appendChild(listItem(k, r.html_url, r.name, sub || 'No description', 'OPEN'));
        });
        body.appendChild(ul);
        var row = el('div', 'cv-row'); row.appendChild(linkBtn('OPEN GITHUB PROFILE', profile, true)); body.appendChild(row);
      }, function () { fallback('Could not load the repositories right now.'); });
    },
    link: function (c) {
      cap.textContent = 'PROFILE';
      body.appendChild(el('div', 'cv-big', c.sub || c.label));
      var row = el('div', 'cv-row'); row.appendChild(linkBtn('OPEN ' + c.label.toUpperCase(), c.href, true)); body.appendChild(row);
    }
  };
  // which builder each channel uses (by id here, so the data file stays simple)
  var KIND = { email: 'email', phone: 'phone', whatsapp: 'whatsapp', cv: 'cv', devto: 'devto', github: 'github', linkedin: 'link' };

  function select(n) {
    var id = order[n]; if (!id) return;
    current = n; var t = ++token, c = CH[id];
    order.forEach(function (k) { cells[k].classList.toggle('sel', k === id); cells[k].setAttribute('aria-pressed', k === id ? 'true' : 'false'); });
    cmd.textContent = '> open ./' + id; cmd.appendChild(el('span', 'cv-cur'));
    title.textContent = c.label; cap.textContent = '';
    body.textContent = ''; body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap');
    (BUILD[KIND[id] || 'link'] || BUILD.link)(c, t);
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    view.classList.add('open'); view.setAttribute('aria-hidden', 'false');
    sizeCanvas(); hovering = false; last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    select(0);                                                         // always starts on the first channel
    setTimeout(function () { if (isOpen && cells[order[0]]) cells[order[0]].focus({ preventScroll: true }); }, 450);
  }
  function shut() {
    if (!isOpen) return;
    isOpen = false; token++; cancelAnimationFrame(raf); view.classList.remove('open'); view.setAttribute('aria-hidden', 'true');
  }

  close.addEventListener('click', shut);
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { if (!document.querySelector('.menu.open')) shut(); return; }
    if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;           // arrows belong to the text box while typing
    if (/^Arrow(Down|Right|Up|Left)$/.test(e.key)) {
      e.preventDefault();
      var step = /Down|Right/.test(e.key) ? 1 : -1, n = (current + step + order.length) % order.length;
      select(n); cells[order[n]].focus({ preventScroll: true });
    }
  });

  window.contactView = { open: open, close: shut, isOpen: function () { return isOpen; } };
})();