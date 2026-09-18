'use strict';

// Minimal RFC 4180 CSV reader. Handles quoted fields containing commas,
// newlines and doubled quotes, and both LF and CRLF line endings.
// Returns { header: [string], rows: [object] }.
// Duplicate column names are tolerated: the last non-empty value wins.

function parseCsv(text) {
  // Strip a UTF-8 byte order mark if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const records = [];
  let field = '';
  let record = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { record.push(field); field = ''; continue; }
    if (c === '\r') { if (text[i + 1] === '\n') i++; records.push(record.concat(field)); record = []; field = ''; continue; }
    if (c === '\n') { records.push(record.concat(field)); record = []; field = ''; continue; }
    field += c;
  }
  if (field !== '' || record.length > 0) records.push(record.concat(field));

  // Drop trailing blank lines.
  while (records.length && records[records.length - 1].every((v) => v === '')) records.pop();
  if (records.length === 0) return { header: [], rows: [] };

  const header = records[0].map((h) => h.trim());
  const rows = records.slice(1).map((cells) => {
    const row = {};
    header.forEach((name, idx) => {
      const value = (cells[idx] === undefined ? '' : cells[idx]).trim();
      if (row[name] === undefined || row[name] === '') row[name] = value;
    });
    return row;
  });

  return { header, rows };
}

module.exports = { parseCsv };
