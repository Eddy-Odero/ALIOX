/* The About view (js/about.js). Edit this file, no other code needs to change.
   - name, line: the text at the bottom left
   - frames:     the glass panels that turn around the portrait, in order. Choosing one brings it forward and shows its text on the right.
       title: heading, cap: small line on the card, text: shown on the right, image: optional picture (leave out for a plain card),
       focusY: optional, 0 to 1, which part of a tall picture stays visible (0 = the top, so heads are kept; default 0.15), focusX: same for wide pictures (default 0.5) */
window.ABOUT = {
  name: 'EDWARD ODERO',
  line: ['Full-stack developer. Apprentice at zone01 Kisumu.', 'Vanilla JS frontends, Go backends.'],
  hint: 'THE GLASS RING TURNS. CLICK A PANEL, OR USE THE ARROW KEYS',
  frames: [
    { title: 'GOPHERCON AFRICA 26', cap: 'GOPHERCON AFRICA', image: 'assets/about/gophercon.jpg', focusY: 0,
      text: 'At GopherCon Africa, the conference of the Go community. Go is the language he is building his backend skills in.' },
    { title: 'WHO I AM', cap: 'EDWARD ODERO',
      text: 'Edward Odero, called Eddy. A full-stack developer who builds both sides of an app, from the vanilla JavaScript frontend to the Go backend.' },
    { title: 'ZONE01 KISUMU', cap: 'ZONE01 KISUMU',
      text: 'An apprentice developer at zone01 in Kisumu, Kenya, learning by building real projects alongside peers rather than from lectures.' },
    { title: 'HOW I WORK', cap: 'HOW I WORK',
      text: 'He likes to understand why something works, not only to get it working, and prefers small, careful changes to rewriting everything.' },
    { title: 'FOCUS', cap: 'FOCUS',
      text: 'Machine learning, system design and development, with over three years of experience. Open to new opportunities and collaborations.' },
    { title: 'KISUMU, KENYA', cap: 'KISUMU, KENYA',
      text: 'Based in Kisumu, on East Africa Time (UTC+3). Also interested in software entrepreneurship.' }
  ]
};