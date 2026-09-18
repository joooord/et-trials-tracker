# Update workflow for automated research jobs

This file is the contract for the automated jobs that refresh the dataset. It is
written for a bot, and a human reviewer reads it to know what a bot was allowed
to do.

## Rules

1. **Never push to `main`.** All work goes to a branch named
   `bots/weekly-YYYY-MM-DD`, where the date is the data date of the run.
2. **Edit only files under `data/`,** plus an appended entry at the top of the
   dated list in `CHANGELOG.md`. Nothing else.
3. **Never edit `src/`, `build.js`, `check.js`, `package.json`, `vercel.json`,
   `README.md` or this file.** The site's wording and figures are produced by
   that code from the data, so a data change is enough.
4. **Never delete a row.** A trial that leaves the registry filter keeps its row
   and is reported in the pull request so a human can decide. Rows are added and
   fields are updated, nothing is removed.
5. **Never change a classification to a stronger one without a reference.**
   `FOUND_RESULTS` requires `url_opened`, and `match_basis` set to
   `NCT_ID_MATCH` or `SPECIFICS_MATCH`, and a `rationale` naming which of the
   four matching criteria were met.
6. **Open a pull request and stop.** A human reviews the diff and merges.
   Merging to `main` triggers the Vercel deploy.

## What a run does

1. Re-pull the registry from the ClinicalTrials.gov API version 2 using the
   condition filter: interventional studies where any condition string contains
   "essential tremor" or "tremor, essential", matched without regard to case.
   Rewrite `data/registry_et_trials.csv`, recomputing `months_since_completion`
   against the run's data date.
2. Recompute `due_12m` in `data/publication_status.csv` for every row.
3. Add a row to `data/publication_status.csv` for any study that is newly
   COMPLETED with `results_posted` of no.
4. Re-run the two stage literature search, as described on the site's method
   page, for every row classified `NOT_FOUND` or `UNCERTAIN`, and for every row
   added in step 3.
5. Update `data/publication_status.csv` in place for any row whose outcome
   changed, filling `pmid`, `doi`, `url_opened`, `pub_title`, `pub_year`,
   `journal`, `match_basis` and `rationale`.
6. Append an entry to `CHANGELOG.md` under a heading for the run's date, listing
   every changed row by NCT identifier and what changed.
7. Run `npm run build`. If the build or its check fails, do not open a pull
   request: open an issue instead, with the error output.

## Commands

Run these exactly, with `DATE` set to the run's data date in `YYYY-MM-DD` form.

```sh
DATE=$(date -u +%F)

git checkout main
git pull --ff-only origin main
git checkout -b "bots/weekly-$DATE"

# ... the run writes data/*.csv and appends to CHANGELOG.md ...

npm run build          # must succeed, including the check step

git add data/ CHANGELOG.md
git status --porcelain # must list nothing outside data/ and CHANGELOG.md

git commit -m "Weekly data update $DATE" \
           -m "Re-pulled the registry and re-ran the literature search for open rows."

git push -u origin "bots/weekly-$DATE"

gh pr create \
  --base main \
  --head "bots/weekly-$DATE" \
  --title "Weekly data update $DATE" \
  --body-file pr-body.md
```

`git status --porcelain` is a gate, not a formality. If it lists a path outside
`data/` and `CHANGELOG.md`, abandon the branch and open an issue.

## Pull request body

Write `pr-body.md` before calling `gh pr create`. It states, in this order:

1. the data date of the run;
2. counts: studies in the registry pull, completed, completed with results
   posted, completed without, and how many of those are at least twelve months
   past completion;
3. rows added, with NCT identifier, title and why each was added;
4. rows whose classification changed, with the old value, the new value, the
   reference and the rationale;
5. rows whose registry fields changed, with the field and the old and new
   values;
6. rows that left the registry filter, which are kept and flagged for a human;
7. anything the run could not resolve.

Keep the wording factual and use the site's status labels: "Results publication
located", "No results publication located", "Cited in literature only",
"Uncertain".

## Review checklist for the human merging

- The diff touches only `data/` and `CHANGELOG.md`.
- No row was deleted, and the row count did not fall.
- Every row newly classified `FOUND_RESULTS` carries a reference and a
  rationale, and the reference resolves.
- `npm run build` succeeds locally.
- The changelog entry matches the diff.
