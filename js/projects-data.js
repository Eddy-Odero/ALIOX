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
    name: 'EDU-FLIX',
    description: 'A free streaming platform. Browse by genre and provider, get recommendations, install it as an app that works offline, or watch a movie with friends in real time through watch parties.',
    image: 'assets/projects/edu-flix.png',
    meta: [['STACK', 'GO / JAVASCRIPT'], ['DATA', 'TURSO + REDIS'], ['STATUS', 'LIVE']],
    links: [['LIVE SITE', 'https://edu-flix.onrender.com'], ['CODE', 'https://github.com/Eddy-Odero/EDU-FLIX']]
  },
  {
    name: 'WAPI',
    description: 'A streaming and live content app with a React web client and a React Native mobile app, including sign-in, OAuth and a home page built from a detailed design.',
    image: 'assets/projects/wapi.png',
    meta: [['STACK', 'REACT / REACT NATIVE'], ['PLATFORM', 'WEB + MOBILE'], ['FOCUS', 'AUTH / OAUTH / UI']],
    links: []
  },
  {
    name: 'THIS PORTFOLIO',
    description: 'Plain HTML, CSS and JavaScript. ALIOX, the robot you are talking to, follows your cursor and answers from a small script, with no server and no API key.',
    image: 'assets/projects/portfolio.jpg',
    meta: [['STACK', 'HTML / CSS / JAVASCRIPT'], ['3D', 'THREE.JS'], ['BACKEND', 'NONE']],
    links: []
  }
];
