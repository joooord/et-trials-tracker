'use strict';

const { escapeHtml, num, longDate, REPO } = require('./layout');

const SEG_INDEX = {
  FOUND_RESULTS: 1,
  MENTIONED_ONLY: 2,
  NOT_FOUND: 3,
  UNCERTAIN: 4,
};

function figure(label, group, indent) {
  return `    <div${indent ? ' class="indent"' : ''}>
      <dt>${label}</dt>
      <dd><span class="n">${num(group.count)}</span><span class="participants">${num(group.participants)} participants</span></dd>
    </div>`;
}

function chart(stats) {
  const totalCount = stats.due.count;
  const segments = stats.breakdown.map((b) => {
    const share = totalCount ? (b.count / totalCount) * 100 : 0;
    const detail = `${num(b.count)} of ${num(totalCount)} trials (${share.toFixed(0)} per cent), ${num(b.participants)} participants`;
    return `      <div data-seg="${SEG_INDEX[b.key]}" style="flex: ${b.count} 1 0" tabindex="0" role="img"
        data-label="${escapeHtml(b.label)}" data-detail="${escapeHtml(detail)}"
        aria-label="${escapeHtml(b.label + ': ' + detail)}"></div>`;
  }).join('\n');

  const legend = stats.breakdown.map((b) => `      <li data-seg="${SEG_INDEX[b.key]}">
        <span class="swatch"></span>
        <span class="lab">${b.label}</span>
        <span class="val">${num(b.count)}</span>
        <span class="sub">${num(b.participants)} participants</span>
      </li>`).join('\n');

  return `  <figure class="chart">
    <figcaption>
      <p class="chart-title">Literature search outcome for the ${num(totalCount)} trials at least twelve months past completion</p>
      <p class="chart-sub">Completed, no results posted to the registry. As of ${stats.dataDate}.</p>
    </figcaption>
    <div class="bar">
${segments}
    </div>
    <ul class="legend">
${legend}
    </ul>
  </figure>`;
}

function trialRow(trial) {
  const paper = trial.url_opened
    ? `<span class="paper"><a href="${escapeHtml(trial.url_opened)}">${escapeHtml(trial.pub_title || 'Reference')}</a>` +
      `<span class="meta">${escapeHtml([trial.journal, trial.pub_year].filter(Boolean).join(', '))}${trial.pmid ? ` PMID ${escapeHtml(trial.pmid)}` : ''}</span></span>`
    : '<span class="note">None recorded</span>';

  const basis = trial.match_basis === 'NCT_ID_MATCH' ? 'NCT ID match'
    : trial.match_basis === 'SPECIFICS_MATCH' ? 'Specifics match'
    : '';

  // Trials outside the twelve month window are marked, since the headline
  // figures do not include them.
  const window = trial.due_12m === 'yes' ? ''
    : trial.due_12m === 'no' ? 'Less than twelve months past completion'
    : 'No completion date recorded';

  return `        <tr data-classification="${escapeHtml(trial.classification)}" data-sponsorclass="${escapeHtml(trial.sponsor_class)}"
          data-nct="${escapeHtml(trial.nct_id)}" data-title="${escapeHtml(trial.title)}"
          data-sponsor="${escapeHtml(trial.sponsor_name)}" data-completion="${escapeHtml(trial.completion_date)}"
          data-enrolment="${escapeHtml(trial.enrollment)}" data-status="${escapeHtml(trial.classification_label)}">
          <td class="nct"><a href="${escapeHtml(trial.registry_url)}">${escapeHtml(trial.nct_id)}</a></td>
          <td class="title">${escapeHtml(trial.title)}</td>
          <td>${escapeHtml(trial.sponsor_name)}<span class="sponsor-class">${escapeHtml(trial.sponsor_class_label)}</span></td>
          <td>${trial.completion_date ? escapeHtml(trial.completion_date) : '<span class="note">Not recorded</span>'}</td>
          <td class="num">${trial.enrollment ? num(trial.enrollment) : '<span class="note">n/a</span>'}</td>
          <td><span class="status" data-seg="${SEG_INDEX[trial.classification]}"${trial.rationale ? ` title="${escapeHtml(trial.rationale)}"` : ''}>${escapeHtml(trial.classification_label)}</span>${basis ? `<span class="basis">${basis}</span>` : ''}${window ? `<span class="basis">${window}</span>` : ''}</td>
          <td>${paper}</td>
        </tr>`;
}

