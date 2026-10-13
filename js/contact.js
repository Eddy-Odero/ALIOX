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

  // ---- layout (stage units): groups on the left, the panel on the right ----
  var CELL_W = 118, CELL_H = 100, GAP = 8, PAD = 14, HEAD = 44, GX = 72;
  var GROUP_H = HEAD + CELL_H + PAD, GROUP_Y0 = 110, GROUP_GAP = 48;

  var view = el('section', 'cv'); view.setAttribute('role', 'dialog'); view.setAttribute('aria-label', 'Contact'); view.setAttribute('aria-hidden', 'true');
  var label = el('div', 'cv-label', 'SELECTED - CONTACT'); label.appendChild(el('i'));
  var close = el('button', 'cv-close'); close.type = 'button';
  close.appendChild(el('span', null, 'ESC')); close.appendChild(document.createTextNode('CLOSE'));
  view.appendChild(label); view.appendChild(close);
  view.appendChild(el('div', 'cv-dots'));
  view.appendChild(el('div', 'cv-hint', 'SELECT A CHANNEL'));

  var wires = svg('svg', { 'class': 'cv-wires', viewBox: '0 0 1475 720', 'aria-hidden': 'true' });
  view.appendChild(wires);

  var order = [], cells = {}, geo = [], idx = 0;
  GROUPS.forEach(function (g, gi) {
    var ids = (g.ids || []).filter(function (id) { return CH[id]; });
    var w = ids.length * CELL_W + (ids.length - 1) * GAP + PAD * 2;
    var y = GROUP_Y0 + gi * (GROUP_H + GROUP_GAP);
    var box = el('div', 'cv-grp'); box.style.cssText = 'left:' + GX + 'px;top:' + y + 'px;width:' + w + 'px;height:' + GROUP_H + 'px';
    box.style.setProperty('--i', gi * 3);
    box.appendChild(el('h3', null, g.title));
    view.appendChild(box);
    geo.push({ x: GX, y: y, w: w, midY: y + GROUP_H / 2 });
    ids.forEach(function (id, k) {
      var c = CH[id];
      var b = el('button', 'cv-cell'); b.type = 'button'; b.setAttribute('aria-label', c.label);
      b.style.cssText = 'left:' + (GX + PAD + k * (CELL_W + GAP)) + 'px;top:' + (y + HEAD) + 'px';
      b.style.setProperty('--i', gi * 3 + k + 1);
      var ic = el('span', 'cv-ico'); ic.appendChild(icon(id));
      b.appendChild(ic); b.appendChild(el('span', 'cv-nm', c.label)); b.appendChild(el('span', 'cv-sb', c.sub || ''));
      (function (n) { b.addEventListener('click', function () { select(n); }); })(idx);
      view.appendChild(b); cells[id] = b; order.push(id); idx++;
    });
  });

  // the trail: in from the top at the left, through each group, winding down; ends on a plus
  function wire(d) { wires.appendChild(svg('path', { 'class': 'wire', d: d })); }
  if (geo.length) {
    var L = 48, g0 = geo[0];
    wire('M' + L + ' 84 V' + (g0.midY - 12) + ' Q' + L + ' ' + g0.midY + ' ' + (L + 12) + ' ' + g0.midY + ' H' + g0.x);
    for (var i = 0; i < geo.length - 1; i++) {
      var a = geo[i], b2 = geo[i + 1], rx = a.x + a.w + 30, my = (a.y + GROUP_H + b2.y) / 2;
      wire('M' + (a.x + a.w) + ' ' + a.midY + ' H' + (rx - 12) + ' Q' + rx + ' ' + a.midY + ' ' + rx + ' ' + (a.midY + 12) +
           ' V' + (my - 12) + ' Q' + rx + ' ' + my + ' ' + (rx - 12) + ' ' + my +
           ' H' + (L + 12) + ' Q' + L + ' ' + my + ' ' + L + ' ' + (my + 12) +
           ' V' + (b2.midY - 12) + ' Q' + L + ' ' + b2.midY + ' ' + (L + 12) + ' ' + b2.midY + ' H' + b2.x);
    }
    var lg = geo[geo.length - 1], ex = lg.x + lg.w;
    wire('M' + ex + ' ' + lg.midY + ' H' + (ex + 32));
    wires.appendChild(svg('circle', { 'class': 'plus', cx: ex + 44, cy: lg.midY, r: 11 }));
    wires.appendChild(svg('path', { 'class': 'plus', d: 'M' + (ex + 39) + ' ' + lg.midY + ' H' + (ex + 49) + ' M' + (ex + 44) + ' ' + (lg.midY - 5) + ' V' + (lg.midY + 5) }));
  }

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
    select(0);                                                         // always starts on the first channel
    setTimeout(function () { if (isOpen && cells[order[0]]) cells[order[0]].focus({ preventScroll: true }); }, 450);
  }
  function shut() {
    if (!isOpen) return;
    isOpen = false; token++; view.classList.remove('open'); view.setAttribute('aria-hidden', 'true');
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