'use strict';

// The files written for machines: data.json, llms.txt, robots.txt, sitemap.xml.

const { SITE, REPO } = require('./layout');

const BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot',
  'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended'];

const PAGES = [
  { path: '/', md: '/index.md', title: 'Tracker',
    note: 'the finding, the counts, the bar, the table of every trial and the questions people ask' },
  { path: '/method', md: '/method.md', title: 'Method',
    note: 'the registry pull, the two stage search, the matching rule and the limits' },
  { path: '/data', md: '/data.md', title: 'Data',
    note: 'both data files, every column described, and the machine readable copies' },
  { path: '/corrections', md: '/corrections.md', title: 'Corrections',
    note: 'how to report a paper this search missed and how corrections are applied' },
  { path: '/glossary', md: '/glossary.md', title: 'Glossary',
    note: 'every term this site uses in a particular way, defined once' },
];

function dataJson(stats) {
  return {
    dataDate: stats.dataDate,
    finding: stats.finding,
    caveat: stats.caveat,
    source: {
      site: SITE + '/',
      repository: REPO,
      licence: 'https://creativecommons.org/licenses/by/4.0/',
      registry: 'ClinicalTrials.gov',
    },
    headline: {
      registered: stats.registered,
      completed: stats.completed,
      postedResults: stats.posted,
      noResultsPosted: stats.notPosted,
      pastTwelveMonths: stats.due,
      insideTwelveMonths: stats.notDue,
      studiesWithoutEnrolment: stats.missingEnrolment,
    },
    dueBreakdown: stats.breakdown.map((b) => ({
      key: b.key,
      label: b.label,
      count: b.count,
      participants: b.participants,
      percentOfDue: b.percent,
    })),
    trials: stats.trials.map((t) => ({
      nct_id: t.nct_id,
      title: t.title,
      conditions: t.conditions,
      status: t.status,
      phase: t.phase,
      start_date: t.start_date,
      completion_date: t.completion_date,
      months_since_completion: t.months_since_completion,
      enrollment: t.enrollment,
      sponsor_name: t.sponsor_name,
      sponsor_class: t.sponsor_class,
      sponsor_class_label: t.sponsor_class_label,
      results_posted: t.results_posted,
      due_12m: t.due_12m,
      classification: t.classification,
      classification_label: t.classification_label,
      match_basis: t.match_basis,
      pmid: t.pmid,
      doi: t.doi,
      url_opened: t.url_opened,
      pub_title: t.pub_title,
      pub_year: t.pub_year,
      journal: t.journal,
      rationale: t.rationale,
      registry_url: t.registry_url,
      anchor: SITE + '/#' + t.nct_id,
    })),
  };
}

function llmsTxt(stats) {
  const lines = [
    '# ET Trials Tracker',
    '',
    '> ' + stats.finding + ' ' + stats.caveat,
    '',
    'This site tracks results reporting for interventional clinical trials in essential tremor. ' +
    'It lists every such study registered on ClinicalTrials.gov, says which completed ones posted ' +
    'results to the registry, and, for those that did not, records whether a results publication ' +
    'could be located in the literature. Every figure is computed from the two data files below at ' +
    'build time. The site is a literature linkage audit and singles nobody out.',
    '',
    '## Pages',
    '',
  ];
  PAGES.forEach((p) => lines.push(`- [${p.title}](${SITE}${p.md}): ${p.note}`));
  lines.push('', '## Data', '');
  lines.push(`- [registry_et_trials.csv](${SITE}/data/registry_et_trials.csv): ` +
    `${stats.registered.count} rows, one per registered interventional essential tremor study`);
  lines.push(`- [publication_status.csv](${SITE}/data/publication_status.csv): ` +
    `${stats.trials.length} rows, one per completed trial with no results posted, with its search outcome`);
  lines.push(`- [data.json](${SITE}/data.json): every computed figure and every trial row as JSON, with the data date`);
  lines.push('', '## Optional', '');
  lines.push(`- [Repository](${REPO}): the data files, the build and the change history`);
  lines.push('');
  return lines.join('\n');
}

function robotsTxt() {
  const blocks = ['User-agent: *', 'Allow: /', ''];
  BOTS.forEach((bot) => blocks.push(`User-agent: ${bot}`, 'Allow: /', ''));
  blocks.push(`Sitemap: ${SITE}/sitemap.xml`, '');
  return blocks.join('\n');
}

function sitemapXml(stats) {
  const urls = [];
  PAGES.forEach((p) => { urls.push(SITE + p.path); urls.push(SITE + p.md); });
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((url) => `  <url>\n    <loc>${url}</loc>\n` +
      `    <lastmod>${stats.dataDate}</lastmod>\n  </url>`).join('\n') +
    '\n</urlset>\n';
}

module.exports = { dataJson, llmsTxt, robotsTxt, sitemapXml, PAGES, BOTS };
