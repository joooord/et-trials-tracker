'use strict';

// The five pages, written once as blocks and rendered as both HTML and markdown.

const { escapeHtml, num, longDate } = require('./util');
const { REPO, SITE_NAME, STRAPLINE } = require('./layout');
const { TERMS } = require('./glossary');

const SEG = { FOUND_RESULTS: 1, MENTIONED_ONLY: 2, NOT_FOUND: 3, UNCERTAIN: 4 };

// A segment carries its own count only when it is wide enough to hold it.
const LABEL_THRESHOLD = 8;

// The bar: one stacked bar, figures on it, and a legend that is also the data.

function chartBlock(stats) {
  const total = stats.due.count;
  const summary = stats.breakdown
    .map((b) => `${b.label}, ${num(b.count)} trials, ${num(b.participants)} participants`)
    .join('. ');

  const segments = stats.breakdown.map((b) => {
    const label = b.percent >= LABEL_THRESHOLD
      ? `<span class="seg-n">${num(b.count)}</span>` : '';
    return `      <div class="seg" data-seg="${SEG[b.key]}" style="flex-grow:${b.count}">${label}</div>`;
  }).join('\n');

  const legend = stats.breakdown.map((b) => `      <li data-seg="${SEG[b.key]}">
        <span class="swatch"></span>
        <span class="lab">${escapeHtml(b.label)}</span>
        <span class="val">${num(b.count)} trials</span>
        <span class="sub">${num(b.participants)} participants</span>
      </li>`).join('\n');

  const title = `Literature search outcome for the ${num(total)} trials at least twelve months past completion`;

  const html = `<figure class="chart">
    <figcaption>
      <p class="chart-title">${escapeHtml(title)}</p>
      <p class="chart-sub">Completed trials with no results posted to the registry, as of <time datetime="${stats.dataDate}">${stats.dataDateLong}</time>.</p>
    </figcaption>
    <div class="bar" role="img" aria-label="${escapeHtml(title + '. ' + summary + '.')}">
${segments}
    </div>
    <ul class="legend">
${legend}
    </ul>
  </figure>`;

  const md = [
    title + ', as of ' + stats.dataDateLong + '.',
    '',
    '| Literature search outcome | Trials | Participants |',
    '| --- | --- | --- |',
  ].concat(stats.breakdown.map((b) =>
    `| ${b.label} | ${num(b.count)} | ${num(b.participants)} |`))
    .concat([`| **All ${num(total)}** | ${num(total)} | ${num(stats.due.participants)} |`])
    .join('\n');

  return { t: 'raw', html, md };
}

// The trials: one table, which becomes a list of cards under 40rem.

const COLUMNS = [
  { key: 'title', label: 'Trial', cls: 'c-trial', sort: true },
  { key: 'completion', label: 'Completed', cls: 'c-date', sort: true },
  { key: 'enrolment', label: 'Participants', cls: 'c-num', sort: true },
  { key: 'outcome', label: 'Literature search outcome', cls: 'c-outcome', sort: true },
  { key: 'reference', label: 'Reference read', cls: 'c-ref' },
  { key: 'why', label: 'Why this classification', cls: 'c-why' },
];

function trialCells(trial) {
  const registry = `<a href="${escapeHtml(trial.registry_url)}">${escapeHtml(trial.nct_id)}</a>`;
  const sponsor = `<span class="sub">${escapeHtml(trial.sponsor_name)}</span>` +
    `<span class="sub">${escapeHtml(trial.sponsor_class_label)}</span>`;
  const cellTrial = `<span class="nct">${registry}</span>` +
    `<span class="trial-title">${escapeHtml(trial.title)}</span>${sponsor}`;

  const completion = trial.completion_date
    ? `<time datetime="${escapeHtml(trial.completion_date)}">${escapeHtml(longDate(trial.completion_date))}</time>`
    : 'Not recorded';

  const enrolment = trial.enrollment ? num(trial.enrollment) : 'Not recorded';

  const extras = [];
  if (trial.match_basis_label) extras.push(trial.match_basis_label);
  if (trial.due_12m === 'no') extras.push('Inside the twelve month window');
  if (trial.due_12m === '') extras.push('No completion date recorded');
  const outcome = `<span class="status" data-seg="${SEG[trial.classification]}">` +
    `${escapeHtml(trial.classification_label)}</span>` +
    extras.map((e) => `<span class="sub">${escapeHtml(e)}</span>`).join('');

  const reference = trial.url_opened
    ? `<a href="${escapeHtml(trial.url_opened)}">${escapeHtml(trial.pub_title || 'Reference')}</a>` +
      `<span class="sub">${escapeHtml([trial.journal, trial.pub_year].filter(Boolean).join(', '))}` +
      `${trial.pmid ? ` PMID ${escapeHtml(trial.pmid)}` : ''}</span>`
    : 'None recorded';

  const why = escapeHtml(trial.rationale || 'Not recorded');

  return { cellTrial, completion, enrolment, outcome, reference, why };
}

