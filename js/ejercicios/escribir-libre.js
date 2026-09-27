// Tipo «escribir-libre»: el niño produce una oración o un texto breve.
// La app revisa lo verificable (mayúscula, punto, cantidad de palabras, palabras pedidas);
// el texto queda guardado solo en este dispositivo para que el adulto lo lea.
import { h } from '../ui/dom.js';
import { revisarRequisitos, MENSAJES_REQUISITO } from '../contenido/texto.js';

export default function escribirLibre(cont, ej, ctx) {
  const area = h('textarea', {
    class: 'campo-texto', rows: '4',
    autocomplete: 'off', autocapitalize: 'sentences', autocorrect: 'off', spellcheck: 'false',
    'aria-label': 'Tu texto', placeholder: 'Escribe aquí…',
    oninput: () => { ctx.alCambiar(); },
  });
  if (ej.guia && ej.guia.length) {
    cont.appendChild(h('p', { style: 'margin:0 0 6px;color:var(--tinta-suave);font-size:.95rem' }, 'Ideas para empezar (tócalas si quieres):'));
    cont.appendChild(h('div', { class: 'guia-escritura' }, ej.guia.map((g) => h('button', {
      type: 'button',
      onclick: () => {
        const inicio = g.replace(/\.\.\.|…$/, '').trim();
        area.value = area.value ? `${area.value} ${inicio}` : inicio;
        area.focus();
        ctx.alCambiar();
      },
    }, g))));
  }
  cont.appendChild(area);
  const lista = h('ul', { class: 'requisitos', 'aria-label': 'Lo que voy a revisar' },
    ej.requisitos.map((q) => h('li', {}, h('span', { 'aria-hidden': 'true' }, '☐'), ' ', MENSAJES_REQUISITO[q.tipo] ? MENSAJES_REQUISITO[q.tipo](q) : q.tipo)));
  cont.appendChild(lista);
  const modelo = h('div', { class: 'apoyo oculto' });
  cont.appendChild(modelo);
  let ultimoGuardado = null;
  const guardarSiCambio = () => {
    if (area.value.trim() && area.value !== ultimoGuardado) { ctx.guardarEscrito(area.value); ultimoGuardado = area.value; }
  };

  function marcar(res) {
    [...lista.children].forEach((li, i) => {
      li.classList.toggle('ok', res[i].ok);
      li.firstChild.textContent = res[i].ok ? '✅' : '✏️';
    });
  }

  return {
    listo: () => area.value.trim().length > 0,
    evaluar() {
      const res = revisarRequisitos(area.value, ej.requisitos);
      marcar(res);
      const faltan = res.filter((x) => !x.ok);
      guardarSiCambio();
      if (!faltan.length) return { correcto: true, respuesta: area.value };
      return { correcto: false, pista: `${faltan.map((f) => f.mensaje).join(' ')} ${ej.pista}`, error: ej.error, respuesta: area.value };
    },
    prepararReintento() { area.focus(); },
    mostrarSolucion() {
      modelo.classList.remove('oculto');
      modelo.textContent = '';
      modelo.append(h('span', { class: 'ic', 'aria-hidden': 'true' }, '📝'), h('span', {}, 'Un ejemplo: ', h('em', {}, ej.modelo)));
      guardarSiCambio();
    },
    bloquear() { area.disabled = true; cont.querySelectorAll('.guia-escritura button').forEach((b) => { b.disabled = true; }); },
  };
}
