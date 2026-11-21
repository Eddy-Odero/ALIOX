/* The projects shown in the project index (projects.js). Edit this file, no other code needs to change.
   - name:        shown in the list on the right and as the title of the card
   - description: shown at the top left when the project is selected
   - image:       a picture for the project. Put it in assets/projects/ (about 3:2, for example 1200x800).
                  If the file is missing, a plain card with the project name is shown instead.
   - meta:        the rows under the picture, [label, value]
   - links:       buttons under the rows, [label, address]
   The order here is the order in the list. */
window.PROJECTS = [
  {
    name: 'WAPI',
    description: 'A Twitch-style live streaming platform built for low-latency streaming over local connections across Kenya.',
    image: 'assets/projects/wapi.png',
    meta: [['STACK', 'REACT / GO / DOCKER'], ['TYPE', 'INTERNAL'], ['STATUS', 'ONGOING']],
    links: [['CODE', 'https://github.com/Eddy-Odero']]
  },
  {
    name: 'SATGATE',
    description: 'A Lightning Network-powered anti-spam contact form, built by a team of seven and winner of the Kisumu Bitcoin Bootcamp Hackathon 2026. I built the frontend loading states: a Bitcoin pulse loader, shimmer skeletons and a progress bar.',
    image: 'assets/projects/satgate.png',
    meta: [['STACK', 'FRONTEND / LIGHTNING'], ['TYPE', 'TEAM OF 7'], ['RESULT', 'HACKATHON WINNER']],
    links: [['CODE', 'https://github.com/Eddy-Odero']]
  },
  {
    name: 'STAR HUNTERS',
    description: 'A team hackathon project for the NASA SPHEREx sky-viewer challenge: a public web tool that shows patches of the sky as a multi-epoch video, so moving objects stand out. Made to be usable by people who are not astronomers.',
    image: 'assets/projects/star-hunters.png',
    meta: [['STACK', 'REACT / TYPESCRIPT / FASTAPI'], ['TYPE', 'TEAM HACKATHON'], ['CHALLENGE', 'NASA SPHEREX']],
    links: [['CODE', 'https://github.com/Eddy-Odero/star-hunters']]
  },
  {
    name: 'EDU-FLIX',
    description: 'A Netflix-style streaming platform with JWT authentication, bcrypt, Gmail-based password reset and CI through GitHub Actions, deployed on Render.',
    image: 'assets/projects/edu-flix.png',
    meta: [['STACK', 'GO / SQLITE + TURSO'], ['TYPE', 'PERSONAL'], ['STATUS', 'LIVE']],
    links: [['LIVE SITE', 'https://edu-flix.onrender.com'], ['CODE', 'https://github.com/Eddy-Odero/EDU-FLIX']]
  },
  {
    name: 'TINAH COSMETICS',
    description: 'A boutique operating system: a PIN-secured point of sale paired with an e-commerce site, sharing one data layer, with M-Pesa, cash and card payments.',
    image: 'assets/projects/maison-pos.png',
    meta: [['STACK', 'BROWSER POS'], ['TYPE', 'PERSONAL'], ['PAYMENTS', 'M-PESA / CASH / CARD']],
    links: [['CODE', 'https://github.com/Eddy-Odero']]
  },
  {
    name: 'PROFILE-ENGINE',
    description: 'A custom GitHub profile README generator with a cyberpunk HUD look, driven by a Python pipeline and GitHub Actions.',
    image: 'assets/projects/profile-engine.png',
    meta: [['STACK', 'PYTHON / SVG'], ['TYPE', 'PERSONAL'], ['AUTOMATION', 'GITHUB ACTIONS']],
    links: [['CODE', 'https://github.com/Eddy-Odero']]
  },
  {
    name: 'THIS PORTFOLIO',
    description: 'Plain HTML, CSS and JavaScript. ALIOX, the robot you are talking to, follows your cursor and answers from a small script, with no server and no API key.',
    image: 'assets/projects/portfolio.png',
    meta: [['STACK', 'HTML / CSS / JAVASCRIPT'], ['3D', 'THREE.JS'], ['BACKEND', 'NONE']],
    links: []
  }
];