/* ALIOX's terminal. No typing by the visitor and no server: they click the robot, then choose a topic.
   What ALIOX says lives in chat-content.js.

   Click the robot  -> the developer stats fly off to the right -> ALIOX introduces itself line by line -> the buttons appear.
   Click a topic    -> the current text flies off to the right -> the face code runs for 3 seconds -> the new text is
                       generated one line at a time, with a blinking cursor at the end of the text.
   Click on the text while it is being typed to show the rest at once. */
(function () {
  'use strict';

  var C = window.BOT_CONTENT;
  var host = document.getElementById('bot');
  var out = document.getElementById('ttyOut');
  var btns = document.getElementById('ttyBtns');
  var stats = document.querySelector('.stats');
  var dockBtn = document.querySelector('.dock-btn');
  var robot = window.robot;

  if (!host || !out || !btns || !robot) {
    console.error('chat: the robot or the terminal is missing. Replace home.html and robot.js with the latest versions.');
    return;
  }
  if (!C) {                                              // never fail silently
    console.error('chat: chat-content.js did not load. It must be js/chat-content.js and be listed before js/chat.js in home.html.');
    C = { columns: 54, intro: ['The content file did not load. Check that js/chat-content.js exists.'], menuPrompt: [''], topics: [] };
  }
  var COLS = C.columns || 54;

  // Works with the current chat-content.js and still copes with an older one (greeting / menu / nodes).
  var INTRO = Array.isArray(C.intro) ? C.intro
    : C.greeting ? [String(C.greeting)]
    : ['Hello.', 'I am ALIOX, here to help you navigate this portfolio.', '', 'What would you like to explore?'];
  var MENU_PROMPT = Array.isArray(C.menuPrompt) ? C.menuPrompt
    : (typeof C.menuPrompt === 'string' && C.menuPrompt) ? [C.menuPrompt] : ['What would you like to explore next?'];
  var MENU_HINT = Array.isArray(C.menuHint) ? C.menuHint : ['', '', 'To explore each section in detail, click the menu bar.'];
  var TOPICS = [];
  if (Array.isArray(C.topics)) {
    TOPICS = C.topics;
  } else if (C.nodes) {
    console.warn('chat: chat-content.js is an old version. Replace it with the latest one.');
    TOPICS = (C.menu || Object.keys(C.nodes)).filter(function (id) { return C.nodes[id]; }).map(function (id) {
      return { id: id, label: C.nodes[id].label || id, text: String(C.nodes[id].text || '').split('\n') };
    });
  }
  TOPICS = TOPICS.filter(function (t) { return t && t.id && t.label; }).map(function (t) {
    return { id: t.id, label: t.label, text: Array.isArray(t.text) ? t.text : [String(t.text || '')] };
  });
  if (!TOPICS.length) console.error('chat: no topics found in chat-content.js.');
  // The computer's "reduce motion" setting is ignored on purpose: it switched the delays and the typing off.
  // Add ?calm to the address (home.html?calm) to get the quiet version.
  var reduce = /[?&]calm\b/.test(location.search);

  var started = false, busy = false, skip = false;

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, reduce ? Math.min(ms, 30) : ms); }); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  // typing speed from the settings panel (settings.js): slow 1.8, normal 1, fast 0.45, instant = no typing at all
  function sf() { return window.settings ? window.settings.speedFactor() : 1; }
  function instant() { return reduce || (window.settings ? window.settings.speed() === 'instant' : false); }

  // ---- the terminal text (everything is built with text nodes, never HTML) ----
  var cursor = document.createElement('span'); cursor.className = 'cur'; cursor.hidden = true; out.appendChild(cursor);
  function typing(on) { cursor.hidden = false; cursor.classList.toggle('typing', on); }

  var typed = [];                                        // every piece of text written so far, in order
  function addPiece(kind, href) {
    var node = document.createTextNode(''), wrap = null;
    if (kind === 'link') {
      wrap = document.createElement('a'); wrap.href = href; wrap.target = '_blank'; wrap.rel = 'noopener noreferrer';
    } else if (kind === 'cmd') {
      wrap = document.createElement('span'); wrap.className = 't-cmd';
    }
    if (wrap) { wrap.appendChild(node); out.insertBefore(wrap, cursor); } else { out.insertBefore(node, cursor); }
    var piece = { node: node, wrap: wrap };
    typed.push(piece);
    return piece;
  }

  // ---- wrapping long paragraphs to the terminal width ----
  function dispLen(word) { return word.replace(/\[\[(.+?)\|.+?\]\]/g, '$1').length; }
  function wrapText(str, cols) {
    if (str === '') return [''];
    var lead = str.match(/^ */)[0], body = str.slice(lead.length);
    var hang = lead + (/^[-*] /.test(body) ? '  ' : '');
    var safe = body.replace(/\[\[(.+?)\|(.+?)\]\]/g, function (m, l, u) { return '[[' + l.replace(/ /g, '\u00a0') + '|' + u + ']]'; });
    var lines = [], line = lead, len = lead.length, first = true;
    safe.split(' ').forEach(function (w) {
      var wl = dispLen(w);
      if (!first && len + 1 + wl > cols && len > hang.length) { lines.push(line); line = hang + w; len = hang.length + wl; }
      else { line += (first ? '' : ' ') + w; len += (first ? 0 : 1) + wl; }
      first = false;
    });
    lines.push(line);
    return lines;
  }
  function segments(line) {                              // splits a line into plain text and [[links|...]]
    var segs = [], last = 0, m, re = /\[\[(.+?)\|(.+?)\]\]/g;
    while ((m = re.exec(line))) {
      if (m.index > last) segs.push({ kind: 'plain', text: line.slice(last, m.index) });
      segs.push({ kind: 'link', text: m[1].replace(/\u00a0/g, ' '), href: m[2] });
      last = re.lastIndex;
    }
    if (last < line.length) segs.push({ kind: 'plain', text: line.slice(last) });
    return segs;
  }

  // ---- typing: uneven speed, pauses at punctuation, small stalls and bursts, so it feels generated ----
  out.addEventListener('click', function () { skip = true; });

  function delayFor(ch) {
    var d = rand(9, 19);
    if (ch === '.' || ch === '!' || ch === '?') d += rand(110, 220);
    else if (ch === ',' || ch === ';' || ch === ':') d += rand(50, 100);
    else if (ch === '\n') d += rand(90, 170);
    else if (Math.random() < 0.025) d += rand(80, 220);
    return d * sf();
  }
  async function typeInto(piece, text, fixedMs) {
    var i = 0;
    while (i < text.length) {
      var chunk = 1;
      if (!fixedMs && (skip || instant())) chunk = text.length - i;
      else if (!fixedMs && Math.random() < 0.22) chunk = Math.min(text.length - i, 2 + Math.floor(rand(0, 3)));
      piece.node.data += text.slice(i, i + chunk);
      i += chunk;
      if (robot.pulse) robot.pulse();
      if (fixedMs) await sleep(fixedMs);
      else if (!skip && !instant()) await sleep(delayFor(text.charAt(i - 1)));
      else if (i % 120 === 0) await sleep(0);
    }
  }
  // One line at a time: a line is typed quickly, then the cursor blinks at its end for a moment while the next
  // line is "worked out". Blank lines pass faster. Clicking the text skips the pauses.
  async function writeLines(paragraphs) {
    var lines = [];
    paragraphs.forEach(function (p) { lines = lines.concat(wrapText(p, COLS)); });
    for (var i = 0; i < lines.length; i++) {
      typing(true);
      var segs = segments(lines[i]);
      for (var s = 0; s < segs.length; s++) await typeInto(addPiece(segs[s].kind, segs[s].href), segs[s].text);
      if (i < lines.length - 1) {
        await typeInto(addPiece('plain'), '\n', 0);
        typing(false);                                    // the cursor blinks while the next line is prepared
        if (!skip) await sleep((lines[i].trim() === '' ? rand(90, 160) : rand(320, 560)) * sf());
      }
    }
    typing(false);                                        // the cursor stays at the end of the text, blinking
  }

  // ---- erasing, like holding backspace ----
  async function eraseOut() {
    typing(true);
    var total = typed.reduce(function (n, p) { return n + p.node.data.length; }, 0);
    var per = reduce ? total : Math.max(2, Math.ceil(total / 36));          // always takes about 0.6 seconds
    while (typed.length) {
      var p = typed[typed.length - 1];
      p.node.data = p.node.data.slice(0, p.node.data.length - Math.min(per, p.node.data.length));
      if (!p.node.data.length) { typed.pop(); (p.wrap || p.node).remove(); }
      if (!reduce) await sleep(16);
    }
    typing(false);
  }

  function textNodes(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), list = [], n;
    while ((n = walker.nextNode())) if (n.data.trim() !== '') list.push(n);
    return list;
  }
  async function eraseStats() {                          // the developer stats, erased from the bottom up
    if (!stats) return;
    stats.querySelectorAll('.fill').forEach(function (f) { f.style.width = '0%'; });   // bars drain as the text goes
    var rows = Array.prototype.slice.call(stats.querySelectorAll('.stats-title, .status, .stat, .term li')).reverse();
    var total = textNodes(stats).reduce(function (n, t) { return n + t.data.length; }, 0);
    var per = reduce ? total : Math.max(1, Math.ceil(total / 70));
    var cur = document.createElement('span'); cur.className = 'cur typing';
    for (var r = 0; r < rows.length; r++) {
      var nodes = textNodes(rows[r]).reverse();
      for (var k = 0; k < nodes.length; k++) {
        nodes[k].parentNode.insertBefore(cur, nodes[k].nextSibling);
        while (nodes[k].data.length) {
          nodes[k].data = nodes[k].data.slice(0, Math.max(0, nodes[k].data.length - per));
          if (!reduce) await sleep(16);
        }
      }
      rows[r].classList.add('gone');
    }
    cur.remove();
    stats.classList.add('gone');
  }

  // ---- flying off: each line slides to the right, one after another, and vanishes at the edge ----
  var FLY_MS = 750, FLY_STEP = 0.04;                      // slide time and the delay between lines (seconds for the step)
  function flyOff(els) {                                  // starts the slide on each element, resolves when all are gone
    els.forEach(function (el, i) {
      el.style.setProperty('--d', Math.min(i * FLY_STEP, 0.9).toFixed(3) + 's');
      el.classList.add('fly-go');
    });
    return sleep(FLY_MS + Math.min(els.length * FLY_STEP * 1000, 900) + 120);
  }
  async function flyOut() {                               // the text in the terminal
    if (!typed.length) return;
    var layer = document.createElement('div'); layer.className = 'fly-layer';
    var line = null, lines = [];
    function newLine() { line = document.createElement('div'); line.className = 'fly-line'; layer.appendChild(line); lines.push(line); }
    newLine();
    typed.forEach(function (p) {
      p.node.data.split('\n').forEach(function (part, k) {
        if (k > 0) newLine();
        if (!part) return;
        if (p.wrap) { var w = p.wrap.cloneNode(false); w.appendChild(document.createTextNode(part)); line.appendChild(w); }
        else line.appendChild(document.createTextNode(part));
      });
    });
    typed.forEach(function (p) { (p.wrap || p.node).remove(); });
    typed = [];
    cursor.hidden = true;
    out.appendChild(layer);
    void layer.offsetWidth;                               // let the browser draw the lines first, then slide them
    if (reduce) await sleep(0); else await flyOff(lines);
    layer.remove();
  }
  async function flyStats() {                             // the developer stats
    if (!stats) return;
    stats.querySelectorAll('.fill').forEach(function (f) { f.style.width = '0%'; });
    var rows = Array.prototype.slice.call(stats.querySelectorAll('.stats-title, .status, .stat, .term li'));
    rows.forEach(function (r) { r.classList.add('fly'); });
    if (reduce) await sleep(0); else await flyOff(rows);
    stats.classList.add('gone');
  }

  // ---- the topic buttons ----
  function buildButtons() {
    btns.textContent = '';
    TOPICS.forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'tb'; b.dataset.id = t.id;
      b.textContent = '[ ' + t.label + ' ]';
      b.addEventListener('click', function () { stopArrow(); openTopic(t); });
      btns.appendChild(b);
    });
  }
  async function revealButtons() {
    var list = btns.querySelectorAll('.tb');
    for (var i = 0; i < list.length; i++) {
      list[i].classList.add('in');
      if (i < list.length - 1) await sleep(140 * sf());          // no wait after the last one, so it can be clicked straight away
    }
  }
  // A small arrow above the buttons hops from one to the next to show where to click. It stops at the first click.
  var arrow = null, arrowOn = false;
  function startArrow() {
    var list = btns.querySelectorAll('.tb');
    if (!list.length || reduce) return;
    arrow = document.createElement('span'); arrow.className = 'tb-arrow';
    arrow.innerHTML = '<svg viewBox="0 0 12 9" width="12" height="9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5L6 7L10.5 1.5"/></svg>';
    btns.appendChild(arrow); arrowOn = true;
    (async function () {
      var i = 0;
      while (arrowOn) {
        var b = list[i % list.length];
        arrow.style.left = (b.offsetLeft + b.offsetWidth / 2 - 6) + 'px';
        arrow.style.top = (b.offsetTop - 15) + 'px';
        arrow.classList.add('show');
        await sleep(950); i++;
      }
    })();
  }
  function stopArrow() {
    if (!arrowOn) return; arrowOn = false;
    if (arrow) { var a = arrow; a.classList.remove('show'); setTimeout(function () { a.remove(); }, 400); arrow = null; }
  }
  var hinted = false;
  function dockHint() { var d = document.querySelector('.dock'); if (!d) return; d.classList.add('hint'); setTimeout(function () { d.classList.remove('hint'); }, 6000); }
  function lockButtons(on) { btns.querySelectorAll('.tb').forEach(function (b) { b.disabled = on; }); }
  function setActive(id) {
    btns.querySelectorAll('.tb').forEach(function (b) {
      var on = b.dataset.id === id; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  // ---- the flow ----
  // Never stuck: if a step fails or takes too long, say so and carry on.
  function withTimeout(promise, ms, onTimeout) {
    return Promise.race([promise, new Promise(function (r) { setTimeout(function () { onTimeout(); r(); }, ms); })]);
  }
  function showError(what, err) {
    console.error('chat: ' + what + ' failed:', err);
    out.insertBefore(document.createTextNode('\n[ error: ' + what + '. Open the browser console (F12) for details. ]'), cursor);
    cursor.hidden = false;
  }
  function hideStats() { if (stats) stats.classList.add('gone'); }

  async function start() {
    if (started) return;
    started = true; busy = true; skip = false;
    host.classList.add('started');
    host.removeAttribute('role'); host.removeAttribute('tabindex'); host.removeAttribute('aria-label');
    robot.setMode('run'); robot.glitch(450);              // the face code runs while the stats fly off
    if (robot.attention) robot.attention(900);
    try { await withTimeout(flyStats(), 8000, hideStats); }
    catch (e) { console.error('chat: moving the stats away failed:', e); hideStats(); }
    await sleep(250);
    robot.setMode('speak');
    try { await writeLines(INTRO); } catch (e) { showError('writing the introduction', e); }
    robot.setMode('idle');
    try { buildButtons(); await revealButtons(); startArrow(); } catch (e) { showError('showing the buttons', e); }
    busy = false;
  }

  async function openTopic(t) {
    if (busy) return;
    busy = true; skip = false;
    lockButtons(true); setActive(t.id);
    try {
      robot.setMode('run'); robot.glitch(350);
      await flyOut();                                    // the previous text flies off first
      await sleep(150);

      var cmd = addPiece('cmd'); typing(true);            // the visitor's choice, typed like a command
      await typeInto(cmd, '> ' + t.id, 45);
      await typeInto(addPiece('plain'), '\n\n', 0);

      var status = document.createElement('span'); status.className = 't-status';   // the robot works on it
      out.insertBefore(status, cursor);
      var label = 'generating response', dots = 0;
      status.textContent = label;
      var timer = setInterval(function () { dots = (dots + 1) % 4; status.textContent = label + '...'.slice(0, dots); }, 280);
      typing(false);
      await sleep(Math.max(250, 3000 * sf()));          // the face code runs for 3 seconds (shorter or longer with the speed setting)
      clearInterval(timer); status.remove();

      robot.glitch(200); await sleep(220);
      robot.setMode('speak'); skip = false;
      await writeLines(t.text);                          // the new text is generated
      if (!hinted) { hinted = true; await sleep(500 * sf()); await writeLines(MENU_HINT); dockHint(); }   // once: point to the menu bar
    } catch (e) {
      showError('writing "' + t.label + '"', e);
    } finally {
      robot.setMode('idle'); lockButtons(false); busy = false;
    }
  }

  async function askAgain() {                            // the sparkle button on the dock, after the start
    busy = true; skip = false; lockButtons(true); setActive(null);
    try {
      robot.setMode('run');
      await flyOut(); await sleep(150);
      robot.setMode('speak'); await writeLines(MENU_PROMPT);
    } catch (e) {
      showError('writing the prompt', e);
    } finally {
      robot.setMode('idle'); lockButtons(false); busy = false;
    }
  }

  // used by the menu (menu.js): open a topic by its id, starting ALIOX first if the visitor has not clicked the robot yet
  window.aliox = {
    open: async function (id) {
      var t = TOPICS.filter(function (x) { return x.id === id; })[0];
      if (!t || busy || !robot.isReady()) return;
      hinted = true; stopArrow();
      if (!started) await start();
      await openTopic(t);
    }
  };

  robot.onClick(start);
  // The dock button no longer writes anything: the whole dock opens the menu (menu.js).
})();