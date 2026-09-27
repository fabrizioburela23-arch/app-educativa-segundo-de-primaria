// Tipo «manipular»: envuelve un manipulable (bloques, dinero, reloj...) como ejercicio.
import { crearManipulable } from '../manipulables/index.js';

export default function manipular(cont, ej, ctx) {
  const m = crearManipulable(ej.manipulable, { libre: false, alCambiar: () => ctx.alCambiar() });
  cont.appendChild(m.el);
  return {
    manipulable: m,
    listo: () => m.listo(),
    evaluar() {
      const r = m.evaluar();
      const respuesta = typeof m.valorTexto === 'function' ? m.valorTexto() : '';
      if (r.correcto) return { correcto: true, respuesta };
      return { correcto: false, pista: r.detalle ? `${r.detalle} ${ej.pista}` : ej.pista, error: ej.error, respuesta };
    },
    prepararReintento() {},
    mostrarSolucion() { m.mostrarSolucion(); },
    bloquear() { m.bloquear(); },
  };
}
