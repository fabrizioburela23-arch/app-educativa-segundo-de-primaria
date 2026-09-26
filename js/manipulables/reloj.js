// Reloj de agujas: botones grandes para mover la hora y los minutos.
// La aguja larga también se puede arrastrar con el dedo.
import { h } from '../ui/dom.js';
import { crearReloj } from '../visuales/visual.js';
import { horaTexto } from '../contenido/generadores.js';
import { crearBase, boton, lectura, entero, puntoEnSvg } from './comun.js';

const digital = (t) => `${t.hora}:${String(t.minutos).padStart(2, '0')}`;

export function crear(cfg, opts) {
  const b = crearBase('reloj', opts);
  const paso = [5, 15, 30].includes(Number(cfg.paso)) ? Number(cfg.paso) : 5;
  const ini = {
    hora: entero(cfg.inicial?.hora, 1, 12, 12),
    minutos: entero(cfg.inicial?.minutos, 0, 59, 0),
  };
  const objetivo = cfg.objetivo && Number.isInteger(cfg.objetivo.hora)
    ? { hora: entero(cfg.objetivo.hora, 1, 12, 12), minutos: entero(cfg.objetivo.minutos, 0, 59, 0) }
    : null;
  let st = { ...ini };
  let solucion = false;

  const rj = crearReloj(st, { interactiva: true });
  rj.svg.setAttribute('role', 'img');
  rj.svg.setAttribute('aria-label', 'Reloj de agujas. Usa los botones para mover las agujas.');

  const btn = {
    menosHora: boton('− hora', { clase: 'rjm-hora', onclick: () => cambiarHora(-1) }),
    masHora: boton('+ hora', { clase: 'rjm-hora', onclick: () => cambiarHora(1) }),
    menosMin: boton('− minutos', { clase: 'rjm-min', etiqueta: `Menos ${paso} minutos`, onclick: () => cambiarMin(-paso) }),
    masMin: boton('+ minutos', { clase: 'rjm-min', etiqueta: `Más ${paso} minutos`, onclick: () => cambiarMin(paso) }),
  };
  const lect = lectura('rjm-lectura');
  b.el.append(
    h('div', { class: 'rjm-caja' }, rj.svg),
    lect,
    h('div', { class: 'rjm-botones' },
      h('div', { class: 'rjm-grupo rjm-grupo-hora' },
        h('div', { class: 'rjm-leyenda' }, h('span', { class: 'rjm-muestra hora', 'aria-hidden': 'true' }), 'Aguja corta: la hora'),
        h('div', { class: 'rjm-par' }, btn.menosHora, btn.masHora)),
      h('div', { class: 'rjm-grupo rjm-grupo-min' },
        h('div', { class: 'rjm-leyenda' }, h('span', { class: 'rjm-muestra min', 'aria-hidden': 'true' }), 'Aguja larga: los minutos'),
        h('div', { class: 'rjm-par' }, btn.menosMin, btn.masMin))),
  );

  function fijar(t) {
    if (t.hora === st.hora && t.minutos === st.minutos) return;
    st = t;
    pintar();
    b.avisar();
  }

  function cambiarHora(d) {
    if (b.bloqueado) return;
    fijar({ hora: ((((st.hora - 1 + d) % 12) + 12) % 12) + 1, minutos: st.minutos });
  }

  function cambiarMin(d) {
    if (b.bloqueado) return;
    // Los minutos se «llevan» a la hora: 12:55 + 5 → 1:00.
    const base = st.minutos % paso === 0 ? st.minutos : (d > 0 ? Math.floor(st.minutos / paso) * paso : Math.ceil(st.minutos / paso) * paso);
    const total = ((((st.hora % 12) * 60 + base + d) % 720) + 720) % 720;
    fijar({ hora: Math.floor(total / 60) || 12, minutos: total % 60 });
  }

  // arrastrar la aguja larga
  let arrastre = false;
  rj.gMin.addEventListener('pointerdown', (e) => {
    if (b.bloqueado) return;
    arrastre = true;
    e.preventDefault();
    try { rj.svg.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
    rj.svg.classList.add('arrastrando');
  });
  rj.svg.addEventListener('pointermove', (e) => {
    if (!arrastre || b.bloqueado) return;
    const p = puntoEnSvg(rj.svg, e, 240, 240);
    let ang = (Math.atan2(p.x - rj.C, -(p.y - rj.C)) * 180) / Math.PI;
    if (ang < 0) ang += 360;
    const m = (Math.round(ang / 6 / paso) * paso) % 60;
    if (m === st.minutos) return;
    let hora = st.hora;
    if (st.minutos >= 45 && m < 15) hora = (hora % 12) + 1; // pasó por el 12 hacia adelante
    else if (st.minutos < 15 && m >= 45) hora = ((hora + 10) % 12) + 1; // hacia atrás
    fijar({ hora, minutos: m });
  });
  const soltar = () => { arrastre = false; rj.svg.classList.remove('arrastrando'); };
  rj.svg.addEventListener('pointerup', soltar);
  rj.svg.addEventListener('pointercancel', soltar);

  function pintar() {
    rj.fijar(st.hora, st.minutos);
    rj.svg.classList.toggle('bloqueada', b.bloqueado);
    Object.values(btn).forEach((x) => { x.disabled = b.bloqueado; });
    const mostrar = b.libre || solucion;
    lect.hidden = !mostrar;
    if (mostrar) {
      lect.replaceChildren(
        h('div', { class: 'manip-numero rjm-digital' }, digital(st)),
        h('div', { class: 'manip-frase' }, horaTexto(st.hora, st.minutos)));
    }
  }

  const api = {
    el: b.el,
    listo: () => st.hora !== ini.hora || st.minutos !== ini.minutos,
    evaluar() {
      if (!objetivo) return { correcto: true };
      const hOk = st.hora === objetivo.hora, mOk = st.minutos === objetivo.minutos;
      if (hOk && mOk) return { correcto: true };
      if (hOk) return { correcto: false, detalle: 'La hora está bien. Revisa la aguja larga, la de los minutos.' };
      if (mOk) return { correcto: false, detalle: 'Los minutos están bien. Revisa la aguja corta, la de la hora.' };
      return { correcto: false, detalle: 'Revisa las dos agujas: la corta marca la hora y la larga los minutos.' };
    },
    mostrarSolucion() {
      if (!objetivo) return;
      st = { ...objetivo };
      solucion = true;
      b.el.classList.add('solucion');
      pintar();
    },
    bloquear() {
      b.bloqueado = true;
      b.el.classList.add('bloqueado');
      pintar();
    },
    reiniciar() {
      st = { ...ini };
      solucion = false;
      b.bloqueado = false;
      b.el.classList.remove('bloqueado', 'solucion');
      pintar();
    },
    valorTexto: () => digital(st),
  };
  pintar();
  return api;
}
