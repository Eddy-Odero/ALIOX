/* What ALIOX says. Edit this file, no other code needs to change.
   - intro: typed when the visitor clicks the robot. menuPrompt: typed when the sparkle button on the dock is used again.
   - topics: one button each. "label" is the button text, "text" is a list of paragraphs.
   - Paragraphs wrap automatically to "columns" characters. A line starting with "- " becomes a bullet.
     Indent a line with spaces to indent it. An empty string "" gives a blank line.
   - Links: write [[label|https://address]]. */
window.BOT_CONTENT = {
  name: 'ALIOX',
  columns: 54,

  intro: [
    'Hello.',
    'I am ALIOX, here to help you navigate this portfolio.',
    '',
    'What would you like to explore?'
  ],
  menuPrompt: [
    'What would you like to explore next?'
  ],

  topics: [
    {
      id: 'about',
      label: 'About',
      text: [
        'Edward Odero (Eddy) is a full-stack developer and an apprentice at zone01 Kisumu, Kenya.',
        '',
        'He builds both sides of an app, with vanilla JavaScript frontends and Go backends, and he learns by building real projects.',
        '',
        'He is also interested in software entrepreneurship.'
      ]
    },
    {
      id: 'projects',
      label: 'Projects',
      text: [
        'EDU-FLIX',
        '  A free streaming platform. Browse by genre and provider, get recommendations and notifications, install it as an app that works offline, or watch a movie with friends in real time through watch parties.',
        '  Built with Go, a hosted SQLite database, Redis caching and a vanilla JavaScript frontend.',
        '  Live    [[edu-flix.onrender.com|https://edu-flix.onrender.com]]',
        '  Code    [[github.com/Eddy-Odero/EDU-FLIX|https://github.com/Eddy-Odero/EDU-FLIX]]',
        '',
        'THIS PORTFOLIO',
        '  Plain HTML, CSS and JavaScript. ALIOX, the robot you are talking to, follows your cursor and answers from a small script, with no server and no API key.'
      ]
    },
    {
      id: 'contacts',
      label: 'Contacts',
      text: [
        'Edward is open to new opportunities and collaborations.',
        '',
        'The easiest way to reach him right now is through GitHub.',
        '',
        '  GitHub  [[github.com/Eddy-Odero|https://github.com/Eddy-Odero]]'
        // add more lines here, for example:
        // '  Email   [[you@example.com|mailto:you@example.com]]',
        // '  LinkedIn  [[linkedin.com/in/your-name|https://www.linkedin.com/in/your-name]]'
      ]
    },
    {
      id: 'skills',
      label: 'Skills',
      text: [
        'LANGUAGES',
        '  Go, JavaScript, HTML and CSS',
        '',
        'BACKEND',
        '  Web servers in Go, WebSockets for real-time features, SQLite (Turso) and Redis (Upstash) for data and caching',
        '',
        'FRONTEND',
        '  Vanilla JavaScript and installable web apps (PWA)',
        '',
        'He is learning all of it by shipping real projects.'
      ]
    }
  ]
};