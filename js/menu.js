/* The menu that springs up when the HOME dock is clicked.
   No backend: the links below are plain links. About / Contact / Skills ask ALIOX (chat.js) to open that topic,
   exactly as if the visitor had clicked its button. Projects and Skills open their own full-page views (projects.js, skills.js). HOME closes the menu.

   Put your real addresses in LINKS. Add or remove a line to change the socials. */
(function () {
  'use strict';

  var LINKS = [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/YOUR-LINKEDIN-NAME' },
    { label: 'Dev.to',   href: 'https://dev.to/YOUR-DEVTO-NAME' },
    { label: 'Github',   href: 'https://github.com/Eddy-Odero' }
  ];
  // top to bottom. "topic" matches an id in chat-content.js. The number is shown in front of the name.
  var PAGES = [
    { label: 'Contact',  view: 'contact' },         // opens the contact trail (contact.js), ALIOX does not write anything
    { label: 'Skills',   view: 'skills' },        // opens the skills view (skills.js), ALIOX does not write anything
    { label: 'Projects', view: 'projects' },     // opens the project index (projects.js), ALIOX does not write anything
    { label: 'About',    view: 'about' },           // opens the 3D portrait (about.js), ALIOX does not write anything
    { label: 'Home',     topic: null }
  ];

  var dock = document.querySelector('.dock');
  if (!dock) return;
  var host = dock.parentNode;
  var open = false, closeTimer = 0;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---- build the panel (text nodes only, never HTML) ----
  var menu = el('div', 'menu'); menu.id = 'menu'; menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', 'Menu');
  var head = el('div', 'menu-head'); head.style.setProperty('--i', 0);
  var titles = el('div');
  titles.appendChild(el('h2', 'menu-title', 'Menu'));
  titles.appendChild(el('span', 'menu-sub', 'NAVIGATION'));
  var closeBtn = el('button', 'menu-close', 'ESC'); closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Close menu');
  head.appendChild(titles); head.appendChild(closeBtn);
  menu.appendChild(head);

  var socials = el('div', 'menu-socials'); socials.style.setProperty('--i', 1);
  LINKS.forEach(function (l) {
    var a = el('a', 'menu-social', l.label);
    a.href = l.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
    socials.appendChild(a);
  });
  menu.appendChild(socials);

  var nav = el('nav', 'menu-nav'); nav.setAttribute('aria-label', 'Sections');
  PAGES.forEach(function (p, k) {
    var b = el('button', 'menu-item'); b.type = 'button'; b.style.setProperty('--i', k + 2);
    b.appendChild(el('i', null, '[' + (PAGES.length - k) + ']'));
    b.appendChild(document.createTextNode(p.label));
    b.addEventListener('click', function () {
      close();
      if (p.view) { showView(p.view); return; }
      showView(null);                                                    // leaving a full-page view for another section
      if (p.topic && window.aliox) window.aliox.open(p.topic);
    });
    nav.appendChild(b);
  });
  menu.appendChild(nav);
  var grid = el('button', 'menu-grid'); grid.type = 'button'; grid.setAttribute('aria-label', 'Close menu');
  for (var d = 0; d < 4; d++) grid.appendChild(el('i'));
  menu.appendChild(grid);
  host.appendChild(menu);

  // sits right on top of the dock, same width, growing upward (layout units, so the page scaling does not matter)
  // Projects, Skills, Contact and About are full-page views: opening one closes the other, and null closes both
  function showView(name) {
    var views = { projects: window.projectsView, skills: window.skillsView, contact: window.contactView, about: window.aboutView };
    Object.keys(views).forEach(function (k) {
      if (!views[k]) return;
      if (k === name) views[k].open(); else views[k].close();
    });
  }

  function place() {
    menu.style.left = dock.offsetLeft + 'px';
    menu.style.width = dock.offsetWidth + 'px';
    menu.style.bottom = (host.clientHeight - dock.offsetTop - dock.offsetHeight) + 'px';
  }

  function show() {
    if (open) return;
    open = true; clearTimeout(closeTimer);
    place();
    menu.classList.remove('closing'); menu.classList.add('open');
    dock.classList.add('open'); dock.setAttribute('aria-expanded', 'true');
    var first = menu.querySelector('.menu-item'); if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 400);
  }
  function close() {
    if (!open) return;
    open = false;
    menu.classList.remove('open'); menu.classList.add('closing');
    dock.classList.remove('open'); dock.setAttribute('aria-expanded', 'false');
    closeTimer = setTimeout(function () { menu.classList.remove('closing'); }, 230);
  }

  // the whole dock is the HOME button: the text, the bars and the icon all open the menu
  dock.setAttribute('role', 'button'); dock.setAttribute('tabindex', '0');
  dock.setAttribute('aria-haspopup', 'dialog'); dock.setAttribute('aria-expanded', 'false'); dock.setAttribute('aria-controls', 'menu');
  dock.addEventListener('click', function (e) {
    if (open) close(); else show();
  });
  dock.addEventListener('keydown', function (e) {
    if (e.target !== dock) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (open) close(); else show(); }
  });
  closeBtn.addEventListener('click', close);
  grid.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); } });
  document.addEventListener('pointerdown', function (e) {                // a click anywhere else closes it
    if (open && !menu.contains(e.target) && !dock.contains(e.target)) close();
  });
  window.addEventListener('resize', function () { if (open) place(); });
})();