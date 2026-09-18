'use strict';

// One document model, two renderers.
//
// Every page is an array of blocks. The blocks are prepared once, which parses
// the inline markup and attaches the glossary links, and are then rendered
// twice: as HTML and as markdown. The two cannot drift, because they are the
// same tree.
//
// Inline markup used in the page sources:
//   [label](/href)        link
//   `code`                code
//   **strong**            strong
//   {t:2026-09-18|18 September 2026}   <time datetime="...">
//   {a:NCT|expansion}     <abbr title="expansion">NCT</abbr>
//   {d:slug|label}        <dfn id="slug">label</dfn>

const { escapeHtml } = require('./util');
const { matchers } = require('./glossary');

const MD_PAGES = {
  '/': '/index.md',
  '/method': '/method.md',
  '/data': '/data.md',
  '/corrections': '/corrections.md',
  '/glossary': '/glossary.md',
};

const TOKEN = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\{([tad]):([^|}]+)\|([^}]*)\}/g;

// 1. Parse the inline markup into nodes.

function tokenise(text) {
  const nodes = [];
  let last = 0;
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) nodes.push({ type: 'text', value: text.slice(last, m.index) });
    if (m[1] !== undefined) nodes.push({ type: 'link', label: m[1], href: m[2] });
    else if (m[3] !== undefined) nodes.push({ type: 'code', value: m[3] });
    else if (m[4] !== undefined) nodes.push({ type: 'strong', value: m[4] });
    else if (m[5] === 't') nodes.push({ type: 'time', datetime: m[6], label: m[7] });
    else if (m[5] === 'a') nodes.push({ type: 'abbr', label: m[6], title: m[7] });
    else if (m[5] === 'd') nodes.push({ type: 'dfn', slug: m[6], label: m[7] });
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push({ type: 'text', value: text.slice(last) });
  return nodes;
}

// 2. Link the first use of every glossary term, in document order.

const PHRASES = matchers();

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function linkTerms(nodes, state) {
  const out = [];
  nodes.forEach((node) => {
    if (node.type !== 'text') { out.push(node); return; }
    let rest = node.value;
    let guard = 0;
    while (rest && guard++ < 40) {
      let best = null;
      PHRASES.forEach((entry) => {
        if (state.linked.has(entry.slug)) return;
        const re = new RegExp('\\b' + escapeRe(entry.phrase) + '\\b', 'i');
        const hit = re.exec(rest);
        if (!hit) return;
        if (!best || hit.index < best.index ||
          (hit.index === best.index && hit[0].length > best.text.length)) {
          best = { index: hit.index, text: hit[0], slug: entry.slug, abbr: entry.abbr };
        }
      });
      if (!best) break;
      if (best.index > 0) out.push({ type: 'text', value: rest.slice(0, best.index) });
      out.push({
        type: 'link', label: best.text, href: '/glossary#' + best.slug,
        abbr: best.abbr && best.text.indexOf(best.abbr[0]) === 0 ? best.abbr : null,
      });
      state.linked.add(best.slug);
      rest = rest.slice(best.index + best.text.length);
    }
    if (rest) out.push({ type: 'text', value: rest });
  });
  return out;
}

function inline(text, state, autolink) {
  const nodes = tokenise(String(text));
  return autolink && state.autolink ? linkTerms(nodes, state) : nodes;
}

// 3. Prepare a page.

function prepare(blocks, options) {
  const state = { linked: new Set(), autolink: options.autolink !== false };
  return blocks.map((block) => prepareBlock(block, state));
}

