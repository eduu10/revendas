/* Vitrine: anúncios do Instagram (window.ESTOQUE) com filtros por tipo, marca, cor, ano e câmbio,
   cards com a foto inteira e uma galeria em tela cheia com todas as fotos de cada veículo.
   Igual em todos os sites; os dados da loja vêm de window.LOJA (config.js). */
(function () {
  'use strict';

  var grid = document.getElementById('estoque-grid');
  var form = document.getElementById('filtros');
  var LOJA = window.LOJA || {};
  if (!grid || !form || !Array.isArray(window.ESTOQUE)) { return; }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WHATS = 'https://wa.me/' + LOJA.whats + '?text=';
  var LOGOS = LOJA.logos || [];
  var TIPOS = LOJA.tipos || {};
  var POR_PAGINA = LOJA.porPagina || 12;
  var cars = window.ESTOQUE.filter(function (c) { return !c.vendido; });
  var byId = {};
  cars.forEach(function (c, i) { c.ordem = i; byId[c.id] = c; });

  var vazio = function () { return { tipo: null, marca: null, cor: null, ano: null, cambio: null }; };
  var state = Object.assign(vazio(), { ordem: 'recente', limite: POR_PAGINA });
  var swatches = { Branco: '#f2f2f2', Preto: '#111', Prata: '#c9c9cf', Cinza: '#6f6f78', Vermelho: '#d1121f', Azul: '#1e4fa3', Verde: '#2e5d3f', Marrom: '#6b4a2b', Bege: '#d9c7a7', Amarelo: '#e3b800', Laranja: '#e86a12' };
  var FILTROS = ['tipo', 'marca', 'cor', 'ano', 'cambio'];

  /* ---------- helpers ---------- */
  var esc = function (str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  };
  var slug = function (str) { return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ''); };
  var num = function (n) { return n.toLocaleString('pt-BR'); };
  var brl = function (n) { return 'R$ ' + num(n); };
  var uso = function (c) {
    if (c.horas != null) { return num(c.horas) + ' h de uso'; }
    if (c.km === 0) { return 'Zero km'; }
    return c.km == null ? 'km a confirmar' : num(c.km) + ' km';
  };
  var dataBr = function (iso) { var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };
  var foto = function (c, i, size) {
    return 'assets/img/estoque/' + c.pasta + '/' + (size ? size + '/' : '') + pad(i + 1) + '.webp';
  };
  var nome = function (c) { return c.marca + ' ' + c.modelo; };
  var precoHtml = function (c) {
    if (c.preco == null) { return '<span class="preco__consulte">Consulte</span>'; }
    return '<small>R$</small> ' + esc(num(c.preco)) + (c.precoNota ? '<span class="preco__nota">' + esc(c.precoNota) + '</span>' : '');
  };
  var waLink = function (c) {
    var pergunta = c.preco == null ? 'e quero saber o valor e as condições.' : 'anunciado por ' + brl(c.preco) + ' e quero saber se ainda está disponível.';
    return WHATS + encodeURIComponent('Olá! Vi no site o ' + nome(c) + ' ' + c.ano + ' ' + pergunta);
  };
  var selo = function (c) {
    if (c.km === 0) { return 'Zero km'; }
    if (/blind/i.test(c.versao)) { return 'Blindado'; }
    if ((c.destaques || []).some(function (d) { return /único dono/i.test(d); })) { return 'Único dono'; }
    return '';
  };
  /* url() inside a CSS custom property resolves against the stylesheet, so hand it absolute URLs. */
  var abs = function (path) { return new URL(path, document.baseURI).href; };
  var icon = function (id) { return '<svg class="ico" aria-hidden="true"><use href="#' + id + '"/></svg>'; };
  var valor = function (c, key) { return key === 'ano' ? String(c.anoNum) : c[key]; };

  /* ---------- filters ---------- */
  var countBy = function (key, lista) {
    var counts = {};
    (lista || cars).forEach(function (c) {
      var v = valor(c, key);
      if (v == null) { return; }
      counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  };

  var buildMarcas = function () {
    var box = form.querySelector('.marcas');
    var counts = countBy('marca');
    var names = Object.keys(counts).sort();
    var tile = function (value, label, count) {
      var s = value ? slug(value) : '';
      var art;
      if (!value) {
        art = '<span class="marca__logo marca__logo--todas" aria-hidden="true">' + icon('i-car') + '</span>';
      } else if (LOGOS.indexOf(s) !== -1) {
        art = '<span class="marca__logo" style="--logo:url(\'' + abs('assets/img/marcas/' + s + '.svg') + '\')" aria-hidden="true"></span>';
      } else {
        var iniciais = value.replace(/[^A-Za-zÀ-ú ]/g, '').split(' ').map(function (w) { return w.charAt(0); }).join('').slice(0, 3);
        art = '<span class="marca__logo marca__logo--sigla" aria-hidden="true">' + esc(iniciais.toUpperCase()) + '</span>';
      }
      return '<button type="button" class="marca" data-key="marca" data-value="' + esc(value) + '" aria-pressed="false">' +
        art + '<span class="marca__nome">' + esc(label) + '</span><span class="marca__qtd">' + count + '</span></button>';
    };
    box.innerHTML = tile('', 'Todas', cars.length) + names.map(function (n) { return tile(n, n, counts[n]); }).join('');
  };

  var buildChips = function () {
    ['tipo', 'cor', 'ano', 'cambio'].forEach(function (key) {
      var field = form.querySelector('[data-filtro="' + key + '"]');
      if (!field) { return; }
      var counts = countBy(key);
      var values = Object.keys(counts);
      if (key === 'tipo') {
        var ordem = Object.keys(TIPOS);
        values.sort(function (a, b) { return ordem.indexOf(a) - ordem.indexOf(b); });
        if (values.length < 2) { field.hidden = true; return; }
      } else if (key === 'ano') {
        values.sort(function (a, b) { return Number(b) - Number(a); });
      } else {
        values.sort();
      }
      field.querySelector('.filtro__chips').innerHTML = values.map(function (v) {
        var dot = key === 'cor' && swatches[v] ? '<i class="chip__swatch" style="background:' + swatches[v] + '"></i>' : '';
        var label = key === 'tipo' ? (TIPOS[v] || v) : v;
        var qtd = key === 'tipo' ? '<span class="chip__qtd">' + counts[v] + '</span>' : '';
        return '<button type="button" class="chip" data-key="' + key + '" data-value="' + esc(v) + '" aria-pressed="false">' + dot + esc(label) + qtd + '</button>';
      }).join('');
    });
  };

  var matches = function (c) {
    return FILTROS.every(function (k) { return !state[k] || valor(c, k) === state[k]; });
  };
  var semPrecoNoFim = function (fn) {
    return function (a, b) {
      if (a.preco == null && b.preco == null) { return a.ordem - b.ordem; }
      if (a.preco == null) { return 1; }
      if (b.preco == null) { return -1; }
      return fn(a, b);
    };
  };
  var sorters = {
    recente: function (a, b) { return a.publicado === b.publicado ? a.ordem - b.ordem : (a.publicado < b.publicado ? 1 : -1); },
    menor: semPrecoNoFim(function (a, b) { return a.preco - b.preco; }),
    maior: semPrecoNoFim(function (a, b) { return b.preco - a.preco; }),
    novo: function (a, b) { return b.anoNum - a.anoNum || a.ordem - b.ordem; },
    km: function (a, b) {
      var k = function (c) { return c.km == null ? 1e9 : c.km; };
      return k(a) - k(b) || a.ordem - b.ordem;
    }
  };

  /* ---------- cards ---------- */
  var cardHtml = function (c) {
    var tag = selo(c) ? '<span class="carro__tag">' + esc(selo(c)) + '</span>' : '';
    var thumbs = '';
    if (c.fotos > 1) {
      for (var i = 0; i < c.fotos; i++) {
        thumbs += '<li><button type="button" class="carro__thumb" data-swap="' + i + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '" aria-label="Mostrar foto ' + (i + 1) + ' de ' + c.fotos + ' do ' + esc(nome(c)) + '">' +
          '<img src="' + foto(c, i, 't') + '" alt="" width="240" height="320" loading="lazy"></button></li>';
      }
    }
    var meta = [
      icon('i-calendar') + esc(c.ano),
      icon('i-gauge') + esc(uso(c)),
      c.cambio ? icon('i-gear') + esc(c.cambio) : (c.combustivel ? icon('i-drop') + esc(c.combustivel) : ''),
      icon('i-palette') + esc(c.cor)
    ].filter(Boolean).map(function (m) { return '<li>' + m + '</li>'; }).join('');
    return '<li class="carro" data-id="' + esc(c.id) + '">' +
      '<button type="button" class="carro__media" data-open="' + esc(c.id) + '" data-i="0" title="Ver em tela cheia" style="--bg:url(\'' + abs(foto(c, 0, 'm')) + '\')" aria-label="Ver as ' + c.fotos + ' fotos do ' + esc(nome(c)) + '">' +
        '<img src="' + foto(c, 0, 'm') + '" alt="' + esc(nome(c) + ' ' + c.cor.toLowerCase()) + '" width="720" height="960" loading="lazy">' +
        tag +
        '<span class="carro__fotos">' + icon('i-camera') + c.fotos + '<span class="carro__fotos-txt">' + (c.fotos === 1 ? ' foto' : ' fotos') + '</span></span>' +
        '<time class="carro__data" datetime="' + esc(c.publicado) + '">Anunciado em ' + dataBr(c.publicado) + '</time>' +
      '</button>' +
      (thumbs ? '<ul class="carro__thumbs">' + thumbs + '</ul>' : '') +
      '<div class="carro__body">' +
        '<p class="carro__marca">' + esc(c.marca) + '</p>' +
        '<h3>' + esc(c.modelo) + '</h3>' +
        '<p class="carro__spec">' + esc(c.versao) + '</p>' +
        '<ul class="carro__meta">' + meta + '</ul>' +
        '<div class="carro__foot">' +
          '<p class="carro__price">' + precoHtml(c) + '</p>' +
          '<a class="btn btn--accent btn--sm" href="' + waLink(c) + '" target="_blank" rel="noopener">' + (c.preco == null ? 'Consultar valor' : 'Tenho interesse') + '</a>' +
        '</div>' +
      '</div></li>';
  };

  var render = function () {
    var list = cars.filter(matches).sort(sorters[state.ordem] || sorters.recente);
    var visiveis = list.slice(0, state.limite);
    grid.innerHTML = visiveis.map(cardHtml).join('');
    var active = FILTROS.some(function (k) { return state[k]; });
    document.getElementById('filtros-count').innerHTML = '<em>' + list.length + '</em> de ' + cars.length + ' anúncio' + (cars.length === 1 ? '' : 's');
    document.getElementById('filtros-reset').hidden = !active;
    document.getElementById('estoque-vazio').hidden = list.length > 0;
    var mais = document.getElementById('estoque-mais');
    if (mais) {
      var resto = list.length - visiveis.length;
      mais.hidden = resto <= 0;
      mais.querySelector('span').textContent = 'Ver mais ' + Math.min(resto, POR_PAGINA) + ' de ' + resto;
    }
    form.querySelectorAll('[data-key]').forEach(function (btn) {
      var key = btn.getAttribute('data-key');
      var value = btn.getAttribute('data-value');
      var on = key === 'marca' && value === '' ? !state.marca : state[key] === value;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.querySelectorAll('[data-set-tipo]').forEach(function (a) {
      a.setAttribute('aria-current', state.tipo === a.getAttribute('data-set-tipo') ? 'true' : 'false');
    });
    if (!reduceMotion) {
      Array.prototype.forEach.call(grid.children, function (li, i) {
        li.style.setProperty('--d', ((i % POR_PAGINA) * 0.04).toFixed(2) + 's');
        li.setAttribute('data-anim', 'rise');
        requestAnimationFrame(function () { requestAnimationFrame(function () { li.classList.add('is-in'); }); });
      });
    }
  };

  var setFiltro = function (key, value) {
    state[key] = state[key] === value ? null : value;
    state.limite = POR_PAGINA;
    render();
  };

  form.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-key]');
    if (!btn) { return; }
    setFiltro(btn.getAttribute('data-key'), btn.getAttribute('data-value') || null);
  });
  form.addEventListener('reset', function (event) {
    event.preventDefault();
    state = Object.assign(vazio(), { ordem: state.ordem, limite: POR_PAGINA });
    render();
  });
  document.getElementById('ordem').addEventListener('change', function (event) {
    state.ordem = event.target.value;
    render();
  });
  var maisBtn = document.getElementById('estoque-mais');
  if (maisBtn) {
    maisBtn.addEventListener('click', function () {
      state.limite += POR_PAGINA;
      render();
    });
  }
  /* Atalhos fora do painel (ex.: categorias no topo da página) */
  document.addEventListener('click', function (event) {
    var link = event.target.closest('[data-set-tipo]');
    if (!link) { return; }
    var tipo = link.getAttribute('data-set-tipo') || null;
    state = Object.assign(vazio(), { ordem: state.ordem, limite: POR_PAGINA, tipo: tipo });
    render();
  });

  /* ---------- gallery (full-screen dialog) ---------- */
  var dlg = document.getElementById('galeria');
  var img = document.getElementById('galeria-foto');
  var thumbsBox = document.getElementById('galeria-thumbs');
  var current = null;
  var index = 0;
  var opener = null;

  var preload = function (c, i) {
    if (i < 0 || i >= c.fotos) { return; }
    var p = new Image();
    p.src = foto(c, i);
  };

  var show = function (i) {
    if (!current) { return; }
    index = (i + current.fotos) % current.fotos;
    img.classList.remove('is-ready');
    img.src = foto(current, index);
    img.alt = nome(current) + ', foto ' + (index + 1) + ' de ' + current.fotos;
    document.getElementById('galeria-contador').textContent = (index + 1) + ' / ' + current.fotos;
    thumbsBox.querySelectorAll('button').forEach(function (b, k) {
      var on = k === index;
      b.setAttribute('aria-current', on ? 'true' : 'false');
      if (on) { b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' }); }
    });
    preload(current, index + 1);
    preload(current, index - 1);
  };
  img.addEventListener('load', function () { img.classList.add('is-ready'); });

  var open = function (id, i, from) {
    current = byId[id];
    if (!current || !dlg) { return; }
    opener = from || null;
    document.getElementById('galeria-titulo').textContent = nome(current) + ' ' + current.ano;
    document.getElementById('galeria-sub').textContent = [current.versao, uso(current), current.cambio, current.combustivel, current.cor].filter(Boolean).join(' · ');
    var destaques = document.getElementById('galeria-destaques');
    if (destaques) {
      destaques.innerHTML = (current.destaques || []).map(function (d) { return '<li>' + icon('i-check') + esc(d) + '</li>'; }).join('');
    }
    document.getElementById('galeria-preco').innerHTML = precoHtml(current);
    var whats = document.getElementById('galeria-whats');
    whats.href = waLink(current);
    whats.querySelector('span').textContent = current.preco == null ? 'Consultar valor' : 'Tenho interesse';
    var html = '';
    for (var k = 0; k < current.fotos; k++) {
      html += '<li><button type="button" data-thumb="' + k + '" aria-label="Foto ' + (k + 1) + '"><img src="' + foto(current, k, 't') + '" alt="" width="240" height="320" loading="lazy"></button></li>';
    }
    thumbsBox.innerHTML = html;
    if (typeof dlg.showModal === 'function') { dlg.showModal(); } else { dlg.setAttribute('open', ''); }
    document.body.classList.add('galeria-aberta');
    show(i || 0);
  };

  var close = function () {
    if (dlg.open) { dlg.close(); }
  };
  dlg.addEventListener('close', function () {
    document.body.classList.remove('galeria-aberta');
    img.removeAttribute('src');
    if (opener) { opener.focus(); }
  });

  var swap = function (thumb) {
    var card = thumb.closest('.carro');
    var c = byId[card.getAttribute('data-id')];
    var media = card.querySelector('.carro__media');
    var big = media.querySelector('img');
    var k = parseInt(thumb.getAttribute('data-swap'), 10);
    if (!c || media.getAttribute('data-i') === String(k)) { return; }
    media.setAttribute('data-i', String(k));
    big.classList.add('is-swapping');
    var next = new Image();
    next.onload = next.onerror = function () {
      big.src = next.src;
      media.style.setProperty('--bg', "url('" + abs(foto(c, k, 'm')) + "')");
      big.classList.remove('is-swapping');
    };
    next.src = foto(c, k, 'm');
    card.querySelectorAll('[data-swap]').forEach(function (b) {
      b.setAttribute('aria-pressed', b === thumb ? 'true' : 'false');
    });
  };

  grid.addEventListener('click', function (event) {
    var thumb = event.target.closest('[data-swap]');
    if (thumb) { swap(thumb); return; }
    var media = event.target.closest('.carro__media');
    if (!media) { return; }
    open(media.getAttribute('data-open'), parseInt(media.getAttribute('data-i'), 10) || 0, media);
  });

  dlg.addEventListener('click', function (event) {
    var action = event.target.closest('[data-galeria]');
    var thumb = event.target.closest('[data-thumb]');
    if (thumb) { show(parseInt(thumb.getAttribute('data-thumb'), 10)); return; }
    if (action) {
      var a = action.getAttribute('data-galeria');
      if (a === 'prev') { show(index - 1); } else if (a === 'next') { show(index + 1); } else { close(); }
      return;
    }
    if (event.target === dlg) { close(); }
  });

  dlg.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowRight') { event.preventDefault(); show(index + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(index - 1); }
  });

  /* swipe on touch screens */
  var startX = null;
  img.addEventListener('pointerdown', function (event) { startX = event.clientX; });
  img.addEventListener('pointerup', function (event) {
    if (startX === null) { return; }
    var dx = event.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) { show(dx < 0 ? index + 1 : index - 1); }
  });

  /* contadores fora da vitrine (ex.: "45 anúncios recentes" no topo) */
  document.querySelectorAll('[data-total-anuncios]').forEach(function (n) { n.textContent = String(cars.length); });
  document.querySelectorAll('[data-total-tipo]').forEach(function (n) {
    n.textContent = String(countBy('tipo')[n.getAttribute('data-total-tipo')] || 0);
  });

  buildMarcas();
  buildChips();
  render();
})();
