// Fracciones: tocar una parte para pintarla o despintarla.
import { crearFraccion } from '../visuales/visual.js';
import { h } from '../ui/dom.js';
import { crearBase, lectura, activarConTeclado } from './comun.js';

export function crear(cfg, opts) {
  const b = crearBase('fraccion', opts);
  const f = crearFraccion({ forma: cfg.forma, partes: cfg.partes, coloreadas: 0 }, { interactiva: true });
  const n = f.n;
  const objetivo = Number.isInteger(cfg.objetivo) ? cfg.objetivo : null;
  const inicial = new Set();
  for (let i = 0; i < Math.min(n, Number(cfg.coloreadas) || 0); i++) inicial.add(i);
  let pintadas = new Set(inicial);
  let solucion = false;

  f.partes.forEach((p, i) => {
    p.addEventListener('click', () => alternar(i));
    activarConTeclado(p, () => alternar(i));
  });

  const lect = lectura('frm-lectura');
  b.el.append(h('div', { class: 'frm-caja' }, f.svg), lect);

  function alternar(i) {
    if (b.bloqueado) return;
    if (pintadas.has(i)) pintadas.delete(i); else pintadas.add(i);
    pintar();
    b.avisar();
  }

  function pintar() {
    for (let i = 0; i < n; i++) {
      f.pintar(i, pintadas.has(i));
      f.partes[i].setAttribute('tabindex', b.bloqueado ? '-1' : '0');
    }
    f.svg.classList.toggle('bloqueada', b.bloqueado);
    const mostrar = b.libre || solucion;
    lect.hidden = !mostrar;
    if (mostrar) lect.textContent = `${pintadas.size} de ${n} partes pintadas`;
  }

  const api = {
    el: b.el,
    listo: () => pintadas.size >= 1,
    evaluar() {
      if (objetivo === null) return { correcto: true };
      if (pintadas.size === objetivo) return { correcto: true };
      return {
        correcto: false,
        detalle: pintadas.size < objetivo
          ? 'Todavía faltan partes por pintar.'
          : 'Pintaste más partes de las necesarias.',
      };
    },
    mostrarSolucion() {
      if (objetivo === null) return;
      pintadas = new Set(Array.from({ length: Math.min(objetivo, n) }, (_, i) => i));
      solucion = true;
      b.el.classList.add('solucion');
      pintar();
    },
    bloquear() {
      b.bloqueado = true;
      b.el.classList.add('bloqueado');
      pintar();
    },
    reiniciar() {
      pintadas = new Set(inicial);
      solucion = false;
      b.bloqueado = false;
      b.el.classList.remove('bloqueado', 'solucion');
      pintar();
    },
    valorTexto: () => `${pintadas.size} de ${n} partes pintadas`,
  };
  pintar();
  return api;
}
