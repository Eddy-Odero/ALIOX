/* Loading page. The percentage moves in jumps with small pauses, holds at 99% until MIN_TIME has passed, then the text
   turns into the CLICK TO ENTER button. Clicking fades the page out and opens home.html. */
(function () {
  var body = document.body;
  var fill = document.getElementById('fill');
  var pctEl = document.getElementById('pct');
  var enter = document.getElementById('enter');
  var MIN_TIME = 4000;                       // shortest time the loader will take (ms)

  function rand(a, b) { return a + Math.random() * (b - a); }
  var start = Date.now(), progress = 0;

  function step() {
    var cap = Date.now() - start >= MIN_TIME ? 100 : 99;
    progress = Math.min(cap, progress + Math.round(rand(1, 9)));
    pctEl.textContent = progress;
    fill.style.transform = 'scaleX(' + (progress / 100) + ')';
    if (progress >= 100) { body.classList.add('ready'); enter.disabled = false; return; }
    var wait = rand(50, 220);
    if (Math.random() < 0.12) wait += rand(400, 700);        // now and then it stalls for a moment
    setTimeout(step, wait);
  }
  setTimeout(step, 250);

  enter.addEventListener('click', function () {
    if (enter.disabled) return;
    body.classList.add('leaving');
    setTimeout(function () { window.location.href = enter.dataset.href; }, 500);
  });
})();