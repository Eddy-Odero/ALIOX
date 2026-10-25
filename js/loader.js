/* Loading page. The percentage moves in jumps with small pauses and holds at 99% until MIN_TIME has passed. At 100% the brackets
   open and WELCOME appears; after a short moment the page fades out and opens home.html by itself. */
(function () {
  var body = document.body;
  var fill = document.getElementById('fill');
  var pctEl = document.getElementById('pct');
  var MIN_TIME = 4000;                       // shortest time the loader will take (ms)
  var WELCOME_TIME = 1700;                   // how long WELCOME stays before going to the home page (ms)
  var HOME = 'home.html';

  function rand(a, b) { return a + Math.random() * (b - a); }
  var start = Date.now(), progress = 0;

  function done() {
    body.classList.add('ready');
    setTimeout(function () {
      body.classList.add('leaving');
      setTimeout(function () { window.location.href = HOME; }, 500);
    }, WELCOME_TIME);
  }

  function step() {
    var cap = Date.now() - start >= MIN_TIME ? 100 : 99;
    progress = Math.min(cap, progress + Math.round(rand(1, 9)));
    pctEl.textContent = progress;
    fill.style.transform = 'scaleX(' + (progress / 100) + ')';
    if (progress >= 100) { done(); return; }
    var wait = rand(50, 220);
    if (Math.random() < 0.12) wait += rand(400, 700);        // now and then it stalls for a moment
    setTimeout(step, wait);
  }
  setTimeout(step, 250);
})();