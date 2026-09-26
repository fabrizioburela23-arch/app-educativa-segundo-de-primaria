// Tipos «opcion» (una respuesta) y «multiple» (todas las correctas).
import { h, mezclar } from '../ui/dom.js';
import { textoOpcion } from '../contenido/texto.js';
import { renderVisual } from '../visuales/visual.js';

export default function opcion(cont, ej, ctx) {
  const multi = ej.tipo === 'multiple';
  const ops = (ej.mezclar === false ? ej.opciones : mezclar(ej.opciones)).map((o) => ({ ...o }));
  const elegidas = new Set();
  const botones = [];

  const cortas = ops.every((o) => textoOpcion(o).length <= 4 && !o.visual);
  const conImagen = ops.some((o) => o.emoji || o.visual);
  const cols = ej.columnas || (cortas ? Math.min(ops.length, 4) : conImagen && ops.every((o) => (o.texto || '').length <= 14) ? 2 : 1);

  const grid = h('div', { class: `opciones c${cols}`, role: multi ? 'group' : 'radiogroup', 'aria-label': ej.enunciado });
  ops.forEach((o, i) => {
    const b = h('button', {
      class: 'opcion', type: 'button',
      role: multi ? 'checkbox' : 'radio', 'aria-checked': 'false',
      onclick: () => tocar(i),
    },
    o.visual ? h('span', { class: 'visual-mini' }, renderVisual(o.visual, ctx.datosVisual)) : null,
    o.emoji ? h('span', { class: 'emoji', 'aria-hidden': 'true' }, o.emoji) : null,
    o.texto ? h('span', { class: 'txt' }, o.texto) : null);
    botones.push(b);
    grid.appendChild(b);
  });
  cont.appendChild(grid);
  if (multi) cont.appendChild(h('p', { class: 'nota', style: 'text-align:center;margin-top:10px;color:var(--tinta-suave)' }, 'Puedes elegir más de una.'));

  function pintar() {
    botones.forEach((b, i) => {
      const si = elegidas.has(i);
      b.classList.toggle('elegida', si);
      b.setAttribute('aria-checked', si ? 'true' : 'false');
    });
  }

  function tocar(i) {
    if (botones[i].disabled) return;
    if (multi) { if (elegidas.has(i)) elegidas.delete(i); else elegidas.add(i); }
    else { elegidas.clear(); elegidas.add(i); }
    pintar();
    ctx.alCambiar();
  }

  return {
    listo: () => elegidas.size > 0,
    evaluar() {
      if (!multi) {
        const o = ops[[...elegidas][0]];
        if (o.correcta) return { correcto: true, respuesta: textoOpcion(o) };
        return { correcto: false, pista: o.pista, error: o.error || ej.error, respuesta: textoOpcion(o) };
      }
      const faltan = ops.filter((o, i) => o.correcta && !elegidas.has(i)).length;
      const sobran = ops.filter((o, i) => !o.correcta && elegidas.has(i));
      const respuesta = [...elegidas].map((i) => textoOpcion(ops[i])).join(', ');
      if (!faltan && !sobran.length) return { correcto: true, respuesta };
      const partes = [];
      if (sobran.length) partes.push(sobran.length === 1 ? 'Elegiste una que no va.' : `Elegiste ${sobran.length} que no van.`);
      if (faltan) partes.push(faltan === 1 ? 'Te falta elegir una.' : `Te faltan ${faltan}.`);
      const esp = sobran.find((o) => o.pista);
      return { correcto: false, pista: [partes.join(' '), esp ? esp.pista : ej.pista].join(' '), error: (sobran[0] && sobran[0].error) || ej.error, respuesta };
    },
    prepararReintento() {
      for (const i of [...elegidas]) {
        if (!ops[i].correcta || !multi) {
          elegidas.delete(i);
          if (!multi) { botones[i].classList.add('descartada'); botones[i].disabled = true; }
          else { botones[i].classList.add('revisar'); setTimeout(() => botones[i].classList.remove('revisar'), 1500); }
        }
      }
      pintar();
    },
    mostrarSolucion() {
      botones.forEach((b, i) => {
        b.classList.remove('elegida', 'revisar');
        if (ops[i].correcta) b.classList.add('correcta'); else b.classList.add('descartada');
      });
    },
    bloquear() { botones.forEach((b) => { b.disabled = true; }); },
  };
}
