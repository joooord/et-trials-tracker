# ET Trials Tracker

A public data tracker of results reporting for interventional clinical trials in
essential tremor. It shows every such study registered on ClinicalTrials.gov,
which of the completed ones posted results to the registry, and, for those that
did not, whether a results publication could be located in the literature.

The site presents data and method. It is a literature linkage audit, not a
determination of anyone's reporting obligation, and it singles nobody out.

Live site: deployed from `main` on Vercel.
Repository: <https://github.com/joooord/et-trials-tracker>

## Build

Node 18 or later. There are no dependencies and nothing to install.

```sh
npm run build     # writes dist/, then verifies it
npm run check     # verifies an existing dist/ on its own
```

`build.js` reads `data/*.csv`, computes every figure, and writes into `dist/`:
five HTML pages, a markdown twin of each, the stylesheet, the script, copies of
the two data files, `data.json`, `llms.txt`, `robots.txt` and `sitemap.xml`. It
then runs `check.js`. No statistic anywhere in the site is hard coded: change the
data and the pages follow.

Each page is written once as a list of blocks in `src/pages.js` and rendered
twice, as HTML and as markdown, from the same prepared tree. The two cannot
drift.

`check.js` recomputes the headline figures straight from the CSV files,
independently of the build, and compares them against the numbers present in the
built pages and in `data.json`. It also checks the canonical sentence, the
anchors, the structured data, the markdown twins, the sitemap and the house style
rules. A mismatch fails the build.

The rules the site is built to are in `DESIGN.md`.

## Layout

```
DESIGN.md           the rules the site is built to
build.js            build entry point
check.js            recomputes the figures and verifies the built site
data/               the two source CSV files, the only thing that changes weekly
src/csv.js          RFC 4180 CSV reader
src/util.js         number and date formatting
src/stats.js        every figure on the site, including the canonical sentence
src/glossary.js     every defined term, its definition and its match phrases
src/doc.js          the block model, the glossary linker, the HTML and markdown renderers
src/layout.js       page shell, structured data, header, navigation, footer
src/pages.js        the five page bodies
src/machine.js      data.json, llms.txt, robots.txt, sitemap.xml
src/styles.css      the one stylesheet
src/app.js          table sorting and filtering, added to a page already complete
dist/               build output, not committed
```

## For machines

Every page has a markdown twin at the same path with a `.md` suffix, advertised
in the page head with `rel="alternate"`. `/llms.txt` indexes the site in the
llmstxt.org format. `/data.json` carries every computed figure and every trial
row. Every page carries `WebSite`, `WebPage` and two `Dataset` objects as
JSON-LD, and the tracker page also carries a `FAQPage`. `/robots.txt` allows
every crawler and names the AI fleets explicitly.

## Data

`data/registry_et_trials.csv` holds one row per registered study: registration
number, title, conditions, status, phase, dates, enrolment, sponsor, sponsor
class, whether results were posted to the registry, and the registry link.

`data/publication_status.csv` holds one row per completed study with no results
posted: the classification from the literature search
(`FOUND_RESULTS`, `MENTIONED_ONLY`, `NOT_FOUND`, `UNCERTAIN`), how the
publication was tied to the trial (`NCT_ID_MATCH`, `SPECIFICS_MATCH`, `NONE`),
the reference that was opened and read, and a short rationale.

Join the two on `nct_id`. Every column is described on the site's data page.

## Weekly update

The dataset is refreshed weekly by automated research jobs, which never write to
`main`. Each run:

1. re-pulls the registry with the same condition filter;
2. re-runs the literature search for trials still marked `NOT_FOUND` or
   `UNCERTAIN`, and searches any trial that has newly passed the twelve month
   window;
3. commits only files under `data/`, plus an appended entry in `CHANGELOG.md`,
   to a branch named `bots/weekly-YYYY-MM-DD`;
4. opens a pull request titled `Weekly data update YYYY-MM-DD` summarising the
   changed rows.

A human reviews the diff and merges. Merging to `main` triggers the Vercel
deploy. The full workflow, including the exact commands, is in `BOTS.md`.

## Corrections

If a trial is marked as having no results publication located and the paper
exists, open an issue at
<https://github.com/joooord/et-trials-tracker/issues>. Corrections are applied in
public and recorded in `CHANGELOG.md` with the date they were applied.

## Licence

Data in `data/` is released under Creative Commons Attribution 4.0
International (CC BY 4.0). The code that builds the site is released under the
MIT licence. Both texts are in `LICENSE`.

Trial records are reproduced from ClinicalTrials.gov, a service of the US
National Library of Medicine.

## About

An independent, open data project maintained by Jordan Pitts. No funding. No
affiliation with any trial sponsor, journal or foundation.
