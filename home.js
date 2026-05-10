/* Social Eagle — home page interactions
   Principles: respect prefers-reduced-motion, use IntersectionObserver
   (no scroll listeners), transform/opacity only, no audio. */
(() => {
  'use strict';

  const reduce =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─── Sticky-nav state on scroll past hero ─────────────── */
  const nav = document.querySelector('[data-nav]');
  if (nav) {
    const navObs = new IntersectionObserver(
      ([entry]) => nav.classList.toggle('is-scrolled', !entry.isIntersecting),
      { rootMargin: '-72px 0px 0px 0px', threshold: 0 }
    );
    const sentinel = document.createElement('div');
    sentinel.style.cssText =
      'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;';
    document.body.prepend(sentinel);
    navObs.observe(sentinel);
  }

  /* ─── Wings: ready (fade in) on load, faded (out) when L1 leaves ── */
  const wings = document.querySelector('[data-wings]');
  const heroSection = document.querySelector('.level-1');
  if (wings && heroSection && !reduce) {
    requestAnimationFrame(() => wings.classList.add('is-ready'));
    const wingObs = new IntersectionObserver(
      ([entry]) => wings.classList.toggle('is-faded', !entry.isIntersecting),
      { threshold: 0.05 }
    );
    wingObs.observe(heroSection);
  } else if (wings) {
    wings.classList.add('is-ready'); // static visibility for reduced-motion
  }

  /* ─── Reveal-on-scroll (stagger by index in container) ─── */
  const targets = document.querySelectorAll('[data-reveal]');
  if (targets.length) {
    if (reduce) {
      targets.forEach((el) => el.classList.add('is-in'));
    } else {
      const revealObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const siblings = Array.from(
              el.parentElement.querySelectorAll('[data-reveal]')
            );
            const idx = Math.max(0, siblings.indexOf(el));
            el.style.transitionDelay = Math.min(idx * 80, 400) + 'ms';
            el.classList.add('is-in');
            revealObs.unobserve(el);
          });
        },
        { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
      );
      targets.forEach((el) => revealObs.observe(el));
    }
  }

  /* ─── Mark whole levels in/out so margin-eagles can react ── */
  const levels = document.querySelectorAll('.level-2, .level-4');
  if (levels.length && !reduce) {
    const lvlObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) =>
          e.target.classList.toggle('is-in', e.isIntersecting)
        );
      },
      { threshold: 0.35 }
    );
    levels.forEach((l) => lvlObs.observe(l));
  } else {
    levels.forEach((l) => l.classList.add('is-in'));
  }
})();