function trialsBlock(stats) {
  const head = COLUMNS.map((c) =>
    `<th scope="col" class="${c.cls}"${c.sort ? ` data-key="${c.key}"` : ''}>` +
    `${escapeHtml(c.label)}</th>`).join('');

  const rows = stats.trials.map((trial) => {
    const c = trialCells(trial);
    const values = [c.cellTrial, c.completion, c.enrolment, c.outcome, c.reference, c.why];
    const cells = COLUMNS.map((col, i) =>
      `<td class="${col.cls}"><span class="cell-label">${escapeHtml(col.label)}</span>` +
      `<span class="cell-value">${values[i]}</span></td>`).join('');
    return `      <tr id="${escapeHtml(trial.nct_id)}"` +
      ` data-classification="${escapeHtml(trial.classification)}"` +
      ` data-outcome="${escapeHtml(trial.classification_label)}"` +
      ` data-sponsorclass="${escapeHtml(trial.sponsor_class)}"` +
      ` data-sponsorlabel="${escapeHtml(trial.sponsor_class_label)}"` +
      ` data-nct="${escapeHtml(trial.nct_id)}"` +
      ` data-title="${escapeHtml(trial.title)}"` +
      ` data-completion="${escapeHtml(trial.completion_date)}"` +
      ` data-enrolment="${escapeHtml(trial.enrollment || '')}">${cells}</tr>`;
  }).join('\n');

  const caption = `The ${num(stats.trials.length)} completed essential tremor trials with no ` +
    `results posted to ClinicalTrials.gov, as of ${stats.dataDateLong}.`;

  const html = `<div class="table-box">
    <table class="rt trials" id="trials">
      <caption>${escapeHtml(caption)}</caption>
      <thead>
        <tr>${head}</tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>`;

  const cell = (value) => String(value).replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|');
  const mdRows = stats.trials.map((trial) => {
    const sponsor = [trial.sponsor_name, trial.sponsor_class_label].filter(Boolean).join(', ');
    const extras = [];
    if (trial.match_basis_label) extras.push(trial.match_basis_label);
    if (trial.due_12m === 'no') extras.push('Inside the twelve month window');
    if (trial.due_12m === '') extras.push('No completion date recorded');
    const reference = trial.url_opened
      ? `[${cell(trial.pub_title || 'Reference')}](${trial.url_opened})` +
        (trial.journal || trial.pub_year
          ? ' ' + cell([trial.journal, trial.pub_year].filter(Boolean).join(', ')) : '') +
        (trial.pmid ? ' PMID ' + trial.pmid : '')
      : 'None recorded';
    return '| ' + [
      `[${trial.nct_id}](${trial.registry_url}) ${cell(trial.title)} (${cell(sponsor)})`,
      trial.completion_date ? longDate(trial.completion_date) : 'Not recorded',
      trial.enrollment ? num(trial.enrollment) : 'Not recorded',
      [trial.classification_label].concat(extras).join('. '),
      reference,
      cell(trial.rationale || 'Not recorded'),
    ].join(' | ') + ' |';
  }).join('\n');

  const md = [
    caption,
    '',
    '| ' + COLUMNS.map((c) => c.label).join(' | ') + ' |',
    '| ' + COLUMNS.map(() => '---').join(' | ') + ' |',
    mdRows,
  ].join('\n');

  return { t: 'raw', html, md };
}

// The five questions. Plain text, so the same words feed the page and the FAQPage markup.

