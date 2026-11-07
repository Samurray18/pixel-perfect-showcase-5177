/* =========================================================
   Snapchat+ landing page — interactions
   ========================================================= */

(function () {
  "use strict";

  function initSnapPlus() {
    const root = document.querySelector(".snapplus-route");
    if (!root || root.dataset.snapReady === "true") return;
    root.dataset.snapReady = "true";

    /* Clean up global listeners from a previous visit --------- */
    if (window.__snapPlusAbort) {
      try {
        window.__snapPlusAbort.abort();
      } catch {
        /* ignore */
      }
    }
    const controller = new AbortController();
    window.__snapPlusAbort = controller;
    const signal = controller.signal;

    /* Sticky header state ----------------------------------- */
    const header = root.querySelector("#site-header");
    const onScroll = () => {
      if (!header) return;
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    window.addEventListener("scroll", onScroll, { passive: true, signal });
    onScroll();

    /* Mobile navigation ------------------------------------- */
    const menuToggle = root.querySelector("#menu-toggle");
    const siteNav = root.querySelector("#site-nav");

    const closeMenu = () => {
      if (!menuToggle || !siteNav) return;
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open menu");
      siteNav.classList.remove("is-open");
    };

    if (menuToggle && siteNav) {
      menuToggle.addEventListener(
        "click",
        () => {
          const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
          menuToggle.setAttribute("aria-expanded", String(!isOpen));
          menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Open menu" : "Close menu"
          );
          siteNav.classList.toggle("is-open", !isOpen);
        },
        { signal }
      );

      siteNav.addEventListener(
        "click",
        (event) => {
          if (event.target.closest("a")) closeMenu();
        },
        { signal }
      );

      document.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Escape") closeMenu();
        },
        { signal }
      );

      document.addEventListener(
        "click",
        (event) => {
          if (
            siteNav.classList.contains("is-open") &&
            !siteNav.contains(event.target) &&
            !menuToggle.contains(event.target)
          ) {
            closeMenu();
          }
        },
        { signal }
      );

      window.addEventListener(
        "resize",
        () => {
          if (window.innerWidth > 820) closeMenu();
        },
        { signal }
      );
    }

    /* FAQ accordion ----------------------------------------- */
    const faqItems = Array.from(root.querySelectorAll(".faq-item"));

    faqItems.forEach((item) => {
      const button = item.querySelector(".faq-question");
      const answer = item.querySelector(".faq-answer");
      if (!button || !answer) return;

      button.addEventListener(
        "click",
        () => {
          const willOpen = !item.classList.contains("open");

          faqItems.forEach((other) => {
            const otherButton = other.querySelector(".faq-question");
            other.classList.remove("open");
            if (otherButton) otherButton.setAttribute("aria-expanded", "false");
          });

          item.classList.toggle("open", willOpen);
          button.setAttribute("aria-expanded", String(willOpen));
        },
        { signal }
      );
    });

    /* Scroll reveal ----------------------------------------- */
    const revealItems = Array.from(root.querySelectorAll(".reveal"));

    if ("IntersectionObserver" in window && revealItems.length) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const siblings = Array.from(el.parentElement.children).filter(
              (node) => node.classList.contains("reveal")
            );
            const index = Math.max(0, siblings.indexOf(el));
            el.style.transitionDelay = `${Math.min(index * 60, 300)}ms`;
            el.classList.add("is-visible");
            observer.unobserve(el);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );

      revealItems.forEach((el) => observer.observe(el));
    } else {
      revealItems.forEach((el) => el.classList.add("is-visible"));
    }

    /* Footer year ------------------------------------------- */
    const year = root.querySelector("#year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  window.initSnapPlus = initSnapPlus;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSnapPlus, { once: true });
  } else {
    initSnapPlus();
  }
})();
