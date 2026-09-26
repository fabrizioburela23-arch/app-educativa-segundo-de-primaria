// Recta numérica: tocar (o arrastrar) cerca de una marca para poner el marcador.
// Toda la recta es zona táctil y el marcador salta a la marca más cercana.
import { h } from '../ui/dom.js';
import { crearRecta, s } from '../visuales/visual.js';
import { crearBase, boton, lectura, xEnSvg } from './comun.js';

export function crear(cfg, opts) {
  const b = crearBase('recta', opts);
  const r = crearRecta(
    { min: cfg.min, max: cfg.max, paso: cfg.paso, ocultar: cfg.ocultar },
    { interactiva: true, etiquetas: cfg.etiquetas === 'extremos' ? 'extremos' : 'todas' },
  );
  const { svg, y0, min, max, paso } = r;
  const objetivo = Number.isFinite(Number(cfg.objetivo)) && cfg.objetivo !== null && cfg.objetivo !== undefined ? Number(cfg.objetivo) : null;
  const inicial = Number.isFinite(Number(cfg.inicial)) && cfg.inicial !== null && cfg.inicial !== undefined ? r.valorEnX(r.xDe(Number(cfg.inicial))) : null;
  let marca = inicial;
  let solucion = false;

  // marcador (alfiler) + punto sobre la línea
  const punto = s('circle', { cx: 0, cy: y0, r: 9, class: 'rn-sel' });
  const pin = s('g', { class: 'rn-pin' },
    s('path', { d: `M0 ${y0 - 11}L-11 ${y0 - 34}A15 15 0 1 1 11 ${y0 - 34}Z` }),
    s('circle', { cx: 0, cy: y0 - 42, r: 5.5, class: 'rn-pin-ojo' }));
  const grupoMarca = s('g', { class: 'rn-marcador' }, punto, pin);
  svg.append(grupoMarca);
  let etSolucion = null;

  svg.setAttribute('role', 'slider');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('aria-label', 'Recta numérica. Toca una rayita para poner tu marca.');
  svg.setAttribute('aria-valuemin', String(min));
  svg.setAttribute('aria-valuemax', String(max));

  const lect = lectura('rnm-lectura');
  // Flechas grandes para ajustar la marca de a una rayita: las rayitas pueden
  // quedar muy juntas para un dedo. En modo libre dicen cuánto mueven (± paso);
  // en modo ejercicio son solo flechas (no dan pistas sobre el número).
  const menos = boton(b.libre ? `− ${paso}` : '◀', { etiqueta: b.libre ? `Mover ${paso} hacia la izquierda` : 'Mover la marca a la izquierda', onclick: () => mover(-1) });
  const mas = boton(b.libre ? `+ ${paso}` : '▶', { etiqueta: b.libre ? `Mover ${paso} hacia la derecha` : 'Mover la marca a la derecha', onclick: () => mover(1) });
  b.el.append(
    h('div', { class: 'rnm-caja' }, svg),
    h('div', { class: 'rnm-libre' }, menos, lect, mas),
  );

  function poner(v, avisar = true) {
    if (v === marca) return;
    marca = v;
    pintar();
    if (avisar) b.avisar();
  }

  function mover(d) {
    if (b.bloqueado) return;
    const base = marca === null ? (d > 0 ? min - paso : max + paso) : marca;
    const v = Math.max(min, Math.min(max, base + d * paso));
    poner(v);
  }

  // Puntero: tocar o arrastrar. La marca se mueve al arrastrar en horizontal y
  // se fija al soltar. Si el navegador usa el gesto para desplazar la página
  // (dedo en vertical), llega «pointercancel» y la marca vuelve a donde estaba.
  let toque = null; // { id, x, y, antes, moviendo }
  svg.addEventListener('pointerdown', (e) => {
    if (b.bloqueado || (e.pointerType === 'mouse' && e.button !== 0)) return;
    toque = { id: e.pointerId, x: e.clientX, y: e.clientY, antes: marca, moviendo: false };
    try { svg.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
    // Con el mouse (o lápiz) la marca responde al instante.
    if (e.pointerType !== 'touch') { toque.moviendo = true; poner(r.valorEnX(xEnSvg(svg, e, r.W))); }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!toque || e.pointerId !== toque.id || b.bloqueado) return;
    if (!toque.moviendo && Math.abs(e.clientX - toque.x) > 6 && Math.abs(e.clientX - toque.x) >= Math.abs(e.clientY - toque.y)) toque.moviendo = true;
    if (toque.moviendo) poner(r.valorEnX(xEnSvg(svg, e, r.W)));
  });
  svg.addEventListener('pointerup', (e) => {
    if (!toque || e.pointerId !== toque.id) return;
    toque = null;
    if (!b.bloqueado) poner(r.valorEnX(xEnSvg(svg, e, r.W)));
  });
  svg.addEventListener('pointercancel', () => {
    if (!toque) return;
    const { antes } = toque;
    toque = null;
    if (!b.bloqueado && marca !== antes) poner(antes);
  });
  svg.addEventListener('keydown', (e) => {
    if (b.bloqueado) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); mover(1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); mover(-1); }
  });

  function pintar() {
    const hay = marca !== null;
    grupoMarca.style.display = hay ? '' : 'none';
    if (hay) grupoMarca.setAttribute('transform', `translate(${r.xDe(marca)} 0)`);
    grupoMarca.classList.toggle('ok', solucion);
    if (hay) svg.setAttribute('aria-valuenow', String(marca));
    else svg.removeAttribute('aria-valuenow');
    if (etSolucion) { etSolucion.remove(); etSolucion = null; }
    r.etiquetasEl.forEach((t) => t.classList.remove('solucion'));
    if (solucion && hay) {
      const t = r.etiquetasEl.get(marca);
      if (t) t.classList.add('solucion');
      else {
        etSolucion = s('text', { x: r.xDe(marca), y: y0 + 31, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'rn-et solucion' }, String(marca));
        svg.append(etSolucion);
      }
    }
    const mostrar = b.libre || solucion;
    lect.hidden = !mostrar;
    if (mostrar) lect.textContent = hay ? (solucion ? `Aquí está el ${marca}` : `Elegiste el ${marca}`) : 'Toca la recta';
    menos.disabled = b.bloqueado || (hay && marca <= min);
    mas.disabled = b.bloqueado || (hay && marca >= max);
    svg.classList.toggle('bloqueada', b.bloqueado);
  }

  const api = {
    el: b.el,
    listo: () => marca !== null,
    evaluar() {
      if (objetivo === null) return { correcto: true };
      if (marca === null) return { correcto: false, detalle: 'Toca la recta para poner tu marca.' };
      if (marca === objetivo) return { correcto: true };
      return {
        correcto: false,
        detalle: marca < objetivo
          ? 'Tu marca quedó antes: el número está más a la derecha.'
          : 'Tu marca quedó después: el número está más a la izquierda.',
      };
    },
    mostrarSolucion() {
      if (objetivo === null) return;
      solucion = true;
      b.el.classList.add('solucion');
      marca = objetivo;
      pintar();
    },
    bloquear() {
      b.bloqueado = true;
      b.el.classList.add('bloqueado');
      svg.setAttribute('tabindex', '-1');
      pintar();
    },
    reiniciar() {
      marca = inicial;
      solucion = false;
      b.bloqueado = false;
      b.el.classList.remove('bloqueado', 'solucion');
      svg.setAttribute('tabindex', '0');
      pintar();
    },
    valorTexto: () => (marca === null ? 'sin marca' : `marca en ${marca}`),
  };
  pintar();
  return api;
}
