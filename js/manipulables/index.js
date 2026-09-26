// Manipulables: objetos que el niño mueve con el dedo (o el mouse).
//
//   crearManipulable(config, { libre, alCambiar }) → {
//     el, listo(), evaluar() → { correcto, detalle? }, mostrarSolucion(),
//     bloquear(), reiniciar(), valorTexto()
//   }
//
// libre = true se usa en «Observo → explorar»: no hay objetivo y se muestra lo
// que el niño va armando (número, total, hora...).
//
// Si la configuración no se puede usar:
//  - en modo ejercicio se lanza un error: el motor de ejercicios lo atrapa y
//    muestra «No se pudo mostrar este ejercicio» con un botón para seguir
//    (así el niño no queda atascado con «Comprobar» desactivado);
//  - en modo libre se muestra un aviso en lugar del manipulable (la lección sigue).
import { h } from '../ui/dom.js';
import { crear as bloques } from './bloques.js';
import { crear as recta } from './recta.js';
import { crear as fraccion } from './fraccion.js';
import { crear as dinero } from './dinero.js';
import { crear as reloj } from './reloj.js';
import { crear as grupos } from './grupos.js';
import { crear as repartir } from './repartir.js';
import { crear as simetria } from './simetria.js';
import { crear as calendario } from './calendario.js';
import { crear as pictograma } from './pictograma.js';
import { crear as patron } from './patron.js';

const TIPOS = { bloques, recta, fraccion, dinero, reloj, grupos, repartir, simetria, calendario, pictograma, patron };

function aviso() {
  const el = h('div', { class: 'manip manip-desconocido' },
    h('p', { class: 'visual-aviso' }, 'Esta actividad no se puede mostrar.'));
  return {
    el,
    listo: () => false,
    evaluar: () => ({ correcto: true }),
    mostrarSolucion() {},
    bloquear() {},
    reiniciar() {},
    valorTexto: () => '',
  };
}

export function crearManipulable(config, { libre = false, alCambiar = () => {} } = {}) {
  const fn = config && typeof config === 'object' ? TIPOS[config.tipo] : null;
  const opts = { libre: !!libre, alCambiar: typeof alCambiar === 'function' ? alCambiar : () => {} };
  if (!libre) {
    if (!fn) throw new Error(`Manipulable no disponible: ${config && config.tipo}`);
    return fn(config, opts);
  }
  let m;
  try {
    if (!fn) throw new Error(`Manipulable no disponible: ${config && config.tipo}`);
    m = fn(config, opts);
  } catch (err) {
    console.error(err);
    return aviso();
  }
  // En modo libre (explorar) no hay nada que acertar: evaluar siempre es correcto.
  m.evaluar = () => ({ correcto: true });
  return m;
}

export const TIPOS_MANIPULABLES = Object.keys(TIPOS);
