'use strict';

// Builds the static site into dist/. Node built-ins only, no dependencies.
//   node build.js          build, then verify the built pages
//   node build.js --quiet  build without printing the figures

const fs = require('fs');
const path = require('path');

const { parseCsv } = require('./src/csv');
const { computeStats } = require('./src/stats');
const { page } = require('./src/layout');
const { prepare, toHtml, toMd } = require('./src/doc');
const pages = require('./src/pages');
const machine = require('./src/machine');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

function readCsv(name) {
  return parseCsv(fs.readFileSync(path.join(ROOT, 'data', name), 'utf8')).rows;
}

function write(relative, contents) {
  const target = path.join(DIST, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function indent(html) {
  return html.split('\n').map((line) => (line ? '    ' + line : line)).join('\n');
}

function build() {
  const registry = readCsv('registry_et_trials.csv');
  const publications = readCsv('publication_status.csv');
  const stats = computeStats(registry, publications);
  const faq = pages.questions(stats);

  const specs = [
    {
      file: 'index.html', path: '/', markdown: '/index.md', md: 'index.md',
      title: 'ET Trials Tracker',
      description: stats.finding,
      blocks: pages.indexBlocks(stats),
      questions: faq,
      script: '/app.js',
    },
    {
      file: 'method.html', path: '/method', markdown: '/method.md', md: 'method.md',
      title: 'Method | ET Trials Tracker',
      description: 'How the figures were produced: the registry pull, the twelve month window, ' +
        'the two stage literature search, the matching rule and the limits.',
      blocks: pages.methodBlocks(stats),
    },
    {
      file: 'data.html', path: '/data', markdown: '/data.md', md: 'data.md',
      title: 'Data | ET Trials Tracker',
      description: 'Both data files, a description of every column, and the machine readable ' +
        'copies of every page.',
      blocks: pages.dataBlocks(stats),
    },
    {
      file: 'corrections.html', path: '/corrections', markdown: '/corrections.md', md: 'corrections.md',
      title: 'Corrections | ET Trials Tracker',
      description: 'How to report a paper this search missed, how corrections are applied, ' +
        'and who maintains this project.',
      blocks: pages.correctionsBlocks(stats),
    },
    {
      file: 'glossary.html', path: '/glossary', markdown: '/glossary.md', md: 'glossary.md',
      title: 'Glossary | ET Trials Tracker',
      description: 'Every term this site uses in a particular way, defined in one place.',
      blocks: pages.glossaryBlocks(stats),
      autolink: false,
    },
  ];

  fs.rmSync(DIST, { recursive: true, force: true });

  specs.forEach((spec) => {
    const prepared = prepare(spec.blocks, { autolink: spec.autolink });
    write(spec.file, page(Object.assign({ stats, body: indent(toHtml(prepared)) }, spec)));
    write(spec.md, toMd(prepared) + '\n');
  });

  write('styles.css', fs.readFileSync(path.join(ROOT, 'src', 'styles.css')));
  write('app.js', fs.readFileSync(path.join(ROOT, 'src', 'app.js')));
  write('data/registry_et_trials.csv', fs.readFileSync(path.join(ROOT, 'data', 'registry_et_trials.csv')));
  write('data/publication_status.csv', fs.readFileSync(path.join(ROOT, 'data', 'publication_status.csv')));
  write('data.json', JSON.stringify(machine.dataJson(stats), null, 2) + '\n');
  write('llms.txt', machine.llmsTxt(stats));
  write('robots.txt', machine.robotsTxt());
  write('sitemap.xml', machine.sitemapXml(stats));

  return stats;
}

if (require.main === module) {
  const stats = build();
  if (!process.argv.includes('--quiet')) {
    console.log('Built dist/ from data/ as of ' + stats.dataDate);
  }
  require('./check');
}

module.exports = { build };