function indexPage(stats) {
  const classOptions = stats.classifications
    .map((c) => `<option value="${c.key}">${c.label}</option>`).join('\n            ');
  const sponsorOptions = stats.sponsorClasses
    .map((s) => `<option value="${escapeHtml(s.key)}">${escapeHtml(s.label)}</option>`).join('\n            ');

  const found = stats.breakdown.find((b) => b.key === 'FOUND_RESULTS');
  const notFound = stats.breakdown.find((b) => b.key === 'NOT_FOUND');
  const mentioned = stats.breakdown.find((b) => b.key === 'MENTIONED_ONLY');
  const uncertain = stats.breakdown.find((b) => b.key === 'UNCERTAIN');

  return `<div class="wrap">
  <section class="section">
    <h1>Results reporting in essential tremor trials</h1>
    <p class="lede">Every interventional study registered on ClinicalTrials.gov for essential tremor, which of the completed ones posted results to the registry, and, where results were not posted, whether a results publication could be located in the literature. Figures are as of ${stats.dataDate}.</p>

    <dl class="figures">
${figure('Interventional studies registered for essential tremor', stats.registered)}
${figure('Completed', stats.completed, true)}
${figure('Completed, results posted to the registry', stats.posted, true)}
${figure('Completed, no results posted to the registry', stats.notPosted, true)}
    </dl>

    <p>Of the ${num(stats.notPosted.count)} completed trials with no results posted to the registry, ${num(stats.due.count)} are at least twelve months past their recorded completion date and ${num(stats.notDue.count)} are not. For the ${num(stats.due.count)} trials past that window, a two stage literature search was run to establish whether a results publication exists. The <a href="/method">method page</a> sets out the search and the classification rules in full.</p>

${chart(stats)}

    <p>As of ${stats.dataDate}, a results publication was located for ${num(found.count)} of these trials, covering ${num(found.participants)} participants. For ${num(notFound.count)} trials, covering ${num(notFound.participants)} participants, no results publication was located. ${num(mentioned.count)} trials were cited in the literature without a report of their results, and ${num(uncertain.count)} remain uncertain. A trial with no results publication located is not a trial that never published: see the limitations on the <a href="/method">method page</a>.</p>
  </section>

  <section class="section">
    <h2>The ${num(stats.trials.length)} completed trials without registry results</h2>
    <p>All ${num(stats.trials.length)} completed trials with no results posted to the registry. This includes the ${num(stats.notDue.count)} outside the twelve month window, either because they completed recently or because the registry records no completion date; those rows are marked and are not counted in the figures above. Sponsor names are reproduced from the registry record. Sort by any column heading, filter with the controls below.</p>

    <div class="controls">
      <div>
        <label for="filter-classification">Literature search outcome</label>
        <select id="filter-classification">
            <option value="all">All outcomes</option>
            ${classOptions}
        </select>
      </div>
      <div>
        <label for="filter-sponsor">Sponsor class</label>
        <select id="filter-sponsor">
            <option value="all">All sponsor classes</option>
            ${sponsorOptions}
        </select>
      </div>
      <p class="count" id="row-count">Showing all ${num(stats.trials.length)} trials</p>
    </div>

    <div class="table-scroll">
      <table id="trials">
        <caption>Completed essential tremor trials with no results posted to ClinicalTrials.gov, with the outcome of the literature search as of ${stats.dataDate}.</caption>
        <thead>
          <tr>
            <th scope="col" data-key="nct">NCT</th>
            <th scope="col" data-key="title">Title</th>
            <th scope="col" data-key="sponsor">Sponsor</th>
            <th scope="col" data-key="completion">Completion</th>
            <th scope="col" class="num" data-key="enrolment">Enrolment</th>
            <th scope="col" data-key="status">Literature search outcome</th>
            <th scope="col">Reference</th>
          </tr>
        </thead>
        <tbody>
${stats.trials.map(trialRow).join('\n')}
        </tbody>
      </table>
    </div>
    <p class="note">Enrolment is the value recorded in the registry. Where it is absent the cell reads n/a and the trial contributes nothing to the participant totals above.</p>
  </section>
</div>`;
}

