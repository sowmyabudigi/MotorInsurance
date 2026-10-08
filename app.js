/* enhance.js - add-on for Motor Insurance Desk.
   Works alongside your existing app.js (does not replace it).
   1) Puts the real car photo on the dashboard
   2) Counts KPI numbers up
   3) Fixes the greeting to match the time of day */
(function () {
  var CAR = 'images/cars/hyundai-i20.webp';
  var content = document.getElementById('content');
  if (!content) return;

  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  new Image().src = CAR; // preload so it doesn't pop in late

  function swapCar(root) {
    root.querySelectorAll('img.spot__img:not([data-car])').forEach(function (img) {
      img.setAttribute('data-car', '1');
      var old = img.getAttribute('src');
      // if the new photo is missing, quietly go back to the old image
      img.addEventListener('error', function () { if (old) img.src = old; }, { once: true });
      img.src = CAR;
      img.alt = 'Hyundai i20';
    });
  }

  function countUp(root) {
    if (calm) return;
    root.querySelectorAll('.kpi__value:not([data-cu])').forEach(function (el) {
      el.setAttribute('data-cu', '1');
      if (el.children.length) return;
      var m = el.textContent.trim().match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
      if (!m) return;
      var raw = m[2], end = parseFloat(raw.replace(/,/g, ''));
      if (!isFinite(end) || end === 0) return;
      var dec = (raw.split('.')[1] || '').length, comma = raw.indexOf(',') > -1, t0 = null;
      function fmt(v) {
        return comma
          ? v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })
          : v.toFixed(dec);
      }
      function step(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / 900, 1), e = 1 - Math.pow(1 - p, 3);
        el.textContent = m[1] + fmt(end * e) + m[3];
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  function greet(root) {
    root.querySelectorAll('.hero__hello:not([data-g])').forEach(function (el) {
      el.setAttribute('data-g', '1');
      if (el.children.length) return;
      var h = new Date().getHours();
      var g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
      el.textContent = el.textContent.replace(/good\s+(morning|afternoon|evening)/i, g);
    });
  }

  var queued = false;
  function run() {
    queued = false;
    swapCar(content); greet(content); countUp(content);
  }
  new MutationObserver(function () {
    if (!queued) { queued = true; requestAnimationFrame(run); }
  }).observe(content, { childList: true, subtree: true });
  run();
})();