function questions(stats) {
  const b = (key) => stats.breakdown.find((x) => x.key === key);
  return [
    {
      question: 'How many essential tremor trials have never reported results?',
      answer: [
        `${num(b('NOT_FOUND').count)} trials have neither posted results to the registry nor a results publication that this search could locate, and they enrolled ${num(b('NOT_FOUND').participants)} participants.`,
        `A further ${num(b('UNCERTAIN').count)} trials, enrolling ${num(b('UNCERTAIN').participants)} participants, are uncertain.`,
        `Both figures count only the ${num(stats.due.count)} trials that are at least twelve months past completion.`,
      ],
    },
    {
      question: 'What does "no results publication located" mean?',
      answer: [
        'It means both stages of the literature search were run for that trial and neither found a paper meeting the matching rule.',
        'It does not mean that no paper exists.',
        'A paper can be missed if it sits in a journal the two databases do not index, or if it describes the trial too loosely to surface.',
      ],
    },
    {
      question: 'Is this a complete list of essential tremor trials?',
      answer: [
        `It is every interventional study on ClinicalTrials.gov whose condition strings name essential tremor, ${num(stats.registered.count)} in all, as of ${stats.dataDateLong}.`,
        'Trials registered only in another country’s register are not here, and neither are trials recorded under a different condition string.',
        'The registry record is taken as given, including its dates and its enrolment figures.',
      ],
    },
    {
      question: 'Who runs this and why?',
      answer: [
        'Jordan Pitts maintains it as an independent open data project, with no funding and no affiliation with any sponsor, journal or foundation.',
        'The aim is to make results reporting in one small field countable by anyone.',
        'The data and the code that builds this site are public, so any figure here can be checked.',
      ],
    },
    {
      question: 'How do I report a paper you missed?',
      answer: [
        `Open an issue in the repository with the NCT number, a link to the paper, and a line on how the paper matches the registry record.`,
        'Corrections are applied in public and recorded in the changelog with the date they were applied.',
        'The corrections page sets out what a useful report contains.',
      ],
    },
  ].map((q) => ({ question: q.question, answer: q.answer.join(' '), paragraphs: q.answer }));
}

// The tracker page.

function indexBlocks(stats) {
  const b = (key) => stats.breakdown.find((x) => x.key === key);
  const qs = questions(stats);

  return [
    { t: 'h1', text: SITE_NAME },
    { t: 'p', cls: 'strapline', text: STRAPLINE },

    { t: 'finding', text: stats.finding, plain: true },
    { t: 'p', text: stats.caveat },

    { t: 'h2', text: `The registry holds ${num(stats.registered.count)} essential tremor trials, ${num(stats.completed.count)} of them completed` },
    { t: 'p', text: `These counts come from ClinicalTrials.gov and are true as of {t:${stats.dataDate}|${stats.dataDateLong}}.` },
    {
      t: 'p',
      text: `${num(stats.registered.count)} interventional studies are registered for essential tremor, ` +
        `and they enrolled ${num(stats.registered.participants)} participants. ` +
        `${num(stats.completed.count)} of them are completed, enrolling ${num(stats.completed.participants)} participants. ` +
        `${num(stats.posted.count)} completed trials posted results to the registry, covering ${num(stats.posted.participants)} participants. ` +
        `${num(stats.notPosted.count)} completed trials did not, covering ${num(stats.notPosted.participants)} participants.`,
    },
    {
      t: 'p',
      text: `Of those ${num(stats.notPosted.count)} trials, ${num(stats.due.count)} are at least twelve months past completion and ` +
        `${num(stats.notDue.count)} are not. The ${num(stats.due.count)} enrolled ${num(stats.due.participants)} participants. ` +
        `The other ${num(stats.notDue.count)} enrolled ${num(stats.notDue.participants)} participants, and they are listed in the table but left out of the counts below.`,
    },

    { t: 'h2', text: `A results publication was located for ${num(b('FOUND_RESULTS').count)} of the ${num(stats.due.count)} trials past that window` },
    { t: 'p', text: `Each of the ${num(stats.due.count)} trials was searched twice, first by its NCT number and then by its specifics. Every trial ends in one of four outcomes.` },
    chartBlock(stats),
    {
      t: 'p',
      text: `A results publication was located for ${num(b('FOUND_RESULTS').count)} trials, enrolling ${num(b('FOUND_RESULTS').participants)} participants. ` +
        `${num(b('MENTIONED_ONLY').count)} trials, enrolling ${num(b('MENTIONED_ONLY').participants)} participants, are cited in the literature without a report of their own results. ` +
        `No results publication was located for ${num(b('NOT_FOUND').count)} trials, enrolling ${num(b('NOT_FOUND').participants)} participants. ` +
        `${num(b('UNCERTAIN').count)} trials, enrolling ${num(b('UNCERTAIN').participants)} participants, are uncertain.`,
    },

    { t: 'h2', text: 'What this shows, and what it does not' },
    {
      t: 'p',
      text: 'This is a linkage audit. It records what a search found, not what exists. ' +
        'A trial marked as having no results publication located may still have a paper that neither database reached.',
    },
    { t: 'note', text: 'The [method page](/method) sets out the search, the matching rule and the full limitations.' },

    { t: 'h2', text: `The ${num(stats.trials.length)} completed trials with no results posted to the registry` },
    { t: 'p', text: 'Every one of them has a row, and every row carries the reason for its classification.' },
    {
      t: 'p',
      text: `The ${num(stats.notDue.count)} trials inside the twelve month window are marked as such. ` +
        'Titles, sponsors, sponsor class, dates and enrolment figures are reproduced from the registry. ' +
        'Where a paper was found, the row says whether the link rests on an NCT ID match or a specifics match. ' +
        'Each row has its own anchor, so a single trial can be linked to, for example `/#' + stats.trials[0].nct_id + '`.',
    },
    { t: 'raw', html: '<div class="controls" id="controls"></div>', md: '' },
    trialsBlock(stats),
    {
      t: 'note',
      text: `Where the registry records no enrolment the cell reads Not recorded, and that trial adds ` +
        `nothing to the participant totals. ${num(stats.missingEnrolment)} of the ${num(stats.registered.count)} registered studies have no enrolment figure.`,
    },

    { t: 'h2', text: 'Questions people ask' },
    { t: 'p', text: 'Five questions, answered from the same data as the rest of this page.' },
    { t: 'faq', items: qs.map((q) => ({ q: q.question, a: q.paragraphs })) },
  ];
}

