// Tipo «tocar»: tocar las palabras que cumplen la consigna.
import { h } from '../ui/dom.js';
import { tokenizarTocar } from '../contenido/texto.js';

export default function tocar(cont, ej, ctx) {
  const { tokens } = tokenizarTocar(ej.texto);
  const caja = h('p', { class: 'texto-tocar' });
  const botones = [];
  const elegidas = new Set();

  tokens.forEach((t, i) => {
    if (t.espacio) { caja.appendChild(document.createTextNode(' ')); return; }
    if (!t.palabra) { caja.appendChild(h('span', { class: 'signo' }, t.texto)); return; }
    const b = h('button', { class: 'palabra', type: 'button', 'aria-pressed': 'false', onclick: () => alternar(i) }, t.texto);
    b.dataset.i = String(i);
    botones.push({ b, i, t });
    caja.appendChild(b);
  });
  cont.appendChild(caja);

  function alternar(i) {
    const item = botones.find((x) => x.i === i);
    if (!item || item.b.disabled) return;
    if (elegidas.has(i)) elegidas.delete(i); else elegidas.add(i);
    item.b.classList.toggle('elegida', elegidas.has(i));
    item.b.setAttribute('aria-pressed', elegidas.has(i) ? 'true' : 'false');
    ctx.alCambiar();
  }

  const correctas = () => botones.filter((x) => x.t.correcta).map((x) => x.i);

  return {
    listo: () => elegidas.size > 0,
    evaluar() {
      const ok = new Set(correctas());
      const faltan = [...ok].filter((i) => !elegidas.has(i)).length;
      const sobran = [...elegidas].filter((i) => !ok.has(i)).length;
      const respuesta = [...elegidas].map((i) => tokens[i].texto).join(', ');
      if (!faltan && !sobran) return { correcto: true, respuesta };
      const partes = [];
      if (sobran) partes.push(sobran === 1 ? 'Tocaste una palabra que no va.' : `Tocaste ${sobran} palabras que no van.`);
      if (faltan) partes.push(faltan === 1 ? 'Te falta una palabra.' : `Te faltan ${faltan} palabras.`);
      return { correcto: false, pista: `${partes.join(' ')} ${ej.pista}`, error: ej.error, respuesta };
    },
    prepararReintento() {
      const ok = new Set(correctas());
      for (const i of [...elegidas]) {
        if (!ok.has(i)) {
          elegidas.delete(i);
          const it = botones.find((x) => x.i === i);
          it.b.classList.remove('elegida');
          it.b.classList.add('revisar');
          it.b.setAttribute('aria-pressed', 'false');
          setTimeout(() => it.b.classList.remove('revisar'), 1600);
        }
      }
    },
    mostrarSolucion() {
      botones.forEach(({ b, t }) => {
        b.classList.remove('elegida', 'revisar');
        if (t.correcta) b.classList.add('correcta');
      });
    },
    bloquear() { botones.forEach(({ b }) => { b.disabled = true; }); },
  };
}
