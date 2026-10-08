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
  var COV_COLOR = { 'Comprehensive': '#1d5eff', 'Limited': '#16b364', 'Third party': '#f59e0b' };

  var KEY = 'motorDesk.v2';
  var db;

  var store = {
    load: function () {
      try {
        var raw = localStorage.getItem(KEY);

        if (raw) {
          db = JSON.parse(raw);

          if (typeof db.seen !== 'number') {
            db.seen = 0;
          }

          return;
        }
      } catch (e) {}

      db = seed();
      store.save();
    },

    save: function () {
      try {
        localStorage.setItem(KEY, JSON.stringify(db));
      } catch (e) {}
    },

    reset: function () {
      try {
        localStorage.removeItem(KEY);
      } catch (e) {}

      db = seed();
      store.save();
    }
  };

  function seed() {
    var r = rng(20261008);

    var names = [
      'Riya Sharma', 'Arjun Mehta', 'Sneha Reddy', 'Vikram Singh', 'Pooja Nair',
      'Ananya Iyer', 'Rahul Verma', 'Kavya Menon', 'Amit Patel', 'Neha Gupta',
      'Karthik Rao', 'Divya Joshi', 'Rohan Das', 'Meera Pillai'
    ];

    var d = {
      customers: [],
      policies: [],
      claims: [],
      seen: 0,
      seq: { cust: 0, pol: 1000, clm: 5000 }
    };

    var today = startOfDay(new Date());

    names.forEach(function (name) {
      var cid = 'C' + pad3(++d.seq.cust);

      d.customers.push({
        id: cid,
        name: name,
        phone: '98' + String(Math.floor(r() * 1e8)).padStart(8, '0'),
        email: name.toLowerCase().split(' ')[0] + '@example.com',
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
        var status;

        if (start > today) {
          status = 'Pending';
        } else if (end < today) {
          status = 'Expired';
        } else {
          status = r() < 0.08 ? 'Cancelled' : 'Active';
        }

        var pid = 'POL-' + (++d.seq.pol);

        d.policies.push({
          id: pid,
          customerId: cid,
          make: make,
          model: pick(r, MAKES[make]),
          year: year,
          plate: plate(r),
          value: value,
          coverage: coverage,
          premium: premium(value, coverage, year),
          start: iso(start),
          end: iso(end),
          status: status
        });

        var nClaims = r() < 0.45 ? 0 : 1 + Math.floor(r() * 2);

        for (var k = 0; k < nClaims; k++) {
          var last = end < today ? end : today;

          if (start >= last) {
            break;
          }

          var cdate = addDays(start, Math.floor(r() * ((last - start) / 864e5)));
          var age = (today - cdate) / 864e5;

          d.claims.push({
            id: 'CLM-' + (++d.seq.clm),
            policyId: pid,
            date: iso(cdate),
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

  function rng(seedVal) {
    return function () {
      seedVal |= 0;
      seedVal = seedVal + 0x6D2B79F5 | 0;

      var t = Math.imul(seedVal ^ seedVal >>> 15, 1 | seedVal);

      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;

      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function pick(r, arr) {
    return arr[Math.floor(r() * arr.length)];
  }

  function plate(r) {
    var letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
    var text = '';

    for (var i = 0; i < 3; i++) {
      text += letters.charAt(Math.floor(r() * letters.length));
    }

    return text + '-' + String(Math.floor(r() * 1000)).padStart(3, '0') + '-' + letters.charAt(Math.floor(r() * letters.length));
  }

  function premium(value, coverage, year) {
    var age = Math.max(0, new Date().getFullYear() - year);

    return Math.round(value * RATES[coverage] * (1 + Math.min(age, 10) * 0.02));
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function pad3(n) {
    return String(n).padStart(3, '0');
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function addDays(d, n) {
    var x = new Date(d);

    x.setDate(x.getDate() + n);

    return x;
  }

  function addYears(d, n) {
    var x = new Date(d);

    x.setFullYear(x.getFullYear() + n);

    return x;
  }

  function iso(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function fromIso(s) {
    var p = s.split('-');

    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function dmy(s) {
    var p = s.split('-');

    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function parseDMY(s) {
    var m = /^(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{4})$/.exec(s);

    if (!m) {
      return null;
    }

    var d = new Date(+m[3], +m[2] - 1, +m[1]);

    return (d.getDate() === +m[1] && d.getMonth() === +m[2] - 1) ? d : null;
  }

  function daysLeft(policy) {
    return Math.ceil((fromIso(policy.end) - startOfDay(new Date())) / 864e5);
  }

  function statusFor(start) {
    return start > startOfDay(new Date()) ? 'Pending' : 'Active';
  }

  function money(v) {
    return '₹' + Math.round(v).toLocaleString('en-IN');
  }

  function compact(v) {
    var a = Math.abs(v);

    if (a >= 1e7) {
      return '₹' + (v / 1e7).toFixed(1) + 'Cr';
    }

    if (a >= 1e5) {
      return '₹' + (v / 1e5).toFixed(1) + 'L';
    }

    if (a >= 1e3) {
      return '₹' + Math.round(v / 1e3) + 'K';
    }

    return '₹' + Math.round(v);
  }

  function sum(arr, f) {
    return arr.reduce(function (total, x) {
      return total + f(x);
    }, 0);
  }

  function by(field, value) {
    return function (x) {
      return x[field] === value;
    };
  }

  var $content = document.getElementById('content');

  function el(tag, cls, text) {
    var n = document.createElement(tag);

    if (cls) {
      n.className = cls;
    }

    if (text != null) {
      n.textContent = text;
    }

    return n;
  }

  function slot(name, root) {
    return (root || $content).querySelector('[data-slot="' + name + '"]');
  }

  function clear(name) {
    var s = slot(name);

    if (s) {
      s.textContent = '';
    }
  }

  function $(id) {
    return document.getElementById(id);
  }

  function on(id, ev, fn) {
    $(id).addEventListener(ev, fn);
  }

  function val(id) {
    return $(id).value.trim();
  }

  function banner(text, info) {
    var s = slot('banner');

    s.textContent = '';
    s.appendChild(el('div', 'pf-msg-banner' + (info ? ' pf-msg-banner--info' : ''), text));
  }

  function msg(text) {
    var s = slot('field-msg');

    s.textContent = '';
    s.appendChild(el('p', 'pf-msg-text', text));
  }

  function options(select, list, placeholder) {
    select.textContent = '';

    if (placeholder) {
      var first = el('option', null, placeholder);

      first.value = '';
      select.appendChild(first);
    }

    list.forEach(function (item) {
      var opt = el('option', null, typeof item === 'string' ? item : item.label);

      opt.value = typeof item === 'string' ? item : item.value;
      select.appendChild(opt);
    });
  }

  function yearList() {
    var years = [];

    for (var y = new Date().getFullYear() + 1; y >= 2010; y--) {
      years.push(String(y));
    }

    return years;
  }

  function customerOf(policy) {
    return db.customers.filter(by('id', policy.customerId))[0];
  }

  function policyOf(claim) {
    return db.policies.filter(by('id', claim.policyId))[0];
  }

  function claimsOfPolicies(pols) {
    var ids = pols.map(function (p) {
      return p.id;
    });

    return db.claims.filter(function (c) {
      return ids.indexOf(c.policyId) >= 0;
    });
  }

  function last12Months() {
    var out = [];
    var t = new Date();

    for (var i = 11; i >= 0; i--) {
      var d = new Date(t.getFullYear(), t.getMonth() - i, 1);

      out.push({
        key: d.getFullYear() + '-' + pad(d.getMonth() + 1),
        label: d.toLocaleString('en-US', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(2)
      });
    }

    return out;
  }

  function ic(n, white, cls) {
    return '<img class="icon' + (white ? ' icon--white' : '') + (cls ? ' ' + cls : '') + '" src="images/icons/' + n + '.png" alt="">';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function avatar(name, big) {
    var h = 0;

    for (var i = 0; i < name.length; i++) {
      h = (h * 31 + name.charCodeAt(i)) % 360;
    }

    var initials = name.split(' ').map(function (w) {
      return w.charAt(0);
    }).slice(0, 2).join('');

    return '<span class="avatar' + (big ? ' avatar--lg' : '') + '" style="--h:' + h + '">' + esc(initials) + '</span>';
  }

  function vtype(p) {
    var s = 0;

    for (var i = 0; i < p.plate.length; i++) {
      s += p.plate.charCodeAt(i);
    }

    return ['Car', 'Car', 'Car', 'Bike', 'Truck', 'Others'][s % 6];
  }

  function pill(s) {
    return '<span class="pill pill--' + s.toLowerCase() + '">' + s + '</span>';
  }

  function td(v) {
    return '<td class="table__td">' + v + '</td>';
  }

  function th(list) {
    return '<thead><tr>' + list.map(function (h) {
      return '<th class="table__th">' + h + '</th>';
    }).join('') + '</tr></thead>';
  }

  var toastTimer;

  function toast(text) {
    var n = $('toast');

    n.textContent = text;
    n.classList.add('is-on');

    clearTimeout(toastTimer);

    toastTimer = setTimeout(function () {
      n.classList.remove('is-on');
    }, 3800);
  }

  var kpiPrev = {};

  function countUp(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-count]'), function (n) {
      var to = +n.getAttribute('data-count');
      var from = +n.getAttribute('data-from') || 0;
      var type = n.getAttribute('data-fmt');
      var t0 = null;

      function fmt(v) {
        if (type === 'money') {
          return money(v);
        }

        if (type === 'pct') {
          return v.toFixed(1) + '%';
        }

        return String(Math.round(v));
      }

      function step(t) {
        if (t0 === null) {
          t0 = t;
        }

        var p = Math.min(1, (t - t0) / 800);
        var eased = 1 - Math.pow(1 - p, 3);

        n.textContent = fmt(from + (to - from) * eased);

        if (p < 1) {
          requestAnimationFrame(step);
        }
      }

      n.textContent = fmt(from);
      requestAnimationFrame(step);
    });
  }

  var modalReturn = null;

  function openModal(opts) {
    $('modal-title').textContent = opts.title;

    var body = $('modal-body');

    body.textContent = '';

    if (typeof opts.body === 'string') {
      body.innerHTML = opts.body;
    } else {
      body.appendChild(opts.body);
    }

    var actions = $('modal-actions');

    actions.textContent = '';

    opts.actions.forEach(function (a) {
      var cls = 'btn' + (a.primary ? ' btn--primary' : '') + (a.danger ? ' btn--danger' : '');
      var b = el('button', cls, a.label);

      b.type = 'button';

      b.addEventListener('click', function () {
        if (a.onClick && a.onClick() === false) {
          return;
        }

        closeModal();
      });

      actions.appendChild(b);
    });

    modalReturn = document.activeElement;

    $('modal').classList.add('is-open');
    $('modal').setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('is-locked');

    if (opts.onOpen) {
      opts.onOpen();
    }

    var firstField = $('modal-body').querySelector('select, input, button');

    if (firstField) {
      setTimeout(function () {
        firstField.focus({ preventScroll: true });
      }, 60);
    }
  }

  function closeModal() {
    $('modal').classList.remove('is-open');
    $('modal').setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('is-locked');

    if (modalReturn && modalReturn.focus) {
      modalReturn.focus({ preventScroll: true });
    }

    modalReturn = null;
  }

  function donut(items, total, label) {
    var cum = 0;
    var stops = [];
    var legend = '';

    items.forEach(function (it) {
      var pct = total ? it.value / total * 100 : 0;

      if (pct > 0) {
        stops.push(it.color + ' ' + cum + '% ' + (cum + pct) + '%');
      }

      cum += pct;

      legend +=
        '<div class="legend__row">' +
        '<span class="legend__dot" style="--c:' + it.color + '"></span>' +
        it.label +
        '<span class="legend__pct">' + Math.round(pct) + '%</span>' +
        '</div>';
    });

    if (!stops.length) {
      stops.push('#eef2fb 0% 100%');
    }

    return '<div class="donut">' +
      '<div class="donut__wrap">' +
      '<div class="donut__ring" style="background:conic-gradient(' + stops.join(',') + ')"></div>' +
      '<div class="donut__hole"><b>' + total + '</b>' + label + '</div>' +
      '</div>' +
      '<div class="legend">' + legend + '</div>' +
      '</div>';
  }

  function ring(pct, color, big, small) {
    return '<div class="donut__wrap">' +
      '<div class="donut__ring" style="background:conic-gradient(' + color + ' 0% ' + pct + '%,#eef2fb ' + pct + '% 100%)"></div>' +
      '<div class="donut__hole"><b>' + big + '</b>' + small + '</div>' +
      '</div>';
  }

  var lineData = null;
  var lineToken = 0;
  var lineObserver = null;
  var lineWidth = 0;

  function lineChart(labels, series) {
    lineData = { labels: labels, series: series };

    return '<canvas class="line__canvas" id="line-canvas"></canvas>';
  }

  function watchLine() {
    if (lineObserver) {
      lineObserver.disconnect();
      lineObserver = null;
    }

    var cv = $('line-canvas');

    if (!cv || !window.ResizeObserver) {
      return;
    }

    var holder = cv.parentNode;

    lineWidth = holder.clientWidth;

    lineObserver = new ResizeObserver(function () {
      var w = holder.clientWidth;

      if (Math.abs(w - lineWidth) < 2) {
        return;
      }

      lineWidth = w;
      paintLine(false);
    });

    lineObserver.observe(holder);
  }

  function paintLine(animate) {
    var cv = $('line-canvas');

    if (!cv || !lineData) {
      return;
    }

    var token = ++lineToken;
    var dpr = window.devicePixelRatio || 1;
    var W = cv.clientWidth || 420;
    var H = W < 380 ? 180 : 210;

    cv.style.height = H + 'px';
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);

    var g = cv.getContext('2d');

    g.scale(dpr, dpr);

    var labels = lineData.labels;
    var series = lineData.series;
    var L = 32;
    var R = 10;
    var T = 12;
    var B = 28;
    var pw = W - L - R;
    var ph = H - T - B;
    var t0 = null;
    var skip = pw / labels.length < 38 ? 2 : 1;
    var mx = Math.ceil(Math.max.apply(null, [4].concat(series[0].v)) / 4) * 4;

    function x(i) {
      return L + pw * i / (labels.length - 1);
    }

    function y(v) {
      return T + ph - ph * v / mx;
    }

    function trace(se) {
      g.beginPath();

      se.v.forEach(function (v, i) {
        if (!i) {
          g.moveTo(x(0), y(v));
          return;
        }

        var m = (x(i - 1) + x(i)) / 2;

        g.bezierCurveTo(m, y(se.v[i - 1]), m, y(v), x(i), y(v));
      });
    }

    function frame(t) {
      if (token !== lineToken) {
        return;
      }

      if (t0 === null) {
        t0 = t;
      }

      var p = animate ? Math.min(1, (t - t0) / 1100) : 1;

      p = 1 - Math.pow(1 - p, 3);

      g.clearRect(0, 0, W, H);
      g.font = '10px sans-serif';
      g.fillStyle = '#7a89ad';
      g.strokeStyle = '#e7edf8';
      g.lineWidth = 1;

      for (var k = 0; k <= 4; k++) {
        var gy = T + ph * k / 4;

        g.beginPath();
        g.moveTo(L, gy);
        g.lineTo(W - R, gy);
        g.stroke();
        g.textAlign = 'right';
        g.fillText(Math.round(mx - mx * k / 4), L - 6, gy + 3);
      }

      g.textAlign = 'center';

      labels.forEach(function (label, i) {
        if (i % skip === 0) {
          g.fillText(label, x(i), H - 8);
        }
      });

      g.save();
      g.beginPath();
      g.rect(0, 0, L + pw * p + 4, H);
      g.clip();

      series.forEach(function (se, k) {
        if (k === 0) {
          trace(se);
          g.lineTo(x(labels.length - 1), T + ph);
          g.lineTo(x(0), T + ph);
          g.closePath();
          g.fillStyle = 'rgba(29,94,255,.1)';
          g.fill();
        }

        trace(se);
        g.strokeStyle = se.c;
        g.lineWidth = 2.5;
        g.lineCap = 'round';
        g.stroke();

        se.v.forEach(function (v, i) {
          g.beginPath();
          g.arc(x(i), y(v), 3.5, 0, 6.2832);
          g.fillStyle = '#fff';
          g.fill();
          g.lineWidth = 2;
          g.stroke();
        });
      });

      g.restore();

      if (p < 1) {
        requestAnimationFrame(frame);
      }
    }

    requestAnimationFrame(frame);
  }

  var resizeFrame = 0;

  window.addEventListener('resize', function () {
    cancelAnimationFrame(resizeFrame);

    resizeFrame = requestAnimationFrame(function () {
      paintLine(false);
    });
  });

  function bars(items, fmt) {
    var mx = Math.max.apply(null, [1].concat(items.map(function (i) {
      return i.value;
    })));

    return '<div class="bars">' + items.map(function (it, i) {
      var p = (it.value / mx).toFixed(3);

      return '<div class="bars__col">' +
        '<span class="bars__val">' + fmt(it.value) + '</span>' +
        '<div class="bars__bar" style="--c:' + it.color + ';--p:' + p + ';animation-delay:' + (i * 100) + 'ms"></div>' +
        it.label +
        '</div>';
    }).join('') + '</div>';
  }

  var NAV = [
    ['dashboard', 'dash', 'Dashboard'],
    ['customer', 'users', 'Customer'],
    ['new', 'plus', 'New Entry']
  ];

  function buildChrome() {
    $('side-nav').innerHTML = NAV.map(function (n) {
      return '<a class="nav__link" href="#/' + n[0] + '" data-nav="' + n[0] + '">' + ic(n[1], true) + '<span>' + n[2] + '</span></a>';
    }).join('');

    $('tabbar').innerHTML = NAV.map(function (n) {
      return '<a class="tabbar__link" href="#/' + n[0] + '" data-nav="' + n[0] + '">' + ic(n[1], true, 'tabbar__icon') + '<span>' + n[2] + '</span></a>';
    }).join('');

    $('side-foot').innerHTML =
      '<span class="side__car">' + ic('car', true) + '</span>' +
      '<span>Drive Safe<br>Stay Covered</span>';

    $('global-search-box').innerHTML =
      ic('search', false, 'search__icon') +
      '<input class="search__input" id="global-search" placeholder="Search customers, policies, vehicles..." autocomplete="off">';

    $('top-right').innerHTML =
      '<button type="button" class="bell" id="bell" aria-label="Notifications">' +
      ic('bell') +
      '<span class="bell__dot" id="bell-dot"></span>' +
      '</button>' +
      '<div class="user">' + avatar('User Desk') + '<span class="user__name">User</span></div>';

    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-nav]');

      if (!a) {
        return;
      }

      e.preventDefault();

      var name = a.getAttribute('data-nav');

      if (name === 'customer') {
        state.customerId = state.customerId || db.customers[0].id;
      }

      if (name === 'new') {
        state.newFor = null;
        state.draft = null;
      }

      go(name);
    });

    on('global-search', 'input', function (e) {
      dash.search = e.target.value.trim().toLowerCase();

      if (hashName() !== 'dashboard') {
        go('dashboard');
        return;
      }

      var s = $('search');

      if (s) {
        s.value = e.target.value;
      }

      drawCustomers(false);
    });

    on('bell', 'click', openNotices);

    on('modal-backdrop', 'click', closeModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('modal').classList.contains('is-open')) {
        closeModal();
      }
    });
  }

  function setPage(name) {
    Array.prototype.forEach.call(document.querySelectorAll('#side-nav [data-nav],#tabbar [data-nav]'), function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-nav') === name);
    });
  }

  function greet() {
    var h = new Date().getHours();

    if (h < 12) {
      return 'Good morning';
    }

    return h < 17 ? 'Good afternoon' : 'Good evening';
  }

  function notices() {
    var list = [];

    db.policies.filter(by('status', 'Active')).forEach(function (p) {
      var left = daysLeft(p);

      if (left <= 30) {
        list.push({
          color: '#f59e0b',
          text: p.id + ' (' + p.make + ' ' + p.model + ') expires in ' + left + ' days.',
          customerId: p.customerId,
          tab: 'policies'
        });
      }
    });

    db.claims.filter(by('status', 'Open')).forEach(function (c) {
      list.push({
        color: '#1d5eff',
        text: 'Claim ' + c.id + ' of ' + money(c.amount) + ' is waiting for a decision.',
        customerId: policyOf(c).customerId,
        tab: 'claims'
      });
    });

    db.policies.filter(by('status', 'Pending')).forEach(function (p) {
      list.push({
        color: '#16b364',
        text: p.id + ' (' + p.make + ' ' + p.model + ') starts on ' + dmy(p.start) + '.',
        customerId: p.customerId,
        tab: 'policies'
      });
    });

    return list;
  }

  function updateBell() {
    var dot = $('bell-dot');

    if (dot) {
      dot.classList.toggle('is-hidden', notices().length <= db.seen);
    }
  }

  function openNotices() {
    var list = notices();
    var body = el('div', 'modal__list');

    if (!list.length) {
      body = el('p', 'modal__text', 'You are all caught up. There is nothing that needs attention.');
    }

    list.forEach(function (n) {
      var b = el('button', 'notice');

      b.type = 'button';
      b.innerHTML = '<span class="notice__dot" style="--c:' + n.color + '"></span><span>' + esc(n.text) + '</span>';

      b.addEventListener('click', function () {
        closeModal();
        state.customerId = n.customerId;
        state.tab = n.tab;
        go('customer');
      });

      body.appendChild(b);
    });

    db.seen = list.length;
    store.save();
    updateBell();

    openModal({
      title: 'Notifications',
      body: body,
      actions: [{ label: 'Close', primary: true }]
    });
  }

  function fld(label, id, ctl, full, i) {
    return '<div class="field' + (full ? ' field--full modal__full' : '') + '" style="--i:' + i + '">' +
      '<label class="field__label" for="' + id + '">' + label + '</label>' + ctl + '</div>';
  }

  function inp(id, attrs) {
    return '<input class="input" id="' + id + '" ' + (attrs || '') + '>';
  }

  function sel(id) {
    return '<select class="input" id="' + id + '"></select>';
  }

  function openQuote() {
    var body = el('div', 'modal__form');

    body.innerHTML =
      fld('Make', 'q-make', sel('q-make'), false, 0) +
      fld('Model', 'q-model', sel('q-model'), false, 1) +
      fld('Year', 'q-year', sel('q-year'), false, 2) +
      fld('Coverage', 'q-coverage', sel('q-coverage'), false, 3) +
      fld('Insured value (₹)', 'q-value', inp('q-value', 'type="text" inputmode="numeric" maxlength="9" placeholder="Enter amount"'), true, 4) +
      '<div class="premium modal__full"><span>Estimated annual premium</span><span class="premium__val" id="q-premium">—</span></div>' +
      '<p class="helper modal__full" id="q-note">Fill in the vehicle details to see your quote.</p>' +
      '<p class="pf-msg-text modal__full" id="q-msg"></p>';

    function quote() {
      var v = parseInt(val('q-value'), 10);
      var cov = $('q-coverage').value;
      var yr = parseInt($('q-year').value, 10);

      if (v && cov && yr) {
        var age = Math.max(0, new Date().getFullYear() - yr);

        $('q-premium').textContent = money(premium(v, cov, yr));
        $('q-note').textContent = 'Base rate ' + (RATES[cov] * 100).toFixed(1) + '% of the insured value, plus ' + (Math.min(age, 10) * 2) + '% vehicle age loading.';
      } else {
        $('q-premium').textContent = '—';
        $('q-note').textContent = 'Fill in the vehicle details to see your quote.';
      }

      $('q-msg').textContent = '';
    }

    openModal({
      title: 'Get a quote',
      body: body,
      onOpen: function () {
        options($('q-make'), Object.keys(MAKES), 'Select an option');
        options($('q-model'), [], 'Select a make first');
        options($('q-year'), yearList(), 'Select an option');
        options($('q-coverage'), COVERAGES, 'Select an option');

        on('q-make', 'change', function () {
          var mk = $('q-make').value;

          options($('q-model'), mk ? MAKES[mk] : [], mk ? 'Select an option' : 'Select a make first');
        });

        on('q-value', 'input', function (e) {
          e.target.value = e.target.value.replace(/\D/g, '');
          quote();
        });

        on('q-year', 'change', quote);
        on('q-coverage', 'change', quote);
      },
      actions: [
        { label: 'Cancel' },
        {
          label: 'Create policy from quote',
          primary: true,
          onClick: function () {
            var f = {
              make: $('q-make').value,
              model: $('q-model').value,
              year: $('q-year').value,
              coverage: $('q-coverage').value,
              value: val('q-value')
            };

            if (!f.make || !f.model || !f.year || !f.coverage || !f.value) {
              $('q-msg').textContent = '*** Complete all the quote fields ***';
              return false;
            }

            if (+f.value < 50000 || +f.value > 20000000) {
              $('q-msg').textContent = '*** Insured value must be between ₹50,000 and ₹2,00,00,000 ***';
              return false;
            }

            state.draft = f;
            state.newFor = null;
            go('new');
          }
        }
      ]
    });
  }

  function renewable() {
    return db.policies.filter(function (p) {
      var due = (p.status === 'Active' && daysLeft(p) <= 90) || p.status === 'Expired';

      if (!due) {
        return false;
      }

      return !db.policies.some(function (o) {
        return o.id !== p.id && o.plate === p.plate && (o.status === 'Active' || o.status === 'Pending') && o.end > p.end;
      });
    }).sort(function (a, b) {
      var ar = a.status === 'Active' ? 0 : 1;
      var br = b.status === 'Active' ? 0 : 1;

      if (ar !== br) {
        return ar - br;
      }

      return ar === 0 ? a.end.localeCompare(b.end) : b.end.localeCompare(a.end);
    });
  }

  function openRenew() {
    var list = renewable();

    if (!list.length) {
      toast('No policies are due for renewal right now.');
      return;
    }

    var rows = list.map(function (p, i) {
      var c = customerOf(p);

      return '<div>' +
        '<input class="pick__input" type="radio" name="renew-pick" id="rp-' + i + '" value="' + p.id + '"' + (i === 0 ? ' checked' : '') + '>' +
        '<label class="pick__card" for="rp-' + i + '">' +
        '<span class="pick__main"><b>' + p.id + ' · ' + esc(p.make + ' ' + p.model) + ' · ' + p.plate + '</b>' +
        '<span class="pick__sub">' + esc(c.name) + ' · ' + (p.status === 'Active' ? 'ends ' : 'ended ') + dmy(p.end) + '</span></span>' +
        pill(p.status) +
        '</label>' +
        '</div>';
    }).join('');

    var body = el('div', 'modal__form');

    body.innerHTML =
      '<p class="helper modal__full">Select a policy that is expiring within 90 days or has already expired.</p>' +
      '<div class="modal__list modal__full">' + rows + '</div>' +
      fld('Coverage for the new term', 'r-coverage', sel('r-coverage'), true, 0) +
      '<div class="premium modal__full"><span>Renewal premium</span><span class="premium__val" id="r-premium">—</span></div>' +
      '<p class="helper modal__full" id="r-note"></p>';

    function chosen() {
      var picked = document.querySelector('input[name="renew-pick"]:checked');

      return db.policies.filter(by('id', picked.value))[0];
    }

    function preview(resetCoverage) {
      var p = chosen();

      if (resetCoverage) {
        $('r-coverage').value = p.coverage;
      }

      $('r-premium').textContent = money(premium(p.value, $('r-coverage').value, p.year));

      var start = p.status === 'Active' ? fromIso(p.end) : startOfDay(new Date());

      $('r-note').textContent = 'New term: ' + dmy(iso(start)) + ' to ' + dmy(iso(addYears(start, 1))) + '.';
    }

    openModal({
      title: 'Renew policy',
      body: body,
      onOpen: function () {
        options($('r-coverage'), COVERAGES);

        Array.prototype.forEach.call(document.querySelectorAll('input[name="renew-pick"]'), function (r) {
          r.addEventListener('change', function () {
            preview(true);
          });
        });

        on('r-coverage', 'change', function () {
          preview(false);
        });

        preview(true);
      },
      actions: [
        { label: 'Cancel' },
        {
          label: 'Renew policy',
          primary: true,
          onClick: function () {
            var old = chosen();
            var coverage = $('r-coverage').value;
            var start = old.status === 'Active' ? fromIso(old.end) : startOfDay(new Date());

            var renewed = {
              id: 'POL-' + (++db.seq.pol),
              customerId: old.customerId,
              make: old.make,
              model: old.model,
              year: old.year,
              plate: old.plate,
              value: old.value,
              coverage: coverage,
              premium: premium(old.value, coverage, old.year),
              start: iso(start),
              end: iso(addYears(start, 1)),
              status: statusFor(start)
            };

            db.policies.push(renewed);
            store.save();

            state.customerId = old.customerId;
            state.tab = 'policies';
            state.flash = 'Policy ' + old.id + ' renewed as ' + renewed.id + '. Annual premium ' + money(renewed.premium) + '.';

            go('customer');
          }
        }
      ]
    });
  }

  function openTrack() {
    var list = db.claims.slice().sort(function (a, b) {
      var ao = a.status === 'Open' ? 0 : 1;
      var bo = b.status === 'Open' ? 0 : 1;

      return ao - bo || b.date.localeCompare(a.date);
    });

    if (!list.length) {
      toast('There are no claims to track.');
      return;
    }

    var body = el('div', 'modal__form');

    body.innerHTML =
      fld('Claim', 'tr-claim', sel('tr-claim'), true, 0) +
      '<div class="modal__full" id="tr-view"></div>';

    function show() {
      var cl = db.claims.filter(by('id', $('tr-claim').value))[0];
      var p = policyOf(cl);

      $('tr-view').innerHTML =
        '<p class="helper">' + esc(customerOf(p).name) + ' · ' + cl.type + ' · ' + money(cl.amount) + ' · ' + pill(cl.status) + '</p>' +
        tracker(cl);
    }

    openModal({
      title: 'Track claim',
      body: body,
      onOpen: function () {
        options($('tr-claim'), list.map(function (c) {
          return { value: c.id, label: c.id + ' · ' + customerOf(policyOf(c)).name + ' · ' + c.status };
        }));

        on('tr-claim', 'change', show);
        show();
      },
      actions: [
        { label: 'Close' },
        {
          label: 'View customer',
          primary: true,
          onClick: function () {
            var cl = db.claims.filter(by('id', $('tr-claim').value))[0];

            state.customerId = customerOf(policyOf(cl)).id;
            state.tab = 'claims';
            go('customer');
          }
        }
      ]
    });
  }

  function download(name, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');

    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function documentText(kind, p) {
    var c = customerOf(p);
    var lines = ['MOTOR INSURANCE DESK', ''];

    if (kind === 'cert') {
      lines.push(
        'POLICY CERTIFICATE',
        '',
        'Policy ID: ' + p.id,
        'Insured: ' + c.name + ' (' + c.id + ')',
        'Vehicle: ' + p.make + ' ' + p.model + ' ' + p.year,
        'Plate: ' + p.plate,
        'Coverage: ' + p.coverage,
        'Insured value: ' + money(p.value),
        'Valid from: ' + dmy(p.start),
        'Valid until: ' + dmy(p.end),
        'Status: ' + p.status
      );
    } else if (kind === 'receipt') {
      lines.push(
        'PREMIUM RECEIPT',
        '',
        'Policy ID: ' + p.id,
        'Received from: ' + c.name,
        'Coverage: ' + p.coverage,
        'Annual premium: ' + money(p.premium),
        'Period: ' + dmy(p.start) + ' to ' + dmy(p.end),
        'Issued on: ' + dmy(iso(new Date()))
      );
    } else {
      var claims = claimsOfPolicies([p]);

      lines.push('CLAIMS SUMMARY', '', 'Policy ID: ' + p.id, 'Insured: ' + c.name, '');

      if (!claims.length) {
        lines.push('No claims have been registered on this policy.');
      }

      claims.forEach(function (x) {
        lines.push(x.id + ' | ' + dmy(x.date) + ' | ' + x.type + ' | ' + money(x.amount) + ' | ' + x.status);
      });
    }

    return lines.join('\n');
  }

  function openDocs() {
    var pols = db.policies.slice().sort(function (a, b) {
      return customerOf(a).name.localeCompare(customerOf(b).name) || a.id.localeCompare(b.id);
    });

    var docs = [
      ['cert', 'Policy certificate', 'Coverage and vehicle details'],
      ['receipt', 'Premium receipt', 'Annual premium and policy dates'],
      ['claims', 'Claims summary', 'All claims on this policy']
    ];

    var body = el('div', 'modal__form');

    body.innerHTML =
      fld('Policy', 'dc-policy', sel('dc-policy'), true, 0) +
      '<div class="doclist modal__full">' + docs.map(function (d) {
        return '<button type="button" class="doc" data-doc="' + d[0] + '">' +
          '<span class="doc__text"><span class="doc__title">' + d[1] + '</span><span class="doc__sub">' + d[2] + '</span></span>' +
          '<span class="doc__go">Download</span>' +
          '</button>';
      }).join('') + '</div>';

    openModal({
      title: 'Documents',
      body: body,
      onOpen: function () {
        options($('dc-policy'), pols.map(function (p) {
          return { value: p.id, label: p.id + ' · ' + p.plate + ' · ' + customerOf(p).name };
        }));

        Array.prototype.forEach.call(body.querySelectorAll('[data-doc]'), function (b) {
          b.addEventListener('click', function () {
            var p = db.policies.filter(by('id', $('dc-policy').value))[0];
            var kind = b.getAttribute('data-doc');
            var name = p.id + '-' + kind + '.txt';

            download(name, documentText(kind, p));
            toast('Downloaded ' + name);
          });
        });
      },
      actions: [{ label: 'Close', primary: true }]
    });
  }

  function openReset() {
    openModal({
      title: 'Reset demo data?',
      body: '<p class="modal__text">All customers, policies and claims you added or changed will be removed and the original demo data will be restored. This cannot be undone.</p>',
      actions: [
        { label: 'Cancel' },
        {
          label: 'Yes, reset',
          primary: true,
          danger: true,
          onClick: function () {
            store.reset();
            dash.coverage = 'All';
            dash.search = '';
            state.customerId = null;
            state.flash = 'Demo data has been reset.';
            render('dashboard', true);
          }
        }
      ]
    });
  }

  function actionsHtml() {
    var A = [
      ['quote', 'plus', 'Get a Quote', true],
      ['renew', 'shield', 'Renew Policy'],
      ['track', 'alert', 'Track Claim'],
      ['docs', 'file', 'Documents']
    ];

    return '<div class="actions reveal" style="--i:2">' + A.map(function (a) {
      return '<button type="button" class="action' + (a[3] ? ' action--primary' : '') + '" data-act="' + a[0] + '">' +
        ic(a[1], !!a[3]) +
        '<span class="action__label">' + a[2] + '</span>' +
        ic('chev', !!a[3], 'btn__arrow') +
        '</button>';
    }).join('') + '</div>';
  }

  function drawSpot(pols, first) {
    var box = slot('spot');
    var cls = first ? ' reveal' : '';
    var today = startOfDay(new Date());

    var act = pols.filter(by('status', 'Active')).sort(function (a, b) {
      return a.end.localeCompare(b.end);
    });

    if (!act.length) {
      box.innerHTML =
        '<section class="card' + cls + ' spot__wide">' +
        '<h2 class="card__title">No active policies</h2>' +
        '<p class="helper">There is nothing active for this coverage filter.</p>' +
        '</section>';
      return;
    }

    var p = act[0];
    var c = customerOf(p);
    var left = Math.max(0, Math.ceil((fromIso(p.end) - today) / 864e5));
    var used = Math.min(100, Math.max(0, Math.round(100 - left / 365 * 100)));
    var open = claimsOfPolicies([p]).filter(by('status', 'Open')).length;
    var bonus = { 'Comprehensive': 25, 'Limited': 15, 'Third party': 8 }[p.coverage];
    var health = Math.min(100, 50 + bonus + (open ? 0 : 15) + (left > 60 ? 10 : 0));

    var checks = [
      [true, p.coverage + ' coverage'],
      [!open, open ? open + ' open claim(s)' : 'No open claims'],
      [left > 60, 'Renewal in ' + left + ' days']
    ];

    box.innerHTML =
      '<section class="card card--lift spot__main' + cls + '" style="--i:3">' +
      '<div class="spot__text">' +
      '<p class="spot__hi">You\u2019re covered.</p>' +
      '<h2 class="spot__car">' + esc(p.make + ' ' + p.model + ' ' + p.year) + '</h2>' +
      '<p class="spot__sub">' + p.coverage + ' insurance \u00b7 ' + esc(c.name) + '</p>' +
      '<div class="spot__meta">' +
      '<div><span class="spot__k">Policy ID</span>' + p.id + '</div>' +
      '<div><span class="spot__k">Valid until</span>' + dmy(p.end) + '</div>' +
      '<div><span class="spot__k">Plate</span>' + p.plate + '</div>' +
      '</div>' +
      '<div class="spot__bar"><span class="spot__fill" style="--w:' + used + '%"></span></div>' +
      '<p class="spot__sub">Policy term ' + used + '% complete \u00b7 expires in ' + left + ' days</p>' +
      '<button type="button" class="btn btn--primary" id="view-policy">View Policy' + ic('chev', true, 'btn__arrow') + '</button>' +
      '</div>' +
      '<img class="spot__img" src="images/car-sedan.png" alt="">' +
      '</section>' +
      '<section class="card card--lift' + cls + '" style="--i:4">' +
      '<h2 class="card__title">Policy health</h2>' +
      '<div class="health">' +
      ring(health, '#16b364', health + '%', 'Protected') +
      '<ul class="health__list">' + checks.map(function (k) {
        return '<li class="health__item' + (k[0] ? '' : ' is-warn') + '">' + (k[0] ? '\u2713' : '!') + ' ' + k[1] + '</li>';
      }).join('') + '</ul>' +
      '</div>' +
      '</section>';

    on('view-policy', 'click', function () {
      state.customerId = c.id;
      go('customer');
    });
  }

  function tracker(cl) {
    var steps = ['Submitted', 'Documents verified', 'Assessment', 'Approved', 'Settlement'];
    var done = cl.status === 'Open' ? 2 : cl.status === 'Approved' ? 4 : 3;
    var rejected = cl.status === 'Rejected';

    if (rejected) {
      steps[3] = 'Rejected';
    }

    return '<div class="track">' +
      '<div class="track__line"><span class="track__fill" style="--w:' + (done / (steps.length - 1) * 100) + '%"></span></div>' +
      steps.map(function (s, i) {
        var cls = i < done ? ' is-done' : i === done ? ' is-now' : '';

        if (rejected && i === 3) {
          cls += ' is-bad';
        }

        return '<div class="track__step' + cls + '">' +
          '<span class="track__dot">' + (i < done ? '\u2713' : '') + '</span>' + s +
          '</div>';
      }).join('') +
      '</div>';
  }

  var dash = { coverage: 'All', search: '' };
  var state = { customerId: null, newFor: null, flash: null, tab: null, draft: null };

  function pageDashboard() {
    setPage('dashboard');

    var covs = ['All'].concat(COVERAGES);

    $content.innerHTML =
      '<section class="hero reveal">' +
      '<div class="hero__tag">Better Coverage<br>for a Safer Tomorrow</div>' +
      '<p class="hero__hello">' + greet() + ', User</p>' +
      '<h1 class="hero__title">Motor Insurance Desk</h1>' +
      '<p class="hero__sub">Smarter coverage. Safer journeys.</p>' +
      '<p class="hero__text">Manage policies, claims and customers — all in one place.</p>' +
      '</section>' +

      '<div class="filter reveal" style="--i:1">' +
      '<span class="filter__label">Coverage:</span>' +
      covs.map(function (c) {
        return '<button type="button" class="chip" data-cov="' + c + '">' + c + '</button>';
      }).join('') +
      '</div>' +

      actionsHtml() +

      '<div class="spot" data-slot="spot"></div>' +
      '<div class="kpis" data-slot="kpis"></div>' +
      '<div class="grid3" data-slot="charts"></div>' +

      '<section class="card reveal" style="--i:5;margin-top:14px">' +
      '<div class="tools">' +
      '<h2 class="tools__title">Customers</h2>' +
      '<label class="search search--tools">' + ic('search', false, 'search__icon') +
      '<input class="search__input" id="search" placeholder="Search name or plate..." autocomplete="off">' +
      '</label>' +
      '<div class="tools__spacer">Coverage' +
      '<select class="input input--sm" id="cov-select">' + covs.map(function (c) {
        return '<option>' + c + '</option>';
      }).join('') + '</select>' +
      '</div>' +
      '</div>' +
      '<div class="table-wrap"><table class="table">' +
      th(['Customer', 'City', 'Policies', 'Vehicles', 'Annual premium', 'Claims', 'Open claims', 'Status']) +
      '<tbody data-slot="customers"></tbody></table></div>' +
      '<p class="helper">Select a customer name to open their policies and claims.</p>' +
      '<div class="btnrow">' +
      '<button type="button" class="btn" id="reset-data">Reset demo data</button>' +
      '<button type="button" class="btn btn--primary" id="new-entry">' + ic('plus', true) + 'New entry</button>' +
      '</div>' +
      '</section>';

    $('search').value = dash.search;

    on('search', 'input', function (e) {
      dash.search = e.target.value.trim().toLowerCase();

      var g = $('global-search');

      if (g) {
        g.value = e.target.value;
      }

      drawCustomers(false);
    });

    on('cov-select', 'change', function (e) {
      setCov(e.target.value);
    });

    Array.prototype.forEach.call($content.querySelectorAll('[data-cov]'), function (b) {
      b.addEventListener('click', function () {
        setCov(b.getAttribute('data-cov'));
      });
    });

    on('new-entry', 'click', function () {
      state.newFor = null;
      state.draft = null;
      go('new');
    });

    on('reset-data', 'click', openReset);

    $content.querySelector('.actions').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');

      if (!b) {
        return;
      }

      var a = b.getAttribute('data-act');

      if (a === 'quote') {
        openQuote();
      } else if (a === 'renew') {
        openRenew();
      } else if (a === 'track') {
        openTrack();
      } else {
        openDocs();
      }
    });

    $content.querySelector('tbody').addEventListener('click', function (e) {
      var tr = e.target.closest('[data-id]');

      if (!tr) {
        return;
      }

      state.customerId = tr.getAttribute('data-id');
      go('customer');
    });

    markCov();
    drawDashboard(true);
  }

  function setCov(c) {
    dash.coverage = c;
    markCov();
    drawDashboard(false);
  }

  function markCov() {
    Array.prototype.forEach.call($content.querySelectorAll('[data-cov]'), function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-cov') === dash.coverage);
    });

    $('cov-select').value = dash.coverage;
  }

  function filteredPolicies() {
    return db.policies.filter(function (p) {
      return dash.coverage === 'All' || p.coverage === dash.coverage;
    });
  }

  function drawDashboard(first) {
    var pols = filteredPolicies();
    var claims = claimsOfPolicies(pols);
    var active = pols.filter(by('status', 'Active'));
    var approved = claims.filter(by('status', 'Approved'));
    var paid = sum(approved, function (c) {
      return c.amount;
    });
    var premAll = sum(pols, function (p) {
      return p.premium;
    });

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

    if (first) {
      kpiPrev = {};
    }

    var delay = first ? 2 : 0;
    var cls = first ? ' reveal' : '';

    slot('kpis').innerHTML = K.map(function (k, i) {
      var from = kpiPrev[k[1]] || 0;

      kpiPrev[k[1]] = k[2];

      return '<div class="card card--lift kpi' + cls + '" style="--i:' + (i + delay) + '">' +
        '<span class="kpi__icon" style="--c:' + k[5] + '">' + ic(k[0]) + '</span>' +
        '<div>' +
        '<div class="kpi__label">' + k[1] + '</div>' +
        '<div class="kpi__value" data-count="' + k[2] + '" data-from="' + from + '" data-fmt="' + k[3] + '">0</div>' +
        '<div class="kpi__delta' + (k[4].charAt(0) === '↓' ? ' is-down' : '') + '">' + k[4] + '</div>' +
        '</div>' +
        '</div>';
    }).join('');

    countUp(slot('kpis'));
    drawSpot(pols, first);

    var cov = COVERAGES.map(function (c) {
      return { label: c, value: pols.filter(by('coverage', c)).length, color: COV_COLOR[c] };
    });

    var months = last12Months().slice(6);

    var total = months.map(function (m) {
      return claims.filter(function (c) {
        return c.date.slice(0, 7) === m.key;
      }).length;
    });

    var okay = months.map(function (m) {
      return approved.filter(function (c) {
        return c.date.slice(0, 7) === m.key;
      }).length;
    });

    var types = [['Car', '#1d5eff'], ['Bike', '#16b364'], ['Truck', '#f59e0b'], ['Others', '#8b5cf6']].map(function (t) {
      return {
        label: t[0],
        color: t[1],
        value: sum(pols.filter(function (p) {
          return vtype(p) === t[0];
        }), function (p) {
          return p.premium;
        })
      };
    });

    slot('charts').innerHTML =
      '<section class="card card--lift' + cls + '" style="--i:' + (delay + 3) + '">' +
      '<h2 class="card__title">Policies by Coverage</h2>' +
      donut(cov, pols.length, 'Policies') +
      '</section>' +

      '<section class="card card--lift' + cls + '" style="--i:' + (delay + 4) + '">' +
      '<div class="cardhead">' +
      '<h2 class="card__title">Claims Trend</h2>' +
      '<div class="legend legend--inline">' +
      '<span class="legend__row"><span class="legend__dot" style="--c:#1d5eff"></span>Total claims</span>' +
      '<span class="legend__row"><span class="legend__dot" style="--c:#16b364"></span>Approved</span>' +
      '</div>' +
      '</div>' +
      lineChart(months.map(function (m) {
        return m.label.split(' ')[0];
      }), [
        { n: 'Total claims', c: '#1d5eff', v: total },
        { n: 'Approved', c: '#16b364', v: okay }
      ]) +
      '</section>' +

      '<section class="card card--lift card--wide' + cls + '" style="--i:' + (delay + 5) + '">' +
      '<h2 class="card__title">Premium by Vehicle Type</h2>' +
      bars(types, compact) +
      '</section>';

    paintLine(true);
    watchLine();
    drawCustomers(first);
  }

  function drawCustomers(animate) {
    var pols = filteredPolicies();

    var rows = db.customers.map(function (c) {
      var ps = pols.filter(by('customerId', c.id));
      var status = 'Inactive';

      if (ps.some(by('status', 'Active'))) {
        status = 'Active';
      } else if (ps.some(by('status', 'Pending'))) {
        status = 'Pending';
      }

      return { c: c, pols: ps, claims: claimsOfPolicies(ps), status: status };
    }).filter(function (r) {
      if (!r.pols.length) {
        return false;
      }

      if (!dash.search) {
        return true;
      }

      return r.c.name.toLowerCase().indexOf(dash.search) >= 0 || r.pols.some(function (p) {
        return p.plate.toLowerCase().indexOf(dash.search) >= 0;
      });
    }).sort(function (a, b) {
      return a.c.name.localeCompare(b.c.name);
    });

    if (!rows.length) {
      slot('customers').innerHTML = '<tr><td class="pf-msg-empty" colspan="8">No customers match this filter.</td></tr>';
      return;
    }

    slot('customers').innerHTML = rows.map(function (r, i) {
      return '<tr class="table__row is-click' + (animate ? ' table__row--in' : '') + '" data-id="' + r.c.id + '" style="--i:' + i + '">' +
        td('<span class="table__name">' + avatar(r.c.name) + esc(r.c.name) + '</span>') +
        td(esc(r.c.city)) +
        td(r.pols.length) +
        td(r.pols.length) +
        td(money(sum(r.pols, function (p) { return p.premium; }))) +
        td(r.claims.length) +
        td(r.claims.filter(by('status', 'Open')).length) +
        td(pill(r.status)) +
        '</tr>';
    }).join('');
  }

  function pageCustomer() {
    var c = db.customers.filter(by('id', state.customerId))[0];

    if (!c) {
      go('dashboard');
      return;
    }

    setPage('customer');

    var pols = db.policies.filter(by('customerId', c.id));

    var claims = claimsOfPolicies(pols).sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });

    var isActive = pols.some(by('status', 'Active'));

    var prem = sum(pols.filter(by('status', 'Active')), function (p) {
      return p.premium;
    });

    var covItems = COVERAGES.map(function (v) {
      return { label: v, value: pols.filter(by('coverage', v)).length, color: COV_COLOR[v] };
    });

    var clItems = [['Approved', '#16b364'], ['Open', '#f59e0b'], ['Rejected', '#ef4444']].map(function (s) {
      return { label: s[0], color: s[1], value: claims.filter(by('status', s[0])).length };
    });

    function stat(icon, color, label, value) {
      return '<div class="stat">' +
        '<span class="stat__icon" style="--c:' + color + '">' + ic(icon) + '</span>' +
        label +
        '<span class="stat__value">' + value + '</span>' +
        '</div>';
    }

    var policyRows = pols.length ? pols.map(function (p, i) {
      return '<tr class="table__row table__row--in" style="--i:' + i + '">' +
        td(p.id) +
        td(p.make + ' ' + p.model + ' ' + p.year) +
        td(p.plate) +
        td(p.coverage) +
        td(money(p.value)) +
        td(money(p.premium)) +
        td(dmy(p.start)) +
        td(dmy(p.end)) +
        td(pill(p.status)) +
        '</tr>';
    }).join('') : '<tr><td class="pf-msg-empty" colspan="9">No policies.</td></tr>';

    var claimRows = claims.length ? claims.map(function (x, i) {
      var action = '—';

      if (x.status === 'Open') {
        action =
          '<a class="link" href="#" data-claim="' + x.id + '" data-set="Approved">Approve</a> · ' +
          '<a class="link link--bad" href="#" data-claim="' + x.id + '" data-set="Rejected">Reject</a>';
      }

      return '<tr class="table__row table__row--in" style="--i:' + i + '">' +
        td(x.id) +
        td(x.policyId) +
        td(dmy(x.date)) +
        td(x.type) +
        td(money(x.amount)) +
        td(pill(x.status)) +
        td(action) +
        '</tr>';
    }).join('') : '<tr><td class="pf-msg-empty" colspan="7">No claims.</td></tr>';

    $content.innerHTML =
      '<a class="back reveal" href="#/dashboard" data-nav="dashboard">' + ic('back') + 'Back to Insurance Desk</a>' +
      '<h1 class="page-title reveal">Customer Details</h1>' +

      '<div class="profile reveal" style="--i:1">' +
      '<section class="card">' +
      '<div class="profile__main">' + avatar(c.name, true) +
      '<div>' +
      '<h2 class="profile__name">' + esc(c.name) + pill(isActive ? 'Active' : 'Inactive') + '</h2>' +
      '<p class="profile__line">Customer ID: ' + c.id + '</p>' +
      '<p class="profile__line">' + esc(c.city) + '</p>' +
      '<p class="profile__line">+91 ' + c.phone.slice(0, 5) + ' ' + c.phone.slice(5) + '</p>' +
      '<p class="profile__line">' + esc(c.email) + '</p>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '<section class="card">' +
      stat('file', '#1d5eff', 'Policies', pols.length) +
      stat('car', '#8b5cf6', 'Vehicles', pols.length) +
      stat('coin', '#f59e0b', 'Total premium', money(prem)) +
      '</section>' +
      '</div>' +

      '<div class="tabs reveal" style="--i:2">' +
      '<button type="button" class="tab is-active" data-tab="overview">Overview</button>' +
      '<button type="button" class="tab" data-tab="policies">Policies</button>' +
      '<button type="button" class="tab" data-tab="claims">Claims</button>' +
      '</div>' +

      '<div class="grid2 reveal" data-pane="overview" style="--i:3">' +
      '<section class="card"><h2 class="card__title">Policy coverage</h2>' + donut(covItems, pols.length, 'Policies') + '</section>' +
      '<section class="card"><h2 class="card__title">Claims status</h2>' + bars(clItems, String) + '</section>' +
      '</div>' +

      (claims.length
        ? '<section class="card reveal" data-pane="overview claims" style="--i:4;margin-bottom:14px">' +
          '<h2 class="card__title">Claim tracking \u00b7 ' + claims[0].id + '</h2>' + tracker(claims[0]) +
          '</section>'
        : '') +

      '<section class="card reveal" data-pane="overview policies" style="--i:4;margin-bottom:14px">' +
      '<h2 class="card__title">Policies</h2>' +
      '<div class="table-wrap"><table class="table">' +
      th(['Policy', 'Vehicle', 'Plate', 'Coverage', 'Insured value', 'Premium', 'Start', 'End', 'Status']) +
      '<tbody>' + policyRows + '</tbody></table></div>' +
      '</section>' +

      '<section class="card reveal" data-pane="overview claims" style="--i:5">' +
      '<h2 class="card__title">Claims</h2>' +
      '<div class="table-wrap"><table class="table">' +
      th(['Claim', 'Policy', 'Date', 'Type', 'Amount', 'Status', 'Action']) +
      '<tbody>' + claimRows + '</tbody></table></div>' +
      '</section>' +

      '<div class="btnrow">' +
      '<button type="button" class="btn" id="back">Dashboard</button>' +
      '<button type="button" class="btn btn--primary" id="new-entry">' + ic('plus', true) + 'New entry</button>' +
      '</div>';

    Array.prototype.forEach.call($content.querySelectorAll('[data-tab]'), function (t) {
      t.addEventListener('click', function () {
        var tab = t.getAttribute('data-tab');

        Array.prototype.forEach.call($content.querySelectorAll('[data-tab]'), function (b) {
          b.classList.toggle('is-active', b === t);
        });

        Array.prototype.forEach.call($content.querySelectorAll('[data-pane]'), function (p) {
          p.classList.toggle('is-hidden', p.getAttribute('data-pane').split(' ').indexOf(tab) < 0);
        });
      });
    });

    Array.prototype.forEach.call($content.querySelectorAll('[data-claim]'), function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();

        var cl = db.claims.filter(by('id', a.getAttribute('data-claim')))[0];

        cl.status = a.getAttribute('data-set');
        store.save();

        state.flash = 'Claim ' + cl.id + ' marked as ' + cl.status + '.';
        render('customer', true);
      });
    });

    if (state.tab) {
      var tb = $content.querySelector('[data-tab="' + state.tab + '"]');

      state.tab = null;

      if (tb) {
        tb.click();
      }
    }

    on('back', 'click', function () {
      go('dashboard');
    });

    on('new-entry', 'click', function () {
      state.newFor = c.id;
      state.draft = null;
      go('new');
    });
  }

  function pageNew() {
    setPage('new');

    function choice(id, value, icon, title, sub, checked) {
      return '<div>' +
        '<input class="choice__input" type="radio" name="entry-type" id="' + id + '" value="' + value + '"' + (checked ? ' checked' : '') + '>' +
        '<label class="choice__card" for="' + id + '">' +
        '<span class="choice__icon">' + ic(icon, true) + '</span>' +
        '<span><span class="choice__title">' + title + '</span><br><span class="choice__sub">' + sub + '</span></span>' +
        '</label>' +
        '</div>';
    }

    $content.innerHTML =
      '<a class="back reveal" href="#/dashboard" data-nav="dashboard">' + ic('back') + 'Back to Dashboard</a>' +
      '<h1 class="page-title reveal">New Entry</h1>' +
      '<p class="helper reveal" style="margin-top:-8px">Add a new policy or claim for a customer.</p>' +
      '<div data-slot="banner"></div>' +

      '<div class="choice reveal" style="--i:1">' +
      choice('type-policy', 'policy', 'file', 'Add Policy', 'Create a new policy for an existing or new customer', true) +
      choice('type-claim', 'claim', 'alert', 'Add Claim', 'Register a claim for an existing policy', false) +
      '</div>' +

      '<section class="card reveal" style="--i:2">' +
      '<div class="form" data-slot="form"></div>' +
      '<div data-slot="field-msg"></div>' +
      '<div class="btnrow">' +
      '<button type="button" class="btn" id="cancel">Cancel</button>' +
      '<button type="button" class="btn btn--primary" id="save">Save' + ic('chev', true, 'btn__arrow') + '</button>' +
      '</div>' +
      '</section>';

    Array.prototype.forEach.call($content.querySelectorAll('input[name="entry-type"]'), function (r) {
      r.addEventListener('change', drawForm);
    });

    on('cancel', 'click', function () {
      if (state.newFor) {
        go('customer');
      } else {
        go('dashboard');
      }
    });

    on('save', 'click', function () {
      if ($('type-policy').checked) {
        savePolicy();
      } else {
        saveClaim();
      }
    });

    drawForm();
  }

  function drawForm() {
    clear('banner');
    clear('field-msg');

    var isPolicy = $('type-policy').checked;

    if (isPolicy) {
      slot('form').innerHTML =
        '<h3 class="form__title">Customer details</h3>' +
        fld('Customer', 'np-customer', sel('np-customer'), true, 0) +
        fld('Full name', 'np-name', inp('np-name', 'type="text" maxlength="80" placeholder="Enter full name"'), false, 1) +
        fld('Phone', 'np-phone', inp('np-phone', 'type="tel" maxlength="10" inputmode="numeric" placeholder="10-digit mobile"'), false, 2) +
        fld('Email', 'np-email', inp('np-email', 'type="email" maxlength="80" placeholder="name@example.com"'), false, 3) +
        fld('City', 'np-city', sel('np-city'), false, 4) +
        '<h3 class="form__title">Vehicle and coverage</h3>' +
        fld('Make', 'np-make', sel('np-make'), false, 5) +
        fld('Model', 'np-model', sel('np-model'), false, 6) +
        fld('Year', 'np-year', sel('np-year'), false, 7) +
        fld('Plate', 'np-plate', inp('np-plate', 'type="text" maxlength="10" placeholder="e.g. TS09-AB-1234"'), false, 8) +
        fld('Insured value (₹)', 'np-value', inp('np-value', 'type="text" inputmode="numeric" maxlength="9" placeholder="Enter amount"'), false, 9) +
        fld('Coverage', 'np-coverage', sel('np-coverage'), false, 10) +
        fld('Start date', 'np-start', inp('np-start', 'type="text" maxlength="10" placeholder="dd/mm/yyyy"'), false, 11) +
        '<div class="premium"><span>Calculated annual premium</span><span class="premium__val" data-slot="premium">—</span></div>';

      setupPolicyForm();
    } else {
      slot('form').innerHTML =
        fld('Policy', 'nc-policy', sel('nc-policy'), true, 0) +
        fld('Date of incident', 'nc-date', inp('nc-date', 'type="text" maxlength="10" placeholder="dd/mm/yyyy"'), false, 1) +
        fld('Claim type', 'nc-type', sel('nc-type'), false, 2) +
        fld('Amount claimed (₹)', 'nc-amount', inp('nc-amount', 'type="text" inputmode="numeric" maxlength="9" placeholder="Enter amount"'), false, 3) +
        fld('Description', 'nc-desc', inp('nc-desc', 'type="text" maxlength="120" placeholder="What happened?"'), true, 4) +
        '<p class="helper field--full">Only active policies can receive a claim. The amount cannot exceed the insured value. New claims start as "Open".</p>';

      setupClaimForm();
    }
  }

  function setupPolicyForm() {
    var customers = db.customers.slice().sort(function (a, b) {
      return a.name.localeCompare(b.name);
    }).map(function (c) {
      return { value: c.id, label: c.name + ' (' + c.id + ')' };
    });

    options($('np-customer'), [{ value: '__new', label: 'New customer' }].concat(customers));

    if (state.newFor) {
      $('np-customer').value = state.newFor;
    }

    options($('np-city'), CITIES, 'Select an option');
    options($('np-make'), Object.keys(MAKES), 'Select an option');
    options($('np-model'), [], 'Select a make first');
    options($('np-year'), yearList(), 'Select an option');
    options($('np-coverage'), COVERAGES, 'Select an option');

    $('np-start').value = dmy(iso(new Date()));

    function toggleCustomer() {
      var isNew = $('np-customer').value === '__new';

      ['np-name', 'np-phone', 'np-email', 'np-city'].forEach(function (id) {
        $(id).disabled = !isNew;
      });
    }

    function calc() {
      var v = parseInt(val('np-value'), 10);
      var cov = $('np-coverage').value;
      var yr = parseInt($('np-year').value, 10);

      slot('premium').textContent = (v && cov && yr) ? money(premium(v, cov, yr)) : '—';
    }

    on('np-customer', 'change', toggleCustomer);

    on('np-make', 'change', function () {
      var mk = $('np-make').value;

      options($('np-model'), mk ? MAKES[mk] : [], mk ? 'Select an option' : 'Select a make first');
      calc();
    });

    on('np-phone', 'input', function (e) {
      e.target.value = e.target.value.replace(/\D/g, '');
    });

    on('np-value', 'input', function (e) {
      e.target.value = e.target.value.replace(/\D/g, '');
      calc();
    });

    on('np-plate', 'input', function (e) {
      e.target.value = e.target.value.toUpperCase();
    });

    on('np-year', 'change', calc);
    on('np-coverage', 'change', calc);

    toggleCustomer();

    if (state.draft) {
      var d = state.draft;

      state.draft = null;

      $('np-make').value = d.make;
      options($('np-model'), MAKES[d.make], 'Select an option');
      $('np-model').value = d.model;
      $('np-year').value = d.year;
      $('np-coverage').value = d.coverage;
      $('np-value').value = d.value;
      calc();
    }
  }

  function savePolicy() {
    clear('banner');
    clear('field-msg');

    var custSel = $('np-customer').value;
    var isNew = custSel === '__new';

    var f = {
      name: val('np-name'),
      phone: val('np-phone'),
      email: val('np-email'),
      city: $('np-city').value,
      make: $('np-make').value,
      model: $('np-model').value,
      year: parseInt($('np-year').value, 10),
      plate: val('np-plate').toUpperCase(),
      value: parseInt(val('np-value'), 10),
      coverage: $('np-coverage').value,
      start: parseDMY(val('np-start'))
    };

    var missingCustomer = isNew && (!f.name || !f.phone || !f.email || !f.city);
    var missingVehicle = !f.make || !f.model || !f.year || !f.plate || !f.value || !f.coverage || !val('np-start');

    if (missingCustomer || missingVehicle) {
      banner('Complete all the required fields.');
      return;
    }

    if (isNew && !/^\d{10}$/.test(f.phone)) {
      msg('*** Enter a 10-digit phone number ***');
      return;
    }

    if (isNew && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
      msg('*** Enter a valid email address ***');
      return;
    }

    if (!/^[A-Z0-9]{2,4}-?[A-Z0-9]{2,4}-?[A-Z0-9]{0,4}$/.test(f.plate)) {
      msg('*** Enter a valid plate (e.g. ABC-123-D) ***');
      return;
    }

    var plateTaken = db.policies.some(function (p) {
      return p.plate === f.plate && (p.status === 'Active' || p.status === 'Pending');
    });

    if (plateTaken) {
      msg('*** This plate already has an active or pending policy ***');
      return;
    }

    if (f.value < 50000 || f.value > 20000000) {
      msg('*** Insured value must be between ₹50,000 and ₹2,00,00,000 ***');
      return;
    }

    if (!f.start) {
      msg('*** Enter a valid start date (dd/mm/yyyy) ***');
      return;
    }

    var customerId = custSel;

    if (isNew) {
      customerId = 'C' + pad3(++db.seq.cust);

      db.customers.push({
        id: customerId,
        name: f.name,
        phone: f.phone,
        email: f.email,
        city: f.city
      });
    }

    var today = startOfDay(new Date());
    var end = addYears(f.start, 1);
    var status = 'Active';

    if (f.start > today) {
      status = 'Pending';
    } else if (end < today) {
      status = 'Expired';
    }

    var pol = {
      id: 'POL-' + (++db.seq.pol),
      customerId: customerId,
      make: f.make,
      model: f.model,
      year: f.year,
      plate: f.plate,
      value: f.value,
      coverage: f.coverage,
      premium: premium(f.value, f.coverage, f.year),
      start: iso(f.start),
      end: iso(end),
      status: status
    };

    db.policies.push(pol);
    store.save();

    state.customerId = customerId;
    state.flash = 'Policy ' + pol.id + ' created for ' + f.make + ' ' + f.model + ' (' + f.plate + '). Annual premium ' + money(pol.premium) + '.';

    go('customer');
  }

  function setupClaimForm() {
    var active = db.policies.filter(by('status', 'Active')).filter(function (p) {
      return !state.newFor || p.customerId === state.newFor;
    });

    options($('nc-policy'), active.map(function (p) {
      return {
        value: p.id,
        label: p.id + ' · ' + p.make + ' ' + p.model + ' · ' + p.plate + ' · ' + customerOf(p).name
      };
    }), active.length ? 'Select an option' : 'No active policies');

    options($('nc-type'), CLAIM_TYPES, 'Select an option');

    $('nc-date').value = dmy(iso(new Date()));

    on('nc-amount', 'input', function (e) {
      e.target.value = e.target.value.replace(/\D/g, '');
    });
  }

  function saveClaim() {
    clear('banner');
    clear('field-msg');

    var pid = $('nc-policy').value;
    var type = $('nc-type').value;
    var amount = parseInt(val('nc-amount'), 10);
    var date = parseDMY(val('nc-date'));

    if (!pid || !type || !amount || !val('nc-date')) {
      banner('Complete all the required fields.');
      return;
    }

    var pol = db.policies.filter(by('id', pid))[0];

    if (!date) {
      msg('*** Enter a valid date of incident (dd/mm/yyyy) ***');
      return;
    }

    if (date > new Date() || date < fromIso(pol.start) || date > fromIso(pol.end)) {
      msg('*** The incident date must be within the policy period and not in the future ***');
      return;
    }

    if (amount > pol.value) {
      msg('*** The amount cannot exceed the insured value (' + money(pol.value) + ') ***');
      return;
    }

    var claim = {
      id: 'CLM-' + (++db.seq.clm),
      policyId: pid,
      date: iso(date),
      type: type,
      amount: amount,
      status: 'Open',
      description: val('nc-desc')
    };

    db.claims.push(claim);
    store.save();

    state.customerId = pol.customerId;
    state.flash = 'Claim ' + claim.id + ' registered on ' + pid + ' for ' + money(amount) + '. Status: Open.';

    go('customer');
  }

  var routes = {
    dashboard: pageDashboard,
    customer: pageCustomer,
    new: pageNew
  };

  function hashName() {
    try {
      return location.hash.replace('#/', '') || 'dashboard';
    } catch (e) {
      return 'dashboard';
    }
  }

  function setUrl(name, replace) {
    try {
      (replace ? history.replaceState : history.pushState).call(history, null, '', '#/' + name);
    } catch (e) {}
  }

  function go(name) {
    render(name, false);
  }

  function render(name, replace) {
    if (!routes[name]) {
      name = 'dashboard';
    }

    if (name === 'customer' && !state.customerId) {
      name = 'dashboard';
    }

    setUrl(name, replace);
    routes[name]();
    updateBell();

    if (state.flash) {
      toast(state.flash);
      state.flash = null;
    }

    try {
      window.scrollTo(0, 0);
    } catch (e) {}
  }

  window.addEventListener('popstate', function () {
    render(hashName(), true);
  });

  function runIntro(done) {
    var root = document.documentElement;
    var splash = $('splash');
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (calm) {
      splash.remove();
      root.classList.remove('intro-on');
      done();
      return;
    }

    setTimeout(function () {
      splash.classList.add('is-leaving');
      root.classList.remove('intro-on');
      done();
    }, 1700);

    setTimeout(function () {
      splash.remove();
    }, 2400);
  }

  window.__deskReady = true;

  store.load();
  buildChrome();

  runIntro(function () {
    render(hashName(), true);
  });
})();
