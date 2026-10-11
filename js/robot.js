/* ALIOX, the robot: a 3D head built from your reference sheet (front, side and rear views in robot-data.js).
   The head is lofted into a solid shape from the silhouettes, the three views are blended onto it by angle,
   and the visor is a live screen on top. It faces the visitor and turns to follow the cursor on servo-style
   motors (they accelerate, brake, overshoot slightly and tremble a little), and the gear hubs on the cheeks
   and the back of the head spin with the motion.

   Timeline on page load:  code runs fast on the face  ->  glitch  ->  "CLICK TO START".
   chat.js takes over when the robot is clicked.

   window.robot (used by chat.js):
     setMode('run' | 'speak' | 'idle')  run = thinking (fast code, hubs spin up), speak = talking, idle = waiting
     glitch(ms)       a burst of glitching          attention(ms)  look straight at the visitor
     pulse()          a small nod (called while text is typed)
     onReady(fn)      fn runs when "CLICK TO START" is showing
     onClick(fn)      fn runs when the robot is clicked (after it is ready)
     isReady()        pose()  where the head points now (radians)

   The performance tier chosen on the landing page (localStorage "tier") sets resolution and frame rate. */
(function () {
  'use strict';

  var host = document.getElementById('bot');
  var canvas = document.getElementById('botCanvas');
  var T = window.THREE;
  var DATA = window.ROBOT_DATA;

  var readyFns = [], clickFns = [];
  var ready = false, phase = 'boot', mode = 'idle';
  var glitchUntil = 0, attentionUntil = 0, talk = 0, nextMicro = 0;

  var yaw, pitch, roll;   // servos, created below
  window.robot = {
    setMode: function (m) { mode = m; if (ready) phase = 'live'; },
    glitch: function (ms) { glitchUntil = Math.max(glitchUntil, performance.now() + ms); },
    attention: function (ms) { attentionUntil = performance.now() + ms; },
    pulse: function () { talk = Math.min(1, talk + 0.4); },
    onReady: function (fn) { if (ready) fn(); else readyFns.push(fn); },
    onClick: function (fn) { clickFns.push(fn); },
    isReady: function () { return ready; },
    pose: function () { return yaw ? { yaw: yaw.p, pitch: pitch.p } : { yaw: 0, pitch: 0 }; }
  };

  if (!host || !canvas) {
    console.error('robot: #bot or #botCanvas is missing. home.html is out of date, replace it with the latest one.');
    return;
  }

  function becomeReady() {
    if (ready) return;
    ready = true; phase = 'prompt'; nextMicro = performance.now() + 2500;
    host.classList.add('ready');
    host.setAttribute('role', 'button'); host.setAttribute('tabindex', '0'); host.setAttribute('aria-label', 'Click to start');
    readyFns.splice(0).forEach(function (fn) { fn(); });
  }
  function fire() { if (ready) clickFns.forEach(function (fn) { fn(); }); }
  host.addEventListener('click', fire);
  host.addEventListener('keydown', function (e) {
    if (ready && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fire(); }
  });

  // ---- settings ----
  var tier = 'med';
  try {
    var saved = localStorage.getItem('tier');
    if (/^(high|med|saver)$/.test(saved)) tier = saved;
  } catch (e) {}
  var maxPixelRatio = tier === 'high' ? 2 : tier === 'med' ? 1.5 : 1;
  var frameMs = 1000 / (tier === 'saver' ? 30 : 60);
  // The computer's "reduce motion" setting is ignored on purpose: it switched the delays and the typing off.
  // Add ?calm to the address (home.html?calm) to get the quiet version.
  var reduce = /[?&]calm\b/.test(location.search);

  var BOOT_MS = reduce ? 1200 : 3600;     // code runs fast for this long ...
  var GLITCH_MS = reduce ? 0 : 900;       // ... then glitches for this long ... then shows CLICK TO START

  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // ---- no 3D available: show the picture and a start button instead ----
  function fallback(reason) {
    console.warn('robot: ' + reason + '. Showing the picture instead.');
    host.classList.add('no-webgl');
    setTimeout(becomeReady, reduce ? 300 : 1800);
  }
  if (!T) { fallback('three.min.js did not load. Check that assets/vendor/three.min.js exists'); return; }
  if (!DATA || !DATA.rows) { fallback('robot-data.js did not load. Check that it sits next to home.html'); return; }

  var renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: tier !== 'saver', alpha: true, powerPreference: 'high-performance' });
  } catch (e) { fallback('WebGL is not available in this browser'); return; }
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = T.sRGBEncoding;
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); host.classList.add('no-webgl'); });

  // ---- servo: moves toward a target with limited speed and acceleration, so it starts, brakes and overshoots ----
  function Servo(maxVel, maxAcc, gain) { this.p = 0; this.v = 0; this.t = 0; this.mv = maxVel; this.ma = maxAcc; this.k = gain; }
  Servo.prototype.step = function (dt) {
    var want = clamp((this.t - this.p) * this.k, -this.mv, this.mv);
    var dv = clamp(want - this.v, -this.ma * dt, this.ma * dt);
    this.v += dv; this.p += this.v * dt;
  };
  yaw = new Servo(2.6, 15, 7); pitch = new Servo(1.9, 12, 7); roll = new Servo(0.7, 6, 6);
  var MAX_YAW = 0.7, MAX_PITCH = 0.3;     // the neck is a flat picture, so the head does not turn further than this
  pitch.p = 0.5; pitch.t = 0.5;           // starts bowed, powered down

  // ---- the scene ----
  var S = 165, Y0 = 210, Y0R = 202, CXF = 179, ZS0 = 258, CXR = 193.5;
  var PIVOT_Y = -1.3, PIVOT_Z = -0.25;

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(21, 380 / 480, 0.1, 60);
  camera.position.set(0, -0.45, 11.9);

  function loadImage(src) {
    return new Promise(function (ok, bad) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = bad; i.src = src; });
  }
  function tex(img, srgb) {
    var t = new T.Texture(img);
    t.encoding = srgb ? T.sRGBEncoding : T.LinearEncoding;
    t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.needsUpdate = true;
    return t;
  }

  // loft the head: one super-ellipse ring per row, sized by the front width and the side depth
  function loftHead() {
    var rows = DATA.rows.map(function (r) { return r.slice(); });
    var i, t, M = 160, N = 2.6;
    for (i = 1; i <= 5; i++) {      // taper under the jaw so the underside closes
      t = i / 5;
      rows.push([445 + 35 * t, 101 - 50 * t, 179, 75 + 110 * t, 301 - 20 * t]);
    }
    var pos = [], idx = [], R = rows.length, j;
    for (i = 0; i < R; i++) {
      var r = rows[i];
      var y = (Y0 - r[0]) / S, a = r[1] / S, cx = (r[2] - CXF) / S;
      var zf = (ZS0 - r[3]) / S, zb = (ZS0 - r[4]) / S;
      var cz = (zf + zb) / 2, d = Math.max(0.01, (zf - zb) / 2);
      for (j = 0; j < M; j++) {
        var th = j / M * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
        pos.push(cx + a * Math.sign(c) * Math.pow(Math.abs(c), 2 / N), y, cz + d * Math.sign(s) * Math.pow(Math.abs(s), 2 / N));
      }
    }
    var top = pos.length / 3, bot = top + 1;
    var f0 = rows[0], fl = rows[R - 1];
    pos.push((f0[2] - CXF) / S, (Y0 - f0[0]) / S + 0.002, (ZS0 - (f0[3] + f0[4]) / 2) / S);
    pos.push((fl[2] - CXF) / S, (Y0 - fl[0]) / S - 0.002, (ZS0 - (fl[3] + fl[4]) / 2) / S);
    function build(flip) {
      idx = [];
      function tri(a, b, c) { if (flip) idx.push(a, c, b); else idx.push(a, b, c); }
      for (i = 0; i < R - 1; i++) for (j = 0; j < M; j++) {
        var a0 = i * M + j, a1 = i * M + (j + 1) % M, b0 = (i + 1) * M + j, b1 = (i + 1) * M + (j + 1) % M;
        tri(a0, b0, a1); tri(a1, b0, b1);
      }
      for (j = 0; j < M; j++) {
        tri(top, j, (j + 1) % M);
        tri(bot, (R - 1) * M + (j + 1) % M, (R - 1) * M + j);
      }
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    build(false); g.setIndex(idx); g.computeVertexNormals();
    // check which way the surface faces: the front of the face (row ~45, angle 90 deg) must point at +z
    var n = g.attributes.normal, probe = 45 * M + M / 4;
    if (n.getZ(probe) < 0) { build(true); g.setIndex(idx); g.computeVertexNormals(); }
    return g;
  }

  var VERT = 'varying vec3 vP; varying vec3 vN;\n' +
    'void main(){ vP = position; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  var FRAG = [
    'precision highp float;',
    'uniform sampler2D tF; uniform sampler2D tS; uniform sampler2D tR; uniform sampler2D tC;',
    'uniform float uHubS; uniform float uHubR; uniform float uLive;',
    'varying vec3 vP; varying vec3 vN;',
    'const float S = 165.0;',
    'vec2 spin(vec2 p, vec2 c, float inner, float outer, float ang){',
    '  vec2 d = p - c; float r = length(d);',
    '  float k = 1.0 - smoothstep(inner, outer, r);',
    '  float a = ang * k; float ca = cos(a), sa = sin(a);',
    '  return c + vec2(ca * d.x - sa * d.y, sa * d.x + ca * d.y);',
    '}',
    'void main(){',
    '  vec3 n = normalize(vN);',
    '  float wf = pow(max(n.z, 0.0), 4.0);',
    '  float wb = pow(max(-n.z, 0.0), 4.0);',
    '  float ws = pow(abs(n.x), 4.0) + pow(max(n.y, 0.0), 2.0) * 0.6;',
    '  float x = vP.x, y = vP.y, z = vP.z;',
    '  vec2 pf = vec2(179.0 + x * S, 210.0 - y * S);',
    '  vec3 cf = texture2D(tF, vec2(pf.x / 360.0, 1.0 - pf.y / 600.0)).rgb;',
    '  vec2 ps = vec2(258.0 - z * S, 210.0 - y * S);',
    '  ps = spin(ps, vec2(257.5, 210.0), 52.0, 62.0, uHubS * (x < 0.0 ? -1.0 : 1.0));',
    '  vec3 cs = texture2D(tS, vec2(ps.x / 420.0, 1.0 - ps.y / 600.0)).rgb;',
    '  vec2 pr = vec2(193.5 - x * S, 202.0 - y * S);',
    '  pr = spin(pr, vec2(192.0, 222.0), 22.0, 30.0, uHubR);',
    '  vec3 cr = texture2D(tR, vec2(pr.x / 400.0, 1.0 - pr.y / 570.0)).rgb;',
    '  vec3 col = (cf * wf + cs * ws + cr * wb) / max(wf + ws + wb, 0.0001);',
    '  vec2 q = abs(pf - vec2(181.0, 243.5)) - vec2(139.0, 100.0) + vec2(40.0);',
    '  float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 40.0;',
    '  float inside = 1.0 - smoothstep(-2.0, 1.0, dist);',
    '  vec2 cuv = vec2((pf.x - 42.0) / 278.0, 1.0 - (pf.y - 143.0) / 201.0);',
    '  col += texture2D(tC, cuv).rgb * inside * wf * uLive;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  // ---- the live visor: code runs, glitches, prompt ----
  var vc = document.createElement('canvas'); vc.width = 480; vc.height = 348;
  var vg = vc.getContext('2d');
  var KW = ['const', 'let', 'function', 'return', 'await', 'if', 'for', 'import', 'export', 'async', 'new', 'class'];
  var ID = ['robot', 'node', 'render', 'scene', 'servo', 'yaw', 'pitch', 'mesh', 'visor', 'stack', 'cache', 'proc', 'state', 'bus', 'link', 'tick', 'frame', 'heap'];
  var POOL = [];
  (function () {
    var i, k;
    function pick(a) { return a[(Math.random() * a.length) | 0]; }
    for (i = 0; i < 240; i++) {
      var ind = (Math.random() * 4 | 0) * 2, line = '';
      for (k = 0; k < ind; k++) line += ' ';
      var form = Math.random();
      if (form < 0.3) line += pick(KW) + ' ' + pick(ID) + ' = ' + pick(ID) + '.' + pick(ID) + '(' + ((Math.random() * 99) | 0) + ');';
      else if (form < 0.55) line += pick(ID) + '.' + pick(ID) + ' += ' + (Math.random() * 9).toFixed(2) + ';';
      else if (form < 0.75) line += pick(KW) + ' (' + pick(ID) + ' < ' + ((Math.random() * 256) | 0) + ') {';
      else if (form < 0.9) line += '0x' + ((Math.random() * 0xffffff) | 0).toString(16) + ' ' + pick(ID) + '[' + ((Math.random() * 64) | 0) + ']';
      else line += '}';
      POOL.push(line);
    }
  })();
  var scroll = 0;
  function drawCode(speed, dt, alpha) {
    scroll += speed * dt;
    var lh = 17, first = Math.floor(scroll / lh), off = scroll % lh, i;
    vg.font = '15px "DejaVu Sans Mono", Menlo, Consolas, monospace'; vg.textBaseline = 'top';
    for (i = 0; i < 22; i++) {
      var n = first - i + 22, line = POOL[((n % POOL.length) + POOL.length) % POOL.length];
      var y = 348 - (i + 1) * lh + off - 2;
      var col = line.indexOf('0x') >= 0 ? '120,200,255' : (i % 5 === 0 ? '190,255,210' : '70,235,150');
      vg.fillStyle = 'rgba(' + col + ',' + (alpha * (0.45 + 0.55 * ((n * 7919) % 100) / 100)) + ')';
      vg.fillText(line, 22 + ((n * 13) % 3) * 6, y);
    }
  }
  function drawGlitch(power) {
    var k, count = 4 + Math.floor(power * 10);
    for (k = 0; k < count; k++) {
      var y = Math.random() * 348, h = 4 + Math.random() * 40 * power, dx = (Math.random() - 0.5) * 140 * power;
      vg.drawImage(vc, 0, y, 480, h, dx, y, 480, h);
    }
    for (k = 0; k < 3 + power * 8; k++) {
      var c = Math.random();
      vg.fillStyle = c < 0.4 ? 'rgba(255,40,70,0.55)' : c < 0.7 ? 'rgba(40,220,255,0.5)' : 'rgba(235,255,240,0.7)';
      vg.fillRect(Math.random() * 480, Math.random() * 348, rand(20, 220) * power + 8, rand(1, 6));
    }
    if (Math.random() < 0.25 * power) { vg.fillStyle = 'rgba(0,0,0,0.85)'; vg.fillRect(0, Math.random() * 348, 480, rand(10, 50)); }
  }
  function drawPrompt(now) {
    vg.fillStyle = 'rgba(0,10,8,0.82)'; vg.fillRect(0, 0, 480, 348);
    var blink = 0.55 + 0.45 * Math.sin(now / 260);
    vg.textAlign = 'center'; vg.textBaseline = 'middle';
    vg.font = '15px "DejaVu Sans Mono", Menlo, Consolas, monospace';
    vg.fillStyle = 'rgba(120,255,190,0.7)'; vg.fillText('ALIOX ONLINE', 240, 140);
    vg.font = 'bold 36px "DejaVu Sans Mono", Menlo, Consolas, monospace';
    vg.shadowColor = 'rgba(80,255,170,0.9)'; vg.shadowBlur = 14;
    vg.fillStyle = 'rgba(190,255,225,' + blink + ')'; vg.fillText('CLICK TO START', 240, 180);
    vg.shadowBlur = 0; vg.textAlign = 'left';
  }
  function drawWave(dt, level) {
    var n = 28, w = 8, gap = 5, x0 = 240 - (n * (w + gap)) / 2, k;
    vg.fillStyle = 'rgba(150,255,210,0.8)';
    for (k = 0; k < n; k++) {
      var h = 4 + level * 60 * Math.abs(Math.sin(performance.now() / 90 + k * 0.7) * Math.sin(k * 0.33 + performance.now() / 230));
      vg.fillRect(x0 + k * (w + gap), 330 - h, w, h);
    }
  }
  var liveAmt = 0, lastVisor = 0, bootStart = 0;
  function drawVisor(now, dt) {
    var glitching = now < glitchUntil;
    vg.setTransform(1, 0, 0, 1, 0, 0);
    vg.fillStyle = '#010605'; vg.fillRect(0, 0, 480, 348);
    var el = now - bootStart;
    if (phase === 'boot') {
      var ramp = clamp(el / 500, 0, 1);
      drawCode(1100, dt, ramp);
      if (el > BOOT_MS - GLITCH_MS * 0.0) phase = 'glitch';
    } else if (phase === 'glitch') {
      drawCode(1400, dt, 1);
      var gp = clamp((el - BOOT_MS) / Math.max(GLITCH_MS, 1), 0, 1);
      drawGlitch(0.5 + gp * 0.7);
      if (gp >= 1) becomeReady();
    } else if (phase === 'prompt') {
      drawCode(40, dt, 0.35);
      drawPrompt(now);
      if (now > nextMicro) { glitchUntil = now + rand(90, 200); nextMicro = now + rand(2500, 5000); }
      if (glitching) drawGlitch(0.45);
    } else {
      var run = mode === 'run', speak = mode === 'speak';
      drawCode(run ? 1000 : speak ? 150 : 50, dt, run ? 1 : speak ? 0.7 : 0.4);
      if (speak) drawWave(dt, 0.25 + talk * 0.75);
      if (glitching || (run && Math.random() < 0.06)) drawGlitch(run ? 0.55 : 0.8);
    }
    vg.setTransform(1, 0, 0, 1, 0, 0);
    // scanlines
    vg.fillStyle = 'rgba(0,0,0,0.18)';
    for (var y = 0; y < 348; y += 3) vg.fillRect(0, y, 480, 1);
  }

  // ---- build once the images are in ----
  var head, pivot, visorTex, uni, neckMesh, shown = false;
  var hubS = 0, hubR = 0;

  Promise.all([loadImage(DATA.front), loadImage(DATA.side), loadImage(DATA.rear), loadImage(DATA.neck)]).then(function (im) {
    visorTex = new T.CanvasTexture(vc);
    visorTex.encoding = T.LinearEncoding; visorTex.generateMipmaps = false; visorTex.minFilter = T.LinearFilter;
    uni = {
      tF: { value: tex(im[0], false) }, tS: { value: tex(im[1], false) }, tR: { value: tex(im[2], false) },
      tC: { value: visorTex }, uHubS: { value: 0 }, uHubR: { value: 0 }, uLive: { value: 0 }
    };
    var mat = new T.ShaderMaterial({ uniforms: uni, vertexShader: VERT, fragmentShader: FRAG, side: T.DoubleSide });
    head = new T.Mesh(loftHead(), mat);
    head.position.set(0, -PIVOT_Y, -PIVOT_Z);
    pivot = new T.Group(); pivot.position.set(0, PIVOT_Y, PIVOT_Z); pivot.add(head);
    scene.add(pivot);

    var nm = new T.MeshBasicMaterial({ map: tex(im[3], true), transparent: true, alphaTest: 0.35, toneMapped: false });
    neckMesh = new T.Mesh(new T.PlaneGeometry(360 / S, 205 / S), nm);
    neckMesh.position.set(1 / S, (Y0 - (395 + 600) / 2) / S, -0.5);
    scene.add(neckMesh);

    bootStart = performance.now();
    requestAnimationFrame(frame);
  }).catch(function () { fallback('the robot images could not be decoded'); });

  // ---- cursor ----
  var mx = 0.5, my = 0.5, haveMouse = false;
  window.addEventListener('mousemove', function (e) {
    var r = host.getBoundingClientRect();
    mx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
    my = (e.clientY - (r.top + r.height * 0.4)) / (window.innerHeight / 2);
    haveMouse = true;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    var t = e.touches[0]; if (!t) return;
    var r = host.getBoundingClientRect();
    mx = (t.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
    my = (t.clientY - (r.top + r.height * 0.4)) / (window.innerHeight / 2);
    haveMouse = true;
  }, { passive: true });

  // ---- size ----
  var lastW = 0, lastPR = 0;
  function resize() {
    var w = host.clientWidth || 380, h = host.clientHeight || 480;
    var scale = host.getBoundingClientRect().width / w || 1;
    var pr = Math.min((window.devicePixelRatio || 1) * scale, maxPixelRatio);
    if (w === lastW && Math.abs(pr - lastPR) < 0.01) return;
    lastW = w; lastPR = pr;
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  // ---- the loop ----
  var last = 0, cmdAt = 0, qYaw = 0, qPitch = 0, t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - last < frameMs - 2) return;
    var dt = Math.min(0.05, (now - (last || now - 16)) / 1000); last = now;
    resize();

    // commands go out in steps, about twelve a second, in small increments, like a controller talking to servos
    if (now - cmdAt > 80) {
      cmdAt = now;
      var tx = 0, ty = 0;
      if (phase !== 'boot' || now - bootStart > 500) {
        if (haveMouse && now > attentionUntil) { tx = clamp(mx, -1, 1) * MAX_YAW; ty = clamp(my, -1, 1) * MAX_PITCH; }
        else if (!haveMouse && ready && now > attentionUntil) {   // nobody is pointing: look about slowly
          var s = (now - t0) / 1000; tx = Math.sin(s * 0.5) * 0.25; ty = Math.sin(s * 0.37 + 1) * 0.08;
        }
      } else { ty = 0.5; }
      if (phase === 'boot' && now - bootStart > 500) ty = 0;
      qYaw = Math.round(tx / 0.03) * 0.03; qPitch = Math.round(ty / 0.02) * 0.02;
      if (mode === 'speak' && talk > 0.05) qPitch -= 0.05 * talk;
      yaw.t = qYaw; pitch.t = qPitch; roll.t = -qYaw * 0.12;
    }
    yaw.step(dt); pitch.step(dt); roll.step(dt);
    talk = Math.max(0, talk - dt * 1.8);

    // hubs: spin faster when thinking, and with the motion of the neck
    var base = (phase === 'boot' || phase === 'glitch') ? 5 : mode === 'run' ? 4 : mode === 'speak' ? 1.3 : 0.25;
    var drive = Math.abs(yaw.v) * 3 + Math.abs(pitch.v) * 2;
    var sp = (reduce ? 0.2 : 1) * (base + drive);
    hubS += sp * dt; hubR -= sp * 0.8 * dt;

    var tremble = Math.min(1, Math.abs(yaw.v) + Math.abs(pitch.v)) * 0.0025 * Math.sin(now * 0.09);
    if (pivot) {
      pivot.rotation.set(pitch.p + tremble, yaw.p + tremble * 0.7, roll.p);
      pivot.position.y = PIVOT_Y + Math.sin(now / 1500) * 0.012;
      uni.uHubS.value = hubS; uni.uHubR.value = hubR;
      uni.uLive.value = liveAmt = Math.min(0.9, liveAmt + dt * 1.2);
    }

    if (now - lastVisor > 33) { drawVisor(now, Math.min(0.1, (now - lastVisor) / 1000)); visorTex.needsUpdate = true; lastVisor = now; }

    renderer.render(scene, camera);
    if (!shown) { shown = true; host.classList.add('on'); }
  }
})();