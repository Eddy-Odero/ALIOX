/* The skills shown in the skills view (skills.js). Edit this file, no other code needs to change.
   Each category is a circle. Choosing it lists its technologies on the right.
   - name:  the circle label and the title on the right
   - about: one line shown under the title
   - items: [what it is used for, technology]
   The circles keep a fixed arrangement for up to 7 categories (see POSITIONS in skills.js). */
window.SKILLS = [
  {
    name: 'LANGUAGES',
    about: 'What I write most, and what I learn by shipping projects.',
    items: [['Backend', 'Go'], ['Frontend and tooling', 'JavaScript'], ['Markup', 'HTML'], ['Styling', 'CSS']]
  },
  {
    name: 'FRONT END',
    about: 'Interfaces built without a framework.',
    items: [['Language', 'Vanilla JavaScript'], ['Installable apps', 'PWA'], ['Offline support', 'Service workers'], ['3D in the browser', 'Three.js']]
  },
  {
    name: 'BACK END',
    about: 'Web servers and the features behind them.',
    items: [['Servers', 'Go'], ['Routes and handlers', 'REST APIs'], ['Real-time features', 'WebSockets'], ['Accounts', 'Authentication'], ['Email', 'Resend']]
  },
  {
    name: 'DATA',
    about: 'Where the data lives and how it is served fast.',
    items: [['Hosted database', 'SQLite / Turso'], ['Caching', 'Redis / Upstash'], ['Read path', 'Memory, then Redis, then Turso']]
  },
  {
    name: 'REAL-TIME',
    about: 'Things that happen for everyone at once.',
    items: [['Transport', 'WebSockets'], ['Group viewing', 'Watch parties'], ['Presence', 'Rooms and participants'], ['Messaging', 'Live chat']]
  },
  {
    name: 'DEPLOY',
    about: 'Getting it online and keeping it healthy.',
    items: [['Hosting', 'Render'], ['Checks on every push', 'CI: Go build and test'], ['Uptime', 'Health pings'], ['History', 'Git, conventional commits']]
  },
  {
    name: 'REACT',
    about: 'Web and mobile clients for a streaming app.',
    items: [['Web client', 'React'], ['Mobile app', 'React Native'], ['Sign-in', 'OAuth']]
  }
];
