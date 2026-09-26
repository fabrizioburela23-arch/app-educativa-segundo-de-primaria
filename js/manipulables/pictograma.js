// Pictograma: cada fila tiene − y + para poner íconos.
import { h } from '../ui/dom.js';
import { iconoPicto, clavePicto } from '../visuales/visual.js';
import { crearBase, boton, entero } from './comun.js';

const MAX = 10;

export function crear(cfg, opts) {
  const b = crearBase('pictograma', opts);
  const icono = cfg.icono || '⭐';
  const escala = Number(cfg.escala) > 0 ? Number(cfg.escala) : 1;
  const cats = (Array.isArray(cfg.categorias) ? cfg.categorias : []).slice(0, 6);
  const conObjetivo = !b.libre && cats.length > 0 && cats.every((c) => Number.isInteger(c.objetivo));
  const ini = cats.map((c) => entero(c.inicial, 0, MAX, 0));
  let st = ini.slice();
  let solucion = false;

  const filas = cats.map((c, i) => {
    const iconos = h('div', { class: 'pim-iconos' });
    const valor = h('div', { class: 'pim-valor' });
    const menos = boton('−', { etiqueta: `Quitar un ícono de ${c.etiqueta}`, clase: 'menos', onclick: () => sumar(i, -1) });
    const mas = boton('+', { etiqueta: `Agregar un ícono a ${c.etiqueta}`, clase: 'mas', onclick: () => sumar(i, 1) });
    const el = h('div', { class: 'pim-fila', role: 'group', 'aria-label': c.etiqueta || `Fila ${i + 1}` },
      h('div', { class: 'pim-etq' }, c.emoji ? h('span', { class: 'pic-etq-emo' }, c.emoji) : null, h('span', {}, c.etiqueta || '')),
      h('div', { class: 'pim-botones' }, menos, mas),
      iconos, valor);
    return { el, iconos, valor, menos, mas };
  });
  b.el.append(
    h('div', { class: 'pic pim' },
      cfg.titulo ? h('div', { class: 'pic-titulo' }, cfg.titulo) : null,
      h('div', { class: 'pim-filas' }, filas.map((f) => f.el)),
      clavePicto(icono, escala)),
  );

  function sumar(i, d) {
    if (b.bloqueado) return;
    const n = st[i] + d;
    if (n < 0 || n > MAX) return;
    st = st.map((x, k) => (k === i ? n : x));
    pintar();
    b.avisar();
  }

  function pintar() {
    filas.forEach((f, i) => {
      f.iconos.replaceChildren(...Array.from({ length: st[i] }, () => iconoPicto(icono)));
      if (!st[i]) f.iconos.append(h('span', { class: 'pim-vacio' }, 'vacío'));
      f.menos.disabled = b.bloqueado || st[i] <= 0;
      f.mas.disabled = b.bloqueado || st[i] >= MAX;
      const ver = b.libre || solucion;
      f.valor.hidden = !ver;
      f.valor.textContent = ver ? `= ${st[i] * escala}` : '';
    });
  }

  const api = {
    el: b.el,
    listo: () => st.some((x, i) => x !== ini[i]),
    evaluar() {
      if (!conObjetivo) return { correcto: true };
      const mal = cats.findIndex((c, i) => st[i] * escala !== c.objetivo);
      if (mal < 0) return { correcto: true };
      const recuerda = escala > 1 ? ` Recuerda: cada ${icono} vale ${escala}.` : '';
      return { correcto: false, detalle: `Revisa la fila de ${cats[mal].etiqueta}.${recuerda}` };
    },
    mostrarSolucion() {
      if (!conObjetivo) return;
      st = cats.map((c) => Math.min(MAX, Math.round(c.objetivo / escala)));
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
      st = ini.slice();
      solucion = false;
      b.bloqueado = false;
      b.el.classList.remove('bloqueado', 'solucion');
      pintar();
    },
    valorTexto: () => cats.map((c, i) => `${c.etiqueta}: ${st[i]} ${st[i] === 1 ? 'ícono' : 'íconos'}`).join(', '),
  };
  pintar();
  return api;
}
