/* The contact view (contact.js). Edit this file, no other code needs to change.
   The trail has groups of channels; choosing one fills the panel on the right.
   - groups:   the boxes on the trail, each with a title and the ids of its channels (in order)
   - channels: one entry per id. "kind" decides what the panel shows:
       email     your address, and a small form that opens the visitor's mail app (mailto:, nothing is sent from this page)
       phone     your number with Call and Copy
       whatsapp  a message box that opens a WhatsApp chat with it filled in
       cv        a preview of your PDF with Download and Open
       devto     your latest articles, read from Dev.to's public API (no key)
       github    your latest repositories, read from GitHub's public API (no key)
       link      a profile with one Open button
   Replace every YOUR-... placeholder with your real details. */
window.CONTACT = {
  groups: [
    { title: 'PRIMARY CHANNELS',      ids: ['email', 'phone', 'whatsapp'] },
    { title: 'PROFESSIONAL NETWORKS', ids: ['cv', 'devto', 'linkedin', 'github'] }
  ],
  channels: {
    email:    { label: 'Email',    sub: 'YOUR-EMAIL@example.com', value: 'YOUR-EMAIL@example.com' },
    phone:    { label: 'Phone',    sub: '+254 700 000 000',       value: '+254 700 000 000' },
    whatsapp: { label: 'WhatsApp', sub: 'Start a chat',           number: '254700000000', message: 'Hi Eddy, I saw your portfolio and' },
    cv:       { label: 'CV',       sub: 'Preview, download',   href: 'assets/cv.pdf', file: 'Edward-Odero-CV.pdf' },
    devto:    { label: 'Dev.to',   sub: '@YOUR-DEVTO-NAME',       username: 'YOUR-DEVTO-NAME', count: 3 },
    linkedin: { label: 'LinkedIn', sub: 'Open profile',           href: 'https://www.linkedin.com/in/YOUR-LINKEDIN-NAME' },
    github:   { label: 'GitHub',   sub: '@Eddy-Odero',            username: 'Eddy-Odero', count: 4 }
  }
};
