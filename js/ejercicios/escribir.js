// Tipo «escribir»: escribir una palabra o frase (con o sin dictado).
import { h } from '../ui/dom.js';
import { compararEscrito } from '../contenido/texto.js';

export default function escribir(cont, ej, ctx) {
  const input = h('input', {
    class: 'campo-texto', type: 'text',
    autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
    'aria-label': 'Tu respuesta', placeholder: 'Escribe aquí',
    oninput: () => ctx.alCambiar(),
    onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); ctx.enviar(); } },
  });
  const solucion = h('p', { class: 'oculto', style: 'margin-top:10px;font-size:1.2rem' });
  cont.append(input, solucion);

  return {
    listo: () => input.value.trim().length > 0,
    evaluar() {
      const r = compararEscrito(input.value, ej.respuestas, { mayusculas: ej.mayusculas, tildes: ej.tildes });
      if (r.correcto) return { correcto: true, nota: r.nota, respuesta: input.value };
      let pista = ej.pista;
      if (r.motivo === 'mayusculas') pista = `Casi: revisa las mayúsculas. ${ej.pista}`;
      if (r.motivo === 'tildes') pista = `Casi: revisa las tildes. ${ej.pista}`;
      return { correcto: false, pista, error: ej.error, respuesta: input.value };
    },
    prepararReintento() {
      input.classList.add('revisar');
      setTimeout(() => input.classList.remove('revisar'), 1800);
      input.focus();
      input.select();
    },
    mostrarSolucion() {
      solucion.classList.remove('oculto');
      solucion.textContent = '';
      solucion.append('Se escribe: ', h('strong', {}, ej.respuestas[0]));
      input.classList.add('revisar');
    },
    bloquear() { input.disabled = true; },
    enfocar() { if (!ej.escuchar) input.focus(); },
  };
}
