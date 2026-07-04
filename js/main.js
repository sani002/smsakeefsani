/* =============================================================
   S. M. Sakeef Sani — Main Script
   ============================================================= */

'use strict';

/* ── CANVAS SCROLL-VIDEO ─────────────────────────────────── */
(function initScrollCanvas() {
  const canvas = document.getElementById('scroll-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const TOTAL_FRAMES = 74;
  let currentFrame = 0;
  let rafPending = false;

  /* Pre-load all frames */
  const frames = Array.from({ length: TOTAL_FRAMES }, (_, i) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = `assets/frames/frame_${String(i).padStart(4, '0')}.webp`;
    return img;
  });

  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    drawFrame(currentFrame);
  }

  function drawFrame(idx) {
    const img = frames[idx];
    if (!img || !img.complete || !img.naturalWidth) return;

    const scaleX = canvas.width  / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;
    const scale  = Math.max(scaleX, scaleY);
    const dx = (canvas.width  - img.naturalWidth  * scale) / 2;
    const dy = (canvas.height - img.naturalHeight * scale) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, dx, dy, img.naturalWidth * scale, img.naturalHeight * scale);
  }

  const overlay = document.getElementById('canvas-overlay');

  function onScroll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      const max  = document.documentElement.scrollHeight - window.innerHeight;
      const frac = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      const fi   = Math.min(TOTAL_FRAMES - 1, Math.floor(frac * TOTAL_FRAMES));

      if (fi !== currentFrame) {
        currentFrame = fi;
        drawFrame(currentFrame);
      }

      /* Scroll progress bar */
      const prog = document.getElementById('prog');
      if (prog) prog.style.width = (frac * 100) + '%';

      /* Scroll-driven background overlay: 0.7 at top → 0.9 at bottom */
      if (overlay) overlay.style.opacity = (0.7 + frac * 0.2).toFixed(3);

      /* Feed scroll fraction to ambient audio engine */
      if (window.__scrollAudio) window.__scrollAudio.update(frac);

      rafPending = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resizeCanvas, { passive: true });

  resizeCanvas();

  /* Draw first frame as soon as it loads */
  if (frames[0].complete) {
    drawFrame(0);
  } else {
    frames[0].addEventListener('load', () => drawFrame(0), { once: true });
  }
}());


/* ── CURSOR GLOW ─────────────────────────────────────────── */
(function initCursorGlow() {
  const glow = document.getElementById('cg');
  if (!glow || window.matchMedia('(pointer: coarse)').matches) return;

  window.addEventListener('mousemove', (e) => {
    glow.style.left = e.clientX + 'px';
    glow.style.top  = e.clientY + 'px';
  }, { passive: true });
}());


/* ── SCROLL REVEAL (IntersectionObserver) ────────────────── */
(function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('on');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.rv').forEach((el) => observer.observe(el));
}());


/* ── ANIMATED COUNTERS ───────────────────────────────────── */
(function initCounters() {
  function animateCount(el, target, duration) {
    const t0 = performance.now();
    (function tick(now) {
      const progress = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); /* ease-out cubic */
      el.textContent = Math.floor(eased * target);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = target;
      }
    }(performance.now()));
  }

  /* Start all counters immediately on page load — 3 s to reach final value */
  document.querySelectorAll('[data-count]').forEach((el) => {
    animateCount(el, parseInt(el.dataset.count, 10), 3000);
  });
}());


/* ── TYPEWRITER ──────────────────────────────────────────── */
(function initTypewriter() {
  const el = document.getElementById('tw');
  if (!el) return;

  const phrases = [
    'an Engineer.',
    'an AI Researcher.',
    'an Entrepreneur.',
    'an Animator & VFX Artist.',
    'an Innovator.'
  ];

  let phraseIndex = 0;
  let charIndex   = 0;
  let isDeleting  = false;

  function tick() {
    const phrase = phrases[phraseIndex];

    if (!isDeleting) {
      el.textContent = phrase.slice(0, ++charIndex);
      if (charIndex === phrase.length) {
        isDeleting = true;
        return setTimeout(tick, 1500);
      }
      setTimeout(tick, 80);
    } else {
      el.textContent = phrase.slice(0, --charIndex);
      if (charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        return setTimeout(tick, 220);
      }
      setTimeout(tick, 42);
    }
  }

  tick();
}());


/* ── LAZY-LOAD GALLERY IMAGES ────────────────────────────── */
(function initLazyLoad() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      img.src = img.dataset.src;
      img.addEventListener('load', () => img.classList.add('vis'), { once: true });
      if (img.complete) img.classList.add('vis');
      observer.unobserve(img);
    });
  }, { rootMargin: '300px' });

  document.querySelectorAll('.gal-item img[data-src]').forEach((img) => observer.observe(img));
}());


/* ── LIGHTBOX ────────────────────────────────────────────── */
(function initLightbox() {
  const lb    = document.getElementById('lb');
  const lbImg = document.getElementById('lb-img');
  const lbCap = document.getElementById('lb-cap');
  const lbBtn = document.getElementById('lb-close');
  if (!lb) return;

  function openLightbox(src, caption) {
    lbImg.src = src;
    lbCap.textContent = caption || '';
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lbBtn.focus();
  }

  function closeLightbox() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    lbImg.src = '';
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.gal-item').forEach((item) => {
    item.addEventListener('click', () => {
      const src     = item.dataset.full || item.querySelector('img').src;
      const caption = item.querySelector('.gal-cap')?.textContent || '';
      openLightbox(src, caption);
    });

    /* Keyboard accessibility */
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });
  });

  lbBtn.addEventListener('click', closeLightbox);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
}());


