/* Sorting, filtering and the chart tooltip. Plain JS, no framework. */
(function () {
  'use strict';

  var table = document.getElementById('trials');
  if (table) setUpTable(table);

  var bar = document.querySelector('.bar');
  if (bar) setUpTooltip(bar);

  function setUpTable(table) {
    var tbody = table.tBodies[0];
    var rows = Array.prototype.slice.call(tbody.rows);
    var classFilter = document.getElementById('filter-classification');
    var sponsorFilter = document.getElementById('filter-sponsor');
    var readout = document.getElementById('row-count');
    var state = { key: null, dir: 1 };

    Array.prototype.forEach.call(table.tHead.rows[0].cells, function (th) {
      var key = th.getAttribute('data-key');
      if (!key) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.innerHTML = th.textContent + ' <span class="arrow" aria-hidden="true"></span>';
      th.textContent = '';
      th.appendChild(button);
      button.addEventListener('click', function () {
        state.dir = state.key === key ? -state.dir : 1;
        state.key = key;
        sort(th, key);
      });
    });

    function sort(th, key) {
      Array.prototype.forEach.call(table.tHead.rows[0].cells, function (cell) {
        cell.removeAttribute('aria-sort');
        var arrow = cell.querySelector('.arrow');
        if (arrow) arrow.textContent = '';
      });
      th.setAttribute('aria-sort', state.dir === 1 ? 'ascending' : 'descending');
      var arrow = th.querySelector('.arrow');
      if (arrow) arrow.textContent = state.dir === 1 ? '↑' : '↓';

      rows.sort(function (a, b) {
        var x = a.getAttribute('data-' + key) || '';
        var y = b.getAttribute('data-' + key) || '';
        var nx = parseFloat(x);
        var ny = parseFloat(y);
        var cmp;
        if (!isNaN(nx) && !isNaN(ny) && x !== '' && y !== '') cmp = nx - ny;
        else cmp = x.localeCompare(y, 'en-GB');
        return cmp * state.dir;
      });
      rows.forEach(function (row) { tbody.appendChild(row); });
    }

    function applyFilters() {
      var wantClass = classFilter ? classFilter.value : 'all';
      var wantSponsor = sponsorFilter ? sponsorFilter.value : 'all';
      var shown = 0;
      rows.forEach(function (row) {
        var ok = (wantClass === 'all' || row.getAttribute('data-classification') === wantClass) &&
                 (wantSponsor === 'all' || row.getAttribute('data-sponsorclass') === wantSponsor);
        row.hidden = !ok;
        if (ok) shown++;
      });
      if (readout) {
        readout.textContent = shown === rows.length
          ? 'Showing all ' + rows.length + ' trials'
          : 'Showing ' + shown + ' of ' + rows.length + ' trials';
      }
    }

    if (classFilter) classFilter.addEventListener('change', applyFilters);
    if (sponsorFilter) sponsorFilter.addEventListener('change', applyFilters);
    applyFilters();
  }

  function setUpTooltip(bar) {
    var tip = document.createElement('div');
    tip.id = 'tip';
    tip.hidden = true;
    tip.setAttribute('role', 'status');
    document.body.appendChild(tip);

    function show(segment) {
      tip.innerHTML = '<b>' + segment.getAttribute('data-label') + '</b><br>' +
        segment.getAttribute('data-detail');
      tip.hidden = false;
      var box = segment.getBoundingClientRect();
      var top = box.top + window.scrollY - tip.offsetHeight - 8;
      var left = box.left + window.scrollX + box.width / 2 - tip.offsetWidth / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - tip.offsetWidth - 8));
      tip.style.top = top + 'px';
      tip.style.left = left + 'px';
    }

    function hide() { tip.hidden = true; }

    Array.prototype.forEach.call(bar.children, function (segment) {
      segment.addEventListener('mouseenter', function () { show(segment); });
      segment.addEventListener('focus', function () { show(segment); });
      segment.addEventListener('mouseleave', hide);
      segment.addEventListener('blur', hide);
    });
    bar.addEventListener('mouseleave', hide);
    window.addEventListener('scroll', hide, { passive: true });
  }
})();
