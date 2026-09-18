'use strict';

// Every number on the site is computed here, from the two CSV files.
// Nothing is hard coded.

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

function enrolment(row) {
  const n = parseInt(row.enrollment, 10);
  return Number.isFinite(n) ? n : 0;
}

function total(rows) {
  return rows.reduce((sum, row) => sum + enrolment(row), 0);
}

function group(rows) {
  return { count: rows.length, participants: total(rows) };
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

  // Join the literature search outcomes onto the registry record.
  const trials = publicationRows.map((pub) => {
    const reg = byNct.get(pub.nct_id) || {};
    return {
      nct_id: pub.nct_id,
      title: reg.title || '',
      sponsor_name: reg.sponsor_name || '',
      sponsor_class: pub.sponsor_class || reg.sponsor_class || '',
      sponsor_class_label: sponsorClassLabel(pub.sponsor_class || reg.sponsor_class),
      completion_date: pub.completion_date || reg.completion_date || '',
      enrollment: pub.enrollment || reg.enrollment || '',
      phase: reg.phase || '',
      due_12m: pub.due_12m || '',
      classification: pub.classification || '',
      classification_label: classificationLabel(pub.classification),
      match_basis: pub.match_basis || '',
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

  const breakdown = CLASSIFICATIONS.map((c) => {
    const rows = due.filter((t) => t.classification === c.key);
    return Object.assign({ key: c.key, label: c.label }, group(rows));
  });

  const sponsorClasses = Array.from(new Set(trials.map((t) => t.sponsor_class)))
    .filter(Boolean)
    .sort()
    .map((key) => ({ key, label: sponsorClassLabel(key) }));

  return {
    dataDate: '2026-09-18',
    missingEnrolment: registryRows.filter((row) => !row.enrollment).length,
    registered: group(registryRows),
    completed: group(completed),
    posted: group(posted),
    notPosted: group(notPosted),
    due: group(due),
    notDue: group(trials.filter((t) => t.due_12m !== 'yes')),
    breakdown,
    trials,
    sponsorClasses,
    classifications: CLASSIFICATIONS,
  };
}

module.exports = { computeStats, classificationLabel, sponsorClassLabel, CLASSIFICATIONS };