// The method page.

function methodBlocks(stats) {
  return [
    { t: 'h1', text: 'Method' },
    { t: 'p', cls: 'strapline', text: 'How every figure on this site was produced, and what it can and cannot support.' },

    { t: 'h2', text: `The registry pull returned ${num(stats.registered.count)} interventional studies` },
    { t: 'p', text: `The trial list comes from the ClinicalTrials.gov {a:API|application programming interface} version 2, pulled on {t:${stats.dataDate}|${stats.dataDateLong}}.` },
    {
      t: 'p',
      text: `A study is included when it is registered as an interventional study and any one of its condition ` +
        `strings contains "essential tremor" or "tremor, essential", matched without regard to case. ` +
        `That filter returned ${num(stats.registered.count)} studies. ${num(stats.completed.count)} of them are completed.`,
    },
    {
      t: 'p',
      text: `A trial counts as having results posted to the registry when its record carries a results section. ` +
        `${num(stats.posted.count)} of the ${num(stats.completed.count)} completed trials do. The other ` +
        `${num(stats.notPosted.count)} are the trials carried into the literature search.`,
    },

    { t: 'h2', text: `The twelve month window leaves ${num(stats.due.count)} trials in the counts` },
    { t: 'p', text: 'Results take time to write up, so a trial that finished recently is not treated like one that finished years ago.' },
    {
      t: 'p',
      text: `Each of the ${num(stats.notPosted.count)} trials is marked according to whether twelve months have passed ` +
        `between its recorded completion date and the data date. ${num(stats.due.count)} trials are past that window and ` +
        `${num(stats.notDue.count)} are not, either because they finished within the last twelve months or because the ` +
        `registry records no completion date. Every headline count refers to the ${num(stats.due.count)}.`,
    },

    { t: 'h2', text: 'The search runs in two stages, and the second runs only when the first finds nothing' },
    { t: 'p', text: 'Stage A looks for the registration number. Stage B looks for the trial itself.' },
    { t: 'h3', text: 'Stage A: search by registration number' },
    {
      t: 'ol',
      items: [
        'PubMed, using the NCT number in the secondary source identifier field, written as the number followed by `[si]`.',
        'PubMed again, using the bare number as a free text term, which catches papers that print it in the abstract or the methods without indexing it.',
        'Europe {a:PMC|PubMed Central}, using the bare number, which indexes the full text of open access articles.',
      ],
    },
    { t: 'h3', text: 'Stage B: search by trial specifics' },
    { t: 'p', text: 'Where no registration number was found, the trial was searched on its own particulars, taken from the registry record.' },
    {
      t: 'ol',
      items: [
        'PubMed, by principal investigator surname combined with tremor, restricted to the completion year and the six years after it.',
        'Europe PMC, by the intervention combined with the phrase "essential tremor", narrowed by the affiliation of a participating site.',
      ],
    },
    { t: 'p', text: 'Every hit returned by either stage was opened and read. Nothing was classified on a title alone.' },

    { t: 'h3', text: 'The matching rule' },
    { t: 'p', text: 'A paper is recorded as the results publication for a trial only when at least three of these four criteria agree with the registry record.' },
    {
      t: 'ol',
      items: [
        'The intervention.',
        'The study design, including randomisation, blinding and control.',
        'The sample size, within 25 per cent of the registered enrolment.',
        'A participating site or a named investigator.',
      ],
    },
    {
      t: 'p',
      text: 'Where the registration number appears in the paper, the match basis is recorded as NCT ID match. ' +
        'Where the link rests on the criteria above alone, it is recorded as a specifics match, and the row says so.',
    },

    { t: 'h2', text: 'Every trial ends in one of four outcomes' },
    { t: 'p', text: 'Each trial gets exactly one outcome, and the four are defined on the [glossary page](/glossary).' },
    {
      t: 'dl',
      items: stats.breakdown.map((b) => [
        `${b.label}: ${num(b.count)} trials, ${num(b.participants)} participants`,
        outcomeText(b.key),
      ]),
    },

    { t: 'h2', text: 'What the method cannot support' },
    { t: 'p', text: 'These limits sit beside the counts on the [tracker page](/) as well, because they qualify them.' },
    {
      t: 'ul',
      items: [
        'No results publication located means the search above did not find one. It does not establish that results were never published. A paper can sit in a journal neither database indexes, or in a language or format the queries did not reach.',
        'Rows matched on specifics rather than on the registration number rest on agreement of design, site and sample size. That is a judgement, not an identity, and those rows are labelled so a reader can weigh them differently.',
        'Rows marked uncertain are uncertain. They are neither located nor not located, and they are reported as their own group rather than folded into either.',
        `The registry record is taken as given. ${num(stats.missingEnrolment)} of the ${num(stats.registered.count)} registered studies carry no enrolment figure, so participant totals are sums over the trials that report one.`,
        'Results posted to a registry and results published in a journal are different things. A trial can do either, both or neither, and the two are counted separately here.',
        `The searches were run on {t:${stats.dataDate}|${stats.dataDateLong}}. A paper appearing after that date is not reflected until the next update.`,
        'This is a literature linkage audit, not a determination of anyone’s legal or regulatory reporting duty. Which trials fall under a given reporting requirement is a separate question this site does not address.',
      ],
    },

    { t: 'h2', text: 'Updates and corrections are public' },
    { t: 'p', text: 'The dataset is refreshed on a weekly cycle and every change is recorded in a dated changelog in the repository.' },
    { t: 'p', text: 'If you know of a paper this search missed, the [corrections page](/corrections) explains how to report it.' },
  ];
}

