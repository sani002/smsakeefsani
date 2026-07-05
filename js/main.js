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

  /* Frame pool — only frame 0 loads immediately; rest load on idle */
  const frames = new Array(TOTAL_FRAMES).fill(null);

  function frameUrl(i) {
    return `assets/frames/frame_${String(i).padStart(4, '0')}.webp`;
  }

  /* Load frame 0 right away so the canvas is never blank */
  frames[0] = new Image();
  frames[0].decoding = 'async';
  frames[0].src = frameUrl(0);

  function loadRemainingFrames() {
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = frameUrl(i);
      frames[i] = img;
    }
  }

  /* Kick off background frame loading after first frame is ready */
  if (frames[0].complete) {
    'requestIdleCallback' in window
      ? requestIdleCallback(loadRemainingFrames, { timeout: 2000 })
      : setTimeout(loadRemainingFrames, 200);
  } else {
    frames[0].addEventListener('load', () => {
      'requestIdleCallback' in window
        ? requestIdleCallback(loadRemainingFrames, { timeout: 2000 })
        : setTimeout(loadRemainingFrames, 200);
    }, { once: true });
  }

  let lastResizeW = 0;
  let resizeTimer;

  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    lastResizeW   = window.innerWidth;
    drawFrame(currentFrame);
  }

  function onResize() {
    /* Ignore height-only changes (iOS address bar appearing/hiding)
       — those cause the image scale to shift, making content look like
       it jumps horizontally. Only resize when WIDTH actually changes. */
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth !== lastResizeW) resizeCanvas();
    }, 100);
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
  window.addEventListener('resize', onResize, { passive: true });

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

  /* Exposed so entry overlay can trigger counters at the exact right moment */
  window.__startCounters = function () {
    document.querySelectorAll('[data-count]').forEach((el) => {
      animateCount(el, parseInt(el.dataset.count, 10), 3000);
    });
  };

  /* Fallback: start immediately if there's no entry overlay in the DOM */
  if (!document.getElementById('site-entry')) window.__startCounters();
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


/* ── SCROLL CLICK-WHEEL AUDIO ENGINE ────────────────────────
   Called INSIDE the Resume button click handler.
   Creating AudioContext inside a user gesture guarantees running
   state on every browser — no resume() juggling, no suspended state.

   Emulates a mechanical rotary encoder (Apple Watch digital-crown
   style): a fixed number of "detents" span the whole page, so a
   soft tick fires per unit of scroll distance — not a continuous
   tone. Scrolling faster naturally produces a quicker train of
   ticks, and it's silent in between, same as a real click-wheel.
─────────────────────────────────────────────────────────── */
function startAudioEngine() {
  if (window.__scrollAudio) return; /* already running */

  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  /* Create context INSIDE gesture = starts in running state on all browsers */
  const actx = new AC();

  /* Safari unlock: play a 1-sample silent buffer immediately */
  const silentBuf = actx.createBuffer(1, 1, actx.sampleRate);
  const silentSrc = actx.createBufferSource();
  silentSrc.buffer = silentBuf;
  silentSrc.connect(actx.destination);
  silentSrc.start(0);

  /* Belt-and-suspenders: force resume in case anything kept it suspended */
  actx.resume();

  const masterGain = actx.createGain();
  masterGain.gain.value = 0.65; /* each click has its own envelope, so this just sets overall level */

  /* Limiter so overlapping ticks during a fast flick never clip/distort */
  const limiter = actx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value      = 12;
  limiter.ratio.value     = 14;
  limiter.attack.value    = 0.002;
  limiter.release.value   = 0.08;
  masterGain.connect(limiter);
  limiter.connect(actx.destination);

  /* One reusable noise burst, re-triggered (not re-generated) per click */
  const NOISE_DUR = 0.07;
  const noiseBuffer = actx.createBuffer(1, Math.ceil(actx.sampleRate * NOISE_DUR), actx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;

  function playClick(intensity) {
    const now = actx.currentTime;
    const amp = Math.min(1, Math.max(0.16, intensity));

    /* Low, buzzy "grit" — noise heavily lowpassed so it reads as a soft
       rumble/texture rather than a bright click */
    const noise = actx.createBufferSource();
    noise.buffer = noiseBuffer;
    const lp = actx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260 + (Math.random() - 0.5) * 60;
    lp.Q.value = 1.1;
    const tickGain = actx.createGain();
    tickGain.gain.setValueAtTime(0.0001, now);
    tickGain.gain.linearRampToValueAtTime(amp * 0.32, now + 0.002);
    tickGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.05);
    noise.connect(lp);
    lp.connect(tickGain);
    tickGain.connect(masterGain);
    noise.start(now);
    noise.stop(now + NOISE_DUR);

    /* Low sine "buzz" body — sits in the ~110-150Hz range where a phone
       speaker/chassis physically buzzes, so it reads as vibration rather
       than a tone. This is the dominant part of the click now. */
    const osc = actx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 130 + (Math.random() - 0.5) * 20;
    const bodyGain = actx.createGain();
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.linearRampToValueAtTime(amp * 0.55, now + 0.002);
    bodyGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.065);
    osc.connect(bodyGain);
    bodyGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  const DETENTS = 140;       /* clicks across the full page scroll */
  const STEP = 1 / DETENTS;
  let accum = 0;
  let prevFrac = 0;

  function update(frac) {
    /* If somehow still suspended, keep retrying */
    if (actx.state !== 'running') { actx.resume(); return; }

    const delta = frac - prevFrac;
    prevFrac = frac;
    accum += Math.abs(delta);

    const intensity = Math.min(1, 0.28 + Math.abs(delta) * 260);

    let fired = 0;
    while (accum >= STEP && fired < 8) {
      playClick(intensity);
      accum -= STEP;
      fired++;
    }
  }

  window.__scrollAudio = { update, actx };
}


/* ── iOS SILENT-SWITCH AUDIO UNLOCK ─────────────────────────
   iOS Safari mutes the Web Audio API whenever the hardware
   ring/silent switch is flipped to silent — but that mute does
   NOT apply to <video> elements with a real audio track. Playing
   one (even hidden/inaudible) switches the page's audio session
   so the ambient engine above stays audible with the switch on.
─────────────────────────────────────────────────────────── */
function unlockIOSAudio() {
  const el = document.getElementById('ios-audio-unlock');
  if (!el || window.__iosAudioUnlocked) return;
  window.__iosAudioUnlocked = true;
  el.volume = 0.01;
  const p = el.play();
  if (p && p.catch) p.catch(() => { window.__iosAudioUnlocked = false; });
}


/* ── SITE ENTRY OVERLAY ──────────────────────────────────── */
(function initEntry() {
  const overlay = document.getElementById('site-entry');
  const btn     = document.getElementById('entry-btn');
  if (!overlay || !btn) return;

  function enter() {
    /* START AUDIO — AudioContext created here, inside gesture callback.
       This is the only 100% reliable way to get audio on all browsers. */
    startAudioEngine();
    unlockIOSAudio();

    /* Fade out the overlay */
    overlay.classList.add('out');

    /* Float hero children in from below shortly after overlay starts fading */
    setTimeout(() => {
      document.body.classList.remove('pre-entry');
      if (window.__startCounters) window.__startCounters();
    }, 180);

    setTimeout(() => overlay.remove(), 1100);
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    enter();
  }, { once: true });

  btn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    enter();
  }, { once: true, passive: false });
}());
