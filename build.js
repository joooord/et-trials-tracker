'use strict';

// Builds the static site into dist/. Node built-ins only, no dependencies.
//   node build.js          build, then verify the built pages
//   node build.js --quiet  build without printing the figures

const fs = require('fs');
const path = require('path');

const { parseCsv } = require('./src/csv');
const { computeStats } = require('./src/stats');
const { page } = require('./src/layout');
const { indexPage, methodPage, correctionsPage, dataPage } = require('./src/pages');

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

function build() {
  const registry = readCsv('registry_et_trials.csv');
  const publications = readCsv('publication_status.csv');
  const stats = computeStats(registry, publications);

  fs.rmSync(DIST, { recursive: true, force: true });

  const pages = [
    { file: 'index.html', title: 'ET Trials Tracker', script: '/app.js',
      description: 'Which completed essential tremor trials posted results to ClinicalTrials.gov, and where results were not posted, whether a results publication could be located in the literature.',
      body: indexPage(stats) },
    { file: 'method.html', title: 'Method | ET Trials Tracker',
      description: 'How the registry pull, the two stage literature search and the four classifications were produced, and what they can and cannot support.',
      body: methodPage(stats) },
    { file: 'corrections.html', title: 'Corrections | ET Trials Tracker',
      description: 'How to report a missed publication or an error, how corrections are applied, and who maintains this project.',
      body: correctionsPage(stats) },
    { file: 'data.html', title: 'Data | ET Trials Tracker',
      description: 'Download both data files and read a description of every column.',
      body: dataPage(stats) },
  ];

  pages.forEach((p) => write(p.file, page(Object.assign({ stats }, p))));

  write('styles.css', fs.readFileSync(path.join(ROOT, 'src', 'styles.css')));
  write('app.js', fs.readFileSync(path.join(ROOT, 'src', 'app.js')));
  write('data/registry_et_trials.csv', fs.readFileSync(path.join(ROOT, 'data', 'registry_et_trials.csv')));
  write('data/publication_status.csv', fs.readFileSync(path.join(ROOT, 'data', 'publication_status.csv')));

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
