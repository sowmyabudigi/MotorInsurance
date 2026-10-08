/* Motor Insurance Desk – app logic (data, store, pages, intro) */
(function () {
  'use strict';

  var MAKES = {
    'Toyota': ['Corolla', 'Yaris', 'RAV4', 'Hilux'],
    'Nissan': ['Versa', 'Sentra', 'Kicks', 'March'],
    'Volkswagen': ['Jetta', 'Vento', 'Tiguan', 'Taos'],
    'Honda': ['Civic', 'City', 'CR-V', 'HR-V'],
    'Mazda': ['Mazda 2', 'Mazda 3', 'CX-30', 'CX-5'],
    'Chevrolet': ['Aveo', 'Onix', 'Tracker', 'Captiva'],
    'Kia': ['Rio', 'Forte', 'Seltos', 'Sportage'],
    'Ford': ['Figo', 'Territory', 'Escape', 'Ranger']
  };
  var CITIES = ['Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai', 'Kochi', 'Delhi'];
  var COVERAGES = ['Comprehensive', 'Limited', 'Third party'];
  var RATES = { 'Comprehensive': 0.045, 'Limited': 0.03, 'Third party': 0.015 };
  var CLAIM_TYPES = ['Collision', 'Theft', 'Glass', 'Hail', 'Flood', 'Vandalism', 'Fire'];
  var POLICY_STATUS = ['Active', 'Pending', 'Expired', 'Cancelled'];
  var CLAIM_STATUS = ['Open', 'Approved', 'Rejected'];

  /* Chart colours (validated reference palette: categorical slots + fixed status steps) */
  var C = {
    blue: '#2a78d6', orange: '#eb6834',
    good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b', neutral: '#898781',
    ink: '#222222', ink2: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7', surface: '#ffffff'
  };
  var STATUS_COLOR = {
    Active: C.good, Pending: C.warning, Expired: C.neutral, Cancelled: C.critical,
    Open: C.warning, Approved: C.good, Rejected: C.critical
  };

  /* ===================================================================
     STORE (localStorage, wrapped so it never breaks the page)
     =================================================================== */
  var KEY = 'motorDesk.v2';
  var db;

  var store = {
    load: function () {
      try { var raw = localStorage.getItem(KEY); if (raw) { db = JSON.parse(raw); return; } } catch (e) {}
      db = seed();
      store.save();
    },
    save: function () { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} db = seed(); store.save(); }
  };

  // Deterministic fictional demo data
  function seed() {
    var r = rng(20261008);
    var names = ['Riya Sharma', 'Arjun Mehta', 'Sneha Reddy', 'Vikram Singh', 'Pooja Nair', 'Ananya Iyer',
      'Rahul Verma', 'Kavya Menon', 'Amit Patel', 'Neha Gupta', 'Karthik Rao', 'Divya Joshi', 'Rohan Das', 'Meera Pillai'];
    var d = { customers: [], policies: [], claims: [], seq: { cust: 0, pol: 1000, clm: 5000 } };
    var today = startOfDay(new Date());

    names.forEach(function (name) {
      var cid = 'C' + pad3(++d.seq.cust);
      d.customers.push({
        id: cid, name: name,
        phone: '98' + String(Math.floor(r() * 1e8)).padStart(8, '0'),
        email: name.toLowerCase().split(' ')[0].normalize('NFD').replace(/[̀-ͯ]/g, '') + '@example.com',
        city: pick(r, CITIES)
      });
      var nPol = 1 + Math.floor(r() * 3);
      for (var i = 0; i < nPol; i++) {
        var make = pick(r, Object.keys(MAKES));
        var year = 2014 + Math.floor(r() * 12);
        var value = Math.round((400000 + r() * 1400000) / 1000) * 1000;
        var coverage = r() < 0.55 ? 'Comprehensive' : (r() < 0.6 ? 'Limited' : 'Third party');
        var start = addDays(today, -Math.floor(r() * 540) + 20);
        var end = addYears(start, 1);
        var status = start > today ? 'Pending'
          : end < today ? 'Expired'
          : (r() < 0.08 ? 'Cancelled' : 'Active');
        var pid = 'POL-' + (++d.seq.pol);
        d.policies.push({
          id: pid, customerId: cid, make: make, model: pick(r, MAKES[make]), year: year,
          plate: plate(r), value: value, coverage: coverage,
          premium: premium(value, coverage, year), start: iso(start), end: iso(end), status: status
        });
        // claims during the policy period
        var nClaims = r() < 0.45 ? 0 : 1 + Math.floor(r() * 2);
        for (var k = 0; k < nClaims; k++) {
          var last = end < today ? end : today;
          if (start >= last) break;
          var cdate = addDays(start, Math.floor(r() * ((last - start) / 864e5)));
          var age = (today - cdate) / 864e5;
          d.claims.push({
            id: 'CLM-' + (++d.seq.clm), policyId: pid, date: iso(cdate),
            type: pick(r, CLAIM_TYPES),
            amount: Math.round((value * (0.005 + r() * 0.035)) / 100) * 100,
            status: age < 30 ? 'Open' : (r() < 0.8 ? 'Approved' : 'Rejected'),
            description: 'Demo claim'
          });
        }
      }
    });
    return d;
  }

  function rng(seedVal) {   // mulberry32
    return function () {
      seedVal |= 0; seedVal = seedVal + 0x6D2B79F5 | 0;
      var t = Math.imul(seedVal ^ seedVal >>> 15, 1 | seedVal);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function plate(r) {
    var L = 'ABCDEFGHJKLMNPRSTUVWXYZ', s = '';
    for (var i = 0; i < 3; i++) s += L.charAt(Math.floor(r() * L.length));
    return s + '-' + String(Math.floor(r() * 1000)).padStart(3, '0') + '-' + L.charAt(Math.floor(r() * L.length));
  }

  function premium(value, coverage, year) {
    var age = Math.max(0, new Date().getFullYear() - year);
    return Math.round(value * RATES[coverage] * (1 + Math.min(age, 10) * 0.02));
  }

  /* ===================================================================
     GENERIC HELPERS
     =================================================================== */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function pad3(n) { return String(n).padStart(3, '0'); }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addYears(d, n) { var x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dmy(s) { var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function parseDMY(s) {
    var m = /^(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{4})$/.exec(s);
    if (!m) return null;
    var d = new Date(+m[3], +m[2] - 1, +m[1]);
    return (d.getDate() === +m[1] && d.getMonth() === +m[2] - 1) ? d : null;
  }
  function money(v) { return '₹' + Math.round(v).toLocaleString('en-IN'); }
  function compact(v) {
    var a = Math.abs(v);
    if (a >= 1e7) return '₹' + (v / 1e7).toFixed(1) + 'Cr';
    if (a >= 1e5) return '₹' + (v / 1e5).toFixed(1) + 'L';
    if (a >= 1e3) return '₹' + Math.round(v / 1e3) + 'K';
    return '₹' + Math.round(v);
  }
  function sum(arr, f) { return arr.reduce(function (s, x) { return s + f(x); }, 0); }
  function by(field, value) { return function (x) { return x[field] === value; }; }

  var $content = document.getElementById('content');
  var $band = document.getElementById('section-band');
  var $bandText = document.getElementById('section-text');

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function slot(name, root) { return (root || $content).querySelector('[data-slot="' + name + '"]'); }
  function clear(name) { var s = slot(name); if (s) s.textContent = ''; }
  function $(id) { return document.getElementById(id); }
  function on(id, ev, fn) { $(id).addEventListener(ev, fn); }
  function val(id) { return $(id).value.trim(); }

  function banner(text, info) {
    var s = slot('banner'); s.textContent = '';
    s.appendChild(el('div', 'pf-msg-banner' + (info ? ' pf-msg-banner--info' : ''), text));
  }
  function msg(text) {
    var s = slot('field-msg'); s.textContent = '';
    s.appendChild(el('p', 'pf-msg-text', text));
  }
  function options(select, list, placeholder) {
    select.textContent = '';
    if (placeholder) { var o = el('option', null, placeholder); o.value = ''; select.appendChild(o); }
    list.forEach(function (item) {
      var opt = el('option', null, typeof item === 'string' ? item : item.label);
      opt.value = typeof item === 'string' ? item : item.value;
      select.appendChild(opt);
    });
  }
  function dataRow(parent, label, value) {
    var row = el('div', 'pf-data-row');
    row.appendChild(el('span', 'pf-data-row__label', label));
    row.appendChild(el('span', null, value));
    parent.appendChild(row);
  }
  function fillTable(tbody, rows, cells, colspan, emptyText) {
    tbody.textContent = '';
    if (!rows.length) {
      var tr = el('tr'), td = el('td', 'pf-msg-empty', emptyText || 'No data found with the selected filter.');
      td.colSpan = colspan; tr.appendChild(td); tbody.appendChild(tr); return;
    }
    rows.forEach(function (row) {
      var tr = el('tr');
      cells.forEach(function (c) {
        var v = c(row);
        var td = el('td');
        if (v instanceof Node) td.appendChild(v); else td.textContent = v;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }
  function link(text, fn) {
    var a = el('a', null, text);
    a.href = '#';
    a.addEventListener('click', function (e) { e.preventDefault(); fn(); });
    return a;
  }

  /* ===================================================================
     DERIVED DATA
     =================================================================== */
  function customerOf(policy) { return db.customers.filter(by('id', policy.customerId))[0]; }
  function policyOf(claim) { return db.policies.filter(by('id', claim.policyId))[0]; }
  function claimsOfPolicies(pols) {
    var ids = pols.map(function (p) { return p.id; });
    return db.claims.filter(function (c) { return ids.indexOf(c.policyId) >= 0; });
  }
  function last12Months() {
    var out = [], t = new Date();
    for (var i = 11; i >= 0; i--) {
      var d = new Date(t.getFullYear(), t.getMonth() - i, 1);
      out.push({ key: d.getFullYear() + '-' + pad(d.getMonth() + 1),
                 label: d.toLocaleString('en-US', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(2) });
    }
    return out;
  }

    function setupPolicyForm() {
    options($('np-customer'), [{ value: '__new', label: 'New customer' }].concat(
      db.customers.slice().sort(function (a, b) { return a.name.localeCompare(b.name); })
        .map(function (c) { return { value: c.id, label: c.name + ' (' + c.id + ')' }; })));
    if (state.newFor) $('np-customer').value = state.newFor;
    options($('np-city'), CITIES, 'Select an option');
    options($('np-make'), Object.keys(MAKES), 'Select an option');
    options($('np-model'), [], 'Select a make first');
    var years = [];
    for (var y = new Date().getFullYear() + 1; y >= 2010; y--) years.push(String(y));
    options($('np-year'), years, 'Select an option');
    options($('np-coverage'), COVERAGES, 'Select an option');
    $('np-start').value = dmy(iso(new Date()));

    function toggleCustomer() {
      var isNew = $('np-customer').value === '__new';
      ['np-name', 'np-phone', 'np-email', 'np-city'].forEach(function (id) { $(id).disabled = !isNew; });
    }
    on('np-customer', 'change', toggleCustomer);
    toggleCustomer();

    on('np-make', 'change', function () {
      var mk = $('np-make').value;
      options($('np-model'), mk ? MAKES[mk] : [], mk ? 'Select an option' : 'Select a make first');
      calc();
    });
    on('np-phone', 'input', function (e) { e.target.value = e.target.value.replace(/\D/g, ''); });
    on('np-value', 'input', function (e) { e.target.value = e.target.value.replace(/\D/g, ''); calc(); });
    on('np-plate', 'input', function (e) { e.target.value = e.target.value.toUpperCase(); });
    on('np-year', 'change', calc);
    on('np-coverage', 'change', calc);

    function calc() {
      var v = parseInt(val('np-value'), 10), cov = $('np-coverage').value, yr = parseInt($('np-year').value, 10);
      slot('premium').textContent = (v && cov && yr) ? money(premium(v, cov, yr)) : '—';
    }
  }

  function savePolicy() {
    clear('banner'); clear('field-msg');
    var custSel = $('np-customer').value;
    var isNew = custSel === '__new';
    var f = {
      name: val('np-name'), phone: val('np-phone'), email: val('np-email'), city: $('np-city').value,
      make: $('np-make').value, model: $('np-model').value, year: parseInt($('np-year').value, 10),
      plate: val('np-plate').toUpperCase(), value: parseInt(val('np-value'), 10),
      coverage: $('np-coverage').value, start: parseDMY(val('np-start'))
    };

    if ((isNew && (!f.name || !f.phone || !f.email || !f.city)) ||
        !f.make || !f.model || !f.year || !f.plate || !f.value || !f.coverage || !val('np-start')) {
      banner('Complete all the required fields.'); return;
    }
    if (isNew && !/^\d{10}$/.test(f.phone)) { msg('*** Enter a 10-digit phone number ***'); return; }
    if (isNew && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { msg('*** Enter a valid email address ***'); return; }
    if (!/^[A-Z0-9]{2,4}-?[A-Z0-9]{2,4}-?[A-Z0-9]{0,2}$/.test(f.plate)) { msg('*** Enter a valid plate (e.g. ABC-123-D) ***'); return; }
    if (db.policies.some(function (p) { return p.plate === f.plate && (p.status === 'Active' || p.status === 'Pending'); })) {
      msg('*** This plate already has an active or pending policy ***'); return;
    }
    if (f.value < 50000 || f.value > 20000000) { msg('*** Insured value must be between ₹50,000 and ₹2,00,00,000 ***'); return; }
    if (!f.start) { msg('*** Enter a valid start date (dd/mm/yyyy) ***'); return; }

    var customerId = custSel;
    if (isNew) {
      customerId = 'C' + pad3(++db.seq.cust);
      db.customers.push({ id: customerId, name: f.name, phone: f.phone, email: f.email, city: f.city });
    }
    var today = startOfDay(new Date());
    var pol = {
      id: 'POL-' + (++db.seq.pol), customerId: customerId, make: f.make, model: f.model, year: f.year,
      plate: f.plate, value: f.value, coverage: f.coverage, premium: premium(f.value, f.coverage, f.year),
      start: iso(f.start), end: iso(addYears(f.start, 1)),
      status: f.start > today ? 'Pending' : addYears(f.start, 1) < today ? 'Expired' : 'Active'
    };
    db.policies.push(pol);
    store.save();
    state.customerId = customerId;
    state.flash = 'Policy ' + pol.id + ' created for ' + f.make + ' ' + f.model + ' (' + f.plate + '). Annual premium ' + money(pol.premium) + '.';
    go('customer');
  }

  function setupClaimForm() {
    var active = db.policies.filter(by('status', 'Active'))
      .filter(function (p) { return !state.newFor || p.customerId === state.newFor; });
    options($('nc-policy'), active.map(function (p) {
      return { value: p.id, label: p.id + ' · ' + p.make + ' ' + p.model + ' · ' + p.plate + ' · ' + customerOf(p).name };
    }), active.length ? 'Select an option' : 'No active policies');
    options($('nc-type'), CLAIM_TYPES, 'Select an option');
    $('nc-date').value = dmy(iso(new Date()));
    on('nc-amount', 'input', function (e) { e.target.value = e.target.value.replace(/\D/g, ''); });
  }

  function saveClaim() {
    clear('banner'); clear('field-msg');
    var pid = $('nc-policy').value, type = $('nc-type').value;
    var amount = parseInt(val('nc-amount'), 10), date = parseDMY(val('nc-date'));
    if (!pid || !type || !amount || !val('nc-date')) { banner('Complete all the required fields.'); return; }
    var pol = db.policies.filter(by('id', pid))[0];
    if (!date) { msg('*** Enter a valid date of incident (dd/mm/yyyy) ***'); return; }
    if (date > new Date() || date < fromIso(pol.start) || date > fromIso(pol.end)) {
      msg('*** The incident date must be within the policy period and not in the future ***'); return;
    }
    if (amount > pol.value) { msg('*** The amount cannot exceed the insured value (' + money(pol.value) + ') ***'); return; }

    var claim = { id: 'CLM-' + (++db.seq.clm), policyId: pid, date: iso(date), type: type,
                  amount: amount, status: 'Open', description: val('nc-desc') };
    db.claims.push(claim);
    store.save();
    state.customerId = pol.customerId;
    state.flash = 'Claim ' + claim.id + ' registered on ' + pid + ' for ' + money(amount) + '. Status: Open.';
    go('customer');
  }

    /* ===================================================================
     UI HELPERS
     =================================================================== */
  var INTRO_KEY = 'motorInsuranceIntroSeen';
  var ICON = {
    dash: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 4a4 4 0 0 1 0 8M22 21c0-3-2-5-5-5.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    car: '<path d="M3 17h18M4 13l2-6h12l2 6v4H4zM7 17v2M17 17v2"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.01"/>',
    pct: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M9 8h6M9 11h6M9 8c4 0 4 5 0 5l5 4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'
  };
  function ic(n) { return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICON[n] + '</svg>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function avatar(name, big) {
    var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    var ini = name.split(' ').map(function (w) { return w.charAt(0); }).slice(0, 2).join('');
    return '<span class="avatar' + (big ? ' avatar--lg' : '') + '" style="--h:' + h + '">' + esc(ini) + '</span>';
  }
  function vtype(p) { var s = 0; for (var i = 0; i < p.plate.length; i++) s += p.plate.charCodeAt(i); return ['Car', 'Car', 'Car', 'Bike', 'Truck', 'Others'][s % 6]; }
  function pill(s) { return '<span class="pill pill--' + s.toLowerCase() + '">' + s + '</span>'; }
  function td(v) { return '<td class="table__td">' + v + '</td>'; }
  function th(list) { return '<thead><tr>' + list.map(function (h) { return '<th class="table__th">' + h + '</th>'; }).join('') + '</tr></thead>'; }
  var toastTimer;
  function toast(t) {
    var n = $('toast'); n.textContent = t; n.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { n.classList.remove('is-on'); }, 3800);
  }
  function countUp(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-count]'), function (n) {
      var to = +n.getAttribute('data-count'), f = n.getAttribute('data-fmt'), t0 = null;
      function fmt(v) { return f === 'money' ? money(v) : f === 'pct' ? v.toFixed(1) + '%' : String(Math.round(v)); }
      function step(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / 800);
        n.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------- charts (plain SVG / CSS, no library) ---------- */
  var COV_COLOR = { 'Comprehensive': '#1d5eff', 'Limited': '#16b364', 'Third party': '#f59e0b' };

  function donut(items, total, label) {
    var cum = 0, segs = '', leg = '';
    items.forEach(function (it, i) {
      var pct = total ? it.value / total * 100 : 0;
      if (pct > 0) segs += '<circle class="donut__seg" cx="50" cy="50" r="38" pathLength="100" stroke="' + it.color + '" stroke-dasharray="' + Math.max(pct - 1, 0.1) + ' ' + (100 - pct + 1) + '" stroke-dashoffset="' + (-cum) + '" style="animation-delay:' + (i * 120) + 'ms"/>';
      cum += pct;
      leg += '<div class="legend__row"><span class="legend__dot" style="--c:' + it.color + '"></span>' + it.label + '<span class="legend__pct">' + Math.round(pct) + '%</span></div>';
    });
    return '<div class="donut"><div class="donut__wrap"><svg class="donut__svg" viewBox="0 0 100 100"><circle class="donut__ring" cx="50" cy="50" r="38"/>' + segs + '</svg>' +
      '<div class="donut__center"><b>' + total + '</b>' + label + '</div></div><div class="legend">' + leg + '</div></div>';
  }

  function lineChart(labels, series) {
    var W = 420, H = 210, L = 32, R = 10, T = 12, B = 28, pw = W - L - R, ph = H - T - B;
    var mx = Math.ceil(Math.max.apply(null, [4].concat(series[0].v)) / 4) * 4;
    function x(i) { return L + pw * i / (labels.length - 1); }
    function y(v) { return T + ph - ph * v / mx; }
    var s = '<svg class="line__svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Claims trend">';
    for (var g = 0; g <= 4; g++) {
      var gy = T + ph * g / 4;
      s += '<line class="line__grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '"/><text class="line__txt" x="' + (L - 6) + '" y="' + (gy + 3) + '" text-anchor="end">' + Math.round(mx - mx * g / 4) + '</text>';
    }
    labels.forEach(function (l, i) { s += '<text class="line__txt" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + l + '</text>'; });
    series.forEach(function (se, k) {
      var d = se.v.map(function (v, i) {
        if (!i) return 'M' + x(0) + ',' + y(v);
        var mid = (x(i - 1) + x(i)) / 2;
        return 'C' + mid + ',' + y(se.v[i - 1]) + ' ' + mid + ',' + y(v) + ' ' + x(i) + ',' + y(v);
      }).join('');
      if (k === 0) s += '<path class="line__area" d="' + d + 'L' + x(labels.length - 1) + ',' + (T + ph) + 'L' + x(0) + ',' + (T + ph) + 'Z" fill="' + se.c + '" fill-opacity=".1"/>';
      s += '<path class="line__path" pathLength="1" d="' + d + '" stroke="' + se.c + '"/>';
      se.v.forEach(function (v, i) {
        s += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3.5" fill="#fff" stroke="' + se.c + '" stroke-width="2"><title>' + se.n + ' · ' + labels[i] + ': ' + v + '</title></circle>';
      });
    });
    return s + '</svg>';
  }

  function bars(items, fmt) {
    var mx = Math.max.apply(null, [1].concat(items.map(function (i) { return i.value; })));
    return '<div class="bars">' + items.map(function (it, i) {
      return '<div class="bars__col"><span class="bars__val">' + fmt(it.value) + '</span><div class="bars__bar" style="--c:' + it.color + ';background:' + it.color + ';height:' + Math.max(4, Math.round(110 * it.value / mx)) + 'px;animation-delay:' + (i * 100) + 'ms"></div>' + it.label + '</div>';
    }).join('') + '</div>';
  }

  var SCENE = '<svg class="hero__scene" viewBox="0 0 600 200" preserveAspectRatio="xMaxYMax slice" aria-hidden="true"><defs><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd089"/><stop offset="1" stop-color="#e0703f" stop-opacity="0"/></linearGradient></defs>' +
    '<circle cx="470" cy="115" r="70" fill="url(#sun)" opacity=".8"/><path d="M0 200v-60l90-50 70 40 80-70 90 80 100-50 170 70v40z" fill="#0f2a63" opacity=".7"/>' +
    '<path d="M180 200 330 135h70l200 65z" fill="#141c38"/><path d="M345 200l30-65" stroke="#f5c26b" stroke-width="2" stroke-dasharray="8 8"/>' +
    '<g fill="#080e20"><rect x="400" y="135" width="96" height="28" rx="10"/><path d="M416 135l14-18h46l14 18z"/><circle cx="425" cy="165" r="10"/><circle cx="476" cy="165" r="10"/></g></svg>';

  /* ===================================================================
     CHROME (sidebar, top bar, tab bar)
     =================================================================== */
  var NAV = [['dashboard', 'dash', 'Dashboard'], ['customer', 'users', 'Customer'], ['new', 'plus', 'New Entry']];

  function buildChrome() {
    $('side-nav').innerHTML = NAV.map(function (n) { return '<a class="nav__link" href="#/' + n[0] + '" data-nav="' + n[0] + '">' + ic(n[1]) + '<span>' + n[2] + '</span></a>'; }).join('');
    $('tabbar').innerHTML = NAV.map(function (n) { return '<a class="tabbar__link" href="#/' + n[0] + '" data-nav="' + n[0] + '">' + ic(n[1]) + '<span>' + n[2] + '</span></a>'; }).join('');
    $('side-foot').innerHTML = '<span class="side__car">' + ic('car') + '</span><span>Drive Safe<br>Stay Covered</span>';
    $('global-search-box').innerHTML = ic('search') + '<input class="search__input" id="global-search" placeholder="Search customers, policies, vehicles..." autocomplete="off">';
    $('top-right').innerHTML = '<button type="button" class="bell" aria-label="Notifications">' + ic('bell') + '<span class="bell__dot"></span></button><div class="user">' + avatar('User Desk') + '<span class="user__name">User</span></div>';

    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-nav]');
      if (!a) return;
      e.preventDefault();
      var name = a.getAttribute('data-nav');
      if (name === 'customer') state.customerId = state.customerId || db.customers[0].id;
      if (name === 'new') state.newFor = null;
      go(name);
    });
    on('global-search', 'input', function (e) {
      dash.search = e.target.value.trim().toLowerCase();
      if (hashName() !== 'dashboard') { go('dashboard'); return; }
      var s = $('search'); if (s) s.value = e.target.value;
      drawCustomers();
    });
  }
  function setPage(name) {
    Array.prototype.forEach.call(document.querySelectorAll('#side-nav [data-nav],#tabbar [data-nav]'), function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-nav') === name);
    });
  }

  /* ===================================================================
     PAGE 1 · DASHBOARD
     =================================================================== */
  var dash = { coverage: 'All', search: '' };
  var state = { customerId: null, newFor: null, flash: null };

  function pageDashboard() {
    setPage('dashboard');
    var covs = ['All'].concat(COVERAGES);
    $content.innerHTML =
      '<section class="hero reveal">' + SCENE + '<div class="hero__tag">Better Coverage<br>for a Safer Tomorrow</div><h1 class="hero__title">Motor Insurance Desk</h1><p class="hero__sub">Smarter coverage. Safer journeys.</p><p class="hero__text">Manage policies, claims and customers — all in one place.</p></section>' +
      '<div class="filter reveal" style="--i:1"><span class="filter__label">Coverage:</span>' + covs.map(function (c) { return '<button type="button" class="chip" data-cov="' + c + '">' + c + '</button>'; }).join('') + '</div>' +
      '<div class="kpis" data-slot="kpis"></div><div class="grid3" data-slot="charts"></div>' +
      '<section class="card reveal" style="--i:5;margin-top:14px"><div class="tools"><h2 class="tools__title">Customers</h2>' +
      '<label class="search" style="max-width:280px">' + ic('search') + '<input class="search__input" id="search" placeholder="Search name or plate..." autocomplete="off"></label>' +
      '<div class="tools__spacer">Coverage<select class="input input--sm" id="cov-select">' + covs.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="table-wrap"><table class="table">' + th(['Customer', 'City', 'Policies', 'Vehicles', 'Annual premium', 'Claims', 'Open claims', 'Status']) + '<tbody data-slot="customers"></tbody></table></div>' +
      '<p class="helper">Select a customer name to open their policies and claims.</p>' +
      '<div class="btnrow"><button type="button" class="btn" id="reset-data">Reset demo data</button><button type="button" class="btn btn--primary" id="new-entry">' + ic('plus') + 'New entry</button></div></section>';

    $('search').value = dash.search;
    on('search', 'input', function (e) { dash.search = e.target.value.trim().toLowerCase(); var g = $('global-search'); if (g) g.value = e.target.value; drawCustomers(); });
    on('cov-select', 'change', function (e) { setCov(e.target.value); });
    Array.prototype.forEach.call($content.querySelectorAll('[data-cov]'), function (b) { b.addEventListener('click', function () { setCov(b.getAttribute('data-cov')); }); });
    on('new-entry', 'click', function () { state.newFor = null; go('new'); });
    on('reset-data', 'click', function () {
      store.reset(); dash.coverage = 'All'; dash.search = ''; state.customerId = null;
      state.flash = 'Demo data has been reset.'; render('dashboard', true);
    });
    $content.querySelector('tbody').addEventListener('click', function (e) {
      var tr = e.target.closest('[data-id]'); if (!tr) return;
      state.customerId = tr.getAttribute('data-id'); go('customer');
    });
    markCov();
    drawDashboard(true);
  }

  function setCov(c) { dash.coverage = c; markCov(); drawDashboard(false); }
  function markCov() {
    Array.prototype.forEach.call($content.querySelectorAll('[data-cov]'), function (b) { b.classList.toggle('is-active', b.getAttribute('data-cov') === dash.coverage); });
    $('cov-select').value = dash.coverage;
  }
  function filteredPolicies() { return db.policies.filter(function (p) { return dash.coverage === 'All' || p.coverage === dash.coverage; }); }

  function drawDashboard(first) {
    var pols = filteredPolicies(), claims = claimsOfPolicies(pols);
    var active = pols.filter(by('status', 'Active')), approved = claims.filter(by('status', 'Approved'));
    var paid = sum(approved, function (c) { return c.amount; });
    var premAll = sum(pols, function (p) { return p.premium; });
    var K = [
      ['file', 'Policies', pols.length, 'int', '↑ 12%', '#16b364'],
      ['check', 'Active', active.length, 'int', '↑ 10%', '#16b364'],
      ['coin', 'Active premium', sum(active, function (p) { return p.premium; }), 'money', '↑ 8%', '#8b5cf6'],
      ['users', 'Active insured', new Set(active.map(function (p) { return p.customerId; })).size, 'int', '↑ 14%', '#1d5eff'],
      ['alert', 'Claims', claims.length, 'int', '↑ 5%', '#ef4444'],
      ['bell', 'Open claims', claims.filter(by('status', 'Open')).length, 'int', '↓ 2%', '#8b5cf6'],
      ['shield', 'Claims approved', approved.length, 'int', '↑ 6%', '#16b364'],
      ['pct', 'Loss ratio', premAll ? paid / premAll * 100 : 0, 'pct', '↓ 4%', '#1d5eff']
    ];
    var delay = first ? 2 : 0;
    slot('kpis').innerHTML = K.map(function (k, i) {
      return '<div class="card card--lift kpi reveal" style="--i:' + (i + delay) + '"><span class="kpi__icon" style="--c:' + k[5] + '">' + ic(k[0]) + '</span><div><div class="kpi__label">' + k[1] + '</div><div class="kpi__value" data-count="' + k[2] + '" data-fmt="' + k[3] + '">0</div><div class="kpi__delta' + (k[4].charAt(0) === '↓' ? ' is-down' : '') + '">' + k[4] + '</div></div></div>';
    }).join('');
    countUp(slot('kpis'));

    var cov = COVERAGES.map(function (c) { return { label: c, value: pols.filter(by('coverage', c)).length, color: COV_COLOR[c] }; });
    var months = last12Months().slice(6);
    var tot = months.map(function (m) { return claims.filter(function (c) { return c.date.slice(0, 7) === m.key; }).length; });
    var apr = months.map(function (m) { return approved.filter(function (c) { return c.date.slice(0, 7) === m.key; }).length; });
    var types = [['Car', '#1d5eff'], ['Bike', '#16b364'], ['Truck', '#f59e0b'], ['Others', '#8b5cf6']].map(function (t) {
      return { label: t[0], color: t[1], value: sum(pols.filter(function (p) { return vtype(p) === t[0]; }), function (p) { return p.premium; }) };
    });
    slot('charts').innerHTML =
      '<section class="card card--lift reveal" style="--i:' + (delay + 3) + '"><h2 class="card__title">Policies by Coverage</h2>' + donut(cov, pols.length, 'Policies') + '</section>' +
      '<section class="card card--lift reveal" style="--i:' + (delay + 4) + '"><div class="cardhead"><h2 class="card__title">Claims Trend</h2><div class="legend legend--inline"><span class="legend__row"><span class="legend__dot" style="--c:#1d5eff"></span>Total claims</span><span class="legend__row"><span class="legend__dot" style="--c:#16b364"></span>Approved</span></div></div>' +
      lineChart(months.map(function (m) { return m.label.split(' ')[0]; }), [{ n: 'Total claims', c: '#1d5eff', v: tot }, { n: 'Approved', c: '#16b364', v: apr }]) + '</section>' +
      '<section class="card card--lift reveal" style="--i:' + (delay + 5) + '"><h2 class="card__title">Premium by Vehicle Type</h2>' + bars(types, compact) + '</section>';
    drawCustomers();
  }

  function drawCustomers() {
    var pols = filteredPolicies();
    var rows = db.customers.map(function (c) {
      var ps = pols.filter(by('customerId', c.id));
      return { c: c, pols: ps, claims: claimsOfPolicies(ps), status: ps.some(by('status', 'Active')) ? 'Active' : ps.some(by('status', 'Pending')) ? 'Pending' : 'Inactive' };
    }).filter(function (r) {
      if (!r.pols.length) return false;
      return !dash.search || r.c.name.toLowerCase().indexOf(dash.search) >= 0 || r.pols.some(function (p) { return p.plate.toLowerCase().indexOf(dash.search) >= 0; });
    }).sort(function (a, b) { return a.c.name.localeCompare(b.c.name); });

    slot('customers').innerHTML = rows.length ? rows.map(function (r, i) {
      return '<tr class="table__row is-click" data-id="' + r.c.id + '" style="--i:' + i + '">' +
        td('<span class="table__name">' + avatar(r.c.name) + esc(r.c.name) + '</span>') + td(esc(r.c.city)) + td(r.pols.length) + td(r.pols.length) +
        td(money(sum(r.pols, function (p) { return p.premium; }))) + td(r.claims.length) + td(r.claims.filter(by('status', 'Open')).length) + td(pill(r.status)) + '</tr>';
    }).join('') : '<tr><td class="pf-msg-empty" colspan="8">No customers match this filter.</td></tr>';
  }

  /* ===================================================================
     PAGE 2 · CUSTOMER DETAILS
     =================================================================== */
  function pageCustomer() {
    var c = db.customers.filter(by('id', state.customerId))[0];
    if (!c) { go('dashboard'); return; }
    setPage('customer');
    var pols = db.policies.filter(by('customerId', c.id));
    var claims = claimsOfPolicies(pols).sort(function (a, b) { return b.date.localeCompare(a.date); });
    var isActive = pols.some(by('status', 'Active'));
    var prem = sum(pols.filter(by('status', 'Active')), function (p) { return p.premium; });
    var covItems = COVERAGES.map(function (v) { return { label: v, value: pols.filter(by('coverage', v)).length, color: COV_COLOR[v] }; });
    var clItems = [['Approved', '#16b364'], ['Open', '#f59e0b'], ['Rejected', '#ef4444']].map(function (s) { return { label: s[0], color: s[1], value: claims.filter(by('status', s[0])).length }; });
    function stat(i, col, label, v) { return '<div class="stat"><span class="stat__icon" style="--c:' + col + '">' + ic(i) + '</span>' + label + '<span class="stat__value">' + v + '</span></div>'; }

    $content.innerHTML =
      '<a class="back reveal" href="#/dashboard" data-nav="dashboard">' + ic('back') + 'Back to Insurance Desk</a><h1 class="page-title reveal">Customer Details</h1>' +
      '<div class="profile reveal" style="--i:1"><section class="card"><div class="profile__main">' + avatar(c.name, true) + '<div><h2 class="profile__name">' + esc(c.name) + pill(isActive ? 'Active' : 'Inactive') + '</h2>' +
      '<p class="profile__line">Customer ID: ' + c.id + '</p><p class="profile__line">' + esc(c.city) + '</p><p class="profile__line">+91 ' + c.phone.slice(0, 5) + ' ' + c.phone.slice(5) + '</p><p class="profile__line">' + esc(c.email) + '</p></div></div></section>' +
      '<section class="card">' + stat('file', '#1d5eff', 'Policies', pols.length) + stat('car', '#8b5cf6', 'Vehicles', pols.length) + stat('coin', '#f59e0b', 'Total premium', money(prem)) + '</section></div>' +
      '<div class="tabs reveal" style="--i:2"><button type="button" class="tab is-active" data-tab="overview">Overview</button><button type="button" class="tab" data-tab="policies">Policies</button><button type="button" class="tab" data-tab="claims">Claims</button></div>' +
      '<div class="grid2 reveal" data-pane="overview" style="--i:3"><section class="card"><h2 class="card__title">Policy coverage</h2>' + donut(covItems, pols.length, 'Policies') + '</section>' +
      '<section class="card"><h2 class="card__title">Claims status</h2>' + bars(clItems, String) + '</section></div>' +
      '<section class="card reveal" data-pane="overview policies" style="--i:4;margin-bottom:14px"><h2 class="card__title">Policies</h2><div class="table-wrap"><table class="table">' +
      th(['Policy', 'Vehicle', 'Plate', 'Coverage', 'Insured value', 'Premium', 'Start', 'End', 'Status']) + '<tbody>' +
      (pols.length ? pols.map(function (p, i) { return '<tr class="table__row" style="--i:' + i + '">' + td(p.id) + td(p.make + ' ' + p.model + ' ' + p.year) + td(p.plate) + td(p.coverage) + td(money(p.value)) + td(money(p.premium)) + td(dmy(p.start)) + td(dmy(p.end)) + td(pill(p.status)) + '</tr>'; }).join('') : '<tr><td class="pf-msg-empty" colspan="9">No policies.</td></tr>') +
      '</tbody></table></div></section>' +
      '<section class="card reveal" data-pane="overview claims" style="--i:5"><h2 class="card__title">Claims</h2><div class="table-wrap"><table class="table">' +
      th(['Claim', 'Policy', 'Date', 'Type', 'Amount', 'Status', 'Action']) + '<tbody>' +
      (claims.length ? claims.map(function (x, i) {
        var act = x.status === 'Open' ? '<a class="link" href="#" data-claim="' + x.id + '" data-set="Approved">Approve</a> · <a class="link link--bad" href="#" data-claim="' + x.id + '" data-set="Rejected">Reject</a>' : '—';
        return '<tr class="table__row" style="--i:' + i + '">' + td(x.id) + td(x.policyId) + td(dmy(x.date)) + td(x.type) + td(money(x.amount)) + td(pill(x.status)) + td(act) + '</tr>';
      }).join('') : '<tr><td class="pf-msg-empty" colspan="7">No claims.</td></tr>') + '</tbody></table></div></section>' +
      '<div class="btnrow"><button type="button" class="btn" id="back">Dashboard</button><button type="button" class="btn btn--primary" id="new-entry">' + ic('plus') + 'New entry</button></div>';

    Array.prototype.forEach.call($content.querySelectorAll('[data-tab]'), function (t) {
      t.addEventListener('click', function () {
        var tab = t.getAttribute('data-tab');
        Array.prototype.forEach.call($content.querySelectorAll('[data-tab]'), function (b) { b.classList.toggle('is-active', b === t); });
        Array.prototype.forEach.call($content.querySelectorAll('[data-pane]'), function (p) { p.classList.toggle('is-hidden', p.getAttribute('data-pane').split(' ').indexOf(tab) < 0); });
      });
    });
    Array.prototype.forEach.call($content.querySelectorAll('[data-claim]'), function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var cl = db.claims.filter(by('id', a.getAttribute('data-claim')))[0];
        cl.status = a.getAttribute('data-set'); store.save();
        state.flash = 'Claim ' + cl.id + ' marked as ' + cl.status + '.'; render('customer', true);
      });
    });
    on('back', 'click', function () { go('dashboard'); });
    on('new-entry', 'click', function () { state.newFor = c.id; go('new'); });
  }

  /* ===================================================================
     PAGE 3 · NEW ENTRY
     =================================================================== */
  function fld(label, id, ctl, full, i) { return '<div class="field' + (full ? ' field--full' : '') + '" style="--i:' + i + '"><label class="field__label" for="' + id + '">' + label + '</label>' + ctl + '</div>'; }
  function inp(id, attrs) { return '<input class="input" id="' + id + '" ' + (attrs || '') + '>'; }
  function sel(id) { return '<select class="input" id="' + id + '"></select>'; }

  function pageNew() {
    setPage('new');
    function choice(id, val, icon, title, sub, on) {
      return '<div><input class="choice__input" type="radio" name="entry-type" id="' + id + '" value="' + val + '"' + (on ? ' checked' : '') + '><label class="choice__card" for="' + id + '"><span class="choice__icon">' + ic(icon) + '</span><span><span class="choice__title">' + title + '</span><br><span class="choice__sub">' + sub + '</span></span></label></div>';
    }
    $content.innerHTML =
      '<a class="back reveal" href="#/dashboard" data-nav="dashboard">' + ic('back') + 'Back to Dashboard</a><h1 class="page-title reveal">New Entry</h1><p class="helper reveal" style="margin-top:-8px">Add a new policy or claim for a customer.</p>' +
      '<div data-slot="banner"></div>' +
      '<div class="choice reveal" style="--i:1">' + choice('type-policy', 'policy', 'file', 'Add Policy', 'Create a new policy for an existing or new customer', true) + choice('type-claim', 'claim', 'alert', 'Add Claim', 'Register a claim for an existing policy', false) + '</div>' +
      '<section class="card reveal" style="--i:2"><div class="form" data-slot="form"></div><div data-slot="field-msg"></div>' +
      '<div class="btnrow"><button type="button" class="btn" id="cancel">Cancel</button><button type="button" class="btn btn--primary" id="save">Save' + ic('chev') + '</button></div></section>';
    Array.prototype.forEach.call($content.querySelectorAll('input[name="entry-type"]'), function (r) { r.addEventListener('change', drawForm); });
    on('cancel', 'click', function () { state.newFor ? go('customer') : go('dashboard'); });
    on('save', 'click', function () { $('type-policy').checked ? savePolicy() : saveClaim(); });
    drawForm();
  }

  function drawForm() {
    clear('banner'); clear('field-msg');
    var isPolicy = $('type-policy').checked;
    slot('form').innerHTML = isPolicy ?
      '<h3 class="form__title">Customer details</h3>' +
      fld('Customer', 'np-customer', sel('np-customer'), true, 0) + fld('Full name', 'np-name', inp('np-name', 'type="text" maxlength="80" placeholder="Enter full name"'), false, 1) +
      fld('Phone', 'np-phone', inp('np-phone', 'type="tel" maxlength="10" inputmode="numeric" placeholder="10-digit mobile"'), false, 2) +
      fld('Email', 'np-email', inp('np-email', 'type="email" maxlength="80" placeholder="name@example.com"'), false, 3) + fld('City', 'np-city', sel('np-city'), false, 4) +
      '<h3 class="form__title">Vehicle and coverage</h3>' +
      fld('Make', 'np-make', sel('np-make'), false, 5) + fld('Model', 'np-model', sel('np-model'), false, 6) + fld('Year', 'np-year', sel('np-year'), false, 7) +
      fld('Plate', 'np-plate', inp('np-plate', 'type="text" maxlength="10" placeholder="e.g. TS09-AB-1234"'), false, 8) +
      fld('Insured value (₹)', 'np-value', inp('np-value', 'type="text" inputmode="numeric" maxlength="9" placeholder="Enter amount"'), false, 9) + fld('Coverage', 'np-coverage', sel('np-coverage'), false, 10) +
      fld('Start date', 'np-start', inp('np-start', 'type="text" maxlength="10" placeholder="dd/mm/yyyy"'), false, 11) +
      '<div class="premium"><span>Calculated annual premium</span><span class="premium__val" data-slot="premium">—</span></div>'
      :
      fld('Policy', 'nc-policy', sel('nc-policy'), true, 0) + fld('Date of incident', 'nc-date', inp('nc-date', 'type="text" maxlength="10" placeholder="dd/mm/yyyy"'), false, 1) +
      fld('Claim type', 'nc-type', sel('nc-type'), false, 2) + fld('Amount claimed (₹)', 'nc-amount', inp('nc-amount', 'type="text" inputmode="numeric" maxlength="9" placeholder="Enter amount"'), false, 3) +
      fld('Description', 'nc-desc', inp('nc-desc', 'type="text" maxlength="120" placeholder="What happened?"'), true, 4) +
      '<p class="helper field--full">Only active policies can receive a claim. The amount cannot exceed the insured value. New claims start as "Open".</p>';
    if (isPolicy) setupPolicyForm(); else setupClaimForm();
  }

  /* ===================================================================
     ROUTER + INTRO
     =================================================================== */
  var routes = { dashboard: pageDashboard, customer: pageCustomer, new: pageNew };
  function hashName() { try { return location.hash.replace('#/', '') || 'dashboard'; } catch (e) { return 'dashboard'; } }
  function setUrl(name, replace) { try { (replace ? history.replaceState : history.pushState).call(history, null, '', '#/' + name); } catch (e) {} }
  function go(name) { render(name, false); }
  function render(name, replace) {
    if (!routes[name]) name = 'dashboard';
    if (name === 'customer' && !state.customerId) name = 'dashboard';
    setUrl(name, replace);
    routes[name]();
    if (state.flash) { toast(state.flash); state.flash = null; }
    try { window.scrollTo(0, 0); } catch (e) {}
  }
  window.addEventListener('popstate', function () { render(hashName(), true); });

  // Dev helper: run resetIntro() in the console (or localStorage.removeItem('motorInsuranceIntroSeen')) and reload.
  window.resetIntro = function () { try { localStorage.removeItem(INTRO_KEY); } catch (e) {} location.reload(); };

  function runIntro(done) {
    var root = document.documentElement, splash = $('splash');
    if (!root.classList.contains('intro-on')) { splash.remove(); done(); return; }
    try { localStorage.setItem(INTRO_KEY, '1'); } catch (e) {}
    setTimeout(function () { splash.classList.add('is-leaving'); root.classList.remove('intro-on'); done(); }, 1700);
    setTimeout(function () { splash.remove(); }, 2300);
  }

  store.load();
  buildChrome();
  runIntro(function () { render(hashName(), true); });
})();
