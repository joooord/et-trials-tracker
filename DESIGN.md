# Design rules for ET Trials Tracker

The site has two readers: a person, and a machine acting for a person. Every rule below serves both. Where a rule has a source, the source is named so the rule can be challenged.

## The one idea

State each fact once, in one complete sentence, with its date, in a place a reader will hit first. People scan and lift the first sentence under a heading; answer engines lift self contained sentences that name their subject and their date. The same sentence serves both. (NN/g eyetracking on scanning patterns; the layer cake pattern is the one to design for.)

## For people

**Type.** Body 18px on phones, 19px from 40rem up, never smaller than 16px anywhere, including captions and table cells. Line height 1.55 for body, 1.25 for headings. One type family for everything, the system sans stack, because it is the face people read all day and it costs no download. (GOV.UK type scale: 16px floor, 19px body. Butterick: 15 to 25px on screen, line spacing 120 to 145 per cent.)

**Measure.** Text blocks are 34rem wide at most, about 65 characters. Nothing that is read as prose exceeds it. Tables may be wider but scroll inside their own box. (Butterick: 45 to 90 characters; the middle of that range, not the edge.)

**Contrast.** Near black on off white in light mode, off white on near black in dark mode, both above 12:1 for body text. One accent colour, used for links and for nothing else. Grey text is allowed only for captions and metadata, never for anything a reader needs.

**Sentences.** Average under 20 words. One idea per sentence. Front load: the number or the claim first, the qualification after. Target a reading age of about 12; define every technical term the first time it appears, in the sentence, not in a footnote. No acronym without its expansion on first use on that page. (GOV.UK and Home Office content guidance: write for a reading age of 9 even for specialists; short sentences; define acronyms.)

**Structure.** Headings summarise the section under them so a reader who reads only headings gets the story. The first sentence under every heading is the section in one line. Prose, then table, never table then prose. The limitations sit next to the numbers they limit, not on another page. (NN/g: layer cake scanning; front loading.)

**Numbers.** Every number carries what it counts and the date it was true. Figures are tabular. Participants are always shown beside trial counts because a trial of 5 and a trial of 276 are not the same thing. No number appears in two places with two values.

**Tables.** Real `<table>` with `<th scope>`. On screens under 40rem the table becomes a list of cards, one trial per card, with the same fields, so nothing scrolls sideways. Sorting and filtering are progressive enhancement; the page is complete without JavaScript.

**Nothing decorative.** No hero, no icons, no gradients, no stat tiles, no boxes for the sake of boxes. One thin rule between sections. The chart is a single bar with the numbers written on it, and its legend is also the data.

**Words that are banned.** Unpublished. Hidden. Failed. Buried. Suppressed. Any sentence that reads as an accusation rather than a count. Em dashes.

## For machines

**Semantic HTML.** `<html lang="en-GB">`, one `<h1>`, ordered `<h2>` and `<h3>`, `<main>`, `<nav aria-label>`, `<time datetime>` on every date, `<dfn>` on every term where it is defined, `<abbr title>` on every abbreviation, stable `id` anchors on every trial row (`#NCT01234567`) so any row can be linked to and cited. No content behind JavaScript. (Same practices that serve screen readers serve extractors.)

**A markdown twin of every page.** `/index.md`, `/method.md`, `/data.md`, `/corrections.md`, `/glossary.md`, generated from the same source at build time, so they cannot drift from the HTML. Each HTML page declares `<link rel="alternate" type="text/markdown" href="...">`. (llms.txt specification: serve markdown companions and advertise them with `rel="alternate"`.)

**`/llms.txt`.** In the specified format: an H1 with the site name, a blockquote summary that contains the headline finding and its date, a short body, then H2 file lists linking to the markdown pages and the data files with a one line note each. (llmstxt.org.)

**`/data.json`.** Every computed figure and every trial row as plain JSON, with the data date, so an agent can answer a question without parsing HTML or CSV. Generated at build time from the same CSVs; the check script asserts it agrees with the page.

**Structured data.** JSON-LD on every page. Two `Dataset` objects (one per CSV) with `name`, `description`, `creator`, `license` (CC BY 4.0 URL), `temporalCoverage`, `dateModified`, `measurementTechnique`, `variableMeasured`, `isAccessibleForFree`, and `distribution` as `DataDownload` with `contentUrl` and `encodingFormat`. A `WebSite` and a `WebPage` per page. A `FAQPage` for the questions section. (Google Dataset structured data: `name` and `description` required; distribution, license, temporal coverage recommended.)

**Crawlers.** `/robots.txt` allows everything, and names the AI fleets explicitly so nobody has to guess: GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Google-Extended. `/sitemap.xml` lists every HTML and markdown page with `lastmod`.

**One canonical statement.** The headline finding is written once as a single sentence and reused verbatim in: the first paragraph of the tracker page, `<meta name="description">`, the llms.txt blockquote, the `WebPage.description`, and `data.json`. Agents that read any one of them get the same words.

## Page order for the tracker page

1. Site name and one line strapline.
2. The finding, in one sentence, dated. Then a second sentence saying what it does not mean.
3. The numbers, as four short sentences, not a ledger. Each with trials and participants.
4. The bar, with figures on it.
5. What this shows and what it does not, three sentences, on this page.
6. The trials, as a table on wide screens and cards on narrow ones, with an anchor per trial and the reason for each classification visible, not in a tooltip.
7. Questions people ask, five of them, each answered in two or three sentences. This section carries the FAQPage markup.
8. Footer: data date, repository, licences, how to report a correction.

## What the first build got wrong, measured against this

The opening paragraph was a 46 word definition of the site, not the finding. The headline numbers were a nested ledger with a faint indent rule that reads as decoration. Body text was 16px on phones. The measure was 40rem, about 90 characters, the top of the range. Headings were a different family from body for no reason a reader benefits from. The reason for each classification was a hover tooltip, invisible on a phone and to a keyboard. The table scrolled sideways on a phone. Limitations lived on the method page, away from the numbers they qualify. There was no markdown twin, no llms.txt, no data.json, no structured data, no robots.txt, no sitemap, no anchors per trial, no glossary, no questions section, no `<time>`, no `<dfn>`, no `<abbr>`. It looked like a statistics page and read like one, which is a compliment and not enough.

## Sources

GOV.UK Design System type scale and the 2022 accessibility revision. Home Office design system, written content readability. Butterick, Practical Typography, summary of key rules. Nielsen Norman Group, text scanning patterns from eyetracking. llmstxt.org specification. Google Search Central, Dataset structured data. Cloudflare, Markdown for Agents, and a 44 day log of which agents request markdown.