/* ── HAMBURGER (desktop only — mobile uses dock, button is hidden) ── */
(function initHamburger() {
  const btn   = document.getElementById('nav-hamburger');
  const links = document.getElementById('nav-links');
  if (!btn || !links) return;

  function close() {
    btn.classList.remove('open');
    links.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', String(isOpen));
  });

  links.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !links.contains(e.target)) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}());


/* ── NAV ACTIVE SECTION HIGHLIGHT ───────────────────────── */
(function initNavHighlight() {
  const navLinks = document.querySelectorAll('.nav-links a');
  const sectionIds = ['research', 'awards', 'experience', 'creative', 'gallery'];

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach((a) => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + id);
      });
    });
  }, { threshold: 0.35 });

  sectionIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}());


/* ── SCROLL AMBIENT AUDIO ────────────────────────────────── */
(function initScrollAudio() {
  if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') return;

  let ctx, masterGain, filterNode, fadeTimer;
  let prevFrac = 0;
  let built = false;

  /* Drone pitches: low pentatonic minor gives that mysterious, hovering quality */
  const DRONES = [
    { hz: 41.2,  amp: 0.13 },  /* E1  — deep sub bass rumble  */
    { hz: 55.0,  amp: 0.11 },  /* A1  — root drone             */
    { hz: 65.4,  amp: 0.08 },  /* C2  — minor third            */
    { hz: 82.4,  amp: 0.07 },  /* E2  — fifth                  */
    { hz: 98.0,  amp: 0.05 },  /* G2  — flatted seventh        */
    { hz: 110.0, amp: 0.04 },  /* A2  — upper root             */
    { hz: 130.8, amp: 0.03 },  /* C3  — breathy upper third    */
    { hz: 220.0, amp: 0.015 }, /* A3  — airy shimmer           */
  ];

  function build() {
    if (built) return;
    built = true;

    ctx = new (window.AudioContext || window.webkitAudioContext)();

    /* Master output — starts silent */
    masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);

    /* Long hall reverb: two cascaded comb delays */
    function makeReverb(wet) {
      const pre  = ctx.createDelay(0.08); pre.delayTime.value  = 0.07;
      const d1   = ctx.createDelay(3.0);  d1.delayTime.value   = 1.4;
      const d2   = ctx.createDelay(3.0);  d2.delayTime.value   = 1.9;
      const fb1  = ctx.createGain();      fb1.gain.value       = 0.42;
      const fb2  = ctx.createGain();      fb2.gain.value       = 0.36;
      const wetG = ctx.createGain();      wetG.gain.value      = wet;
      pre.connect(d1); d1.connect(fb1); fb1.connect(d1); fb1.connect(wetG);
      pre.connect(d2); d2.connect(fb2); fb2.connect(d2); fb2.connect(wetG);
      wetG.connect(masterGain);
      return pre; /* return input node */
    }
    const reverbIn = makeReverb(0.55);

    /* Scroll-swept low-pass filter — dark & muffled at top, opens up while scrolling */
    filterNode = ctx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = 160;
    filterNode.Q.value = 2.2;
    filterNode.connect(masterGain);  /* dry path */
    filterNode.connect(reverbIn);   /* wet path  */

    /* Oscillator bank */
    DRONES.forEach(({ hz, amp }, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      /* Alternate sine / triangle for texture */
      osc.type = i % 3 === 0 ? 'triangle' : 'sine';
      osc.frequency.value = hz;
      /* Tiny random detune so beats form between layers */
      osc.detune.value = (Math.random() - 0.5) * 10;
      gain.gain.value = amp;
      osc.connect(gain);
      gain.connect(filterNode);
      osc.start();
    });
  }

  function update(frac) {
    if (!built) return;

    const delta = frac - prevFrac;          /* positive = down, negative = up */
    const speed = Math.abs(delta);
    prevFrac = frac;

    /* Filter frequency tracks scroll position — going back up reverses it */
    const targetHz = 160 + frac * 1100;    /* 160 Hz (muffled) → 1260 Hz (bright) */
    filterNode.frequency.setTargetAtTime(targetHz, ctx.currentTime, 0.7);

    /* Volume: rises when scrolling, fades to a quiet hum when still */
    if (speed > 0.0004) {
      clearTimeout(fadeTimer);
      const vol = Math.min(0.38, speed * 120 + 0.08);
      masterGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.12);
      fadeTimer = setTimeout(() => {
        masterGain.gain.setTargetAtTime(0.05, ctx.currentTime, 1.6);
      }, 280);
    }
  }

  /* Expose to the scroll RAF (already wired above) */
  window.__scrollAudio = { update };

  /* Web Audio requires a user gesture before the context can run */
  function onGesture() {
    build();
    /* Resume context if browser suspended it */
    if (ctx && ctx.state === 'suspended') ctx.resume();
    document.removeEventListener('click',      onGesture);
    document.removeEventListener('touchstart', onGesture);
    document.removeEventListener('keydown',    onGesture);
    document.removeEventListener('scroll',     onGesture);
  }

  document.addEventListener('click',      onGesture, { passive: true, once: true });
  document.addEventListener('touchstart', onGesture, { passive: true, once: true });
  document.addEventListener('keydown',    onGesture, { passive: true, once: true });
  document.addEventListener('scroll',     onGesture, { passive: true, once: true });
}());
