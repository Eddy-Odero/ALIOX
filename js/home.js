(function () {
  // ---- settings you can change ----
  var PLACE = 'Kisumu/Nairobi';     // shown before the time
  var TIME_ZONE = 'Africa/Nairobi'; // clock follows this zone

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
})();
