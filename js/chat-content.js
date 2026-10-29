
window.BOT_CONTENT = {
  name: 'ALIOX',
  columns: 54,

  intro: [
    'Hello.',
    'I am ALIOX, here to help you navigate this portfolio.',
    '',
    'Click a button below to learn more.'
  ],
  // typed under the first topic the visitor opens, to point them to the menu bar
  menuHint: [
    '',
    '',
    'To explore each section in detail, click the menu bar.'
  ],
  menuPrompt: [
    'What would you like to explore next?'
  ],

  topics: [
    {
      id: 'about',
      label: 'About',
      text: [
        'Edward Odero (Eddy) is a full-stack engineer in Kisumu, Kenya, building systems that hold up.',
        '',
        'He designs and ships Go-based backends, distributed systems and the interfaces around them, from hackathon platforms to a boutique point-of-sale system.',
        '',
        'He works at zone01 Kisumu, is part of the Kisumu Bitcoin Bootcamp community, and is open to work.'
      ]
    },
    {
      id: 'projects',
      label: 'Projects',
      text: [
        'WAPI',
        '  A Twitch-style live streaming platform for low-latency streaming over local connections across Kenya.',
        '',
        'SATGATE',
        '  A Lightning Network anti-spam contact form. Winner of the Kisumu Bitcoin Bootcamp Hackathon 2026, built by a team of seven.',
        '',
        'EDU-FLIX',
        '  A Netflix-style streaming platform with JWT auth, built in Go and deployed on Render.',
        '  Live    [[edu-flix.onrender.com|https://edu-flix.onrender.com]]',
        '',
        'There is more: AidStream, Blue-talk, Tinah Cosmetics and Profile-Engine. Open the menu bar and choose Projects to see them all.'
      ]
    },
    {
      id: 'contacts',
      label: 'Contacts',
      text: [
        'Edward is open to work and to collaborations.',
        '',
        '  GitHub    [[github.com/Eddy-Odero|https://github.com/Eddy-Odero]]',
        '  LinkedIn  [[linkedin.com/in/eddy-odero|https://www.linkedin.com/in/eddy-odero-7b3332346]]',
        '  Dev.to    [[dev.to/edd_odero|https://dev.to/edd_odero]]'
      ]
    },
    {
      id: 'skills',
      label: 'Skills',
      text: [
        'BACKEND',
        '  Go, REST APIs, PHP and Bash',
        '',
        'FRONTEND',
        '  HTML, CSS, JavaScript, TypeScript and React',
        '',
        'DATA',
        '  PostgreSQL, SQLite / Turso and Redis',
        '',
        'TOOLS',
        '  Git, GitHub, Docker and Ansible'
      ]
    }
  ]
};