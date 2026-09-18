'use strict';

// Every number on the site is computed here, from the two CSV files.
// Nothing is hard coded.

const { num, longDate, percent } = require('./util');

const DATA_DATE = '2026-09-18';

const CLASSIFICATIONS = [
  { key: 'FOUND_RESULTS', label: 'Results publication located' },
  { key: 'MENTIONED_ONLY', label: 'Cited in literature only' },
  { key: 'NOT_FOUND', label: 'No results publication located' },
  { key: 'UNCERTAIN', label: 'Uncertain' },
];

const SPONSOR_CLASS_LABELS = {
  INDUSTRY: 'Industry',
  NIH: 'NIH',
  FED: 'Other federal',
  OTHER_GOV: 'Other government',
  NETWORK: 'Network',
  INDIV: 'Individual',
  OTHER: 'Other',
  UNKNOWN: 'Unknown',
};

const MATCH_BASIS_LABELS = {
  NCT_ID_MATCH: 'NCT ID match',
  SPECIFICS_MATCH: 'Specifics match',
  NONE: '',
};

function enrolment(row) {
  const n = parseInt(row.enrollment, 10);
  return Number.isFinite(n) ? n : 0;
}

function group(rows) {
  return { count: rows.length, participants: rows.reduce((sum, r) => sum + enrolment(r), 0) };
}

function classificationLabel(key) {
  const found = CLASSIFICATIONS.find((c) => c.key === key);
  return found ? found.label : 'Uncertain';
}

function sponsorClassLabel(key) {
  return SPONSOR_CLASS_LABELS[key] || (key ? key : 'Not stated');
}

function computeStats(registryRows, publicationRows) {
  const byNct = new Map(registryRows.map((row) => [row.nct_id, row]));

  const completed = registryRows.filter((row) => row.status === 'COMPLETED');
  const posted = completed.filter((row) => row.results_posted === 'yes');
  const notPosted = completed.filter((row) => row.results_posted === 'no');

  // Join each literature search outcome onto its registry record.
  const trials = publicationRows.map((pub) => {
    const reg = byNct.get(pub.nct_id) || {};
    const sponsorClass = pub.sponsor_class || reg.sponsor_class || '';
    return {
      nct_id: pub.nct_id,
      title: reg.title || '',
      conditions: reg.conditions || pub.conditions || '',
      status: reg.status || '',
      phase: reg.phase || '',
      start_date: reg.start_date || '',
      completion_date: pub.completion_date || reg.completion_date || '',
      months_since_completion: reg.months_since_completion || '',
      enrollment: pub.enrollment || reg.enrollment || '',
      sponsor_name: reg.sponsor_name || '',
      sponsor_class: sponsorClass,
      sponsor_class_label: sponsorClassLabel(sponsorClass),
      results_posted: reg.results_posted || 'no',
      due_12m: pub.due_12m || '',
      classification: pub.classification || '',
      classification_label: classificationLabel(pub.classification),
      match_basis: pub.match_basis || '',
      match_basis_label: MATCH_BASIS_LABELS[pub.match_basis] !== undefined
        ? MATCH_BASIS_LABELS[pub.match_basis] : pub.match_basis,
      pmid: pub.pmid || '',
      doi: pub.doi || '',
      url_opened: pub.url_opened || '',
      pub_title: pub.pub_title || '',
      pub_year: pub.pub_year || '',
      journal: pub.journal || '',
      rationale: pub.rationale || '',
      registry_url: pub.registry_url || reg.registry_url || '',
    };
  });

  const due = trials.filter((t) => t.due_12m === 'yes');
  const notDue = trials.filter((t) => t.due_12m !== 'yes');

  const breakdown = CLASSIFICATIONS.map((c) => {
    const rows = due.filter((t) => t.classification === c.key);
    const g = group(rows);
    return {
      key: c.key,
      label: c.label,
      count: g.count,
      participants: g.participants,
      percent: percent(g.count, due.length),
    };
  });

  const sponsorClasses = Array.from(new Set(trials.map((t) => t.sponsor_class)))
    .filter(Boolean).sort()
    .map((key) => ({ key, label: sponsorClassLabel(key) }));

  const starts = registryRows.map((r) => r.start_date).filter(Boolean).sort();

  const stats = {
    dataDate: DATA_DATE,
    dataDateLong: longDate(DATA_DATE),
    earliestStart: starts[0] || '',
    missingEnrolment: registryRows.filter((row) => !row.enrollment).length,
    registered: group(registryRows),
    completed: group(completed),
    posted: group(posted),
    notPosted: group(notPosted),
    due: group(due),
    notDue: group(notDue),
    breakdown,
    trials,
    sponsorClasses,
    classifications: CLASSIFICATIONS,
  };

  stats.finding = finding(stats);
  stats.caveat = 'This is a literature search outcome, not a finding that results were never published.';
  return stats;
}

// The one canonical sentence. Written once here, reused verbatim everywhere.
function finding(stats) {
  const notFound = stats.breakdown.find((b) => b.key === 'NOT_FOUND');
  return `As of ${longDate(stats.dataDate)}, ${num(notFound.count)} of the ` +
    `${num(stats.due.count)} completed essential tremor trials that never posted results to ` +
    `ClinicalTrials.gov, and are at least twelve months past completion, have no results ` +
    `publication that could be located; those ${num(notFound.count)} trials enrolled ` +
    `${num(notFound.participants)} participants.`;
}

module.exports = {
  computeStats, classificationLabel, sponsorClassLabel,
  CLASSIFICATIONS, MATCH_BASIS_LABELS, DATA_DATE,
};
