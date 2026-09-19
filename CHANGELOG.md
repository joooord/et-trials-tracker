# Changelog

All changes to the dataset are recorded here, newest first, with the date they
were applied.

## 2026-09-19

Site change. The data is untouched, and every figure is the one recorded below.

- `static/`: an icon drawn as the letters ET on a near black square, in every
  size a browser asks for, a web manifest, and a 1200 by 630 share image
  carrying the site name, the strapline and one line of explanation. The image
  holds no numbers and no dates, so a weekly data update cannot date it.
- Every page now carries the icon links, the manifest, a theme colour for light
  and dark, Open Graph and Twitter card tags, and a robots tag asking to be
  indexed. The share image is also the `image` of the `WebSite` and `WebPage`
  structured data.
- `check.js` verifies those tags, the presence of every static file, and the
  pixel size of every image the site ships.

## 2026-09-18

Initial dataset.

- `data/registry_et_trials.csv`: 192 interventional studies pulled from the
  ClinicalTrials.gov API version 2, every study whose condition strings contain
  "essential tremor" or "tremor, essential", matched without regard to case.
- `data/publication_status.csv`: the 57 completed studies with no results posted
  to the registry, each with the outcome of the two stage literature search
  described in `src/pages.js` and on the method page of the site.
