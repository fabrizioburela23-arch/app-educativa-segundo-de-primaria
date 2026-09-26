// Manipulables: objetos que el niño mueve con el dedo (o el mouse).
//
//   crearManipulable(config, { libre, alCambiar }) → {
//     el, listo(), evaluar() → { correcto, detalle? }, mostrarSolucion(),
//     bloquear(), reiniciar(), valorTexto()
//   }
//
// libre = true se usa en «Observo → explorar»: no hay objetivo y se muestra lo
// que el niño va armando (número, total, hora...).
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

export function crearManipulable(config, { libre = false, alCambiar = () => {} } = {}) {
  const fn = config && TIPOS[config.tipo];
  if (!fn) {
    const el = h('div', { class: 'manip manip-desconocido' },
      h('p', { class: 'visual-aviso' }, 'Esta actividad no se puede mostrar.'));
    return {
      el,
      listo: () => false,
      evaluar: () => ({ correcto: false }),
      mostrarSolucion() {},
      bloquear() {},
      reiniciar() {},
      valorTexto: () => '',
    };
  }
  return fn(config, { libre: !!libre, alCambiar: typeof alCambiar === 'function' ? alCambiar : () => {} });
}

export const TIPOS_MANIPULABLES = Object.keys(TIPOS);
