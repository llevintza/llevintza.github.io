/* Shared mockup behaviour: theme toggle + scroll reveal. No dependencies. */
(function () {
  var root = document.documentElement;
  var KEY = 'mockup-theme';
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  } catch (e) {}

  function current() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function sync(btn) {
    var dark = current() === 'dark';
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  document.addEventListener('DOMContentLoaded', function () {
    root.classList.add('js');
    var btn = document.querySelector('[data-theme-toggle]');
    if (btn) {
      sync(btn);
      btn.addEventListener('click', function () {
        var next = current() === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem(KEY, next); } catch (e) {}
        sync(btn);
      });
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { sync(btn); });
    }

    var items = document.querySelectorAll('[data-reveal]');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });

    /* Table of contents: highlight the section in view. */
    var toc = document.querySelectorAll('.toc a[href^="#"]');
    if (toc.length) {
      var map = {};
      toc.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
      var tio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            toc.forEach(function (a) { a.removeAttribute('aria-current'); });
            var a = map[e.target.id];
            if (a) a.setAttribute('aria-current', 'true');
          }
        });
      }, { rootMargin: '0px 0px -70% 0px' });
      Object.keys(map).forEach(function (id) { var h = document.getElementById(id); if (h) tio.observe(h); });
    }
  });
})();