function prepareBlock(block, state) {
  const b = Object.assign({}, block);
  switch (block.t) {
    case 'h1': case 'h2': case 'h3':
      b.nodes = inline(block.text, state, false);
      return b;
    case 'p': case 'note': case 'finding':
      b.nodes = inline(block.text, state, block.plain !== true);
      return b;
    case 'ul': case 'ol':
      b.nodes = block.items.map((item) => inline(item, state, true));
      return b;
    case 'dl':
      b.nodes = block.items.map(([term, def]) => ({
        term: inline(term, state, false),
        def: (Array.isArray(def) ? def : [def]).map((d) => inline(d, state, true)),
      }));
      return b;
    case 'table':
      b.captionNodes = block.caption ? inline(block.caption, state, false) : null;
      b.rowNodes = block.rows.map((row) => row.map((cell) => inline(cell, state, false)));
      return b;
    case 'faq':
      b.nodes = block.items.map((item) => ({
        q: item.q,
        a: item.a,
        qNodes: inline(item.q, state, false),
        aNodes: item.a.map((para) => inline(para, state, true)),
      }));
      return b;
    default:
      return b;
  }
}

// 4. Render as HTML.

function htmlInline(nodes) {
  return nodes.map((n) => {
    switch (n.type) {
      case 'text': return escapeHtml(n.value);
      case 'link': return `<a href="${escapeHtml(n.href)}">${n.abbr
        ? `<abbr title="${escapeHtml(n.abbr[1])}">${escapeHtml(n.abbr[0])}</abbr>` +
          escapeHtml(n.label.slice(n.abbr[0].length))
        : escapeHtml(n.label)}</a>`;
      case 'code': return `<code>${escapeHtml(n.value)}</code>`;
      case 'strong': return `<strong>${escapeHtml(n.value)}</strong>`;
      case 'time': return `<time datetime="${escapeHtml(n.datetime)}">${escapeHtml(n.label)}</time>`;
      case 'abbr': return `<abbr title="${escapeHtml(n.title)}">${escapeHtml(n.label)}</abbr>`;
      case 'dfn': return `<dfn id="${escapeHtml(n.slug)}">${escapeHtml(n.label)}</dfn>`;
      default: return '';
    }
  }).join('');
}

function toHtml(blocks) {
  return blocks.map((b) => {
    switch (b.t) {
      case 'h1': return `<h1>${htmlInline(b.nodes)}</h1>`;
      case 'h2': return `<h2${b.id ? ` id="${escapeHtml(b.id)}"` : ''}>${htmlInline(b.nodes)}</h2>`;
      case 'h3': return `<h3${b.id ? ` id="${escapeHtml(b.id)}"` : ''}>${htmlInline(b.nodes)}</h3>`;
      case 'p': return `<p${b.cls ? ` class="${escapeHtml(b.cls)}"` : ''}>${htmlInline(b.nodes)}</p>`;
      case 'finding': return `<p class="finding">${htmlInline(b.nodes)}</p>`;
      case 'note': return `<p class="note">${htmlInline(b.nodes)}</p>`;
      case 'ul': return `<ul>\n${b.nodes.map((n) => `  <li>${htmlInline(n)}</li>`).join('\n')}\n</ul>`;
      case 'ol': return `<ol>\n${b.nodes.map((n) => `  <li>${htmlInline(n)}</li>`).join('\n')}\n</ol>`;
      case 'dl': return `<dl>\n${b.nodes.map((item) =>
        `  <dt>${htmlInline(item.term)}</dt>\n` +
        item.def.map((d) => `  <dd>${htmlInline(d)}</dd>`).join('\n')).join('\n')}\n</dl>`;
      case 'table': return htmlTable(b);
      case 'faq': return htmlFaq(b);
      case 'raw': return b.html;
      default: return '';
    }
  }).join('\n\n');
}

function htmlTable(b) {
  const head = b.head.map((h) => {
    const cls = h.cls ? ` class="${h.cls}"` : '';
    return `<th scope="col"${cls}>${escapeHtml(h.text || h)}</th>`;
  }).join('');
  const labels = b.head.map((h) => h.text || h);
  const rows = b.rowNodes.map((row) => {
    const cells = row.map((cell, i) => {
      const spec = b.head[i] || {};
      const cls = spec.cls ? ` class="${spec.cls}"` : '';
      return `<td${cls}><span class="cell-label">${escapeHtml(labels[i])}</span>` +
        `<span class="cell-value">${htmlInline(cell)}</span></td>`;
    }).join('');
    return `      <tr>${cells}</tr>`;
  }).join('\n');
  return `<div class="table-box">
  <table class="rt ${b.cls || 'grid'}">
${b.captionNodes ? `    <caption>${htmlInline(b.captionNodes)}</caption>\n` : ''}    <thead>
      <tr>${head}</tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</div>`;
}

