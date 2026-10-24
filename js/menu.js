(function () {
  // ---- settings you can change ----
  var PLACE = 'Kisumu/Nairobi';     // shown before the time
  var TIME_ZONE = 'Africa/Nairobi'; // clock follows this zone
  var GITHUB_USER = 'Eddy-Odero';   // the PROJECTS count is this account's public repositories, so it grows by itself

  // ---- fit the 1475 x 720 design canvas to the window ----
  var W = 1475, H = 720;
  var stage = document.getElementById('stage');

  function fit() {
    var s = Math.min(window.innerWidth / W, window.innerHeight / H);
    stage.style.transform =
      'translate(' + (-W * s / 2) + 'px,' + (-H * s / 2) + 'px) scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  fit();

  // ---- local time, e.g. "4:19 p.m." ----
  var placeEl = document.getElementById('place');
  var clockEl = document.getElementById('clock');
  placeEl.textContent = PLACE;

  function tickClock() {
    var v = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true
    }).formatToParts(new Date()).forEach(function (p) { v[p.type] = p.value; });
    var period = (v.dayPeriod || '').toLowerCase().replace(/[^ap]/g, '') + '.m.';
    clockEl.textContent = v.hour + ':' + v.minute + ' ' + period;
  }
  tickClock();
  setInterval(tickClock, 15000);

  // ---- stats: bars fill and numbers count up on load ----
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.fill').forEach(function (bar) {
    var target = bar.dataset.fill + '%';
    if (reduce) { bar.style.width = target; return; }
    setTimeout(function () { bar.style.width = target; }, 500);
  });

  document.querySelectorAll('[data-count]').forEach(function (el) {
    var end = +el.dataset.count;
    if (reduce) { el.textContent = end; return; }
    var t0 = null, dur = 1400;
    el.textContent = 0;
    function step(now) {
      if (t0 === null) t0 = now + 500;               // start with the bars
      var t = Math.max(0, Math.min((now - t0) / dur, 1));
      el.textContent = Math.round(end * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });

  // ---- projects: count the public repositories (not forks) on GitHub, read-only, no key ----
  // The answer is kept for the visit in sessionStorage. If GitHub cannot be reached the number stays as "--".
  var projEl = document.getElementById('projCount'), projFill = document.getElementById('projFill');
  function showProjects(n) {
    var end = Math.max(0, +n || 0), t0 = null, dur = 1400;
    projFill.style.width = Math.min(end / 20, 1) * 100 + '%';                // the bar is full at 20 projects
    if (reduce) { projEl.textContent = end; return; }
    function step(now) {
      if (t0 === null) t0 = now;
      var t = Math.max(0, Math.min((now - t0) / dur, 1));
      projEl.textContent = Math.round(end * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function countRepos(list) {
    return Array.isArray(list) ? list.filter(function (r) { return r && !r.fork; }).length : null;
  }
  (function loadProjects() {
    var key = 'home-github-count';
    try { var c = sessionStorage.getItem(key); if (c !== null && c !== '') { showProjects(+c); return; } } catch (e) {}
    var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    fetch('https://api.github.com/users/' + encodeURIComponent(GITHUB_USER) + '/repos?per_page=100&type=owner', ctl ? { signal: ctl.signal } : {})
      .then(function (r) { clearTimeout(timer); if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (list) {
        var n = countRepos(list); if (n === null) return;
        try { sessionStorage.setItem(key, String(n)); } catch (e) {}
        showProjects(n);
      })
      .catch(function () { /* leave "--" */ });
  })();

  // ---- the focus words in the top bar swap every few seconds, rolling up like a clock's digits ----
  (function roll() {
    var words = document.querySelectorAll('#roll .roll-w');
    if (words.length < 2) return;
    var box = document.getElementById('roll'), cur = 0, busy = false;
    function fit(w) { box.style.width = Math.ceil(w.scrollWidth) + 'px'; }      // the box is as wide as the word showing, so the text after it follows
    function fitSoon(w) { fit(w); if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(words[cur]); }); }
    words[0].classList.add('in'); fitSoon(words[0]);
    if (reduce) { setInterval(function () { words[cur].classList.remove('in'); cur = (cur + 1) % words.length; words[cur].classList.add('in'); fit(words[cur]); }, 3200); return; }
    setInterval(function () {
      if (busy || document.hidden) return;
      busy = true;
      var out = words[cur], next = words[(cur + 1) % words.length];
      next.classList.add('reset'); next.classList.remove('out'); void next.offsetWidth; next.classList.remove('reset');   // park it below, no animation
      out.classList.remove('in'); out.classList.add('out');
      next.classList.add('in'); fit(next);
      cur = (cur + 1) % words.length;
      setTimeout(function () { out.classList.remove('out'); busy = false; }, 760);
    }, 3200);
  })();
})();