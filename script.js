/* Portfolio interactions — vanilla JS, no dependencies. */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var MOBILE_BP = 760;

  /* ------------------------------------------------------------------
     Current year
     ------------------------------------------------------------------ */
  var year = String(new Date().getFullYear());
  document.querySelectorAll(".js-year").forEach(function (el) {
    el.textContent = year;
  });

  /* ------------------------------------------------------------------
     Header state on scroll
     ------------------------------------------------------------------ */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------
     Mobile navigation
     ------------------------------------------------------------------ */
  var toggle = document.querySelector(".nav__toggle");
  var menu = document.getElementById("nav-menu");

  function isOpen() {
    return toggle && toggle.getAttribute("aria-expanded") === "true";
  }

  function setMenu(open, returnFocus) {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    if (!open && returnFocus) toggle.focus();
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      setMenu(!isOpen());
    });

    // Close after choosing a link
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (e) {
      if (!isOpen()) return;

      // Escape closes and returns focus to the toggle
      if (e.key === "Escape") {
        setMenu(false, true);
        return;
      }

      // Keep Tab focus inside the open menu (toggle + links)
      if (e.key === "Tab") {
        var focusables = [toggle].concat(Array.prototype.slice.call(menu.querySelectorAll("a")));
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // Reset when resizing back to desktop
    window.addEventListener("resize", function () {
      if (window.innerWidth > MOBILE_BP && isOpen()) setMenu(false);
    });
  }

  /* ------------------------------------------------------------------
     Scroll reveal (staggered among siblings)
     ------------------------------------------------------------------ */
  var revealEls = document.querySelectorAll(".reveal");
  var groups = new Map();

  revealEls.forEach(function (el) {
    var parent = el.parentElement;
    var i = groups.get(parent) || 0;
    el.style.setProperty("--delay", Math.min(i, 4) * 0.08 + "s");
    groups.set(parent, i + 1);
  });

  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    var revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -48px 0px" }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ------------------------------------------------------------------
     Active nav link for the section in view
     ------------------------------------------------------------------ */
  var navLinks = document.querySelectorAll(".nav__link");
  var sections = document.querySelectorAll("main section[id]");

  function setActive(id) {
    navLinks.forEach(function (link) {
      var active = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  if ("IntersectionObserver" in window && sections.length) {
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach(function (s) { navObserver.observe(s); });

    // Clear the highlight when back in the hero
    window.addEventListener("scroll", function () {
      if (sections[0] && window.scrollY < sections[0].offsetTop - window.innerHeight * 0.5) {
        setActive(null);
      }
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     Project cards: pointer-follow glow (fine pointers only)
     ------------------------------------------------------------------ */
  var cards = document.querySelectorAll(".project__link");

  cards.forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      if (!finePointer.matches || reduceMotion.matches) return;
      var rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - rect.left + "px");
      card.style.setProperty("--my", e.clientY - rect.top + "px");
    });

    // Placeholder cards have no case study yet — don't jump to the top
    if (card.hasAttribute("data-placeholder")) {
      card.addEventListener("click", function (e) {
        if (card.getAttribute("href") === "#") e.preventDefault();
      });
    }
  });

  /* ------------------------------------------------------------------
     Copy email
     ------------------------------------------------------------------ */
  var copyBtn = document.querySelector(".js-copy");
  var copyStatus = document.querySelector(".js-copy-status");

  if (copyBtn) {
    var label = copyBtn.textContent;
    var resetTimer;

    copyBtn.addEventListener("click", function () {
      var value = copyBtn.getAttribute("data-copy") || "";

      function done(ok) {
        copyBtn.textContent = ok ? "Copied" : "Copy failed";
        copyBtn.classList.toggle("is-copied", ok);
        if (copyStatus) copyStatus.textContent = ok ? "Email address copied to clipboard" : "Could not copy email address";
        clearTimeout(resetTimer);
        resetTimer = setTimeout(function () {
          copyBtn.textContent = label;
          copyBtn.classList.remove("is-copied");
          if (copyStatus) copyStatus.textContent = "";
        }, 2000);
      }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(function () { done(true); }, function () { done(false); });
      } else {
        // Fallback for file:// previews and older browsers
        var ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
        document.body.removeChild(ta);
        done(ok);
      }
    });
  }
})();
