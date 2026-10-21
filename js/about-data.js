/* The About view (js/about.js). Edit this file, no other code needs to change.
   - name, line: the text at the bottom left
   - frames:     the glass panels that turn around the portrait, in order. Choosing one brings it forward and shows its text on the right.
       title: heading, cap: small line on the card, text: shown on the right, image: optional picture (leave out for a plain card) */
window.ABOUT = {
  name: 'EDWARD ODERO',
  line: ['Full-stack developer. Apprentice at zone01 Kisumu.', 'Vanilla JS frontends, Go backends.'],
  hint: 'THE GLASS RING TURNS. CLICK A PANEL, OR USE THE ARROW KEYS',
  frames: [
    { title: 'GOPHERCON AFRICA 26', cap: 'GOPHERCON AFRICA', image: 'assets/about/gophercon.jpg',
      text: 'At GopherCon Africa, the conference of the Go community. Go is the language behind the backends he builds.' },
    { title: 'ZONE01 KISUMU', cap: 'ZONE01 KISUMU',
      text: 'Where he is an apprentice developer in Kisumu, Kenya, learning by building real projects with peers.' },
    { title: 'EDU-FLIX', cap: 'EDU-FLIX', image: 'assets/projects/edu-flix.jpg',
      text: 'A free streaming platform. A Go backend with a vanilla JavaScript frontend, built end to end.' },
    { title: 'WAPI', cap: 'WAPI', image: 'assets/projects/wapi.jpg',
      text: 'A streaming and live content app, with a React web client and a React Native mobile client.' },
    { title: 'THIS PORTFOLIO', cap: 'THIS PORTFOLIO', image: 'assets/projects/portfolio.jpg',
      text: 'The site you are on: a 3D robot, a terminal-style chat and full-page views, written without a framework.' },
    { title: 'KISUMU, KENYA', cap: 'KISUMU, KENYA',
      text: 'Based in Kisumu, on East Africa Time (UTC+3). Also interested in software entrepreneurship.' }
  ]
};