function methodPage(stats) {
  return `<div class="wrap prose">
  <section class="section">
    <h1>Method</h1>
    <p class="lede">How the figures on this site were produced, and what they can and cannot support.</p>

    <h2>Registry pull</h2>
    <p>The trial list was drawn from the ClinicalTrials.gov API version 2. A study is included when it is registered as interventional and any one of its condition strings contains "essential tremor" or "tremor, essential", matched without regard to case. That filter returned ${num(stats.registered.count)} studies, of which ${num(stats.completed.count)} carry the status COMPLETED. For each study the registry supplies the title, conditions, overall status, phase, start and completion dates, enrolment, sponsor name and sponsor class, and whether results have been posted to the registry.</p>
    <p>A trial counts as having posted results when the registry record carries a results section. ${num(stats.posted.count)} of the ${num(stats.completed.count)} completed trials do. The remaining ${num(stats.notPosted.count)} do not, and those are the trials carried forward to the literature search.</p>

    <h2>The twelve month window</h2>
    <p>Results take time to write up, so a trial that completed recently is not treated the same as one that completed years ago. Each of the ${num(stats.notPosted.count)} trials is marked according to whether at least twelve months have passed between its recorded completion date and the data date of ${stats.dataDate}. ${num(stats.due.count)} trials are past that window and ${num(stats.notDue.count)} are not, either because they completed within the last twelve months or because the registry records no completion date for them. Every headline count on this site refers to the ${num(stats.due.count)} trials past the window. The other ${num(stats.notDue.count)} stay in the table, marked as outside it, so that the full set is visible.</p>

    <h2>The literature search</h2>
    <p>Each trial was searched in two stages. Stage B was run only where Stage A found nothing conclusive.</p>

    <h3>Stage A: search by registration number</h3>
    <ol>
      <li>PubMed, using the NCT identifier in the secondary source identifier field, written as the identifier followed by <code>[si]</code>.</li>
      <li>PubMed again, using the bare identifier as a free text term, which catches papers that print the number in the abstract or the methods but do not index it.</li>
      <li>Europe PMC, using the bare identifier, which indexes the full text of open access articles and so catches numbers that appear only in a methods section.</li>
    </ol>

    <h3>Stage B: search by trial specifics</h3>
    <p>Where no registration number hit was found, the trial was searched on its own particulars, taken from the registry record: sponsor, principal investigator surname, intervention, target enrolment, participating sites, and completion year.</p>
    <ol>
      <li>PubMed, by principal investigator surname combined with tremor, restricted to publications from the completion year to six years after it.</li>
      <li>Europe PMC, by the intervention combined with the phrase "essential tremor", narrowed by the affiliation of a participating site.</li>
    </ol>
    <p>Every hit returned by either stage was opened and read. Nothing was classified on the strength of a title alone.</p>

    <h3>The matching rule</h3>
    <p>A publication is recorded as the results publication for a trial only when at least three of these four criteria match the registry record:</p>
    <ol>
      <li>the intervention;</li>
      <li>the study design, including randomisation, blinding and control;</li>
      <li>the sample size, within 25 per cent of the registered enrolment;</li>
      <li>a participating site or a named investigator.</li>
    </ol>
    <p>Where the registration number appeared in the publication, the match basis is recorded as NCT ID match. Where the link rests on the criteria above alone, it is recorded as Specifics match, and that label appears beside the outcome in the table.</p>

    <h2>The four outcomes</h2>
    <dl>
      <dt>Results publication located</dt>
      <dd>A publication reporting the trial's results was found and met the matching rule. The reference is linked in the table.</dd>

      <dt>Cited in literature only</dt>
      <dd>The trial is referred to in the literature, for example in a review, a meta analysis or another trial's discussion, but no publication reporting its own results was found. The citing reference is linked so that the reader can judge it.</dd>

      <dt>No results publication located</dt>
      <dd>Both stages of the search were run and no publication meeting the matching rule was found.</dd>

      <dt>Uncertain</dt>
      <dd>A candidate publication exists but the evidence is not strong enough to tie it to this registry record, for example where the registry entry is an umbrella programme record, or where the reported design and sample size are close but not close enough to meet the rule. The candidate is linked and the reasoning is recorded in the data file.</dd>
    </dl>

    <h2>Limitations</h2>
    <div class="panel">
      <p>This is a literature linkage audit. It is not a determination of anyone's legal or regulatory reporting obligation. Which trials fall within a given reporting requirement, and on what timetable, is a separate question that this site does not address.</p>
    </div>
    <ul>
      <li>"No results publication located" means the search described above did not find a results publication. It does not establish that results were never published. A paper can be missed by both stages: it may be in a journal that neither database indexes, in a language or format the queries did not reach, or written up under a description that does not match the registry record closely enough to surface.</li>
      <li>The rows matched on specifics rather than on the registration number rest on design, site and sample size agreement. That is a judgement, not an identity, and those rows are labelled Specifics match so that a reader can weigh them differently.</li>
      <li>Rows marked Uncertain are uncertain. They are neither located nor not located, and they are reported as their own category rather than folded into either.</li>
      <li>The registry record is taken as given. Completion dates, enrolment figures and sponsor names are the registry's, and they are sometimes out of date or incomplete. ${num(stats.missingEnrolment)} of the ${num(stats.registered.count)} registered studies carry no enrolment figure, so participant totals are sums over the trials that report one.</li>
      <li>Results posted to a registry and results published in a journal are different things. A trial can do either, both or neither, and this site reports the two separately rather than combining them into a single score.</li>
      <li>The searches were run on ${longDate(stats.dataDate)}. A publication appearing after that date will not be reflected until the next update.</li>
    </ul>

    <h2>Updates and corrections</h2>
    <p>The dataset is refreshed on a weekly cycle and every change is recorded in a dated changelog in the repository. If you know of a publication this search missed, please tell us: the <a href="/corrections">corrections page</a> explains how.</p>
  </section>
</div>`;
}

