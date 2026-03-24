/* ==========================================================
   MAIN JS — Vincenzo Carcarino | Netlify + GitHub Raw v2
   Architettura: legge file .md e JSON da GitHub Raw CDN.
   Zero duplicati. Zero codice morto.
   ========================================================== */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     CONFIGURAZIONE GITHUB
  ---------------------------------------------------------- */
  const GH_USER   = 'vcarcoffwebsite-dev';
  const GH_REPO   = 'vincenzo-carcarino';
  const GH_BRANCH = 'main';
  const GH_RAW    = `https://raw.githubusercontent.com/${GH_USER}/${GH_REPO}/${GH_BRANCH}`;
  const GH_API    = `https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents`;

  /* ----------------------------------------------------------
     FETCH UTILITIES
  ---------------------------------------------------------- */

  async function ghRaw(path) {
    try {
      const r = await fetch(`${GH_RAW}/${path}?_=${Date.now()}`);
      return r.ok ? await r.text() : null;
    } catch { return null; }
  }

  async function ghList(dir) {
    try {
      const r = await fetch(`${GH_API}/${dir}?ref=${GH_BRANCH}`, {
        headers: { Accept: 'application/vnd.github.v3+json' }
      });
      if (!r.ok) return [];
      const files = await r.json();
      return Array.isArray(files) ? files.filter(f => f.name.endsWith('.md')) : [];
    } catch { return []; }
  }

  /* ----------------------------------------------------------
     PARSER FRONTMATTER YAML
  ---------------------------------------------------------- */
  function parseMd(text) {
    if (!text) return null;
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};
    const result = {};
    match[1].split('\n').forEach(line => {
      const colon = line.indexOf(':');
      if (colon === -1) return;
      const key = line.slice(0, colon).trim();
      let val   = line.slice(colon + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (val === 'true')  { result[key] = true;  return; }
      if (val === 'false') { result[key] = false; return; }
      if (val !== '' && !isNaN(val)) { result[key] = Number(val); return; }
      result[key] = val;
    });
    return result;
  }

  async function loadDir(dir) {
    const files = await ghList(`content/${dir}`);
    if (!files.length) return [];
    const items = await Promise.all(
      files.map(async f => {
        const text = await ghRaw(`content/${dir}/${f.name}`);
        const data = parseMd(text);
        if (data) data._filename = f.name;
        return data;
      })
    );
    return items.filter(Boolean);
  }

  async function loadSettings() {
    const text = await ghRaw('content/impostazioni.json');
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  }

  /* ----------------------------------------------------------
     HELPERS
  ---------------------------------------------------------- */
  function ytId(url) {
    if (!url) return null;
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&\s]+)/);
    return m ? m[1] : null;
  }

  function resolveImg(src) {
    if (!src) return '';
    if (src.startsWith('http')) return src;
    return `${GH_RAW}/${src.replace(/^\//, '')}`;
  }

  function $(id)            { return document.getElementById(id); }
  function setText(id, txt) { const el = $(id); if (el) el.textContent = txt; }
  function setHTML(id, h)   { const el = $(id); if (el) el.innerHTML   = h;   }
  function setAll(sel, txt) { document.querySelectorAll(sel).forEach(el => el.textContent = txt); }
  function show(id)         { const el = $(id); if (el) el.style.display = 'flex'; }
  function hide(id)         { const el = $(id); if (el) el.style.display = 'none'; }
  function hideSection(secId, navId) {
    const sec = $(secId); if (sec) sec.style.display = 'none';
    const nav = navId ? $(navId) : null; if (nav) nav.style.display = 'none';
  }

  /* ----------------------------------------------------------
     INIT — punto di ingresso unico
  ---------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', async function () {
    const cfg = await loadSettings();
    if (cfg) applySettings(cfg);

    await Promise.all([
      loadMusica(), loadEventi(), loadDiscografia(),
      loadVideoGallery(), loadStampa(), loadGallery(),
      loadCollaboratori(), loadShop(),
    ]);

    initNavbar();
    initMobileMenu();
    initObserver();
    initCarousel();
    initContactForm();
  });

  /* ----------------------------------------------------------
     IMPOSTAZIONI
  ---------------------------------------------------------- */
  function applySettings(cfg) {
    document.documentElement.setAttribute('data-theme', cfg.tema || 'nero-oro');

    const nome  = cfg.nome_artista || 'Vincenzo Carcarino';
    const parts = nome.split(' ');
    setText('heroFirst', parts[0]);
    setText('heroLast',  parts.slice(1).join(' '));
    setAll('.artist-name', nome);
    setAll('.nav-logo',    nome);
    setAll('.footer-logo', nome);

    if (cfg.tagline)     setHTML('heroTagline', cfg.tagline.replace(/\n/g, '<br>'));
    if (cfg.hero_image)  { const bg = $('heroBg'); if (bg) bg.style.backgroundImage = `url(${resolveImg(cfg.hero_image)})`; }
    if (cfg.profile_image) {
      const ph = $('profilePlaceholder'), img = $('profileImg');
      if (ph) ph.style.display = 'none';
      if (img) { img.src = resolveImg(cfg.profile_image); img.style.display = 'block'; }
    }

    if (cfg.biografia) {
      const bioEl = $('bioContent');
      if (bioEl) {
        let html = '';
        if (cfg.biografia.p1) html += `<p>${cfg.biografia.p1}</p>`;
        if (cfg.biografia.p2) html += `<p>${cfg.biografia.p2}</p>`;
        if (cfg.biografia.p3) html += `<p>${cfg.biografia.p3}</p>`;
        if (html) bioEl.innerHTML = html;
      }
    }

    if (cfg.links) buildLinks(cfg.links);

    if (cfg.contatti) {
      const emailLink = $('contactEmailLink');
      if (emailLink && cfg.contatti.email) {
        emailLink.href = 'mailto:' + cfg.contatti.email;
        emailLink.textContent = cfg.contatti.email;
      }
      if (cfg.contatti.testo) setText('contactTesto', cfg.contatti.testo);
      if (cfg.contatti.hcaptcha_key) {
        window._hcaptchaKey = cfg.contatti.hcaptcha_key;
        const wrap = $('hcaptchaWrap');
        if (wrap) {
          wrap.innerHTML = `<div class="h-captcha" data-sitekey="${cfg.contatti.hcaptcha_key}"></div>`;
          const s = document.createElement('script');
          s.src = 'https://js.hcaptcha.com/1/api.js';
          s.async = true; s.defer = true;
          document.head.appendChild(s);
        }
      }
    }
  }

  /* ----------------------------------------------------------
     LINK PIATTAFORME
  ---------------------------------------------------------- */
  function buildLinks(links) {
    const platforms = [
      { id:'spotify',   name:'Spotify',     color:'#1DB954', icon:'spotify'   },
      { id:'youtube',   name:'YouTube',      color:'#FF0000', icon:'youtube'   },
      { id:'amazon',    name:'Amazon Music', color:'#25D1DA', icon:'amazon'    },
      { id:'facebook',  name:'Facebook',     color:'#1877F2', icon:'facebook'  },
      { id:'apple',     name:'Apple Music',  color:'#fc3c44', icon:'apple'     },
      { id:'instagram', name:'Instagram',    color:'#E1306C', icon:'instagram' },
    ];

    const grid    = $('linksGrid');
    const section = $('links');
    if (!grid) return;
    grid.innerHTML = '';
    let hasAny = false;

    platforms.forEach(p => {
      const url = links[p.id];
      if (!url || url.trim() === '' || url === '#') return;
      hasAny = true;
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      a.className = 'platform-card fade-in';
      a.style.setProperty('--platform-color', p.color);
      a.innerHTML = `<div class="platform-icon">${getPlatformIcon(p.icon)}</div><span class="platform-name">${p.name}</span>`;
      grid.appendChild(a);
    });

    if (section) section.style.display = hasAny ? '' : 'none';
    const navLi = $('navLinksLi');
    if (navLi)  navLi.style.display   = hasAny ? '' : 'none';
  }

  /* ----------------------------------------------------------
     SEZIONE: MUSICA
  ---------------------------------------------------------- */
  async function loadMusica() {
    const items = await loadDir('musica');
    const grid  = $('musicaGrid');
    if (!grid) return;
    if (!items.length) { hideSection('musica', 'navMusicaLi'); return; }
    items.sort((a, b) => (a.order || 99) - (b.order || 99));
    grid.innerHTML = '';

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'musica-card fade-in';
      let mediaHtml = '';

      if (item.tipo === 'youtube' && item.youtube_url) {
        const id = ytId(item.youtube_url);
        if (id) mediaHtml = `<div class="musica-youtube-wrap"><iframe src="https://www.youtube.com/embed/${id}" allowfullscreen loading="lazy"></iframe></div>`;
      } else if (item.audio_file) {
        const cs = resolveImg(item.cover);
        const ch = cs ? `<img class="musica-cover" src="${cs}" alt="${item.title||''}" loading="lazy">`
                      : `<div class="musica-cover-placeholder"><svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg></div>`;
        mediaHtml = ch + `<audio class="musica-player" controls src="${resolveImg(item.audio_file)}" preload="metadata"></audio>`;
      }

      card.innerHTML = `
        ${mediaHtml}
        <div class="musica-info">
          <div class="musica-tipo">${item.tipo === 'youtube' ? '🎬 Video' : '🎵 Audio'}</div>
          <div class="musica-title">${item.title || ''}</div>
          ${item.anno        ? `<div class="musica-anno">${item.anno}</div>`        : ''}
          ${item.descrizione ? `<div class="musica-desc">${item.descrizione}</div>` : ''}
        </div>`;
      grid.appendChild(card);
    });
  }

  /* ----------------------------------------------------------
     SEZIONE: EVENTI
  ---------------------------------------------------------- */
  async function loadEventi() {
    const items = await loadDir('eventi');
    const grid  = $('eventiGrid');
    if (!grid) return;
    const oggi   = new Date(); oggi.setHours(0,0,0,0);
    const futuri = items.filter(i => i.data && new Date(i.data) >= oggi);
    if (!futuri.length) { hideSection('eventi', 'navEventiLi'); return; }
    futuri.sort((a, b) => new Date(a.data) - new Date(b.data));
    grid.innerHTML = '';

    futuri.forEach(ev => {
      const d      = new Date(ev.data);
      const giorno = String(d.getDate()).padStart(2, '0');
      const mese   = d.toLocaleDateString('it-IT', { month:'long', year:'numeric' });
      const maps   = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.indirizzo||'')}`;
      const imgSrc = resolveImg(ev.immagine);
      const card   = document.createElement('div');
      card.className = 'evento-card fade-in';
      card.innerHTML = `
        ${imgSrc ? `<img class="evento-img" src="${imgSrc}" alt="${ev.title||''}" loading="lazy">` : ''}
        <div class="evento-body">
          <div class="evento-date-wrap">
            <div class="evento-giorno">${giorno}</div>
            <div class="evento-mese">${mese}</div>
          </div>
          ${ev.ora ? `<div class="evento-ora">🕐 Ore ${ev.ora}</div>` : ''}
          <div class="evento-nome">${ev.title||''}</div>
          <div class="evento-indirizzo">📍 ${ev.indirizzo||''}</div>
          ${ev.note ? `<div class="evento-note">${ev.note}</div>` : ''}
          <div class="evento-actions">
            <a href="${maps}" target="_blank" rel="noopener" class="btn-map">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Mappa
            </a>
            ${ev.ticket_url ? `<a href="${ev.ticket_url}" target="_blank" rel="noopener" class="btn-ticket">🎟 Biglietti</a>` : ''}
          </div>
        </div>`;
      grid.appendChild(card);
    });
  }

  /* ----------------------------------------------------------
     SEZIONE: DISCOGRAFIA
  ---------------------------------------------------------- */
  async function loadDiscografia() {
    const items = await loadDir('discografia');
    const grid  = $('discografiaGrid');
    if (!grid) return;
    if (!items.length) { hideSection('discografia', 'navDiscografiaLi'); return; }
    items.sort((a, b) => (b.anno||0) - (a.anno||0));
    grid.innerHTML = '';

    items.forEach(item => {
      const cs = resolveImg(item.copertina);
      const ch = cs ? `<img class="disco-cover" src="${cs}" alt="${item.title||''}" loading="lazy">`
                    : `<div class="disco-cover-placeholder"><svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></div>`;
      const lh = [
        item.spotify_url ? `<a href="${item.spotify_url}" target="_blank" class="disco-link">Spotify</a>`  : '',
        item.youtube_url ? `<a href="${item.youtube_url}" target="_blank" class="disco-link">YouTube</a>`  : '',
      ].filter(Boolean).join('');
      const card = document.createElement('div');
      card.className = 'disco-card fade-in';
      card.innerHTML = `${ch}<div class="disco-tipo">${item.tipo||'Singolo'}</div><div class="disco-title">${item.title||''}</div>${item.anno?`<div class="disco-anno">${item.anno}</div>`:''}${lh?`<div class="disco-links">${lh}</div>`:''}`;
      grid.appendChild(card);
    });
  }

  /* ----------------------------------------------------------
     SEZIONE: VIDEO GALLERY
  ---------------------------------------------------------- */
  async function loadVideoGallery() {
    const items = await loadDir('video');
    const grid  = $('videoGrid');
    if (!grid) return;
    if (!items.length) { hideSection('video-gallery', 'navVideoLi'); return; }
    items.sort((a, b) => (a.order||99) - (b.order||99));
    grid.innerHTML = '';

    items.forEach(item => {
      const id = ytId(item.youtube_url);
      if (!id) return;
      const card = document.createElement('div');
      card.className = 'video-card fade-in';
      card.innerHTML = `
        <div class="video-embed"><iframe src="https://www.youtube.com/embed/${id}" allowfullscreen loading="lazy" title="${item.title||''}"></iframe></div>
        <div class="video-info">
          <div class="video-title">${item.title||''}</div>
          ${item.descrizione ? `<div class="video-desc">${item.descrizione}</div>` : ''}
        </div>`;
      grid.appendChild(card);
    });
  }

  /* ----------------------------------------------------------
     SEZIONE: RASSEGNA STAMPA
  ---------------------------------------------------------- */
  async function loadStampa() {
    const items = await loadDir('stampa');
    const grid  = $('stampaGrid');
    if (!grid) return;
    if (!items.length) { hideSection('stampa', 'navStampaLi'); return; }
    items.sort((a, b) => new Date(b.data||0) - new Date(a.data||0));
    grid.innerHTML = '';

    items.forEach(item => {
      const d  = item.data ? new Date(item.data).toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'}) : '';
      const ls = resolveImg(item.logo);
      const card = document.createElement('div');
      card.className = 'stampa-card fade-in';
      card.innerHTML = `
        <div class="stampa-quote">"</div>
        <div class="stampa-estratto">${item.estratto||''}</div>
        <div class="stampa-meta">
          ${ls ? `<img class="stampa-logo" src="${ls}" alt="${item.testata||''}">` : ''}
          <span class="stampa-fonte">${item.testata||''}</span>
          ${d ? `<span class="stampa-data">${d}</span>` : ''}
        </div>
        ${item.url ? `<a href="${item.url}" target="_blank" rel="noopener" class="stampa-link">Leggi articolo →</a>` : ''}`;
      grid.appendChild(card);
    });
  }

  /* ----------------------------------------------------------
     SEZIONE: GALLERY (carosello)
  ---------------------------------------------------------- */
  let carouselPhotos = [];

  async function loadGallery() {
    const items = await loadDir('gallery');
    const track = $('carouselTrack');
    if (!track) return;
    if (!items.length) { hideSection('gallery', 'navGalleryLi'); return; }
    items.sort((a, b) => (a.order||99) - (b.order||99));
    carouselPhotos = items.filter(i => i.foto);
    track.innerHTML = '';
    carouselPhotos.forEach(item => {
      const slide = document.createElement('div');
      slide.className = 'carousel-slide';
      slide.innerHTML = `<img src="${resolveImg(item.foto)}" alt="${item.title||'Gallery'}" loading="lazy">`;
      track.appendChild(slide);
    });
    buildDots();
    updateCarousel(0);
  }

  /* ----------------------------------------------------------
     SEZIONE: COLLABORATORI
  ---------------------------------------------------------- */
  async function loadCollaboratori() {
    const items = await loadDir('collaboratori');
    const grid  = $('collaboratoriGrid');
    if (!grid) return;
    if (!items.length) { hideSection('collaboratori', 'navCollabLi'); return; }
    items.sort((a, b) => (a.order||99) - (b.order||99));
    grid.innerHTML = '';

    items.forEach(item => {
      const fs = resolveImg(item.foto);
      const fh = fs ? `<img class="collab-foto" src="${fs}" alt="${item.title||''}" loading="lazy">`
                    : `<div class="collab-foto-placeholder"><svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`;
      const card = document.createElement('div');
      card.className = 'collab-card fade-in';
      card.innerHTML = `
        ${fh}
        <div class="collab-nome">${item.title||''}</div>
        <div class="collab-ruolo">${item.ruolo||''}</div>
        ${item.descrizione ? `<div class="collab-desc">${item.descrizione}</div>` : ''}
        ${item.url ? `<a href="${item.url}" target="_blank" rel="noopener" class="collab-link">→ Profilo</a>` : ''}`;
      grid.appendChild(card);
    });
  }

  /* ----------------------------------------------------------
     SEZIONE: SHOP
  ---------------------------------------------------------- */
  async function loadShop() {
    const items = await loadDir('shop');
    const grid  = $('shopGrid');
    if (!grid) return;
    const available = items.filter(i => i.disponibile !== false);
    if (!available.length) { hideSection('shop', 'navShopLi'); return; }
    available.sort((a, b) => (a.order||99) - (b.order||99));
    grid.innerHTML = '';

    available.forEach(item => {
      const prezzo = parseFloat(item.prezzo||0).toFixed(2).replace('.', ',');
      const card   = document.createElement('div');
      card.className = 'shop-card fade-in';
      card.innerHTML = `
        <img class="shop-img" src="${resolveImg(item.foto)}" alt="${item.title||''}" loading="lazy">
        <div class="shop-body">
          <div class="shop-tipo">${item.tipo||'CD'}</div>
          <div class="shop-title">${item.title||''}</div>
          <div class="shop-desc">${item.descrizione||''}</div>
          <div class="shop-footer">
            <div class="shop-price">€ ${prezzo}</div>
            ${item.paypal_url
              ? `<a href="${item.paypal_url}" target="_blank" rel="noopener" class="shop-buy">🛒 Acquista</a>`
              : `<span class="shop-esaurito">Non disponibile</span>`}
          </div>
        </div>`;
      grid.appendChild(card);
    });
  }

  /* ----------------------------------------------------------
     CAROSELLO
  ---------------------------------------------------------- */
  let currentSlide  = 0;
  let autoplayTimer = null;

  function getSlidesPerView() {
    if (window.innerWidth <= 500) return 1;
    if (window.innerWidth <= 900) return 2;
    return 3;
  }

  function updateCarousel(idx) {
    const track = $('carouselTrack');
    if (!track || !carouselPhotos.length) return;
    const spv = getSlidesPerView();
    const max = Math.max(0, carouselPhotos.length - spv);
    currentSlide = Math.max(0, Math.min(idx, max));
    track.style.transform = `translateX(-${currentSlide * (100 / spv)}%)`;
    updateDots();
  }

  function buildDots() {
    const dotsEl = $('carouselDots');
    if (!dotsEl) return;
    const count = Math.max(1, carouselPhotos.length - getSlidesPerView() + 1);
    dotsEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const btn = document.createElement('button');
      btn.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      btn.setAttribute('aria-label', `Slide ${i + 1}`);
      btn.onclick = () => { updateCarousel(i); resetAutoplay(); };
      dotsEl.appendChild(btn);
    }
  }

  function updateDots() {
    document.querySelectorAll('.carousel-dot').forEach((d, i) =>
      d.classList.toggle('active', i === currentSlide)
    );
  }

  function resetAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = setInterval(() => {
      const max = Math.max(0, carouselPhotos.length - getSlidesPerView());
      updateCarousel(currentSlide >= max ? 0 : currentSlide + 1);
    }, 4000);
  }

  function initCarousel() {
    const prev = $('carouselPrev');
    const next = $('carouselNext');
    if (prev) prev.onclick = () => { updateCarousel(currentSlide - 1); resetAutoplay(); };
    if (next) next.onclick = () => { updateCarousel(currentSlide + 1); resetAutoplay(); };
    window.addEventListener('resize', () => { buildDots(); updateCarousel(currentSlide); });
    resetAutoplay();
  }

  /* ----------------------------------------------------------
     CONTACT FORM
  ---------------------------------------------------------- */
  function initContactForm() {
    const form = $('contactForm');
    if (!form) return;

    const msgField  = $('cfMessaggio');
    const charCount = $('charCount');
    if (msgField && charCount) {
      msgField.addEventListener('input', function () {
        const len = this.value.length;
        charCount.textContent = len;
        charCount.parentElement.classList.toggle('over', len > 3000);
      });
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearFormErrors();
      hide('formSuccess'); hide('formError');

      const nome      = fVal('cfNome');
      const email     = fVal('cfEmail');
      const oggetto   = fVal('cfOggetto');
      const messaggio = fVal('cfMessaggio');
      let ok = true;

      if (!nome)                                       { setErr('cfNome',     'errNome',     'Il nome è obbligatorio.');               ok = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('cfEmail',    'errEmail',    'Email non valida.');                     ok = false; }
      if (!oggetto)                                    { setErr('cfOggetto',  'errOggetto',  'Seleziona un oggetto.');                 ok = false; }
      if (messaggio.length < 10)                       { setErr('cfMessaggio','errMessaggio','Messaggio troppo breve (min. 10 car.)'); ok = false; }
      if (!ok) return;

      let hcaptcha_token = '';
      if (window.hcaptcha) {
        hcaptcha_token = hcaptcha.getResponse();
        if (!hcaptcha_token) { show('formError'); setText('errorMsg', 'Completa la verifica captcha.'); return; }
      }

      setBtnLoading(true);
      try {
        const res  = await fetch('/.netlify/functions/contact', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, email, oggetto, messaggio, hcaptcha_token }),
        });
        const data = await res.json();
        if (data.success) {
          show('formSuccess');
          setText('successMsg', data.message || 'Messaggio inviato con successo!');
          form.reset(); if (charCount) charCount.textContent = '0';
          if (window.hcaptcha) hcaptcha.reset();
        } else {
          show('formError'); setText('errorMsg', data.error || "Errore nell'invio. Riprova.");
        }
      } catch {
        show('formError'); setText('errorMsg', 'Errore di connessione. Riprova più tardi.');
      }
      setBtnLoading(false);
    });
  }

  /* ----------------------------------------------------------
     NAVBAR + MOBILE MENU
  ---------------------------------------------------------- */
  function initNavbar() {
    window.addEventListener('scroll', () => {
      const nav = $('navbar');
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 80);
    });
  }

  function initMobileMenu() {
    const burger = $('navBurger');
    const menu   = $('mobileMenu');
    const close  = $('mobileClose');
    if (burger && menu) burger.addEventListener('click', () => menu.classList.toggle('open'));
    if (close  && menu) close.addEventListener('click',  () => menu.classList.remove('open'));
    document.querySelectorAll('.mobile-menu a').forEach(a =>
      a.addEventListener('click', () => menu && menu.classList.remove('open'))
    );
  }

  /* ----------------------------------------------------------
     INTERSECTION OBSERVER
  ---------------------------------------------------------- */
  function initObserver() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
  }

  /* ----------------------------------------------------------
     HELPERS FORM
  ---------------------------------------------------------- */
  function fVal(id) { const el = $(id); return el ? el.value.trim() : ''; }

  function clearFormErrors() {
    ['cfNome','cfEmail','cfOggetto','cfMessaggio'].forEach(id => {
      const el = $(id); if (el && el.closest('.form-field')) el.closest('.form-field').classList.remove('has-error');
    });
    ['errNome','errEmail','errOggetto','errMessaggio'].forEach(id => {
      const el = $(id); if (el) el.textContent = '';
    });
  }

  function setErr(fieldId, errId, msg) {
    const f = $(fieldId), e = $(errId);
    if (f && f.closest('.form-field')) f.closest('.form-field').classList.add('has-error');
    if (e) e.textContent = msg;
  }

  function setBtnLoading(on) {
    const btn = $('formSubmit'), txt = $('submitText'), arr = $('submitArrow'), sp = $('submitSpinner');
    if (!btn) return;
    btn.disabled = on;
    if (txt) txt.textContent   = on ? 'Invio in corso...' : 'Invia messaggio';
    if (arr) arr.style.display = on ? 'none'  : '';
    if (sp)  sp.style.display  = on ? 'block' : 'none';
  }

  /* ----------------------------------------------------------
     ICONE SVG PIATTAFORME
  ---------------------------------------------------------- */
  function getPlatformIcon(type) {
    const icons = {
      spotify: `<svg width="28" height="28" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`,
      youtube: `<svg width="28" height="28" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>`,
      amazon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="#25D1DA"><path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.699-3.182v.685zm3.186 7.706c-.209.189-.512.201-.745.074-1.052-.872-1.238-1.276-1.814-2.106-1.734 1.767-2.962 2.297-5.209 2.297-2.66 0-4.731-1.641-4.731-4.925 0-2.565 1.391-4.309 3.37-5.164 1.715-.754 4.11-.891 5.942-1.099v-.41c0-.753.06-1.642-.383-2.294-.385-.579-1.124-.82-1.775-.82-1.205 0-2.277.618-2.54 1.897-.054.285-.261.567-.547.582l-3.065-.333c-.259-.058-.548-.266-.472-.66C5.83 2.056 9.037 1 11.913 1c1.468 0 3.386.391 4.543 1.502C17.802 3.61 17.716 5.23 17.716 7v6.36c0 1.911.793 2.754 1.54 3.789.261.368.317.809-.015 1.082l-2.097 1.565z"/></svg>`,
      facebook: `<svg width="28" height="28" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
      apple: `<svg width="28" height="28" viewBox="0 0 24 24" fill="#fc3c44"><path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a6.316 6.316 0 00-1.903-.737A10.85 10.85 0 0017.775 0H6.292a9.57 9.57 0 00-1.878.15A6.21 6.21 0 00.47 3.983 6.12 6.12 0 00.06 6.263a27.73 27.73 0 00-.05 1.604v8.267c0 .56.02 1.113.07 1.664.103 1.3.57 2.433 1.486 3.35.97.96 2.15 1.473 3.5 1.654.42.056.843.09 1.27.1h11.223c.45-.01.895-.042 1.334-.1 1.366-.19 2.558-.72 3.54-1.7.9-.9 1.38-1.995 1.49-3.25a19.9 19.9 0 00.08-1.78V7.82c0-.57-.015-1.14-.05-1.696zM12 17.518A5.518 5.518 0 1112 6.48a5.518 5.518 0 010 11.038zm0-9.535a4.018 4.018 0 100 8.035 4.018 4.018 0 000-8.035zm5.525-1.765a1.269 1.269 0 100 2.538 1.269 1.269 0 000-2.538z"/></svg>`,
      instagram: `<svg width="28" height="28" viewBox="0 0 24 24"><defs><linearGradient id="ig_grad" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#FFDC80"/><stop offset="50%" stop-color="#F56040"/><stop offset="100%" stop-color="#833AB4"/></linearGradient></defs><path fill="url(#ig_grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
    };
    return icons[type] || '';
  }

})();