function outcomeText(key) {
  switch (key) {
    case 'FOUND_RESULTS':
      return 'A paper reporting the trial’s results was found and met the matching rule. The reference is linked in the table.';
    case 'MENTIONED_ONLY':
      return 'The trial is referred to in the literature, for example in a review or another trial’s discussion, but no paper reporting its own results was found. The citing reference is linked so a reader can judge it.';
    case 'NOT_FOUND':
      return 'Both stages of the search were run and no paper met the matching rule.';
    default:
      return 'A candidate paper exists but the evidence is too thin to tie it to this registry record, for example where the registry entry covers a whole programme. The candidate is linked and the reasoning is in the data file.';
  }
}

// The data page.

function dataBlocks(stats) {
  const registryColumns = [
    ['nct_id', 'ClinicalTrials.gov registration number.'],
    ['title', 'Brief title as recorded in the registry.'],
    ['conditions', 'Condition strings as recorded in the registry, separated by semicolons where there is more than one.'],
    ['status', 'Overall status from the registry, for example COMPLETED, RECRUITING or TERMINATED.'],
    ['phase', 'Trial phase, or NA where the study is not phased, for example a device or behavioural study.'],
    ['start_date', 'Study start date as recorded in the registry.'],
    ['completion_date', 'Study completion date as recorded in the registry. Some records give a year and month only.'],
    ['months_since_completion', `Whole months from the completion date to the data date of ${stats.dataDateLong}. Blank where no completion date is recorded.`],
    ['enrollment', 'Number of participants as recorded in the registry, actual where available, otherwise the estimate. Blank where the registry gives none. Spelled as the registry spells it.'],
    ['sponsor_name', 'Lead sponsor name, verbatim from the registry.'],
    ['sponsor_class', 'Sponsor class assigned by the registry, for example INDUSTRY, NIH, FED or OTHER_GOV.'],
    ['results_posted', 'yes where the registry record carries a results section, otherwise no.'],
    ['registry_url', 'Link to the study record on ClinicalTrials.gov.'],
  ];

  const publicationColumns = [
    ['nct_id', 'Registration number, the key back to the registry file.'],
    ['completion_date', 'Completion date carried over from the registry record.'],
    ['due_12m', 'yes where at least twelve months separate the completion date from the data date, no where less. Blank where the registry records no usable completion date.'],
    ['sponsor_class', 'Sponsor class carried over from the registry record.'],
    ['enrollment', 'Enrolment carried over from the registry record. Blank where the registry gives none.'],
    ['classification', 'Outcome of the literature search: FOUND_RESULTS, MENTIONED_ONLY, NOT_FOUND or UNCERTAIN.'],
    ['match_basis', 'How the paper was tied to the trial: NCT_ID_MATCH, SPECIFICS_MATCH, or NONE where no paper was tied to it.'],
    ['pmid', 'PubMed identifier of the paper, where there is one.'],
    ['doi', 'Digital object identifier of the paper, where there is one.'],
    ['url_opened', 'The record that was opened and read during the search.'],
    ['pub_title', 'Title of the paper.'],
    ['pub_year', 'Year of publication.'],
    ['journal', 'Journal, in its indexed abbreviation.'],
    ['rationale', 'A short note recording why the trial was classified as it was, quoted on the tracker page.'],
    ['registry_url', 'Link to the study record on ClinicalTrials.gov.'],
    ['conditions', 'Condition strings carried over from the registry record. The file carries this column twice, with identical values.'],
  ];

  const columnTable = (caption, rows) => ({
    t: 'table',
    cls: 'columns',
    caption,
    head: [{ text: 'Column', cls: 'c-col' }, { text: 'Meaning', cls: 'c-mean' }],
    rows: rows.map(([name, meaning]) => ['`' + name + '`', meaning]),
  });

  return [
    { t: 'h1', text: 'Data' },
    { t: 'p', cls: 'strapline', text: 'The two files this site is built from, and a description of every column.' },

    { t: 'h2', text: 'Both files are plain comma separated text' },
    { t: 'p', text: 'They are {a:UTF-8|Unicode Transformation Format, 8 bit} text with a header row, and they are the files the build reads.' },
    {
      t: 'ul',
      items: [
        `[registry_et_trials.csv](/data/registry_et_trials.csv). ${num(stats.registered.count)} rows, one for each interventional study on ClinicalTrials.gov whose condition strings name essential tremor.`,
        `[publication_status.csv](/data/publication_status.csv). ${num(stats.trials.length)} rows, one for each completed trial with no results posted to the registry, with the outcome of the literature search.`,
      ],
    },
    { t: 'p', text: 'Every figure on the site is computed from these files at build time, so the files and the pages cannot disagree.' },

    { t: 'h2', text: 'There is a machine readable copy of everything here' },
    { t: 'p', text: 'Nothing on this site is behind JavaScript, and every page has a markdown twin.' },
    {
      t: 'ul',
      items: [
        '[data.json](/data.json). Every computed figure and every trial row as {a:JSON|JavaScript Object Notation}, with the data date.',
        '[llms.txt](/llms.txt). A short index of this site in the llmstxt.org format.',
        '[index.md](/index.md), [method.md](/method.md), [data.md](/data.md), [corrections.md](/corrections.md) and [glossary.md](/glossary.md). The five pages as markdown.',
        '[sitemap.xml](/sitemap.xml) and [robots.txt](/robots.txt). Every page, with its last modified date, and an open crawling policy.',
      ],
    },

    { t: 'h2', text: 'registry_et_trials.csv, one row per registered study' },
    { t: 'p', text: 'Thirteen columns, in this order.' },
    columnTable('Columns of registry_et_trials.csv.', registryColumns),

    { t: 'h2', text: 'publication_status.csv, one row per completed trial without posted results' },
    { t: 'p', text: 'Sixteen columns, in this order.' },
    columnTable('Columns of publication_status.csv.', publicationColumns),

    { t: 'h2', text: 'Join the two files on nct_id' },
    {
      t: 'p',
      text: `Every \`nct_id\` in \`publication_status.csv\` appears in \`registry_et_trials.csv\`. ` +
        `The ${num(stats.trials.length)} rows of the publication file are exactly the rows of the registry ` +
        `file where \`status\` is COMPLETED and \`results_posted\` is no. Join on \`nct_id\` to recover the title and sponsor.`,
    },

    { t: 'h2', text: 'Reproducing the figures takes one command' },
    { t: 'p', text: 'Clone the repository and run `npm run build`. There are no dependencies to install.' },
    {
      t: 'p',
      text: 'The build reads the two files, recomputes every number, writes the site into `dist/`, ' +
        'then recomputes the headline figures a second time and checks them against the built pages. ' +
        'If the two disagree, the build stops.',
    },
    { t: 'note', text: `Data under CC BY 4.0. Code under the {a:MIT|Massachusetts Institute of Technology} licence. Both are in the repository at [${REPO.replace('https://', '')}](${REPO}).` },
  ];
}

