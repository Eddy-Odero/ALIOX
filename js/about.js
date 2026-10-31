
(function () {
  'use strict';

  var T = window.THREE, PTS = window.ABOUT_POINTS, DATA = window.ABOUT || {};
  var FRAMES = Array.isArray(DATA.frames) ? DATA.frames : [];
  var dock = document.querySelector('.dock');
  if (!dock) return;
  var host = dock.parentNode;
  var calm = /[?&]calm\b/.test(location.search);

  var tier = 'med';
  try { var saved = localStorage.getItem('tier'); if (/^(high|med|saver)$/.test(saved)) tier = saved; } catch (e) {}
  var maxPR = tier === 'high' ? 2 : tier === 'med' ? 1.5 : 1;
  var share = tier === 'saver' ? 0.45 : tier === 'med' ? 0.8 : 1;          // the points are shuffled, so a share still covers the whole figure
  var panelSegs = tier === 'saver' ? 8 : 16;
  var TEX_W = tier === 'saver' ? 768 : 1024, TEX_H = Math.round(TEX_W * 0.6875);
  var frameMs = 1000 / (tier === 'saver' ? 30 : 60);

  var STAGE_W = 1475, STAGE_H = 720;
  var RING_R = 360, PANEL_W = 215, PANEL_H = 148, RING_Y = -30, TILT = 0.26;   // the ring, in stage units; TILT looks down on it
  var FOCUS = 30 * Math.PI / 180;                                          // where the chosen panel comes to rest (front, a little to the right)
  var LINE = '#e6e6e6';

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // ---- build the page parts ----
  var view = el('section', 'ab'); view.setAttribute('role', 'dialog'); view.setAttribute('aria-label', 'About'); view.setAttribute('aria-hidden', 'true');
  view.appendChild(el('div', 'ab-dots'));
  var canvas = el('canvas', 'ab-canvas'); view.appendChild(canvas);

  var label = el('div', 'ab-label', 'SELECTED - ABOUT'); label.appendChild(el('i'));
  var close = el('button', 'ab-close'); close.type = 'button';
  close.appendChild(el('span', null, 'ESC')); close.appendChild(document.createTextNode('CLOSE'));
  view.appendChild(label); view.appendChild(close);

  view.appendChild(el('div', 'ab-name', DATA.name || ''));
  var line = el('div', 'ab-line'); (DATA.line || []).forEach(function (l, i) { if (i) line.appendChild(document.createElement('br')); line.appendChild(document.createTextNode(l)); });
  view.appendChild(line);
  view.appendChild(el('div', 'ab-hint', DATA.hint || ''));
  var info = el('div', 'ab-info'), iCap = el('div', 'cap'), iTitle = el('b'), iText = el('p');
  info.appendChild(iCap); info.appendChild(iTitle); info.appendChild(iText); view.appendChild(info);

  // the panels as real buttons too, hidden from sight, so the keyboard and screen readers can reach them
  var sr = el('div', 'ab-sr');
  FRAMES.forEach(function (f, i) {
    var b = el('button', null, f.title); b.type = 'button';
    b.addEventListener('click', function () { choose(i); });
    sr.appendChild(b);
  });
  view.appendChild(sr);
  host.appendChild(view);

  // ---- 3D ----
  var renderer, scene, camera, group, mat, tilt, ring, panels = [], points, ready = false, isOpen = false, raf = 0, last = 0, t0 = 0;
  var tgtYaw = 0, tgtPitch = 0, yaw = 0, pitch = 0;
  var spin = 0, selected = -1, hovered = -1, targetSpin = null, holdUntil = 0;
  var raycaster = null, mouse = null, ptr = null;

  function decode() {
    var bin = atob(PTS.data), n = PTS.n, u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    var dv = new DataView(u8.buffer), o = 0;
    var xs = new Uint16Array(n), ys = new Uint16Array(n);
    for (i = 0; i < n; i++) xs[i] = dv.getUint16(o + i * 2, true); o += n * 2;
    for (i = 0; i < n; i++) ys[i] = dv.getUint16(o + i * 2, true); o += n * 2;
    return { x: xs, y: ys, z: u8.subarray(o, o + n), b: u8.subarray(o + n, o + 2 * n), f: u8.subarray(o + 2 * n, o + 3 * n), n: n };
  }

  // ---- what is drawn on each glass panel ----
  function seeded(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function drawPanel(p, i) {
    var f = FRAMES[i], c = p.ctx, W = TEX_W, H = TEX_H, k = W / 1024, rnd = seeded(97 + i * 131);
    c.clearRect(0, 0, W, H);
    c.fillStyle = 'rgba(0,0,0,0.62)'; c.fillRect(0, 0, W, H);
    // faint inner glow towards the edges, like the glass in the reference
    var g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(255,255,255,0.14)'); g.addColorStop(0.1, 'rgba(255,255,255,0)'); g.addColorStop(0.9, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.14)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = LINE; c.lineWidth = 5 * k; c.strokeRect(5 * k, 5 * k, W - 10 * k, H - 10 * k);
    // title bar with three dots, like a small window
    c.lineWidth = 3 * k; c.beginPath(); c.moveTo(5 * k, 58 * k); c.lineTo(W - 5 * k, 58 * k); c.stroke();
    c.fillStyle = LINE; for (var d = 0; d < 3; d++) { c.beginPath(); c.arc((34 + d * 26) * k, 32 * k, 7 * k, 0, 6.283); c.fill(); }
    c.font = '500 ' + (24 * k) + 'px "Roboto Mono","IBM Plex Mono","DejaVu Sans Mono",monospace'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(235,235,235,0.8)'; c.textAlign = 'left'; c.fillText((f.cap || f.title).toUpperCase(), 130 * k, 32 * k);
    c.textAlign = 'right'; c.fillText(pad(i + 1) + ' / ' + pad(FRAMES.length), W - 30 * k, 32 * k);
    // the body: the picture if there is one, otherwise a drawn diagram and lines of code, as in the reference
    var bx = 40 * k, by = 84 * k, bw = W - 80 * k, bh = 400 * k;
    if (p.img) {
      c.save(); c.beginPath(); c.rect(bx, by, bw, bh); c.clip();
      var s = Math.max(bw / p.img.width, bh / p.img.height), iw = p.img.width * s, ih = p.img.height * s;
      var fx = typeof f.focusX === 'number' ? f.focusX : 0.5, fy = typeof f.focusY === 'number' ? f.focusY : 0.15;   // which part stays in view when the picture is cropped (0 = top/left, 1 = bottom/right)
      c.filter = 'grayscale(1) contrast(1.1)'; c.drawImage(p.img, bx + (bw - iw) * fx, by + (bh - ih) * fy, iw, ih); c.filter = 'none';
      c.restore();
      c.strokeStyle = 'rgba(235,235,235,0.5)'; c.lineWidth = 2 * k; c.strokeRect(bx, by, bw, bh);
    } else {
      c.strokeStyle = 'rgba(235,235,235,0.75)'; c.lineWidth = 2.5 * k;
      var nx = [], ny = [], cx = bx + bw * 0.28, cy = by + bh * 0.5, n = 9, j;
      for (j = 0; j < n; j++) { var a = j / n * 6.283 + rnd() * 0.5, r = (0.45 + 0.55 * rnd()) * bh * 0.42; nx.push(cx + Math.cos(a) * r * 1.25); ny.push(cy + Math.sin(a) * r); }
      nx.push(cx); ny.push(cy);
      for (j = 0; j < nx.length; j++) for (var q = j + 1; q < nx.length; q++) if (rnd() < 0.42) { c.beginPath(); c.moveTo(nx[j], ny[j]); c.lineTo(nx[q], ny[q]); c.stroke(); }
      c.fillStyle = LINE; for (j = 0; j < nx.length; j++) { c.beginPath(); c.arc(nx[j], ny[j], 6 * k, 0, 6.283); c.fill(); }
      var lx = bx + bw * 0.58, ly = by + 14 * k;                        // lines of code on the right
      for (j = 0; j < 12; j++) {
        var ind = (rnd() < 0.4 ? 1 : 0) * 36 * k, ln = (0.25 + 0.6 * rnd()) * bw * 0.36;
        c.fillStyle = j === 4 ? 'rgba(235,235,235,0.85)' : 'rgba(235,235,235,0.4)'; c.fillRect(lx + ind, ly + j * 30 * k, ln, 8 * k);
      }
    }
    // the title, large, along the bottom
    c.font = '600 ' + (56 * k) + 'px "Roboto Mono","IBM Plex Mono","DejaVu Sans Mono",monospace'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = '#ffffff'; c.fillText(f.title, 40 * k, H - 44 * k, W - 80 * k);
    p.tex.needsUpdate = true;
  }

  function build() {
    if (ready || !T || !PTS || !PTS.data) return ready;
    try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: tier !== 'saver', alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { return false; }
    renderer.setClearColor(0x000000, 0);
    var d = decode(), n = d.n, S = 0.74, ZS = 230;
    var pos = new Float32Array(n * 3), br = new Float32Array(n), fl = new Float32Array(n), rn = new Float32Array(n);
    var seed = 12345; function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    for (var i = 0; i < n; i++) {
      pos[i * 3] = (d.x[i] - 512) * S;
      pos[i * 3 + 1] = -(d.y[i] - 560) * S;
      pos[i * 3 + 2] = (d.z[i] / 255 - 0.5) * ZS;
      br[i] = d.b[i] / 255; fl[i] = d.f[i]; rn[i] = rand();
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aB', new T.BufferAttribute(br, 1));
    geo.setAttribute('aF', new T.BufferAttribute(fl, 1));
    geo.setAttribute('aR', new T.BufferAttribute(rn, 1));
    geo.setDrawRange(0, Math.floor(n * share));
    var uni = { uT: { value: 0 }, uA: { value: calm ? 1 : 0 }, uPx: { value: 1 }, uSize: { value: 1.9 } };
    var VS = [
        'attribute float aB; attribute float aF; attribute float aR;',
        'uniform float uT; uniform float uA; uniform float uPx; uniform float uSize;',
        'varying float vB; varying float vN;',
        'void main(){',
        '  vec3 p = position;',
        '  float k = clamp(uA * 1.35 - aR * 0.35, 0.0, 1.0); k = k * k * (3.0 - 2.0 * k);',   // each point arrives at its own moment
        '  vec3 away = vec3(sin(aR*91.0), cos(aR*57.0), sin(aR*33.0)) * 520.0;',
        '  p += away * (1.0 - k);',
        '  if (aF > 0.5) { p += vec3(sin(uT*0.55+aR*40.0), cos(uT*0.45+aR*30.0), sin(uT*0.35+aR*20.0)) * 16.0; }',
        '  else { p.z += sin(uT*1.1 + aR*60.0) * 1.2; }',
        '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        '  gl_Position = projectionMatrix * mv;',
        '  float near = clamp(0.5 - position.z / 260.0, 0.0, 1.0);',
        '  vN = near; vB = min(aB * 1.6, 1.0) * (0.6 + 0.4 * near) * (0.35 + 0.65 * k);',
        '  gl_PointSize = uSize * uPx * (1500.0 / -mv.z) * (aF > 0.5 ? 1.7 : 1.0);',
        '}'
    ].join('\n');
    mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending,
      uniforms: uni, vertexShader: VS,
      fragmentShader: [
        'varying float vB; varying float vN;',
        'void main(){',
        '  vec2 c = gl_PointCoord - 0.5; float r = length(c);',
        '  if (r > 0.5) discard;',
        '  float a = smoothstep(0.5, 0.1, r) * vB;',
        '  vec3 col = mix(vec3(0.17, 0.38, 0.52), vec3(0.86, 0.93, 0.97), pow(clamp(vB * 1.1, 0.0, 1.0), 0.75));',
        '  gl_FragColor = vec4(col * a, a);',
        '}'
      ].join('\n')
    });
    group = new T.Group();
    group.position.set(737 - STAGE_W / 2, STAGE_H / 2 - 330, 0);          // the figure's middle sits at stage (737, 330)
    // an invisible, denser copy of the figure that only writes depth, so panels behind the figure are hidden by it
    var occ = new T.ShaderMaterial({
      transparent: true, depthWrite: true, colorWrite: false,
      uniforms: { uT: uni.uT, uA: uni.uA, uPx: uni.uPx, uSize: { value: 5.2 } },
      vertexShader: VS.replace('(aF > 0.5 ? 1.7 : 1.0)', '(aF > 0.5 ? 0.0 : 1.0)'),
      fragmentShader: 'void main(){ vec2 c = gl_PointCoord - 0.5; if (length(c) > 0.5) discard; gl_FragColor = vec4(0.0); }'
    });
    var occluder = new T.Points(geo, occ); occluder.renderOrder = -1; occluder.frustumCulled = false; group.add(occluder);
    points = new T.Points(geo, mat); points.renderOrder = 1; group.add(points);
    scene = new T.Scene(); scene.add(group);

    // the ring of glass panels: slices of a cylinder, one per frame, in the same scene as the figure
    tilt = new T.Group(); tilt.position.set(737 - STAGE_W / 2, STAGE_H / 2 - 330 + RING_Y, 0); tilt.rotation.x = TILT;
    ring = new T.Group(); tilt.add(ring); scene.add(tilt);
    var arc = PANEL_W / RING_R, count = Math.max(FRAMES.length, 1);
    FRAMES.forEach(function (f, i) {
      var theta = (i / count) * Math.PI * 2;
      var cv = document.createElement('canvas'); cv.width = TEX_W; cv.height = TEX_H;
      var tex = new T.CanvasTexture(cv); tex.anisotropy = 4;
      var g = new T.CylinderGeometry(RING_R, RING_R, PANEL_H, panelSegs, 1, true, theta - arc / 2, arc);
      var m = new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.DoubleSide, depthWrite: false, opacity: 0.85 });
      var mesh = new T.Mesh(g, m);
      var edges = new T.LineSegments(new T.EdgesGeometry(g, 25), new T.LineBasicMaterial({ color: 0xf0f0f0, transparent: true, opacity: 0.9 }));
      mesh.add(edges); ring.add(mesh);
      var p = { theta: theta, mesh: mesh, edges: edges, mat: m, tex: tex, ctx: cv.getContext('2d'), img: null, mix: 0 };
      mesh.userData.i = i; panels.push(p);
      drawPanel(p, i);
      if (f.image && location.protocol === 'file:') {                      // opened by double-clicking the file: the browser blocks pictures in 3D
        if (!window.__aboutFileWarn) { window.__aboutFileWarn = 1; console.warn('about: pictures need a local server (the page was opened as a file). See the note in about-data.js.'); }
      } else if (f.image) {                                                      // a missing picture just leaves the drawn diagram
        var im = new Image(); im.onload = function () { p.img = im; drawPanel(p, i); }; im.onerror = function () { console.warn('about: picture not found: ' + f.image + ' (check the path and the file extension)'); }; im.src = f.image;
      }
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { panels.forEach(function (p, i) { drawPanel(p, i); }); });
    // a faint ring of light at the foot of the glass
    var pts = [], seg = 120; for (var s2 = 0; s2 <= seg; s2++) { var a2 = s2 / seg * Math.PI * 2; pts.push(new T.Vector3(Math.sin(a2) * RING_R, -PANEL_H / 2 - 4, Math.cos(a2) * RING_R)); }
    ring.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.3 })));

    camera = new T.PerspectiveCamera(2 * Math.atan(STAGE_H / 2 / 1500) * 180 / Math.PI, STAGE_W / STAGE_H, 100, 4000);
    camera.position.set(0, 0, 1500);
    raycaster = new T.Raycaster(); mouse = new T.Vector2();
    ready = true; resize();
    return true;
  }

  function resize() {
    if (!ready) return;
    var r = view.getBoundingClientRect(), s = r.width / STAGE_W || 1;      // the stage is scaled by home.js
    var pr = Math.min(Math.max(s * (window.devicePixelRatio || 1), 1), maxPR);
    renderer.setPixelRatio(pr); renderer.setSize(STAGE_W, STAGE_H, false);
    mat.uniforms.uPx.value = pr;
  }

  // ---- choosing ----
  function choose(i) {
    if (!FRAMES[i] || !ready) return;
    selected = i;
    // turn the ring the shortest way until this panel sits at the focus angle
    var cur = panels[i].theta + spin, d = wrap(FOCUS - cur);
    targetSpin = spin + d; holdUntil = 0;
    var f = FRAMES[i];
    iCap.textContent = 'FRAME ' + pad(i + 1) + ' OF ' + pad(FRAMES.length);
    iTitle.textContent = f.title; iText.textContent = f.text || ''; iText.appendChild(el('span', 'ab-cur'));
    info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
    if (calm) { spin = targetSpin; targetSpin = null; applyRing(1 / 60, 0); renderer.render(scene, camera); }
  }
  function intro() {
    iCap.textContent = 'SELECT A FRAME'; iTitle.textContent = ''; iText.textContent = 'Click a panel to open it and read the story behind it.'; iText.appendChild(el('span', 'ab-cur'));
  }

  // the ring: turn it, and light each panel by how near and how chosen it is
  function applyRing(dt, now) {
    ring.rotation.y = spin;
    panels.forEach(function (p, i) {
      var psi = p.theta + spin, near = (Math.cos(psi) + 1) / 2;           // 1 at the front, 0 at the back
      var goal = i === selected ? 1 : (i === hovered ? 0.6 : 0);
      p.mix += (goal - p.mix) * Math.min(dt * 6, 1);
      p.mat.opacity = Math.min(0.5 + 0.35 * near + 0.2 * p.mix, 1);
      p.edges.material.opacity = Math.min(0.55 + 0.4 * near + 0.3 * p.mix, 1);
      p.mesh.renderOrder = Math.cos(psi) < 0 ? 0 : 2;                     // far panels are drawn before the figure, near ones after
    });
  }

  // ---- loop ----
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < frameMs - 1) return;
    var dt = Math.min((now - last) / 1000, 0.1); last = now;
    var t = (now - t0) / 1000;
    if (ready) {
      mat.uniforms.uT.value = calm ? 0 : t;
      if (!calm) mat.uniforms.uA.value = Math.min(t / 2.4, 1);
      var idle = calm ? 0 : Math.sin(t * 0.35) * 0.05;
      yaw += (tgtYaw + idle - yaw) * Math.min(dt * 3, 1); pitch += (tgtPitch - pitch) * Math.min(dt * 3, 1);
      group.rotation.y = yaw; group.rotation.x = pitch;
      if (!calm) {
        if (targetSpin !== null) {
          var diff = targetSpin - spin; spin += diff * Math.min(dt * 3.2, 1);
          if (Math.abs(diff) < 0.002) { spin = targetSpin; targetSpin = null; holdUntil = now + 4500; }   // rest on it for a moment
        } else if (hovered < 0 && now > holdUntil) spin += dt * 0.14;     // then the ring carries on
      }
      applyRing(dt, now);
      renderer.render(scene, camera);
    }
  }

  function pick(e) {
    var r = view.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    raycaster.setFromCamera(mouse, camera);
    var hits = raycaster.intersectObjects(panels.map(function (p) { return p.mesh; }), false);
    return hits.length ? hits[0].object.userData.i : -1;
  }
  function onMove(e) {
    var r = view.getBoundingClientRect();
    var nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    tgtYaw = Math.max(-1, Math.min(1, nx)) * 0.22; tgtPitch = Math.max(-1, Math.min(1, ny)) * 0.05;
    if (ready) { hovered = pick(e); view.style.cursor = hovered >= 0 ? 'pointer' : ''; }
  }
  function onClick(e) {
    if (!ready || e.target.closest('.ab-close')) return;
    var i = pick(e); if (i >= 0) choose(i);
  }

  function open() {
    if (isOpen) return;
    isOpen = true; view.classList.add('open'); view.setAttribute('aria-hidden', 'false');
    var ok = build();
    if (!ok && !ready && !view.querySelector('.ab-nowebgl')) view.appendChild(el('div', 'ab-nowebgl', 'THE 3D PORTRAIT NEEDS WEBGL, WHICH THIS BROWSER DOES NOT OFFER'));
    selected = -1; hovered = -1; targetSpin = null; holdUntil = 0; spin = 0; yaw = pitch = tgtYaw = tgtPitch = 0;
    intro();
    t0 = performance.now(); last = 0;
    if (ready) { mat.uniforms.uA.value = calm ? 1 : 0; resize(); applyRing(1 / 60, 0); if (calm) renderer.render(scene, camera); }
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }
  function shut() {
    if (!isOpen) return;
    isOpen = false; cancelAnimationFrame(raf);
    view.classList.remove('open'); view.setAttribute('aria-hidden', 'true');
  }

  close.addEventListener('click', shut);
  view.addEventListener('pointermove', onMove);
  view.addEventListener('click', onClick);
  window.addEventListener('resize', function () { if (isOpen) resize(); });
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { if (!document.querySelector('.menu.open')) shut(); return; }
    if (/^Arrow(Down|Right|Up|Left)$/.test(e.key) && FRAMES.length) {
      e.preventDefault();
      var step = /Down|Right/.test(e.key) ? 1 : -1, n = ((selected < 0 ? (step > 0 ? -1 : 0) : selected) + step + FRAMES.length) % FRAMES.length;
      choose(n);
    }
  });

  window.aboutView = { open: open, close: shut, isOpen: function () { return isOpen; } };
})();