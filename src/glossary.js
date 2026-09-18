'use strict';

// Every term the site defines, in one place.
//
// `match` holds the phrases that trigger a link to the definition. The first
// time one of them appears in the prose of a page, the build wraps it in a link
// to /glossary. The glossary page itself marks each term with <dfn>.
//
// `define` returns one or more sentences, and may use the computed figures so
// that the glossary carries the same numbers as the rest of the site.

const { num, longDate } = require('./util');

const TERMS = [
  {
    slug: 'essential-tremor',
    term: 'Essential tremor',
    match: ['essential tremor'],
    define: () => [
      'Essential tremor is a movement disorder that causes rhythmic shaking, most often in the hands. It is the condition every trial on this site was registered to study.',
    ],
  },
  {
    slug: 'clinicaltrials-gov',
    term: 'ClinicalTrials.gov',
    match: ['ClinicalTrials.gov'],
    define: (s) => [
      'ClinicalTrials.gov is the public register of clinical studies run by the United States National Library of Medicine. Sponsors record a study there before it starts and may post its results there after it ends. Every trial on this site comes from that register, and the pull was made on {t:' + s.dataDate + '|' + longDate(s.dataDate) + '}.',
    ],
  },
  {
    slug: 'nct-number',
    term: 'NCT number',
    match: ['NCT number', 'NCT numbers', 'NCT identifier'],
    abbr: ['NCT', 'National Clinical Trial'],
    define: () => [
      'An {a:NCT|National Clinical Trial} number is the registration number that ClinicalTrials.gov gives a study, written as NCT followed by eight digits. It is the key that joins the two data files, and every row in the table on the tracker page can be linked to by it.',
    ],
  },
  {
    slug: 'interventional-study',
    term: 'Interventional study',
    match: ['interventional study', 'interventional studies', 'interventional trial'],
    define: () => [
      'An interventional study gives participants a treatment, a device or a procedure and then measures what happens. It is the opposite of an observational study, which watches without assigning anything. Only interventional studies are counted here.',
    ],
  },
  {
    slug: 'completed',
    term: 'Completed',
    match: ['completed'],
    define: (s) => [
      'Completed is the registry status for a study that has finished, including its follow up. ' + num(s.completed.count) + ' of the ' + num(s.registered.count) + ' registered studies carry it. Statuses such as recruiting, terminated or withdrawn are not counted as completed.',
    ],
  },
  {
    slug: 'results-posted',
    term: 'Results posted to the registry',
    match: ['results posted to the registry', 'posted results to the registry', 'results posted'],
    define: (s) => [
      'A trial has posted results to the registry when its ClinicalTrials.gov record carries a results section, with participant flow, baseline data and outcome measures. ' + num(s.posted.count) + ' of the ' + num(s.completed.count) + ' completed trials have one. This is separate from publishing a paper.',
    ],
  },
  {
    slug: 'results-publication',
    term: 'Results publication',
    match: ['results publication', 'results publications'],
    define: () => [
      'A results publication is a paper that reports the findings of a named trial. A paper that only cites a trial, such as a review or another trial’s discussion, is not one. Deciding whether a paper reports a given trial is what the matching rule on the [method page](/method) is for.',
    ],
  },
  {
    slug: 'sponsor-class',
    term: 'Sponsor class',
    match: ['sponsor class', 'sponsor classes'],
    define: (s) => [
      'Sponsor class is the category the registry assigns to the organisation running a trial, such as industry, {a:NIH|National Institutes of Health} or other government. The site reproduces the registry value and does not reassign it. ' + num(s.sponsorClasses.length) + ' classes appear among the trials in the table.',
    ],
  },
  {
    slug: 'four-outcomes',
    term: 'The four outcomes',
    match: ['four outcomes'],
    define: (s) => {
      const of = (key) => {
        const b = s.breakdown.find((x) => x.key === key);
        return num(b.count) + ' trials, ' + num(b.participants) + ' participants';
      };
      return [
        'Every trial searched ends in one of four outcomes, and each trial gets exactly one.',
        '{d:outcome-found|Results publication located} means a paper reporting that trial’s results was found and met the matching rule (' + of('FOUND_RESULTS') + ').',
        '{d:outcome-mentioned|Cited in literature only} means the trial is referred to in the literature, but no paper reporting its own results was found (' + of('MENTIONED_ONLY') + ').',
        '{d:outcome-not-found|No results publication located} means both stages of the search were run and nothing met the matching rule (' + of('NOT_FOUND') + ').',
        '{d:outcome-uncertain|Uncertain} means a candidate paper exists but the evidence is too thin to tie it to that registry record (' + of('UNCERTAIN') + ').',
      ];
    },
  },
  {
    slug: 'nct-id-match',
    term: 'NCT ID match',
    match: ['NCT ID match'],
    abbr: ['NCT', 'National Clinical Trial'],
    define: () => [
      'An {a:NCT ID|National Clinical Trial identifier} match means the paper prints the trial’s registration number, so the link between paper and trial is stated rather than inferred. It is the stronger of the two match bases.',
    ],
  },
  {
    slug: 'specifics-match',
    term: 'Specifics match',
    match: ['specifics match', 'matched on specifics'],
    define: () => [
      'A specifics match means the paper does not print the registration number, and the link rests on agreement of intervention, design, sample size and site or investigator. It is a judgement, not an identity, and rows resting on it say so.',
    ],
  },
  {
    slug: 'twelve-month-window',
    term: 'The twelve month window',
    match: ['twelve month window', 'twelve months past completion'],
    define: (s) => [
      'The twelve month window is the wait this site allows before counting a trial as due. A trial is inside the window until twelve months have passed between its recorded completion date and the data date. ' + num(s.due.count) + ' of the ' + num(s.notPosted.count) + ' completed trials without posted results are past it and ' + num(s.notDue.count) + ' are not.',
    ],
  },
];

// Longest phrases first, so that a phrase is never eaten by a shorter one.
function matchers() {
  const list = [];
  TERMS.forEach((entry) => {
    entry.match.forEach((phrase) => list.push({ slug: entry.slug, phrase, abbr: entry.abbr }));
  });
  return list.sort((a, b) => b.phrase.length - a.phrase.length);
}

module.exports = { TERMS, matchers };