function htmlFaq(b) {
  return b.nodes.map((item) =>
    `<h3 id="${escapeHtml(item.slug || slugOf(item.q))}">${htmlInline(item.qNodes)}</h3>\n` +
    item.aNodes.map((a) => `<p>${htmlInline(a)}</p>`).join('\n')).join('\n\n');
}

function slugOf(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

// 5. Render as markdown.

function mdHref(href) {
  const [path, fragment] = href.split('#');
  const mapped = MD_PAGES[path];
  if (!mapped) return href;
  return mapped + (fragment ? '#' + fragment : '');
}

function mdText(value, inCell) {
  let out = String(value).replace(/([*_`])/g, '\\$1');
  if (inCell) out = out.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
  return out;
}

function mdInline(nodes, inCell) {
  return nodes.map((n) => {
    switch (n.type) {
      case 'text': return mdText(n.value, inCell);
      case 'link': return `[${mdText(n.label, inCell)}](${mdHref(n.href)})`;
      case 'code': return '`' + n.value + '`';
      case 'strong': return `**${mdText(n.value, inCell)}**`;
      case 'time': return mdText(n.label, inCell);
      case 'abbr': return mdText(n.label, inCell);
      case 'dfn': return `**${mdText(n.label, inCell)}**`;
      default: return '';
    }
  }).join('');
}

function toMd(blocks) {
  return blocks.map((b) => {
    switch (b.t) {
      case 'h1': return `# ${mdInline(b.nodes)}`;
      case 'h2': return `## ${mdInline(b.nodes)}`;
      case 'h3': return `### ${mdInline(b.nodes)}`;
      case 'p': case 'finding': case 'note': return mdInline(b.nodes);
      case 'ul': return b.nodes.map((n) => `- ${mdInline(n)}`).join('\n');
      case 'ol': return b.nodes.map((n, i) => `${i + 1}. ${mdInline(n)}`).join('\n');
      case 'dl': return b.nodes.map((item) => {
        // A term marked with <dfn> is already bold in markdown; do not double it.
        const term = mdInline(item.term);
        return (term.startsWith('**') ? term : `**${term}**`) + '\n\n' +
          item.def.map((d) => mdInline(d)).join('\n\n');
      }).join('\n\n');
      case 'table': return mdTable(b);
      case 'faq': return b.nodes.map((item) =>
        `### ${mdInline(item.qNodes)}\n\n` +
        item.aNodes.map((a) => mdInline(a)).join('\n\n')).join('\n\n');
      case 'raw': return b.md;
      default: return '';
    }
  }).filter(Boolean).join('\n\n');
}

function mdTable(b) {
  const labels = b.head.map((h) => h.text || h);
  const lines = [];
  if (b.captionNodes) lines.push(mdInline(b.captionNodes), '');
  lines.push('| ' + labels.map((l) => mdText(l, true)).join(' | ') + ' |');
  lines.push('| ' + labels.map(() => '---').join(' | ') + ' |');
  b.rowNodes.forEach((row) => {
    lines.push('| ' + row.map((cell) => mdInline(cell, true) || ' ').join(' | ') + ' |');
  });
  return lines.join('\n');
}

// Plain text, for the JSON-LD answers and the meta description.
function plain(nodes) {
  return nodes.map((n) => {
    if (n.type === 'text') return n.value;
    if (n.type === 'code' || n.type === 'strong') return n.value;
    return n.label || '';
  }).join('');
}

module.exports = { prepare, toHtml, toMd, tokenise, plain, slugOf, mdHref };
