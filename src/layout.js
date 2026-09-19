'use strict';

// The page shell: head, structured data, header, navigation, footer.

const { escapeHtml } = require('./util');

const SITE = 'https://et-trials-tracker.xyz';
const REPO = 'https://github.com/joooord/et-trials-tracker';
const LICENCE = 'https://creativecommons.org/licenses/by/4.0/';
const AUTHOR = 'Jordan Pitts';
const SITE_NAME = 'ET Trials Tracker';
const STRAPLINE = 'Results reporting for interventional clinical trials in essential tremor.';
const SHARE_IMAGE = SITE + '/og.png';
const SHARE_IMAGE_ALT = 'ET Trials Tracker, with the line: results reporting for ' +
  'interventional clinical trials in essential tremor.';

const NAV = [
  { href: '/', file: 'index.html', label: 'Tracker' },
  { href: '/method', file: 'method.html', label: 'Method' },
  { href: '/data', file: 'data.html', label: 'Data' },
  { href: '/corrections', file: 'corrections.html', label: 'Corrections' },
  { href: '/glossary', file: 'glossary.html', label: 'Glossary' },
];

const SEARCH_TECHNIQUE = 'Two stage literature search: first by registration number in ' +
  'PubMed and Europe PMC, then, where that found nothing, by trial specifics such as ' +
  'investigator, intervention, sample size and site.';

function person() {
  return { '@type': 'Person', name: AUTHOR };
}

function datasets(stats) {
  const coverage = `${stats.earliestStart}/${stats.dataDate}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Essential tremor trials registered on ClinicalTrials.gov',
      description: `One row for each of the ${stats.registered.count} interventional studies ` +
        `registered on ClinicalTrials.gov whose condition strings name essential tremor, with ` +
        `status, phase, dates, enrolment, sponsor and whether results were posted to the registry.`,
      url: SITE + '/data',
      creator: person(),
      license: LICENCE,
      isAccessibleForFree: true,
      temporalCoverage: coverage,
      dateModified: stats.dataDate,
      measurementTechnique: 'Registry pull from the ClinicalTrials.gov API version 2, filtered ' +
        'to interventional studies whose condition strings contain "essential tremor" or ' +
        '"tremor, essential", matched without regard to case.',
      variableMeasured: ['nct_id', 'title', 'conditions', 'status', 'phase', 'start_date',
        'completion_date', 'months_since_completion', 'enrollment', 'sponsor_name',
        'sponsor_class', 'results_posted', 'registry_url'],
      distribution: [{
        '@type': 'DataDownload',
        contentUrl: SITE + '/data/registry_et_trials.csv',
        encodingFormat: 'text/csv',
      }],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Literature search outcomes for completed essential tremor trials without posted results',
      description: `One row for each of the ${stats.trials.length} completed essential tremor ` +
        `trials with no results posted to ClinicalTrials.gov, carrying the outcome of a two ` +
        `stage literature search, the reference that was read and the reason for the classification.`,
      url: SITE + '/data',
      creator: person(),
      license: LICENCE,
      isAccessibleForFree: true,
      temporalCoverage: coverage,
      dateModified: stats.dataDate,
      measurementTechnique: SEARCH_TECHNIQUE,
      variableMeasured: ['nct_id', 'completion_date', 'due_12m', 'sponsor_class', 'enrollment',
        'classification', 'match_basis', 'pmid', 'doi', 'url_opened', 'pub_title', 'pub_year',
        'journal', 'rationale', 'registry_url', 'conditions'],
      distribution: [{
        '@type': 'DataDownload',
        contentUrl: SITE + '/data/publication_status.csv',
        encodingFormat: 'text/csv',
      }],
    },
  ];
}

function website(stats) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE + '/',
    description: STRAPLINE,
    image: SHARE_IMAGE,
    inLanguage: 'en-GB',
    creator: person(),
    license: LICENCE,
    dateModified: stats.dataDate,
  };
}

function webpage({ path, title, description, stats }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    url: SITE + path,
    description,
    image: SHARE_IMAGE,
    inLanguage: 'en-GB',
    dateModified: stats.dataDate,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE + '/' },
    author: person(),
  };
}

function faqPage(questions) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    })),
  };
}

function jsonLd(value) {
  // No "<" can reach the script element, so the block cannot close it early.
  return '<script type="application/ld+json">\n' +
    JSON.stringify(value, null, 2).replace(/</g, '\\u003c') +
    '\n</script>';
}

function page({ file, path, title, description, markdown, body, stats, questions, script }) {
  const blocks = [website(stats), webpage({ path, title, description, stats })]
    .concat(datasets(stats));
  if (questions && questions.length) blocks.push(faqPage(questions));

  const nav = NAV.map((item) => {
    const current = item.file === file;
    return `<a href="${item.href}"${current ? ' aria-current="page"' : ''}>${item.label}</a>`;
  }).join('\n        ');

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${SITE}${path}">
<link rel="alternate" type="text/markdown" href="${markdown}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#fcfcfb" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1a1a19" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SHARE_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escapeHtml(SHARE_IMAGE_ALT)}">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${SHARE_IMAGE}">
<meta name="twitter:image:alt" content="${escapeHtml(SHARE_IMAGE_ALT)}">
<link rel="stylesheet" href="/styles.css">
${blocks.map(jsonLd).join('\n')}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header class="site-header">
  <div class="wrap">
    <a class="wordmark" href="/">${SITE_NAME}</a>
    <nav aria-label="Pages">
        ${nav}
    </nav>
  </div>
</header>

<main id="main">
  <div class="wrap">
${body}
  </div>
</main>

<footer class="site-footer">
  <div class="wrap">
    <p>Data as of <time datetime="${stats.dataDate}">${stats.dataDateLong}</time>. Trial records are reproduced from ClinicalTrials.gov, a service of the United States National Library of Medicine.</p>
    <p>Code and data: <a href="${REPO}">${REPO.replace('https://', '')}</a>. Data under <a href="${LICENCE}">CC BY 4.0</a>, code under the MIT licence.</p>
    <p>Found a paper this search missed? The <a href="/corrections">corrections page</a> explains how to report it.</p>
    <p>Machine readable: <a href="${markdown}">this page as markdown</a>, <a href="/llms.txt">llms.txt</a>, <a href="/data.json">data.json</a>.</p>
  </div>
</footer>
${script ? `<script src="${script}" defer></script>\n` : ''}</body>
</html>
`;
}

module.exports = {
  page, SITE, REPO, LICENCE, AUTHOR, SITE_NAME, STRAPLINE, SHARE_IMAGE, SHARE_IMAGE_ALT, NAV,
  SEARCH_TECHNIQUE, datasets, website, webpage, faqPage,
};
