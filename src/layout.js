'use strict';

const REPO = 'https://github.com/joooord/et-trials-tracker';

const NAV = [
  { href: '/', file: 'index.html', label: 'Tracker' },
  { href: '/method', file: 'method.html', label: 'Method' },
  { href: '/data', file: 'data.html', label: 'Data' },
  { href: '/corrections', file: 'corrections.html', label: 'Corrections' },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function num(value) {
  return Number(value).toLocaleString('en-GB');
}

function longDate(iso) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

function page({ file, title, description, body, script, stats }) {
  const nav = NAV.map((item) => {
    const current = item.file === file;
    return `<a href="${item.href}"${current ? ' aria-current="page"' : ''}>${item.label}</a>`;
  }).join('\n          ');

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <div class="masthead">
      <a class="wordmark" href="/">ET Trials Tracker</a>
      <p class="strapline">Results reporting for interventional clinical trials in essential tremor</p>
    </div>
    <nav aria-label="Sections">
          ${nav}
    </nav>
  </div>
</header>

<main id="main">
${body}
</main>

<footer class="site-footer">
  <div class="wrap">
    <p>Data as of ${escapeHtml(stats.dataDate)}. Registry source: ClinicalTrials.gov.</p>
    <p>Data and code: <a href="${REPO}">${REPO.replace('https://', '')}</a>. Data CC BY 4.0, code MIT.</p>
  </div>
</footer>
${script ? `<script src="${script}" defer></script>\n` : ''}</body>
</html>
`;
}

module.exports = { page, escapeHtml, num, longDate, REPO };
