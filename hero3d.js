/* Tres Pistas Lab · portada animada
   Un render propio en canvas 2D con proyección en perspectiva: las cinco
   pistas, el edificio, los mástiles de cámara y los jugadores en movimiento,
   con los recuadros de seguimiento que dibuja el sistema de análisis.
   Sin librerías: pesa unos 12 kB y va fluido en cualquier móvil. */
(function () {
  'use strict';

  var lienzo = document.getElementById('hero3d');
  if (!lienzo) return;

  var menos = window.matchMedia('(prefers-reduced-motion: reduce)');
  var ctx = lienzo.getContext('2d', { alpha: true });
  if (!ctx) return;

  /* ---------------------------------------------------------- colores */
  var C = {
    pistaAzul: '#1d6fb8', pistaAzulT: '#2a81cd',
    pistaVerde: '#2f7d51', pistaVerdeT: '#3c9462',
    linea: 'rgba(255,255,255,.62)',
    borde: '#c2541a',
    sueloA: '#23324d', sueloB: '#1b2740',
    murоA: '#dfe3ea',
    naranja: '#E06010', naranjaClaro: '#FF9A4D',
    sombra: 'rgba(8,16,32,.30)',
  };
  var EQUIPOS = ['#E8E9EC', '#E06010', '#F2C14E', '#5BA8E8'];

  /* ------------------------------------------------- geometría del centro
     Son las medidas reales del plano de distribución y de la maqueta 3D:
     x a lo ancho de la parcela, y en profundidad, z en altura, en metros.
     'vert' marca las pistas cuyo lado largo va en el eje y. */
  var PISTAS = [
    // pista 1: balonmano y fútbol sala, 40 x 20, girada 90°
    { x: 5, y: 50.25, w: 20, h: 40, azul: true, vert: true },
    // pista 2: balonmano y fútbol sala, 40 x 20, la del graderío
    { x: 11.5, y: 24.25, w: 40, h: 20, azul: true, vert: false },
    // pistas 3, 4 y 5: baloncesto, 28 x 15
    { x: 30.4, y: 46.5, w: 28, h: 15, azul: false, vert: false },
    { x: 30.4, y: 62.5, w: 28, h: 15, azul: false, vert: false },
    { x: 30.4, y: 78.5, w: 28, h: 15, azul: false, vert: false },
  ];
  // los siete mástiles de cámara, en los centros que fija la memoria
  var MASTILES = [
    [15, 60.25], [15, 80.25], [21.5, 34.25], [41.5, 34.25],
    [44.4, 54], [44.4, 70], [44.4, 86],
  ];
  var EDIFICIO = { x: 9, y: 5, w: 45, h: 13.5, alt: 4.4 };
  var GRADA = { x: 11.5, y: 20.6, w: 40, h: 2.4 };          // la de 240 plazas
  var APARCA = [[62, 41], [72, 41], [95.5, 75.5], [91.5, 90], [62, 90]];
  var PARCELA = [[0, 0], [0, 100], [93, 100], [99, 76], [58, 12], [55, 0]];

  /* ------------------------------------------------------------ cámara */
  var cam = { giro: -0.50, alt: 0.74, dist: 215, objZ: 2, ox: 31, oy: 54 };
  var raton = { x: 0, y: 0, ax: 0, ay: 0 };
  var scroll = 0;
  var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, foco = 1;

  function medir() {
    var r = lienzo.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    lienzo.width = Math.round(W * dpr);
    lienzo.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // en pantalla ancha la maqueta se desplaza a la derecha, para que el
    // texto de la portada quede sobre fondo limpio
    var ancha = W / H > 1.15;
    cx = ancha ? W * 0.655 : W / 2;
    cy = ancha ? H * 0.52 : H * 0.78;
    foco = Math.max(W, H) * (ancha ? 1.02 : 0.60);
  }

  /* Proyección: giro sobre el eje vertical, inclinación y perspectiva. */
  var cosG = 1, sinG = 0, cosA = 1, sinA = 0, dist = 1;
  function prepararCamara() {
    var g = cam.giro + raton.ax * 0.22;
    var a = cam.alt + raton.ay * 0.1 - scroll * 0.26;
    cosG = Math.cos(g); sinG = Math.sin(g);
    cosA = Math.cos(a); sinA = Math.sin(a);
    dist = cam.dist * (1 + scroll * 0.55);
  }

  var _p = { x: 0, y: 0, z: 0, v: false };
  function proy(x, y, z) {
    x -= cam.ox; y -= cam.oy;
    var rx = x * cosG - y * sinG;
    var ry = x * sinG + y * cosG;
    var ey = ry * cosA - (z - cam.objZ) * sinA;
    var ez = ry * sinA + (z - cam.objZ) * cosA;
    var prof = ey + dist;
    if (prof < 6) { _p.v = false; return _p; }
    var k = foco / prof;
    _p.x = cx + rx * k;
    _p.y = cy - ez * k;
    _p.z = prof;
    _p.v = true;
    return _p;
  }

  /* --------------------------------------------------------- jugadores */
  var jugadores = [];
  function sembrar() {
    jugadores.length = 0;
    PISTAS.forEach(function (p, i) {
      var n = p.azul ? 7 : 5;
      for (var k = 0; k < n; k++) {
        jugadores.push({
          pista: i,
          bx: p.x + 4 + Math.random() * (p.w - 8),
          by: p.y + 3 + Math.random() * (p.h - 6),
          x: 0, y: 0,
          fase: Math.random() * 6.28,
          vel: 0.22 + Math.random() * 0.4,
          radio: 2.2 + Math.random() * 4.4,
          col: EQUIPOS[(i + k) % EQUIPOS.length],
          sx: 0, sy: 0, sz: 0, sk: 0,
        });
      }
    });
  }

  function moverJugadores(t) {
    for (var i = 0; i < jugadores.length; i++) {
      var j = jugadores[i];
      var f = j.fase + t * j.vel;
      j.x = j.bx + Math.cos(f) * j.radio;
      j.y = j.by + Math.sin(f * 1.37) * j.radio * 0.6;
    }
  }

  /* ------------------------------------------------------------ dibujo */
  function quad(a, b, c, d, relleno, trazo, grosor) {
    var p;
    ctx.beginPath();
    p = proy(a[0], a[1], a[2] || 0); if (!p.v) return; ctx.moveTo(p.x, p.y);
    p = proy(b[0], b[1], b[2] || 0); if (!p.v) return; ctx.lineTo(p.x, p.y);
    p = proy(c[0], c[1], c[2] || 0); if (!p.v) return; ctx.lineTo(p.x, p.y);
    p = proy(d[0], d[1], d[2] || 0); if (!p.v) return; ctx.lineTo(p.x, p.y);
    ctx.closePath();
    if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
    if (trazo) {
      ctx.strokeStyle = trazo;
      ctx.lineWidth = grosor || 1;
      ctx.stroke();
    }
  }

  function linea(pts, color, grosor) {
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var p = proy(pts[i][0], pts[i][1], pts[i][2] || 0);
      if (!p.v) return;
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = grosor || 1;
    ctx.stroke();
  }

  function arco(cxm, cym, r, de, a, color, grosor) {
    var pts = [], n = 22;
    for (var i = 0; i <= n; i++) {
      var ang = de + (a - de) * (i / n);
      pts.push([cxm + Math.cos(ang) * r, cym + Math.sin(ang) * r]);
    }
    linea(pts, color, grosor);
  }

  function caja(x, y, w, h, alto, cara, techo) {
    // cuatro paredes y la tapa, en orden de lejanía
    var e = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    var caras = [];
    for (var i = 0; i < 4; i++) {
      var a = e[i], b = e[(i + 1) % 4];
      var m = proy((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, alto / 2);
      caras.push({ z: m.v ? m.z : 1e9, a: a, b: b });
    }
    caras.sort(function (p, q) { return q.z - p.z; });
    for (var k = 0; k < 4; k++) {
      var f = caras[k];
      quad([f.a[0], f.a[1], 0], [f.b[0], f.b[1], 0],
        [f.b[0], f.b[1], alto], [f.a[0], f.a[1], alto], cara, 'rgba(10,20,40,.18)', 1);
    }
    quad([x, y, alto], [x + w, y, alto], [x + w, y + h, alto], [x, y + h, alto],
      techo, 'rgba(10,20,40,.22)', 1);
  }

  /* Las marcas de la pista se dibujan en coordenadas locales (u a lo largo,
     v a lo ancho desde el eje) y se llevan al mundo según esté girada. */
  function pista(p, t) {
    var b = 1.6, vert = !!p.vert;
    var largo = vert ? p.h : p.w;
    var ancho = vert ? p.w : p.h;
    var ejeU = vert ? p.y : p.x;
    var ejeV = vert ? p.x + p.w / 2 : p.y + p.h / 2;
    var M = vert
      ? function (u, v) { return [ejeV + v, ejeU + u]; }
      : function (u, v) { return [ejeU + u, ejeV + v]; };
    var lin = function (pts, col, gr) {
      linea(pts.map(function (q) { return M(q[0], q[1]); }), col, gr);
    };
    var arc = function (cu, cv, r, de, a, col, gr) {
      var pts = [], n = 24;
      for (var i = 0; i <= n; i++) {
        var ang = de + (a - de) * (i / n);
        pts.push([cu + Math.cos(ang) * r, cv + Math.sin(ang) * r]);
      }
      lin(pts, col, gr);
    };

    // zócalo de color teja alrededor y superficie de la pista
    quad(M(-b, -ancho / 2 - b), M(largo + b, -ancho / 2 - b),
      M(largo + b, ancho / 2 + b), M(-b, ancho / 2 + b), C.borde);
    quad(M(0, -ancho / 2), M(largo, -ancho / 2),
      M(largo, ancho / 2), M(0, ancho / 2), p.azul ? C.pistaAzul : C.pistaVerde);

    var L = C.linea, g = 1.1;
    var a2 = ancho / 2 - 0.9, u0 = 0.9, u1 = largo - 0.9, um = largo / 2;
    lin([[u0, -a2], [u1, -a2], [u1, a2], [u0, a2], [u0, -a2]], L, g);
    lin([[um, -a2], [um, a2]], L, g);
    arc(um, 0, p.azul ? 3.2 : 1.8, 0, 6.2832, L, g);
    if (p.azul) {
      // áreas de portería de balonmano, arcos de 6 m
      arc(u0, 0, 6, -1.5708, 1.5708, L, g);
      arc(u1, 0, 6, 1.5708, 4.7124, L, g);
    } else {
      // zona y triple de baloncesto
      arc(u0 + 1.575, 0, 6.75, -1.25, 1.25, L, g);
      arc(u1 - 1.575, 0, 6.75, 1.8916, 4.3916, L, g);
      lin([[u0, -2.45], [u0 + 5.8, -2.45], [u0 + 5.8, 2.45], [u0, 2.45]], L, g);
      lin([[u1, -2.45], [u1 - 5.8, -2.45], [u1 - 5.8, 2.45], [u1, 2.45]], L, g);
    }

    // barrido del análisis: una franja naranja que recorre la pista
    var s = (t * 0.17 + p.y * 0.008) % 1.7;
    if (s < 1) {
      ctx.save();
      ctx.globalAlpha = 0.5 * Math.sin(s * Math.PI);
      lin([[u0 + (u1 - u0) * s, -a2], [u0 + (u1 - u0) * s, a2]], C.naranjaClaro, 2);
      ctx.restore();
    }
  }

  function mastil(x, y) {
    var h = 7.4;
    quad([x - 0.22, y - 0.22, 0], [x + 0.22, y - 0.22, 0],
      [x + 0.22, y - 0.22, h], [x - 0.22, y - 0.22, h], '#55617a');
    quad([x - 0.9, y - 0.75, h], [x + 0.9, y - 0.75, h],
      [x + 0.9, y + 0.75, h + 0.1], [x - 0.9, y + 0.75, h + 0.1], '#2b3550');
    var p = proy(x, y, h + 0.55);
    if (p.v) {
      var r = Math.max(1.4, 160 / p.z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 6.2832);
      ctx.fillStyle = C.naranjaClaro;
      ctx.fill();
    }
  }

  function jugador(j) {
    var s = proy(j.x, j.y, 0);
    if (!s.v) { j.sk = 0; return; }
    var k = foco / s.z;
    var alto = 1.78 * k, ancho = 0.52 * k;
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, ancho * 0.95, ancho * 0.42, 0, 0, 6.2832);
    ctx.fillStyle = '#0a1420';
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = j.col;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(s.x - ancho / 2, s.y - alto, ancho, alto, ancho * 0.45);
    else ctx.rect(s.x - ancho / 2, s.y - alto, ancho, alto);
    ctx.fill();
    j.sx = s.x; j.sy = s.y; j.sz = s.z; j.sk = k;
    j.sw = ancho; j.sh = alto;
  }

  /* ------------------------------------------- recuadros de seguimiento */
  var seguidos = [];
  function elegirSeguidos(t) {
    if (seguidos.length && t - seguidos.t0 < 5.2) return;
    seguidos = [];
    seguidos.t0 = t;
    var vistos = jugadores.filter(function (j) { return j.sk > 0; });
    vistos.sort(function (a, b) { return a.sz - b.sz; });
    var n = Math.min(3, vistos.length);
    for (var i = 0; i < n; i++) {
      var j = vistos[Math.floor(i * vistos.length / Math.max(1, n))];
      if (j) seguidos.push({ j: j, dorsal: 2 + ((i * 7 + 3) % 20), conf: 91 + i * 3 });
    }
  }

  function recuadro(s, t, entrada) {
    var j = s.j;
    if (!j.sk) return;
    var m = Math.max(5, j.sw * 0.95);
    var w = Math.max(30, j.sw + m * 2);
    var h = Math.max(46, j.sh + m * 1.5);
    var x = j.sx - w / 2, y = j.sy - h + m * 0.5;
    var e = Math.min(1, entrada * 3);
    ctx.save();
    ctx.globalAlpha = e;
    var l = Math.min(w, h) * 0.34;
    var esquinas = [[x, y, 1, 1], [x + w, y, -1, 1],
      [x, y + h, 1, -1], [x + w, y + h, -1, -1]];
    ctx.lineCap = 'square';
    // primero un trazo oscuro, para que resalte sobre el color de la pista
    [['rgba(8,16,32,.55)', 4.5], ['#FFB366', 2.2]].forEach(function (capa) {
      ctx.strokeStyle = capa[0];
      ctx.lineWidth = capa[1];
      esquinas.forEach(function (c) {
        ctx.beginPath();
        ctx.moveTo(c[0], c[1] + c[3] * l);
        ctx.lineTo(c[0], c[1]);
        ctx.lineTo(c[0] + c[2] * l, c[1]);
        ctx.stroke();
      });
    });
    if (w > 20) {
      var et = '#' + s.dorsal + ' · ' + s.conf + '%';
      ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      var aw = ctx.measureText(et).width + 10;
      ctx.fillStyle = C.naranja;
      ctx.fillRect(x, y - 15, aw, 14);
      ctx.fillStyle = '#fff';
      ctx.fillText(et, x + 5, y - 4.5);
    }
    ctx.restore();
  }

  /* -------------------------------------------------------------- suelo */
  function poligono(pts, relleno, trazo, grosor) {
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var p = proy(pts[i][0], pts[i][1], 0);
      if (!p.v) return;
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
    if (trazo) { ctx.strokeStyle = trazo; ctx.lineWidth = grosor || 1; ctx.stroke(); }
  }

  function suelo() {
    // el entorno y, encima, la parcela con su forma real
    var R = 150;
    quad([34 - R, 50 - R], [34 + R, 50 - R], [34 + R, 50 + R], [34 - R, 50 + R],
      C.sueloB);
    poligono(PARCELA, C.sueloA, 'rgba(120,145,190,.20)', 1);
    poligono(APARCA, '#2c3a52', 'rgba(120,145,190,.22)', 0.8);
    // marcas del aparcamiento
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (var k = 0; k < 9; k++) {
      var u = 64 + k * 3.2;
      linea([[u, 43.5], [u, 48.5]], '#8d9cb6', 0.7);
    }
    ctx.restore();
    // graderío de la pista 2
    quad([GRADA.x, GRADA.y], [GRADA.x + GRADA.w, GRADA.y],
      [GRADA.x + GRADA.w, GRADA.y + GRADA.h], [GRADA.x, GRADA.y + GRADA.h], '#44506b');
  }

  /* -------------------------------------------------------------- bucle */
  var t0 = performance.now(), corriendo = false, visible = false, raf = 0;

  function cuadro(ahora) {
    raf = 0;
    if (!corriendo) return;
    var t = (ahora - t0) / 1000;
    raton.ax += (raton.x - raton.ax) * 0.06;
    raton.ay += (raton.y - raton.ay) * 0.06;
    cam.giro = -0.50 + Math.sin(t * 0.055) * 0.26;
    prepararCamara();

    ctx.clearRect(0, 0, W, H);
    suelo();

    // pistas de atrás hacia delante
    var orden = PISTAS.map(function (p, i) {
      var m = proy(p.x + p.w / 2, p.y + p.h / 2, 0);
      return { p: p, z: m.v ? m.z : 1e9, i: i };
    }).sort(function (a, b) { return b.z - a.z; });
    orden.forEach(function (o) { pista(o.p, t); });

    caja(EDIFICIO.x, EDIFICIO.y, EDIFICIO.w, EDIFICIO.h, EDIFICIO.alt,
      '#e7eaf0', '#49536b');

    MASTILES.map(function (m) {
      var p = proy(m[0], m[1], 0);
      return { m: m, z: p.v ? p.z : 1e9 };
    }).sort(function (a, b) { return b.z - a.z; })
      .forEach(function (o) { mastil(o.m[0], o.m[1]); });

    moverJugadores(t);
    jugadores.slice().sort(function (a, b) {
      var pa = proy(a.x, a.y, 0).z, pb = proy(b.x, b.y, 0).z;
      return pb - pa;
    }).forEach(jugador);

    elegirSeguidos(t);
    seguidos.forEach(function (s) { recuadro(s, t, t - seguidos.t0); });

    raf = requestAnimationFrame(cuadro);
  }

  function arrancar() {
    if (corriendo || menos.matches) return;
    corriendo = true;
    t0 = performance.now() - 1000;
    if (!raf) raf = requestAnimationFrame(cuadro);
  }
  function parar() {
    corriendo = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function estatico() {
    prepararCamara();
    ctx.clearRect(0, 0, W, H);
    suelo();
    PISTAS.forEach(function (p) { pista(p, 0); });
    caja(EDIFICIO.x, EDIFICIO.y, EDIFICIO.w, EDIFICIO.h, EDIFICIO.alt,
      '#e7eaf0', '#49536b');
    MASTILES.forEach(function (m) { mastil(m[0], m[1]); });
    moverJugadores(0);
    jugadores.forEach(jugador);
  }

  /* ------------------------------------------------------------ eventos */
  medir();
  sembrar();

  var pendiente = false;
  window.addEventListener('resize', function () {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(function () {
      pendiente = false;
      medir();
      if (!corriendo) estatico();
    });
  }, { passive: true });

  var banda = lienzo.closest('.hero') || lienzo.parentNode;
  banda.addEventListener('pointermove', function (e) {
    var r = banda.getBoundingClientRect();
    raton.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    raton.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }, { passive: true });
  banda.addEventListener('pointerleave', function () {
    raton.x = 0; raton.y = 0;
  }, { passive: true });

  window.addEventListener('scroll', function () {
    var r = banda.getBoundingClientRect();
    scroll = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) arrancar(); else parar();
    }, { threshold: 0.02 }).observe(lienzo);
  } else {
    arrancar();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) parar(); else if (visible) arrancar();
  });

  menos.addEventListener('change', function () {
    if (menos.matches) { parar(); estatico(); } else if (visible) arrancar();
  });

  if (menos.matches) estatico();
  lienzo.dataset.listo = '1';
})();
