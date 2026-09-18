'use strict';

// Recomputes the headline figures straight from data/*.csv, independently of
// src/stats.js, and checks that those figures are the ones present in the
// built dist/index.html. Also checks the house style rules. Exits non zero on
// any failure, which fails the build.

const fs = require('fs');
const path = require('path');
const { parseCsv } = require('./src/csv');

const ROOT = __dirname;
const DATA_DATE = '2026-09-18';
const FORBIDDEN = ['unpublished', 'hidden', 'failed to report'];
const EM_DASH = '—';
const PAGES = ['index.html', 'method.html', 'corrections.html', 'data.html'];

const failures = [];
const notes = [];

function check(ok, message) {
  if (!ok) failures.push(message);
  return ok;
}

function fmt(n) {
  return Number(n).toLocaleString('en-GB');
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

// 1. Recompute, from the CSV files alone.

const registry = rows('registry_et_trials.csv');
const publications = rows('publication_status.csv');

const completed = registry.filter((r) => r.status === 'COMPLETED');
const posted = completed.filter((r) => r.results_posted === 'yes');
const notPosted = completed.filter((r) => r.results_posted === 'no');
const due = publications.filter((r) => r.due_12m === 'yes');

const expected = [
  ['registered trials', registry.length, sumEnrolment(registry)],
  ['completed', completed.length, sumEnrolment(completed)],
  ['completed with results posted', posted.length, sumEnrolment(posted)],
  ['completed without results posted', notPosted.length, sumEnrolment(notPosted)],
];

const breakdown = ['FOUND_RESULTS', 'MENTIONED_ONLY', 'NOT_FOUND', 'UNCERTAIN'].map((key) => {
  const group = due.filter((r) => r.classification === key);
  return [key, group.length, sumEnrolment(group)];
});

// 2. Read the built pages.

const built = {};
PAGES.forEach((file) => {
  const target = path.join(ROOT, 'dist', file);
  if (!fs.existsSync(target)) {
    failures.push('missing built page: dist/' + file);
    return;
  }
  built[file] = fs.readFileSync(target, 'utf8');
});
if (failures.length) report();

const index = built['index.html'];

// 3. The headline figures in the built page must be the recomputed ones.

const figureStart = index.indexOf('<dl class="figures">');
const figureBlock = index.slice(figureStart, index.indexOf('</dl>', figureStart));
const figureCounts = [...figureBlock.matchAll(/class="n">([\d,]+)</g)].map((m) => m[1]);
const figureParticipants = [...figureBlock.matchAll(/class="participants">([\d,]+) participants/g)].map((m) => m[1]);

check(figureCounts.length === expected.length,
  `expected ${expected.length} headline figures in dist/index.html, found ${figureCounts.length}`);

expected.forEach(([label, count, participants], i) => {
  check(figureCounts[i] === fmt(count),
    `${label}: page shows ${figureCounts[i]}, data gives ${fmt(count)}`);
  check(figureParticipants[i] === fmt(participants),
    `${label} participants: page shows ${figureParticipants[i]}, data gives ${fmt(participants)}`);
  notes.push(`${label}: ${fmt(count)} trials, ${fmt(participants)} participants`);
});

// 4. The breakdown of the twelve month group must match too.

const legendStart = index.indexOf('<ul class="legend">');
const legendBlock = index.slice(legendStart, index.indexOf('</ul>', legendStart));
const legendCounts = [...legendBlock.matchAll(/class="val">([\d,]+)</g)].map((m) => m[1]);
const legendParticipants = [...legendBlock.matchAll(/class="sub">([\d,]+) participants/g)].map((m) => m[1]);

check(legendCounts.length === breakdown.length,
  `expected ${breakdown.length} breakdown figures, found ${legendCounts.length}`);

breakdown.forEach(([key, count, participants], i) => {
  check(legendCounts[i] === fmt(count),
    `${key}: page shows ${legendCounts[i]}, data gives ${fmt(count)}`);
  check(legendParticipants[i] === fmt(participants),
    `${key} participants: page shows ${legendParticipants[i]}, data gives ${fmt(participants)}`);
  notes.push(`${key}: ${fmt(count)} trials, ${fmt(participants)} participants`);
});

check(index.includes(`${fmt(due.length)} are at least twelve months past`),
  `the twelve month group count (${fmt(due.length)}) is not stated in the prose`);
notes.push(`at least twelve months past completion: ${fmt(due.length)} trials, ${fmt(sumEnrolment(due))} participants`);

// 5. Every trial has a row, and every non empty link is a link.

const rowCount = (index.match(/<tr data-classification=/g) || []).length;
check(rowCount === publications.length,
  `table has ${rowCount} rows, the data has ${publications.length}`);

// URLs are HTML escaped in the page, so escape them the same way before looking.
function escaped(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

publications.forEach((trial) => {
  check(index.includes(`href="${escaped(trial.registry_url)}"`),
    `${trial.nct_id}: registry_url is not linked`);
  if (trial.url_opened) {
    check(index.includes(`href="${escaped(trial.url_opened)}"`),
      `${trial.nct_id}: url_opened is not linked`);
  }
});

// 6. House style.

PAGES.forEach((file) => {
  const text = built[file];
  check(!text.includes(EM_DASH), `${file} contains an em dash`);
  FORBIDDEN.forEach((word) => {
    check(!text.toLowerCase().includes(word), `${file} contains the word "${word}"`);
  });
});

check(index.includes(`as of ${DATA_DATE}`) || index.includes(`As of ${DATA_DATE}`),
  `dist/index.html does not carry "as of ${DATA_DATE}"`);

report();

function report() {
  notes.forEach((note) => console.log('  ' + note));
  if (failures.length) {
    console.error('\ncheck failed:');
    failures.forEach((f) => console.error('  ' + f));
    process.exit(1);
  }
  console.log('check passed: every headline figure in dist/index.html matches data/*.csv');
}