function correctionsPage(stats) {
  return `<div class="wrap prose">
  <section class="section">
    <h1>Corrections</h1>
    <p class="lede">If a trial on this site is marked as having no results publication located and you know of the paper, the entry is wrong and we would like to fix it.</p>

    <h2>How to report a missed paper or an error</h2>
    <p>Open an issue in the repository: <a href="${REPO}/issues">${REPO.replace('https://', '')}/issues</a>.</p>
    <p>The most useful report includes:</p>
    <ul>
      <li>the NCT identifier of the trial;</li>
      <li>a link to the publication, ideally a DOI or a PubMed identifier;</li>
      <li>a line on how the publication corresponds to the registry record, for example the matching intervention, design and sample size.</li>
    </ul>
    <p>Errors of any other kind are equally welcome: a wrong completion date, a sponsor name that does not match the registry, a broken link, a miscounted figure, a sentence that reads as an accusation rather than a statement of what was found.</p>

    <h2>How corrections are handled</h2>
    <p>Corrections are applied in public. Each accepted change is recorded in <code>CHANGELOG.md</code> in the repository with the date it was applied, the trials affected and what changed. Nothing is altered quietly. The full history of the dataset is in the repository's commit log, so any figure on this site can be traced back to the data it was computed from.</p>
    <p>Every figure here is recomputed from the data files at build time. Correct the data and the site follows.</p>

    <h2>About</h2>
    <p>ET Trials Tracker is an independent, open data project maintained by Jordan Pitts. The data and the code that builds this site are public in the repository at <a href="${REPO}">${REPO.replace('https://', '')}</a>.</p>
    <p>The project has no funding. It has no affiliation with any trial sponsor, journal or foundation.</p>
    <p class="note">Site data as of ${stats.dataDate}.</p>
  </section>
</div>`;
}

function columnTable(rows) {
  return `    <div class="table-scroll">
      <table class="columns">
        <thead><tr><th scope="col">Column</th><th scope="col">Meaning</th></tr></thead>
        <tbody>
${rows.map(([name, meaning]) => `          <tr><td>${name}</td><td>${meaning}</td></tr>`).join('\n')}
        </tbody>
      </table>
    </div>`;
}

