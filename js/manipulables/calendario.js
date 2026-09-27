// Calendario: tocar un día para elegirlo.
import { crearCalendario } from '../visuales/visual.js';
import { DIAS_SEMANA, MESES } from '../contenido/catalogo.js';
import { crearBase, lectura } from './comun.js';

export function crear(cfg, opts) {
  const b = crearBase('calendario', opts);
  const cal = crearCalendario({ mes: cfg.mes, anio: cfg.anio, marcar: cfg.marcar, titulo: cfg.titulo, alTocar: (d) => elegir(d) });
  const objetivo = Number.isInteger(cfg.objetivo) && cfg.objetivo >= 1 && cfg.objetivo <= cal.dias ? cfg.objetivo : null;
  const diaSemana = (d) => (cal.desfase + d - 1) % 7; // 0 = lunes
  let sel = null;
  let solucion = false;

  const lect = lectura('calm-lectura');
  b.el.append(cal.el, lect);

  function elegir(d) {
    if (b.bloqueado || d === sel) return;
    sel = d;
    pintar();
    b.avisar();
  }

  function pintar() {
    cal.botones.forEach((btn, d) => {
      const si = d === sel;
      btn.classList.toggle('elegido', si);
      btn.setAttribute('aria-pressed', si ? 'true' : 'false');
      btn.disabled = b.bloqueado;
    });
    const mostrar = b.libre || solucion;
    lect.hidden = !mostrar;
    if (mostrar) {
      lect.textContent = sel === null
        ? 'Toca un día'
        : `${solucion ? 'Es el' : 'Elegiste el'} ${DIAS_SEMANA[diaSemana(sel)]} ${sel} de ${MESES[cal.mes - 1]}`;
    }
  }

  const api = {
    el: b.el,
    listo: () => sel !== null,
    evaluar() {
      if (objetivo === null) return { correcto: true };
      if (sel === null) return { correcto: false, detalle: 'Toca un día del calendario.' };
      if (sel === objetivo) return { correcto: true };
      if (diaSemana(sel) !== diaSemana(objetivo)) {
        return { correcto: false, detalle: `Fíjate en el día de la semana: busca en la columna del ${DIAS_SEMANA[diaSemana(objetivo)]}.` };
      }
      return { correcto: false, detalle: 'El día de la semana está bien. Revisa en qué semana está.' };
    },
    mostrarSolucion() {
      if (objetivo === null) return;
      sel = objetivo;
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
      sel = null;
      solucion = false;
      b.bloqueado = false;
      b.el.classList.remove('bloqueado', 'solucion');
      pintar();
    },
    valorTexto: () => (sel === null ? 'ningún día' : `${DIAS_SEMANA[diaSemana(sel)]} ${sel}`),
  };
  pintar();
  return api;
}
