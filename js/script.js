(function () {
  var body = document.body;
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- performance tier: HIGH / MED / SAVER ----
  var tierBtns = document.querySelectorAll('.tier-btns button');
  var tierName = document.getElementById('tierName');

  function autoTier() {
    var conn = navigator.connection || {};
    var weak = (navigator.hardwareConcurrency || 8) <= 4 || conn.saveData;
    return (reduce || weak) ? 'saver' : 'med';
  }

  function stored() {
    try { return localStorage.getItem('tier'); } catch (e) { return null; }
  }

  function setTier(t, remember) {
    body.dataset.tier = t;
    tierName.textContent = t.toUpperCase();
    tierBtns.forEach(function (b) {
      b.setAttribute('aria-checked', String(b.dataset.tier === t));
    });
    if (remember) { try { localStorage.setItem('tier', t); } catch (e) {} }
  }

  tierBtns.forEach(function (b) {
    b.addEventListener('click', function () { setTier(b.dataset.tier, true); });
  });
  var saved = stored();
  setTier(/^(high|med|saver)$/.test(saved) ? saved : autoTier(), false);

  // HIGH only: the orb drifts slightly towards the pointer
  window.addEventListener('pointermove', function (e) {
    if (body.dataset.tier !== 'high') { root.style.removeProperty('--mx'); root.style.removeProperty('--my'); return; }
    root.style.setProperty('--mx', ((e.clientX / window.innerWidth  - .5) * 26) + 'px');
    root.style.setProperty('--my', ((e.clientY / window.innerHeight - .5) * 26) + 'px');
  });

  // ---- loader: works in jumps with pauses; never finishes before MIN_TIME ----
  var enter   = document.getElementById('enter');
  var pctEl   = document.getElementById('pct');
  var wordEl  = document.getElementById('sysWord');
  var stageEl = document.getElementById('stageName');
  var MIN_TIME = 6000;

  var stages = [
    [0,  'INIT_CORE'],
    [22, 'MOUNT_GRID'],
    [45, 'LOAD_ASSETS'],
    [68, 'SYNC_CLOCK'],
    [88, 'VERIFY_MODULES']
  ];
  function stageLabel(v) {
    var name = stages[0][1];
    stages.forEach(function (st) { if (v >= st[0]) name = st[1]; });
    return name;
  }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function setProgress(v) {
    pctEl.textContent = v;
    root.style.setProperty('--p', v / 100);
  }

  // the enter button only becomes active once the loader hits 100%
  function ready() {
    wordEl.textContent = 'SYSTEM READY';
    stageEl.textContent = 'LOADED';
    enter.disabled = false;
  }

  var startTime = Date.now();
  var progress = 0;

  function step() {
    var cap = (Date.now() - startTime) >= MIN_TIME ? 100 : 99;  // hold at 99% until MIN_TIME
    progress = Math.min(cap, progress + Math.round(rand(1, 9)));
    setProgress(progress);
    if (progress >= 100) { ready(); return; }
    stageEl.textContent = stageLabel(progress);

    var wait = rand(60, 260);
    if (Math.random() < 0.13) wait += rand(500, 850);           // occasional stall
    setTimeout(step, wait);
  }
  setTimeout(step, 300);

  enter.addEventListener('click', function () {
    if (enter.disabled) return;
    body.classList.add('leaving');
    setTimeout(function () { window.location.href = enter.dataset.href; }, 500);
  });
})();