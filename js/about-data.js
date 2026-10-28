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
    { title: 'GOPHERCON AFRICA 26', cap: 'GOPHERCON AFRICA', image: 'assets/about/gophercon.jpeg', focusY: 0,
      text: 'At GopherCon Africa, the conference of the Go community. Go is the language I am building my backend skills in.' },
    { title: 'WHO I AM', cap: 'EDWARD ODERO', image: 'assets/about/me.jpg', focusY: 0.15,
      text: 'I am Edward Odero, but everyone calls me Eddy. I am a full-stack developer, and I build both sides of an app, from the vanilla JavaScript frontend to the Go backend.' },
    { title: 'ZONE01 KISUMU', cap: 'ZONE01 KISUMU', image: 'assets/about/zone01.jpg', focusY: 0.15,
      text: 'I am an apprentice developer at zone01 in Kisumu, Kenya. I learn by building real projects alongside my peers rather than from lectures.' },
    { title: 'HOW I WORK', cap: 'HOW I WORK', image: 'assets/about/work.jpg', focusY: 0.15,
      text: 'I like to understand why something works, not only to get it working, and I prefer small, careful changes to rewriting everything.' },
    { title: 'FOCUS', cap: 'FOCUS', image: 'assets/about/focus.jpg', focusY: 0.15,
      text: 'Machine learning, system design and development, with over three years of experience. I am open to new opportunities and collaborations.' },
    { title: 'KISUMU, KENYA', cap: 'KISUMU, KENYA', image: 'assets/about/kisumu.jpg', focusY: 0.15,
      text: 'I am based in Kisumu, on East Africa Time (UTC+3). I am also interested in software entrepreneurship.' }
  ]
};