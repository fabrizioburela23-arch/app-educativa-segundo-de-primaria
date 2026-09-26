// Tipo «ordenar»: tocar las fichas en el orden correcto (se pueden quitar tocándolas).
import { h, mezclarDistinto } from '../ui/dom.js';
import { textoOpcion } from '../contenido/texto.js';

export default function ordenar(cont, ej, ctx) {
  const elementos = ej.elementos.map((e, k) => ({ k, texto: typeof e === 'string' ? e : textoOpcion(e), emoji: typeof e === 'object' ? e.emoji : '', etiqueta: typeof e === 'object' ? e.texto || '' : e }));
  const mezclados = mezclarDistinto(elementos, (a, b) => a.k === b.k);
  const colocados = []; // k en orden
  const vertical = !!ej.vertical || elementos.some((e) => e.texto.length > 22);
  const unir = typeof ej.unir === 'string';

  const zona = h('div', { class: `ordenar-zona ${vertical ? 'vertical' : ''} ${unir && ej.unir === '' ? 'unido' : ''}`, 'aria-label': 'Tu orden' });
  const origen = h('div', { class: `ordenar-origen ${vertical ? 'vertical' : ''}`, 'aria-label': 'Fichas para ordenar' });
  const vista = unir ? h('div', { class: 'vista-previa', 'aria-live': 'polite' }) : null;
  cont.append(zona, vista || '', origen);

  const fichasOrigen = new Map();
  mezclados.forEach((e) => {
    const b = h('button', { class: 'ficha', type: 'button', 'data-k': String(e.k), onclick: () => colocar(e.k) },
      e.emoji ? h('span', { class: 'emoji', 'aria-hidden': 'true' }, e.emoji) : null, e.etiqueta ? ` ${e.etiqueta}` : '');
    fichasOrigen.set(e.k, b);
    origen.appendChild(b);
  });
  let bloqueado = false;
  let marcas = new Set();

  function colocar(k) {
    if (bloqueado || colocados.includes(k)) return;
    colocados.push(k);
    pintar();
    ctx.alCambiar();
  }
  function quitar(pos) {
    if (bloqueado) return;
    colocados.splice(pos, 1);
    marcas = new Set();
    pintar();
    ctx.alCambiar();
  }

  function pintar(solucion = false) {
    zona.textContent = '';
    for (let pos = 0; pos < elementos.length; pos++) {
      const k = colocados[pos];
      if (k === undefined) { zona.appendChild(h('span', { class: 'hueco-orden', 'aria-hidden': 'true' }, String(pos + 1))); continue; }
      const e = elementos[k];
      const b = h('button', { class: `ficha ${marcas.has(pos) ? 'revisar' : ''} ${solucion ? 'correcta' : ''}`, type: 'button', onclick: () => quitar(pos), 'aria-label': `${pos + 1}: ${e.texto}. Toca para quitar` },
        !unir ? h('span', { class: 'num' }, String(pos + 1)) : null,
        e.emoji ? h('span', { class: 'emoji', 'aria-hidden': 'true' }, e.emoji) : null, e.etiqueta ? ` ${e.etiqueta}` : '');
      if (bloqueado) b.disabled = true;
      zona.appendChild(b);
    }
    fichasOrigen.forEach((b, k) => { b.classList.toggle('usada', colocados.includes(k)); b.disabled = bloqueado || colocados.includes(k); });
    if (vista) vista.textContent = colocados.map((k) => elementos[k].texto).join(ej.unir);
  }
  pintar();

  const correctoEn = (pos) => colocados[pos] === pos;

  return {
    listo: () => colocados.length === elementos.length,
    evaluar() {
      const respuesta = colocados.map((k) => elementos[k].texto).join(unir ? ej.unir : ' → ');
      if (colocados.every((k, pos) => k === pos)) return { correcto: true, respuesta };
      return { correcto: false, pista: ej.pista, error: ej.error, respuesta };
    },
    prepararReintento() {
      // Se quedan las fichas que ya están bien desde el inicio; las demás vuelven.
      let primeroMal = colocados.findIndex((k, pos) => k !== pos);
      if (primeroMal < 0) primeroMal = colocados.length;
      marcas = new Set();
      colocados.splice(primeroMal);
      pintar();
    },
    mostrarSolucion() {
      colocados.length = 0;
      elementos.forEach((e) => colocados.push(e.k));
      marcas = new Set();
      bloqueado = true;
      pintar(true);
    },
    bloquear() { bloqueado = true; pintar(); },
  };
}