// The corrections page.

function correctionsBlocks(stats) {
  const b = (key) => stats.breakdown.find((x) => x.key === key);
  return [
    { t: 'h1', text: 'Corrections' },
    { t: 'p', cls: 'strapline', text: 'How to tell us about a paper this search missed, and how corrections are handled.' },

    { t: 'h2', text: `If you know the paper for one of the ${num(b('NOT_FOUND').count)} trials, the entry is wrong` },
    { t: 'p', text: 'A trial marked as having no results publication located is a search outcome, and a search can miss things.' },
    { t: 'p', text: `Open an issue in the repository at [${REPO.replace('https://', '')}/issues](${REPO}/issues).` },
    { t: 'p', text: 'The most useful report includes three things.' },
    {
      t: 'ul',
      items: [
        'The NCT number of the trial.',
        'A link to the paper, ideally a {a:DOI|digital object identifier} or a {a:PMID|PubMed identifier}.',
        'A line on how the paper corresponds to the registry record, for example the matching intervention, design and sample size.',
      ],
    },
    {
      t: 'p',
      text: 'Errors of any other kind are just as welcome: a wrong completion date, a sponsor name that does not ' +
        'match the registry, a broken link, a miscounted figure, or a sentence that reads as an accusation rather ' +
        'than a count.',
    },

    { t: 'h2', text: 'Corrections are applied in public' },
    { t: 'p', text: 'Nothing is altered quietly.' },
    {
      t: 'p',
      text: 'Each accepted change is recorded in `CHANGELOG.md` in the repository, with the date it was applied, ' +
        'the trials affected and what changed. The full history of the dataset is in the commit log, so any figure ' +
        'here can be traced back to the data it was computed from.',
    },
    { t: 'p', text: 'Every figure is recomputed from the data files at build time. Correct the data and the site follows.' },

    { t: 'h2', text: 'Who maintains this' },
    { t: 'p', text: `${SITE_NAME} is an independent open data project maintained by Jordan Pitts.` },
    { t: 'p', text: `The data and the code that builds this site are public at [${REPO.replace('https://', '')}](${REPO}). The project has no funding and no affiliation with any trial sponsor, journal or foundation.` },
    { t: 'note', text: `Site data as of {t:${stats.dataDate}|${stats.dataDateLong}}.` },
  ];
}

// The glossary.

function glossaryBlocks(stats) {
  return [
    { t: 'h1', text: 'Glossary' },
    { t: 'p', cls: 'strapline', text: 'Every term this site uses in a particular way, defined in one place.' },
    { t: 'p', text: 'Each term is linked from its first use on the other pages. Counts here are the same counts as on the [tracker page](/).' },
    {
      t: 'dl',
      items: TERMS.map((entry) => [
        `{d:${entry.slug}|${entry.term}}`,
        entry.define(stats),
      ]),
    },
  ];
}

module.exports = {
  indexBlocks, methodBlocks, dataBlocks, correctionsBlocks, glossaryBlocks, questions,
};