function dataPage(stats) {
  const registryColumns = [
    ['nct_id', 'ClinicalTrials.gov registration number.'],
    ['title', 'Brief title as recorded in the registry.'],
    ['conditions', 'Condition strings as recorded in the registry, separated by semicolons where there is more than one.'],
    ['status', 'Overall recruitment status from the registry, for example COMPLETED, RECRUITING, TERMINATED.'],
    ['phase', 'Trial phase, or NA where the study is not phased, for example a device or behavioural study.'],
    ['start_date', 'Study start date as recorded in the registry.'],
    ['completion_date', 'Study completion date as recorded in the registry. Some records give a year and month only.'],
    ['months_since_completion', `Whole months from the completion date to the data date of ${stats.dataDate}. Blank where no completion date is recorded.`],
    ['enrollment', 'Number of participants as recorded in the registry, actual where available, otherwise the estimate. Blank where the registry gives none. Spelled as the registry spells it.'],
    ['sponsor_name', 'Lead sponsor name, verbatim from the registry.'],
    ['sponsor_class', 'Sponsor class assigned by the registry: INDUSTRY, NIH, FED, OTHER_GOV, OTHER and so on.'],
    ['results_posted', 'yes where the registry record carries a results section, otherwise no.'],
    ['registry_url', 'Link to the study record on ClinicalTrials.gov.'],
  ];

  const publicationColumns = [
    ['nct_id', 'ClinicalTrials.gov registration number, the key back to the registry file.'],
    ['completion_date', 'Completion date carried over from the registry record.'],
    ['due_12m', 'yes where at least twelve months separate the completion date from the data date, no where less. Blank where the registry records no usable completion date.'],
    ['sponsor_class', 'Sponsor class carried over from the registry record.'],
    ['enrollment', 'Enrolment carried over from the registry record. Blank where the registry gives none.'],
    ['classification', 'Outcome of the literature search: FOUND_RESULTS, MENTIONED_ONLY, NOT_FOUND or UNCERTAIN. The four are defined on the method page.'],
    ['match_basis', 'How the publication was tied to the trial: NCT_ID_MATCH where the registration number appears in the paper, SPECIFICS_MATCH where the link rests on design, site and sample size, NONE where no publication was tied to the trial.'],
    ['pmid', 'PubMed identifier of the publication, where there is one.'],
    ['doi', 'Digital object identifier of the publication, where there is one.'],
    ['url_opened', 'The record that was opened and read during the search. Every classification other than NOT_FOUND rests on a page that was read in full.'],
    ['pub_title', 'Title of the publication.'],
    ['pub_year', 'Year of publication.'],
    ['journal', 'Journal, in its indexed abbreviation.'],
    ['rationale', 'A short note recording why the trial was classified as it was, including which matching criteria were met and which were not.'],
    ['registry_url', 'Link to the study record on ClinicalTrials.gov.'],
    ['conditions', 'Condition strings carried over from the registry record. The file carries this column twice, with identical values in each.'],
  ];

  return `<div class="wrap prose">
  <section class="section">
    <h1>Data</h1>
    <p class="lede">Both files are plain comma separated text, UTF-8, with a header row. They are the same files the site is built from. Figures on the site are computed from them at build time, so the files and the site cannot disagree.</p>

    <ul class="downloads">
      <li>
        <a class="file" href="/data/registry_et_trials.csv" download>registry_et_trials.csv</a>
        <span class="desc">${num(stats.registered.count)} rows. Every interventional study on ClinicalTrials.gov whose condition strings contain "essential tremor" or "tremor, essential", one row per study.</span>
      </li>
      <li>
        <a class="file" href="/data/publication_status.csv" download>publication_status.csv</a>
        <span class="desc">${num(stats.trials.length)} rows. The completed trials with no results posted to the registry, one row per trial, with the outcome of the literature search.</span>
      </li>
    </ul>

    <p class="note">Data is released under CC BY 4.0. The code that builds this site is MIT licensed. Both are in the repository at <a href="${REPO}">${REPO.replace('https://', '')}</a>.</p>

    <h2>registry_et_trials.csv</h2>
${columnTable(registryColumns)}

    <h2>publication_status.csv</h2>
${columnTable(publicationColumns)}

    <h2>Joining the two files</h2>
    <p>Every <code>nct_id</code> in <code>publication_status.csv</code> appears in <code>registry_et_trials.csv</code>, and the ${num(stats.trials.length)} rows in the publication file are exactly the rows of the registry file where <code>status</code> is COMPLETED and <code>results_posted</code> is no. Join on <code>nct_id</code> to recover the title and sponsor for each trial.</p>

    <h2>Reproducing the figures</h2>
    <p>Clone the repository and run <code>npm run build</code>. There are no dependencies to install. The build reads the two files, recomputes every number, writes the site into <code>dist/</code>, then recomputes the headline figures a second time and checks them against the built page. If they disagree, the build fails.</p>
  </section>
</div>`;
}

module.exports = { indexPage, methodPage, correctionsPage, dataPage };
