/* ════════════════════════════════════════════════════════
   Social Eagle — home page (immersive)
   - Single rAF scroll loop drives parallax, wings, eagle, stats
   - Wing-shadow sweep every ~1000px scroll
   - Strike flash on Level 4 entry
   - Ambient wind via Web Audio API (no asset, opt-in)
   - Reduced-motion: all scroll FX disabled, statics shown
   ══════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const reduce =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ─────────────────────────────────────────────
     Nav state on scroll past hero
     ───────────────────────────────────────────── */
  const nav = $('[data-nav]');
  if (nav) {
    const sentinel = document.createElement('div');
    sentinel.style.cssText =
      'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;';
    document.body.prepend(sentinel);
    new IntersectionObserver(
      ([e]) => nav.classList.toggle('is-scrolled', !e.isIntersecting),
      { rootMargin: '-72px 0px 0px 0px', threshold: 0 }
    ).observe(sentinel);
  }

  /* ─────────────────────────────────────────────
     Hero word reveal (immediate)
     ───────────────────────────────────────────── */
  $$('[data-reveal-word]').forEach((el, i) => {
    if (reduce) { el.classList.add('is-in'); return; }
    el.style.transitionDelay = i * 120 + 'ms';
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
  });

  /* ─────────────────────────────────────────────
     IO-based reveal (cases, etc.)
     ───────────────────────────────────────────── */
  const revealEls = $$('[data-reveal]');
  if (reduce) {
    revealEls.forEach((el) => el.classList.add('is-in'));
  } else if (revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const sibs = Array.from(el.parentElement.querySelectorAll('[data-reveal]'));
        const idx = Math.max(0, sibs.indexOf(el));
        el.style.transitionDelay = Math.min(idx * 80, 400) + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      }),
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ─────────────────────────────────────────────
     Strike flash on L4 entry
     ───────────────────────────────────────────── */
  const strike = $('[data-strike]');
  const level4 = $('.level-4');
  if (strike && level4 && !reduce) {
    new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio > 0.25) {
          strike.classList.add('is-strike');
          setTimeout(() => strike.classList.remove('is-strike'), 220);
        }
      }),
      { threshold: [0, 0.25, 0.5] }
    ).observe(level4);
  }

  /* ─────────────────────────────────────────────
     Talon-grip release animation on click
     ───────────────────────────────────────────── */
  $$('.btn--talon').forEach((btn) => {
    btn.addEventListener('pointerup', () => {
      btn.classList.remove('is-released');
      void btn.offsetWidth; // restart anim
      btn.classList.add('is-released');
    });
    btn.addEventListener('animationend', () => btn.classList.remove('is-released'));
  });

  /* ─────────────────────────────────────────────
     3D tilt on path cards (mouse)
     ───────────────────────────────────────────── */
  if (!reduce) {
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (ev) => {
        const r = card.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width  - 0.5;
        const y = (ev.clientY - r.top)  / r.height - 0.5;
        card.style.setProperty('--ry', (x * 8).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--rx', '0deg');
      });
    });
  }

  /* ─────────────────────────────────────────────
     Scroll-driven loop (rAF coalesced)
     Drives:
      - parallax px-layers
      - wings translate up + fade out
      - stat thermal-current lift
      - eagle right-margin position + climb→dive morph
      - level-5 eye ken-burns scale tied to scroll
      - wing-shadow sweep every ~1000px
     ───────────────────────────────────────────── */
  if (!reduce) {
    const pxLayers = $$('.px-layer');
    const wings    = $('[data-wings]');
    const stats    = $$('[data-thermal]');
    const eagleEl  = $('[data-eagle-track]');
    const eagleSh  = $('[data-eagle-shape]');
    const eyeImg   = $('[data-eye] img');
    const wingShEl = $('[data-wing-shadow]');

    // Use href swap for the eagle SVG to morph climb↔dive
    const useEl = eagleSh ? eagleSh.querySelector('use') : null;
    let currentShape = 'climb';
    const setShape = (name) => {
      if (!useEl || currentShape === name) return;
      useEl.setAttribute('href', '#eagle-' + name);
      currentShape = name;
    };

    const heroEl = $('.level-1');

    let lastY = -1;
    let ticking = false;
    let lastSweepBucket = -1;
    let sweepInFlight   = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    const update = () => {
      ticking = false;
      const y = window.scrollY || window.pageYOffset;
      if (y === lastY) return;
      lastY = y;
      const vh = window.innerHeight;

      // Show eagle once we're a bit past the hero
      if (eagleEl) eagleEl.classList.toggle('is-visible', y > vh * 0.5);

      // 1) Parallax layers
      pxLayers.forEach((el) => {
        const k = parseFloat(el.dataset.px || '0.3');
        el.style.transform = 'translate3d(0,' + (-y * k).toFixed(1) + 'px,0)';
      });

      // 2) Wings: drift up, fade out across hero
      if (wings) {
        const heroH = heroEl ? heroEl.offsetHeight : vh;
        const t = Math.min(1, y / heroH);
        const lift = -t * 220;
        const opacity = Math.max(0, 0.6 - t * 0.7);
        const left  = wings.querySelector('.wings__left');
        const right = wings.querySelector('.wings__right');
        if (left)  left.style.setProperty('--w-y', lift + 'px');
        if (right) right.style.setProperty('--w-y', lift + 'px');
        if (left)  left.style.setProperty('--w-o', opacity);
        if (right) right.style.setProperty('--w-o', opacity);
        if (left)  left.style.opacity  = opacity;
        if (right) right.style.opacity = opacity;
      }

      // 3) Stat thermal lift — each stat rises while in viewport
      stats.forEach((el) => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        // Progress: 0 when stat is at bottom of viewport, 1 at top
        const p = Math.max(0, Math.min(1, 1 - center / vh));
        const lift = -p * 32; // px
        el.style.setProperty('--t', lift.toFixed(1) + 'px');
      });

      // 4) Eagle right-margin: position + shape morph
      if (eagleSh) {
        const doc = document.documentElement;
        const total = (doc.scrollHeight - vh) || 1;
        const p = Math.max(0, Math.min(1, y / total)); // 0..1 page progress
        // Track from 12% to 88% of viewport vertically
        const vertical = (0.12 + p * 0.76) * vh;
        // Climb (early) → Level (mid) → Dive (late)
        let rot = 0, scale = 1;
        if (p < 0.35) {
          setShape('climb');
          rot = -8 + p * 22;          // -8° to about 0°
          scale = 1;
        } else if (p < 0.65) {
          setShape('climb');
          rot = (p - 0.35) * 30;      // 0° to ~9°
          scale = 1.05;
        } else {
          setShape('dive');
          rot = 12 + (p - 0.65) * 28; // 12° to 22°
          scale = 1.15 + (p - 0.65) * 0.4;
        }
        eagleSh.style.setProperty('--ey', vertical.toFixed(1) + 'px');
        eagleSh.style.setProperty('--er', rot.toFixed(1) + 'deg');
        eagleSh.style.setProperty('--es', scale.toFixed(2));
      }

      // 5) Level-5 eye: subtle ken-burns scale tied to scroll within section
      if (eyeImg) {
        const sect = eyeImg.closest('.level-5');
        if (sect) {
          const r = sect.getBoundingClientRect();
          const visible = Math.max(0, Math.min(1, 1 - r.top / vh));
          const scale = 1.05 + visible * 0.12;
          eyeImg.style.setProperty('--eye-scale', scale.toFixed(3));
          eyeImg.style.transform = 'scale(' + scale.toFixed(3) + ')';
        }
      }

      // 6) Wing-shadow sweep every ~1000px
      const bucket = Math.floor(y / 1000);
      if (bucket !== lastSweepBucket && bucket > 0 && !sweepInFlight && wingShEl) {
        lastSweepBucket = bucket;
        sweepWingShadow(wingShEl);
      }
    };

    const sweepWingShadow = (el) => {
      sweepInFlight = true;
      const top = (10 + Math.random() * 60).toFixed(0) + 'vh';
      el.style.setProperty('--ws-top', top);
      el.style.setProperty('--ws-x', '-100%');
      el.classList.add('is-sweeping');
      // Animate via CSS transition by toggling the var
      requestAnimationFrame(() => {
        const sweep = el.querySelector('svg');
        if (sweep) {
          sweep.animate(
            [
              { transform: 'translate3d(-100%,0,0)' },
              { transform: 'translate3d(80%,0,0)' }
            ],
            { duration: 2400, easing: 'cubic-bezier(0.4,0,0.2,1)' }
          ).onfinish = () => {
            el.classList.remove('is-sweeping');
            sweepInFlight = false;
          };
        } else {
          el.classList.remove('is-sweeping');
          sweepInFlight = false;
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ─────────────────────────────────────────────
     Ambient wind (Web Audio API — synthesised)
     Off by default. Toggle in nav.
     ───────────────────────────────────────────── */
  const soundBtn = $('[data-sound]');
  let audioCtx = null;
  let windNodes = null;

  const startWind = () => {
    if (windNodes) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Buffer of pink noise
    const bufSize = 2 * audioCtx.sampleRate;
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < bufSize; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      data[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11;
      b6 = w * 0.115926;
    }

    const src = audioCtx.createBufferSource();
    src.buffer = buf; src.loop = true;

    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.7;

    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 80;

    // Slow LFO modulating filter cutoff for "gusts"
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 0.13; // very slow
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(lp.frequency);

    const master = audioCtx.createGain();
    master.gain.value = 0;
    src.connect(hp).connect(lp).connect(master).connect(audioCtx.destination);

    src.start();
    lfo.start();
    // Fade in
    master.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 1.5);

    windNodes = { src, lfo, master };
    return true;
  };

  const stopWind = () => {
    if (!windNodes || !audioCtx) return;
    const { src, lfo, master } = windNodes;
    const t = audioCtx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.linearRampToValueAtTime(0, t + 0.6);
    setTimeout(() => {
      try { src.stop(); lfo.stop(); } catch (_) {}
      windNodes = null;
    }, 700);
  };

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const on = soundBtn.getAttribute('aria-pressed') === 'true';
      if (on) {
        stopWind();
        soundBtn.setAttribute('aria-pressed', 'false');
      } else {
        const ok = startWind();
        if (ok !== false) soundBtn.setAttribute('aria-pressed', 'true');
      }
    });
  }
})();
