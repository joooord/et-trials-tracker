# Changelog

All changes to the dataset are recorded here, newest first, with the date they
were applied.

## 2026-09-18

Initial dataset.

- `data/registry_et_trials.csv`: 192 interventional studies pulled from the
  ClinicalTrials.gov API version 2, every study whose condition strings contain
  "essential tremor" or "tremor, essential", matched without regard to case.
- `data/publication_status.csv`: the 57 completed studies with no results posted
  to the registry, each with the outcome of the two stage literature search
  described in `src/pages.js` and on the method page of the site.
