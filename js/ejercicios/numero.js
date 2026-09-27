// Tipo «numero»: respuesta numérica con teclado grande en pantalla.
import { h } from '../ui/dom.js';

const MAX_CIFRAS = 6;

export default function numero(cont, ej, ctx) {
  const campos = ej.campos ? ej.campos : [{ etiqueta: '', respuesta: ej.respuesta }];
  const valores = campos.map(() => '');
  let activo = 0;
  let bloqueado = false;

  const cajas = campos.map((c, i) => {
    const caja = h('button', { class: 'caja-numero', type: 'button', 'aria-label': c.etiqueta ? `${c.etiqueta}: tu respuesta` : 'Tu respuesta', onclick: () => { if (!bloqueado) { activo = i; pintar(); } } });
    return caja;
  });
  const filas = campos.map((c, i) => h('div', { class: 'campo-numero' },
    c.etiqueta ? h('span', { class: 'etiqueta' }, c.etiqueta) : null,
    cajas[i]));
  cont.appendChild(h('div', { class: 'campos-numero' }, filas));

  const tecla = (t, etiqueta, clase = '') => h('button', { type: 'button', class: clase, 'aria-label': etiqueta || t, onclick: () => pulsar(t) }, etiqueta || t);
  const teclado = h('div', { class: 'teclado', role: 'group', 'aria-label': 'Teclado de números' },
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((t) => tecla(t)),
    tecla('borrar', '⌫', 'borrar'), tecla('0'), tecla('ok', campos.length > 1 ? '→' : '✓', 'borrar'));
  teclado.lastChild.setAttribute('aria-label', campos.length > 1 ? 'Siguiente casilla' : 'Comprobar');
  cont.appendChild(teclado);

  function pulsar(t) {
    if (bloqueado) return;
    if (t === 'borrar') valores[activo] = valores[activo].slice(0, -1);
    else if (t === 'ok') {
      if (activo < campos.length - 1 && valores[activo] !== '') activo++;
      else if (valores.every((v) => v !== '')) ctx.enviar();
      else activo = valores.findIndex((v) => v === '');
    } else if (valores[activo].length < MAX_CIFRAS) {
      valores[activo] = valores[activo] === '0' ? t : valores[activo] + t;
    }
    pintar();
    ctx.alCambiar();
  }

  function pintar() {
    cajas.forEach((c, i) => {
      c.textContent = '';
      if (ej.prefijo) c.appendChild(h('span', { class: 'extra' }, ej.prefijo));
      c.appendChild(document.createTextNode(valores[i]));
      if (i === activo && !bloqueado) c.appendChild(h('span', { class: 'cursor', 'aria-hidden': 'true' }));
      if (ej.sufijo) c.appendChild(h('span', { class: 'extra' }, ej.sufijo));
      c.classList.toggle('activo', i === activo && !bloqueado);
    });
  }
  pintar();

  const teclas = (e) => {
    if (bloqueado || !cont.isConnected) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (/^[0-9]$/.test(e.key)) pulsar(e.key);
    else if (e.key === 'Backspace') pulsar('borrar');
    else if (e.key === 'Enter') { e.preventDefault(); pulsar('ok'); }
  };
  document.addEventListener('keydown', teclas);

  const esCorrecto = (i) => valores[i] !== '' && Number(valores[i]) === campos[i].respuesta;

  return {
    listo: () => valores.every((v) => v !== ''),
    evaluar() {
      const malos = campos.map((_, i) => i).filter((i) => !esCorrecto(i));
      const respuesta = valores.join(' | ');
      if (!malos.length) return { correcto: true, respuesta };
      if (!ej.campos) {
        const comun = (ej.erroresComunes || []).find((x) => x.respuesta === Number(valores[0]));
        if (comun) return { correcto: false, pista: comun.pista, error: comun.error || ej.error, respuesta };
      }
      const extra = campos.length > 1 ? (malos.length === 1 ? 'Revisa la casilla marcada.' : 'Revisa las casillas marcadas.') : '';
      return { correcto: false, pista: `${extra} ${ej.pista}`.trim(), error: ej.error, respuesta };
    },
    prepararReintento() {
      const malos = campos.map((_, i) => i).filter((i) => !esCorrecto(i));
      malos.forEach((i) => {
        cajas[i].classList.add('revisar');
        setTimeout(() => cajas[i].classList.remove('revisar'), 1800);
        valores[i] = '';
      });
      activo = malos[0] ?? 0;
      pintar();
    },
    mostrarSolucion() {
      campos.forEach((c, i) => { valores[i] = String(c.respuesta); cajas[i].classList.add('correcta'); });
      bloqueado = true;
      pintar();
    },
    bloquear() {
      bloqueado = true;
      teclado.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      cajas.forEach((c) => { c.disabled = true; });
      document.removeEventListener('keydown', teclas);
      pintar();
    },
  };
}
