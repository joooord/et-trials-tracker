/* Sorting and filtering for the trials table. Plain JS, no framework.

   Everything here is an addition to a page that is already complete. The
   controls are built by this script, so a reader without JavaScript is never
   shown a control that does nothing. The sort direction is carried by aria-sort
   on the column heading, and the stylesheet draws the arrow from it. */
(function () {
  'use strict';

  var table = document.getElementById('trials');
  var host = document.getElementById('controls');
  if (!table || !table.tBodies.length) return;

  var tbody = table.tBodies[0];
  var rows = Array.prototype.slice.call(tbody.rows);
  var state = { key: null, dir: 1 };
  var readout = null;
  var filters = [];

  buildControls();
  buildSorting();

  function unique(attribute, labelAttribute) {
    var seen = {};
    var list = [];
    rows.forEach(function (row) {
      var value = row.getAttribute(attribute);
      if (!value || seen[value]) return;
      seen[value] = true;
      list.push({ value: value, label: row.getAttribute(labelAttribute) || value });
    });
    return list.sort(function (a, b) { return a.label.localeCompare(b.label, 'en-GB'); });
  }

  function addFilter(id, label, attribute, options, allLabel) {
    var box = document.createElement('div');
    var lab = document.createElement('label');
    lab.setAttribute('for', id);
    lab.textContent = label;
    var select = document.createElement('select');
    select.id = id;
    var all = document.createElement('option');
    all.value = 'all';
    all.textContent = allLabel;
    select.appendChild(all);
    options.forEach(function (option) {
      var node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      select.appendChild(node);
    });
    select.addEventListener('change', apply);
    box.appendChild(lab);
    box.appendChild(select);
    host.appendChild(box);
    filters.push({ select: select, attribute: attribute });
  }

  function buildControls() {
    if (!host) return;
    addFilter('filter-outcome', 'Literature search outcome', 'data-classification',
      unique('data-classification', 'data-outcome'), 'All outcomes');
    addFilter('filter-sponsor', 'Sponsor class', 'data-sponsorclass',
      unique('data-sponsorclass', 'data-sponsorlabel'), 'All sponsor classes');

    readout = document.createElement('p');
    readout.className = 'count';
    readout.id = 'row-count';
    readout.setAttribute('role', 'status');
    host.appendChild(readout);
    apply();
  }

  function apply() {
    var shown = 0;
    rows.forEach(function (row) {
      var ok = filters.every(function (filter) {
        return filter.select.value === 'all' ||
          row.getAttribute(filter.attribute) === filter.select.value;
      });
      row.classList.toggle('is-out', !ok);
      if (ok) shown++;
    });
    if (readout) {
      readout.textContent = shown === rows.length
        ? 'Showing all ' + rows.length + ' trials'
        : 'Showing ' + shown + ' of ' + rows.length + ' trials';
    }
  }

  function buildSorting() {
    Array.prototype.forEach.call(table.tHead.rows[0].cells, function (th) {
      var key = th.getAttribute('data-key');
      if (!key) return;
      var text = th.textContent;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'sort';
      button.textContent = text;
      th.textContent = '';
      th.appendChild(button);
      button.addEventListener('click', function () {
        state.dir = state.key === key ? -state.dir : 1;
        state.key = key;
        sort(th, key);
      });
    });
  }

  function sort(th, key) {
    Array.prototype.forEach.call(table.tHead.rows[0].cells, function (cell) {
      cell.removeAttribute('aria-sort');
    });
    th.setAttribute('aria-sort', state.dir === 1 ? 'ascending' : 'descending');

    rows.sort(function (a, b) {
      var x = a.getAttribute('data-' + key) || '';
      var y = b.getAttribute('data-' + key) || '';
      var nx = parseFloat(x);
      var ny = parseFloat(y);
      if (!isNaN(nx) && !isNaN(ny) && x !== '' && y !== '') return (nx - ny) * state.dir;
      if (x === '' && y !== '') return 1;
      if (y === '' && x !== '') return -1;
      return x.localeCompare(y, 'en-GB') * state.dir;
    });
    rows.forEach(function (row) { tbody.appendChild(row); });
  }
})();
