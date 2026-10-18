(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* Scroll motion: each element declares its own entrance (rise / left / right / pop / wipe);
     children lists stagger automatically. One observer, released after the first reveal. */
  document.querySelectorAll('[data-anim-children]').forEach(function (list) {
    var kind = list.getAttribute('data-anim-children');
    Array.prototype.forEach.call(list.children, function (child, i) {
      child.setAttribute('data-anim', kind);
      child.style.setProperty('--d', (i * 0.08).toFixed(2) + 's');
    });
  });
  var animated = Array.prototype.slice.call(document.querySelectorAll('[data-anim], [data-lines]'));
  if (reduceMotion || !hasIO) {
    animated.forEach(function (node) { node.classList.add('is-in'); });
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        entry.target.classList.add('is-in');
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    animated.forEach(function (node) { revealer.observe(node); });
  }

  /* Linhas de LED: cada traço recebe o próprio comprimento para "acender" desenhando. */
  document.querySelectorAll('[data-lines] path, [data-lines] polyline, [data-lines] line').forEach(function (path, i) {
    if (typeof path.getTotalLength !== 'function') { return; }
    var len = Math.ceil(path.getTotalLength());
    path.style.setProperty('--len', len);
    path.style.setProperty('--d', (i * 0.12).toFixed(2) + 's');
  });

  /* Hero: a foto da vitrine se aproxima levemente no scroll. */
  var heroPhoto = document.querySelector('[data-parallax]');
  if (heroPhoto && !reduceMotion) {
    var ticking = false;
    var update = function () {
      var p = Math.min(window.scrollY / Math.max(window.innerHeight, 480), 1);
      heroPhoto.style.setProperty('--zoom', (1.04 + p * 0.08).toFixed(3));
      heroPhoto.style.setProperty('--shift', (p * 40).toFixed(1) + 'px');
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* Mobile menu */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('menu-mobile');
  if (toggle && menu) {
    var setMenu = function (open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      menu.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
    };
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (event) {
      if (event.target.closest('a')) { setMenu(false); }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
    });
  }

  /* Floating WhatsApp: stays out of the way while the hero CTA is on screen. */
  var floater = document.querySelector('.float-whats');
  var hero = document.querySelector('.hero');
  if (floater && hero && hasIO) {
    floater.classList.add('is-hidden');
    new IntersectionObserver(function (entries) {
      floater.classList.toggle('is-hidden', entries[0].isIntersecting);
    }, { threshold: 0.25 }).observe(hero);
  }

  /* Aberto agora? Seg a sáb, 8h às 18h (horário de Brasília). */
  var status = document.querySelector('[data-aberto]');
  if (status) {
    var agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Recife' }));
    var aberto = agora.getDay() !== 0 && agora.getHours() >= 8 && agora.getHours() < 18;
    status.textContent = aberto ? 'Aberto agora' : 'Fechado agora';
    status.classList.add(aberto ? 'is-aberto' : 'is-fechado');
  }

  /* Footer year */
  var year = document.querySelector('[data-year]');
  if (year) { year.textContent = String(new Date().getFullYear()); }
})();
