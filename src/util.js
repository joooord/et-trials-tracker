'use strict';

// Small shared helpers. Node built-ins only.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Thousands separators without relying on the platform locale data.
function num(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const [whole, fraction] = String(Math.abs(n)).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + grouped + (fraction ? '.' + fraction : '');
}

// 2026-09-18 -> 18 September 2026. 2019-09 -> September 2019.
function longDate(iso) {
  const parts = String(iso).split('-');
  const year = parts[0];
  const month = parts[1] ? MONTHS[Number(parts[1]) - 1] : '';
  const day = parts[2] ? String(Number(parts[2])) : '';
  if (day) return `${day} ${month} ${year}`;
  if (month) return `${month} ${year}`;
  return year;
}

function slug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function percent(part, whole) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

module.exports = { escapeHtml, num, longDate, slug, percent, MONTHS };
