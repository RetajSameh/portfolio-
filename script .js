/* =========================================================
   Retaj Sameh | Portfolio script (vanilla JavaScript)
   Works with the existing index.html and style.css.

   1. Setup & helpers        6. Project filters
   2. Reveal on scroll       7. Image viewer (ERD lightbox)
   3. Mobile menu            8. Footer year
   4. Header & back-to-top
   5. Active nav link
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 1. Setup & helpers ---------- */
  // Tells the small safety script in <head> that this file loaded,
  // so it does not switch the reveal effect off.
  window.__portfolioReady = true;

  var root = document.documentElement;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(selector, scope) { return (scope || document).querySelector(selector); }
  function $$(selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); }

  // Runs the callback at most once per animation frame (keeps scrolling smooth).
  function onFrame(callback) {
    var waiting = false;
    return function () {
      if (waiting) return;
      waiting = true;
      window.requestAnimationFrame(function () {
        waiting = false;
        callback();
      });
    };
  }

  /* ---------- 2. Reveal on scroll ----------
     CSS hides ".js .reveal" until it also has ".is-visible".
     If anything goes wrong, every element is shown instead of staying hidden. */
  function showAllRevealElements() {
    $$('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
  }

  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      showAllRevealElements();
      return;
    }

    try {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0,
        rootMargin: '0px 0px -8% 0px' // reveal a little after entering, works for tall blocks too
      });
      items.forEach(function (el) { observer.observe(el); });
    } catch (error) {
      showAllRevealElements();
    }

    // Last-resort safety net: never leave content hidden.
    window.setTimeout(function () {
      var stillHidden = $$('.reveal:not(.is-visible)').some(function (el) {
        var rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });
      if (stillHidden) showAllRevealElements();
    }, 2500);
  }

  /* ---------- 3. Mobile menu ---------- */
  var header = $('.site-header');
  var navToggle = $('.nav-toggle');
  var siteNav = $('#site-nav');
  var desktopQuery = window.matchMedia('(min-width: 861px)'); // matches the CSS breakpoint

  function setMenu(open) {
    if (!navToggle || !siteNav) return;
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    siteNav.classList.toggle('is-open', open);
    if (header) header.classList.toggle('menu-open', open);
  }

  function isMenuOpen() {
    return !!navToggle && navToggle.getAttribute('aria-expanded') === 'true';
  }

  function initMenu() {
    if (!navToggle || !siteNav) return;

    navToggle.addEventListener('click', function () { setMenu(!isMenuOpen()); });

    // Close after choosing a link
    $$('a', siteNav).forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });

    // Close with Escape and return focus to the button
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isMenuOpen()) {
        setMenu(false);
        navToggle.focus();
      }
    });

    // Close when clicking outside the header
    document.addEventListener('click', function (event) {
      if (isMenuOpen() && header && !header.contains(event.target)) setMenu(false);
    });

    // Reset when the screen grows to desktop size
    var onChange = function (event) { if (event.matches) setMenu(false); };
    if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', onChange);
    else if (desktopQuery.addListener) desktopQuery.addListener(onChange);
  }

  /* ---------- 4. Header background & back-to-top button ---------- */
  var toTop = $('#to-top');

  function updateScrollState() {
    var y = window.pageYOffset || root.scrollTop;
    if (header) header.classList.toggle('is-scrolled', y > 10);
    if (toTop) toTop.hidden = y < 600;
  }

  /* ---------- 5. Active navigation link ----------
     Uses the sections that exist in the page. "Education" has no menu link,
     so no link is highlighted while it is on screen. */
  var navLinks = $$('[data-nav]');
  var trackedSections = [];

  function setupActiveNav() {
    if (!navLinks.length) return;
    var ids = ['home', 'about', 'skills', 'projects', 'services', 'education', 'contact'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) trackedSections.push(el);
    });
  }

  function updateActiveNav() {
    if (!trackedSections.length) return;
    var headerHeight = header ? header.offsetHeight : 72;
    var marker = (window.pageYOffset || root.scrollTop) + headerHeight + window.innerHeight * 0.25;
    var current = trackedSections[0];

    trackedSections.forEach(function (section) {
      if (section.offsetTop <= marker) current = section;
    });

    // At the very bottom, the last section (Contact) wins
    var atBottom = window.innerHeight + (window.pageYOffset || root.scrollTop) >= root.scrollHeight - 4;
    if (atBottom) current = trackedSections[trackedSections.length - 1];

    var targetHash = '#' + current.id;
    navLinks.forEach(function (link) {
      var active = link.getAttribute('href') === targetHash;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  function initScrollEffects() {
    setupActiveNav();
    var handler = onFrame(function () {
      updateScrollState();
      updateActiveNav();
    });
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
    window.addEventListener('load', handler);
    handler();
  }

  /* ---------- 6. Project filters ---------- */
  function initFilters() {
    var buttons = $$('.filter-btn');
    var cards = $$('.project-card');
    var status = $('#filter-status');
    if (!buttons.length || !cards.length) return;

    var timer = null;
    var FADE_MS = 250; // matches the .25s card transition in the CSS

    function finish(filter) {
      cards.forEach(function (card) {
        var show = filter === 'all' || card.getAttribute('data-category') === filter;
        card.hidden = !show;
        card.classList.remove('is-leaving', 'is-entering');
      });
    }

    function applyFilter(filter) {
      if (timer) { window.clearTimeout(timer); timer = null; }

      buttons.forEach(function (btn) {
        var active = btn.getAttribute('data-filter') === filter;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });

      var visibleCount = cards.filter(function (card) {
        return filter === 'all' || card.getAttribute('data-category') === filter;
      }).length;

      if (prefersReducedMotion) {
        finish(filter);
      } else {
        // Fade out the cards that leave
        cards.forEach(function (card) {
          var show = filter === 'all' || card.getAttribute('data-category') === filter;
          if (!show && !card.hidden) card.classList.add('is-leaving');
        });
        timer = window.setTimeout(function () {
          cards.forEach(function (card) {
            var show = filter === 'all' || card.getAttribute('data-category') === filter;
            card.classList.remove('is-leaving');
            if (show && card.hidden) {
              card.hidden = false;
              card.classList.add('is-entering');
              void card.offsetWidth; // let the browser register the starting state
              card.classList.remove('is-entering');
            } else if (!show) {
              card.hidden = true;
            }
          });
          timer = null;
        }, FADE_MS);
      }

      if (status) {
        var activeButton = buttons.filter(function (b) { return b.getAttribute('data-filter') === filter; })[0];
        var label = activeButton ? activeButton.textContent.trim() : 'All Projects';
        status.textContent = 'Showing ' + visibleCount + (visibleCount === 1 ? ' project' : ' projects') + ': ' + label + '.';
      }
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyFilter(btn.getAttribute('data-filter') || 'all');
      });
    });
  }

  /* ---------- 7. Image viewer (ERD lightbox) ---------- */
  function initLightbox() {
    var dialog = $('#lightbox');
    var image = $('#lightbox-img');
    var openLink = $('#lightbox-open');
    var zoomBtn = $('#lightbox-zoom');
    var closeBtn = $('#lightbox-close');
    var triggers = $$('[data-lightbox]');
    if (!dialog || !image || !triggers.length) return;

    function resetZoom() {
      dialog.classList.remove('is-actual');
      if (zoomBtn) {
        zoomBtn.setAttribute('aria-pressed', 'false');
        zoomBtn.textContent = 'Show actual size';
      }
    }

    function openViewer(src, alt) {
      image.src = src;
      image.alt = alt || '';
      if (openLink) openLink.href = src;
      resetZoom();
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
      document.body.classList.add('no-scroll');
      var body = $('.lightbox-body', dialog);
      if (body) { body.scrollTop = 0; body.scrollLeft = 0; }
    }

    function closeViewer() {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      else dialog.removeAttribute('open');
      cleanup();
    }

    function cleanup() {
      document.body.classList.remove('no-scroll');
      resetZoom();
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        openViewer(trigger.getAttribute('data-lightbox'), trigger.getAttribute('data-lightbox-alt'));
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeViewer);

    if (zoomBtn) {
      zoomBtn.addEventListener('click', function () {
        var actual = dialog.classList.toggle('is-actual');
        zoomBtn.setAttribute('aria-pressed', String(actual));
        zoomBtn.textContent = actual ? 'Fit to screen' : 'Show actual size';
      });
    }

    // Click on the dark backdrop closes the viewer
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) closeViewer();
    });

    // Fires for Escape, the close button, and dialog.close()
    dialog.addEventListener('close', cleanup);
  }

  /* ---------- 8. Footer year ---------- */
  function initYear() {
    var year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* ---------- Start everything ---------- */
  // Each part is isolated so one problem can never stop the others
  // (and never leaves the page content hidden).
  [initReveal, initMenu, initScrollEffects, initFilters, initLightbox, initYear].forEach(function (init) {
    try { init(); } catch (error) {
      if (window.console) console.error('Portfolio script:', init.name, error);
      if (init === initReveal) showAllRevealElements();
    }
  });
})();
