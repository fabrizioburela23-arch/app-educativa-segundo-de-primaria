// Tipo «clasificar»: arrastrar (o tocar y luego tocar el grupo) cada elemento a su grupo.
import { h, mezclar, hacerArrastrable } from '../ui/dom.js';
import { textoOpcion } from '../contenido/texto.js';

export default function clasificar(cont, ej, ctx) {
  const elementos = mezclar(ej.elementos.map((e, k) => ({ ...e, k })));
  const lugar = new Map(); // k → id de categoría
  let elegido = null;
  let bloqueado = false;

  const origen = h('div', { class: 'clasificar-origen', role: 'group', 'aria-label': 'Elementos para clasificar' });
  const cats = ej.categorias.map((c) => {
    const dentro = h('div', { class: 'dentro-cat' });
    const el = h('div', { class: 'categoria', role: 'button', tabindex: '0', 'aria-label': `Grupo ${c.texto}`, onclick: (e) => { if (!e.target.closest('.ficha')) tocarCategoria(c.id); } },
      h('div', { class: 'cab' }, c.emoji ? h('span', { class: 'emoji', 'aria-hidden': 'true' }, c.emoji) : null, h('span', {}, c.texto)),
      dentro);
    el.dataset.cat = c.id;
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tocarCategoria(c.id); } });
    return { c, el, dentro };
  });
  const grilla = h('div', { class: 'categorias', style: `--n: ${cats.length}` }, cats.map((x) => x.el));
  const ayuda = h('p', { style: 'text-align:center;color:var(--tinta-suave);font-size:.95rem;margin:0 0 8px' }, 'Arrastra cada ficha a su grupo, o tócala y luego toca el grupo.');
  cont.append(ayuda, origen, grilla);

  const fichas = new Map();
  elementos.forEach((e) => {
    const b = h('button', { class: 'ficha', type: 'button' },
      e.emoji ? h('span', { class: 'emoji', 'aria-hidden': 'true' }, e.emoji) : null, e.texto ? ` ${e.texto}` : '');
    hacerArrastrable(b, {
      destinos: () => cats.map((x) => x.el),
      alSoltar: (d) => { if (d) mover(e.k, d.dataset.cat); },
      alTocar: () => tocarFicha(e.k),
    });
    fichas.set(e.k, b);
  });

  function mover(k, cat) {
    if (bloqueado) return;
    lugar.set(k, cat);
    elegido = null;
    pintar();
    ctx.alCambiar();
  }
  function tocarFicha(k) {
    if (bloqueado) return;
    if (lugar.has(k)) { lugar.delete(k); elegido = null; pintar(); ctx.alCambiar(); return; }
    elegido = elegido === k ? null : k;
    pintar();
  }
  function tocarCategoria(cat) {
    if (bloqueado || elegido === null) return;
    mover(elegido, cat);
  }

  function pintar(marcarMal = new Set(), solucion = false) {
    origen.textContent = '';
    cats.forEach((x) => { x.dentro.textContent = ''; });
    elementos.forEach((e) => {
      const b = fichas.get(e.k);
      b.classList.toggle('elegida', elegido === e.k);
      b.classList.toggle('revisar', marcarMal.has(e.k));
      b.classList.toggle('correcta', solucion);
      b.disabled = bloqueado;
      const cat = lugar.get(e.k);
      if (cat) cats.find((x) => x.c.id === cat).dentro.appendChild(b);
      else origen.appendChild(b);
    });
    origen.classList.toggle('oculto', lugar.size === elementos.length);
    cats.forEach((x) => x.el.classList.toggle('destino', elegido !== null));
  }
  pintar();

  return {
    listo: () => lugar.size === elementos.length,
    evaluar() {
      const malos = elementos.filter((e) => lugar.get(e.k) !== e.categoria);
      const respuesta = elementos.map((e) => `${textoOpcion(e)}→${lugar.get(e.k) || '?'}`).join(', ');
      if (!malos.length) return { correcto: true, respuesta };
      const extra = malos.length === 1 ? 'Una ficha está en otro grupo.' : `${malos.length} fichas están en otro grupo.`;
      return { correcto: false, pista: `${extra} ${ej.pista}`, error: ej.error, respuesta };
    },
    prepararReintento() {
      const malos = new Set(elementos.filter((e) => lugar.get(e.k) !== e.categoria).map((e) => e.k));
      malos.forEach((k) => lugar.delete(k));
      pintar(malos);
      setTimeout(() => pintar(), 1800);
    },
    mostrarSolucion() {
      elementos.forEach((e) => lugar.set(e.k, e.categoria));
      bloqueado = true;
      elegido = null;
      pintar(new Set(), true);
    },
    bloquear() { bloqueado = true; pintar(); },
  };
}
