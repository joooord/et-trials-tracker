'use strict';

// Recomputes every headline figure straight from data/*.csv, independently of
// src/stats.js, and checks that those figures are the ones in the built site.
// Also checks the house style rules, the machine files and the structured data.
// Exits non zero on any failure, which fails the build.

const fs = require('fs');
const path = require('path');
const { parseCsv } = require('./src/csv');
const { num } = require('./src/util');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const DATA_DATE = '2026-09-18';
const DATA_DATE_LONG = '18 September 2026';
const EM_DASH = '—';
const BANNED = ['unpublished', 'hidden', 'failed', 'buried', 'suppressed'];

const PAGES = [
  { html: 'index.html', md: 'index.md', path: '/' },
  { html: 'method.html', md: 'method.md', path: '/method' },
  { html: 'data.html', md: 'data.md', path: '/data' },
  { html: 'corrections.html', md: 'corrections.md', path: '/corrections' },
  { html: 'glossary.html', md: 'glossary.md', path: '/glossary' },
];

const failures = [];
const notes = [];

function check(ok, message) {
  if (!ok) failures.push(message);
  return ok;
}

function rows(name) {
  return parseCsv(fs.readFileSync(path.join(ROOT, 'data', name), 'utf8')).rows;
}

function sumEnrolment(list) {
  return list.reduce((total, row) => {
    const n = parseInt(row.enrollment, 10);
    return total + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function escaped(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// The text a reader sees, with the markup taken out.
function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, '\'')
    .replace(/\s+/g, ' ')
    .trim();
}

// 1. Recompute, from the CSV files alone.

const registry = rows('registry_et_trials.csv');
const publications = rows('publication_status.csv');

const completed = registry.filter((r) => r.status === 'COMPLETED');
const posted = completed.filter((r) => r.results_posted === 'yes');
const notPosted = completed.filter((r) => r.results_posted === 'no');
const due = publications.filter((r) => r.due_12m === 'yes');
const notDue = publications.filter((r) => r.due_12m !== 'yes');

const g = (list) => ({ count: list.length, participants: sumEnrolment(list) });

const figures = {
  registered: g(registry),
  completed: g(completed),
  postedResults: g(posted),
  noResultsPosted: g(notPosted),
  pastTwelveMonths: g(due),
  insideTwelveMonths: g(notDue),
};

const CLASSES = [
  ['FOUND_RESULTS', 'Results publication located'],
  ['MENTIONED_ONLY', 'Cited in literature only'],
  ['NOT_FOUND', 'No results publication located'],
  ['UNCERTAIN', 'Uncertain'],
];

const breakdown = CLASSES.map(([key, label]) => {
  const group = due.filter((r) => r.classification === key);
  return Object.assign({ key, label }, g(group));
});

const notFound = breakdown.find((b) => b.key === 'NOT_FOUND');

// The canonical sentence, rebuilt here rather than imported.
const FINDING = `As of ${DATA_DATE_LONG}, ${num(notFound.count)} of the ${num(due.length)} ` +
  `completed essential tremor trials that never posted results to ClinicalTrials.gov, and are ` +
  `at least twelve months past completion, have no results publication that could be located; ` +
  `those ${num(notFound.count)} trials enrolled ${num(notFound.participants)} participants.`;

// 2. Read what was built.

const built = {};
PAGES.forEach((p) => {
  const target = path.join(DIST, p.html);
  if (!fs.existsSync(target)) { failures.push('missing built page: dist/' + p.html); return; }
  built[p.html] = fs.readFileSync(target, 'utf8');
});
['llms.txt', 'robots.txt', 'sitemap.xml', 'data.json', 'styles.css', 'app.js'].forEach((file) => {
  const target = path.join(DIST, file);
  if (!fs.existsSync(target)) failures.push('missing built file: dist/' + file);
});
if (failures.length) report();

const index = built['index.html'];
const indexText = textOf(index);
const llms = fs.readFileSync(path.join(DIST, 'llms.txt'), 'utf8');
const dataJsonRaw = fs.readFileSync(path.join(DIST, 'data.json'), 'utf8');
const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
const indexMd = fs.readFileSync(path.join(DIST, 'index.md'), 'utf8');

// 3. The headline figures must be the recomputed ones, in the words of the page.

const sentences = [
  `${num(figures.registered.count)} interventional studies are registered for essential tremor, ` +
    `and they enrolled ${num(figures.registered.participants)} participants.`,
  `${num(figures.completed.count)} of them are completed, enrolling ` +
    `${num(figures.completed.participants)} participants.`,
  `${num(figures.postedResults.count)} completed trials posted results to the registry, covering ` +
    `${num(figures.postedResults.participants)} participants.`,
  `${num(figures.noResultsPosted.count)} completed trials did not, covering ` +
    `${num(figures.noResultsPosted.participants)} participants.`,
  `Of those ${num(figures.noResultsPosted.count)} trials, ${num(figures.pastTwelveMonths.count)} ` +
    `are at least twelve months past completion and ${num(figures.insideTwelveMonths.count)} are not.`,
  `The ${num(figures.pastTwelveMonths.count)} enrolled ` +
    `${num(figures.pastTwelveMonths.participants)} participants.`,
];

sentences.forEach((sentence) => {
  check(indexText.includes(sentence), `dist/index.html does not state: "${sentence}"`);
});

Object.keys(figures).forEach((key) => {
  notes.push(`${key}: ${num(figures[key].count)} trials, ${num(figures[key].participants)} participants`);
});

breakdown.forEach((b) => {
  check(indexText.includes(`${b.label}`), `dist/index.html is missing the outcome "${b.label}"`);
  check(indexText.includes(`${num(b.count)} trials ${num(b.participants)} participants`) ||
    indexText.includes(`${num(b.count)} trials, enrolling ${num(b.participants)} participants`),
  `dist/index.html does not give ${b.label} as ${num(b.count)} trials and ${num(b.participants)} participants`);
  notes.push(`${b.key}: ${num(b.count)} trials, ${num(b.participants)} participants`);
});

// 4. data.json must agree with the CSV files and with the page.

let data = null;
try { data = JSON.parse(dataJsonRaw); } catch (error) {
  failures.push('dist/data.json is not valid JSON: ' + error.message);
}

if (data) {
  check(data.dataDate === DATA_DATE, `data.json dataDate is ${data.dataDate}, expected ${DATA_DATE}`);
  Object.keys(figures).forEach((key) => {
    const got = data.headline[key];
    check(got && got.count === figures[key].count,
      `data.json headline.${key}.count is ${got && got.count}, data gives ${figures[key].count}`);
    check(got && got.participants === figures[key].participants,
      `data.json headline.${key}.participants is ${got && got.participants}, data gives ${figures[key].participants}`);
    check(indexText.includes(num(figures[key].count)),
      `the count ${num(figures[key].count)} from data.json is not on the page`);
  });
  breakdown.forEach((b) => {
    const got = (data.dueBreakdown || []).find((x) => x.key === b.key);
    check(got && got.count === b.count,
      `data.json dueBreakdown ${b.key} count is ${got && got.count}, data gives ${b.count}`);
    check(got && got.participants === b.participants,
      `data.json dueBreakdown ${b.key} participants is ${got && got.participants}, data gives ${b.participants}`);
  });
  check(data.trials.length === publications.length,
    `data.json carries ${data.trials.length} trials, the data has ${publications.length}`);
  const missing = data.trials.filter((t) => !t.title || !t.sponsor_name).length;
  check(missing === 0, `${missing} rows in data.json have no joined title or sponsor`);
}

// 5. The canonical sentence, verbatim, in all five places.

check(indexText.includes(FINDING), 'the canonical sentence is not in the text of dist/index.html');
check(index.includes(`<meta name="description" content="${escaped(FINDING)}">`),
  'the canonical sentence is not the meta description of dist/index.html');
check(llms.includes(FINDING), 'the canonical sentence is not in dist/llms.txt');
check(indexMd.includes(FINDING), 'the canonical sentence is not in dist/index.md');
check(data && data.finding === FINDING, 'the canonical sentence is not the finding in dist/data.json');
notes.push('canonical sentence: ' + FINDING);

// 6. Every trial has an anchor, and every reference is a link.

publications.forEach((trial) => {
  check(index.includes(`id="${trial.nct_id}"`), `${trial.nct_id}: no id anchor in dist/index.html`);
  check(index.includes(`href="${escaped(trial.registry_url)}"`), `${trial.nct_id}: registry_url is not linked`);
  if (trial.url_opened) {
    check(index.includes(`href="${escaped(trial.url_opened)}"`), `${trial.nct_id}: url_opened is not linked`);
  }
  if (trial.rationale) {
    check(index.includes(escaped(trial.rationale)), `${trial.nct_id}: the reason is not visible in the row`);
  }
});

// 7. One h1 per page, a markdown twin per page, and the twin is advertised.

PAGES.forEach((p) => {
  const html = built[p.html];
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  check(h1s === 1, `dist/${p.html} has ${h1s} h1 elements, expected exactly 1`);
  check(html.includes(`<link rel="alternate" type="text/markdown" href="/${p.md}">`),
    `dist/${p.html} does not advertise its markdown twin`);

  const md = path.join(DIST, p.md);
  if (!fs.existsSync(md)) { failures.push(`missing markdown twin: dist/${p.md}`); return; }
  const text = fs.readFileSync(md, 'utf8').trim();
  check(text.length > 200, `dist/${p.md} is empty or too short (${text.length} characters)`);
  check(text.startsWith('# '), `dist/${p.md} does not start with a markdown h1`);
});

// 8. The sitemap lists every page and every twin, and robots names every fleet.

PAGES.forEach((p) => {
  check(sitemap.includes(`${p.path}</loc>`) || sitemap.includes(`${p.path}<`),
    `sitemap.xml does not list ${p.path}`);
  check(sitemap.includes(`/${p.md}</loc>`), `sitemap.xml does not list /${p.md}`);
});
check((sitemap.match(/<lastmod>/g) || []).length === (sitemap.match(/<url>/g) || []).length,
  'sitemap.xml has an entry without a lastmod');
check(sitemap.includes(`<lastmod>${DATA_DATE}</lastmod>`), 'sitemap.xml does not carry the data date');
['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User', 'Google-Extended'].forEach((bot) => {
  check(new RegExp(`User-agent: ${bot}\\nAllow: /`).test(robots), `robots.txt does not allow ${bot}`);
});
check(/\nSitemap: https?:\/\/\S+sitemap\.xml/.test(robots), 'robots.txt has no Sitemap line');

// 9. Every JSON-LD block parses, and the page declares the right shapes.

PAGES.forEach((p) => {
  const blocks = built[p.html].match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
  check(blocks.length >= 4, `dist/${p.html} has ${blocks.length} JSON-LD blocks, expected at least 4`);
  const types = [];
  blocks.forEach((block, i) => {
    const body = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')
      .replace(/\\u003c/g, '<');
    try { types.push(JSON.parse(body)['@type']); } catch (error) {
      failures.push(`dist/${p.html} JSON-LD block ${i + 1} does not parse: ${error.message}`);
    }
  });
  ['WebSite', 'WebPage', 'Dataset'].forEach((type) => {
    check(types.includes(type), `dist/${p.html} has no ${type} JSON-LD`);
  });
  check(types.filter((t) => t === 'Dataset').length === 2,
    `dist/${p.html} does not carry two Dataset objects`);
  if (p.html === 'index.html') check(types.includes('FAQPage'), 'dist/index.html has no FAQPage JSON-LD');
});

// 10. House style, over every file in dist/.
//
// The rationale column is reproduced verbatim from the data, which is not
// edited by this repository. One rationale quotes a review using a banned word.
// Quoted data is taken out before the prose is scanned, and the copies of the
// data files are checked for being byte identical instead.

const quoted = publications.map((r) => r.rationale).filter((r) =>
  BANNED.some((word) => new RegExp(`\\b${word}\\b`, 'i').test(r)));

function scrub(text) {
  let out = text;
  quoted.forEach((value) => {
    [value, escaped(value), JSON.stringify(value).slice(1, -1),
      value.replace(/\|/g, '\\|')].forEach((variant) => {
      out = out.split(variant).join(' [quoted from the data] ');
    });
  });
  return out;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((list, entry) => {
    const full = path.join(dir, entry.name);
    return list.concat(entry.isDirectory() ? walk(full) : [full]);
  }, []);
}

const distFiles = walk(DIST);
notes.push(`${distFiles.length} files in dist/`);

distFiles.forEach((file) => {
  const relative = path.relative(DIST, file);
  const text = fs.readFileSync(file, 'utf8');
  check(!text.includes(EM_DASH), `dist/${relative} contains an em dash`);
  if (relative.startsWith('data' + path.sep)) return;
  const prose = scrub(text);
  BANNED.forEach((word) => {
    const hit = new RegExp(`\\b${word}\\b`, 'i').exec(prose);
    check(!hit, `dist/${relative} contains the banned word "${word}"`);
  });
});

['registry_et_trials.csv', 'publication_status.csv'].forEach((name) => {
  const source = fs.readFileSync(path.join(ROOT, 'data', name));
  const copy = fs.readFileSync(path.join(DIST, 'data', name));
  check(source.equals(copy), `dist/data/${name} is not byte identical to data/${name}`);
});

check(indexText.includes(`As of ${DATA_DATE_LONG}`), `dist/index.html does not carry "As of ${DATA_DATE_LONG}"`);

report();

function report() {
  notes.forEach((note) => console.log('  ' + note));
  if (failures.length) {
    console.error('\ncheck failed:');
    failures.forEach((f) => console.error('  ' + f));
    process.exit(1);
  }
  console.log('check passed: every figure in dist/ matches data/*.csv');
}
