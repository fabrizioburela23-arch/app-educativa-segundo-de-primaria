// Simetría: el lado izquierdo viene pintado (fijo); el niño pinta el lado
// derecho tocando cuadritos para que sea su reflejo.
import { crearCuadricula } from '../visuales/visual.js';
import { crearBase, lectura, entero } from './comun.js';

export function crear(cfg, opts) {
  const b = crearBase('simetria', opts);
  const F = entero(cfg.filas, 2, 10, 4);
  let K = entero(cfg.columnas, 2, 10, 4);
  if (K % 2) K += 1;
  const mitad = K / 2;
  const cua = crearCuadricula({
    filas: F,
    columnas: K,
    celdas: [],
    color: cfg.color,
    editable: (f, k) => k >= mitad,
    alTocar: (f, k) => alternar(f, k),
  });
  const clave = (f, k) => `${f},${k}`;
  const fijas = new Set((cfg.celdas || [])
    .filter((c) => Array.isArray(c) && c[0] >= 0 && c[0] < F && c[1] >= 0 && c[1] < mitad)
    .map((c) => clave(c[0], c[1])));
  const esperado = new Set([...fijas].map((x) => {
    const [f, k] = x.split(',').map(Number);
    return clave(f, K - 1 - k);
  }));
  let derecha = new Set();
  let solucion = false;

  const lect = lectura('simm-lectura');
  b.el.append(cua.el, lect);

  function alternar(f, k) {
    if (b.bloqueado || k < mitad) return;
    const c = clave(f, k);
    if (derecha.has(c)) derecha.delete(c); else derecha.add(c);
    pintar();
    b.avisar();
  }

  const igual = () => derecha.size === esperado.size && [...esperado].every((x) => derecha.has(x));

  function pintar() {
    cua.celdasEl.forEach((el, c) => {
      const k = Number(c.split(',')[1]);
      if (k < mitad) {
        el.classList.toggle('pintada', fijas.has(c));
      } else {
        const si = derecha.has(c);
        el.classList.toggle('pintada', si);
        el.setAttribute('aria-pressed', si ? 'true' : 'false');
        el.disabled = b.bloqueado;
      }
    });
    const mostrar = b.libre || solucion;
    lect.hidden = !mostrar;
    if (mostrar) {
      lect.textContent = igual()
        ? '¡Los dos lados son iguales, como en un espejo!'
        : `Pintaste ${derecha.size} ${derecha.size === 1 ? 'cuadrito' : 'cuadritos'} a la derecha`;
    }
  }

  const api = {
    el: b.el,
    listo: () => derecha.size >= 1,
    evaluar() {
      if (igual()) return { correcto: true };
      const faltan = [...esperado].some((x) => !derecha.has(x));
      const sobran = [...derecha].some((x) => !esperado.has(x));
      if (faltan && sobran) return { correcto: false, detalle: 'Hay cuadritos que no van y faltan otros. Compara cada fila con el otro lado.' };
      if (faltan) return { correcto: false, detalle: 'Todavía faltan cuadritos por pintar.' };
      return { correcto: false, detalle: 'Hay cuadritos pintados que no van.' };
    },
    mostrarSolucion() {
      derecha = new Set(esperado);
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
      derecha = new Set();
      solucion = false;
      b.bloqueado = false;
      b.el.classList.remove('bloqueado', 'solucion');
      pintar();
    },
    valorTexto: () => `${derecha.size} ${derecha.size === 1 ? 'cuadrito pintado' : 'cuadritos pintados'} a la derecha`,
  };
  pintar();
  return api;
}
