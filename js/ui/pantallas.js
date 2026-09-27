// Pantallas del niño: inicio, mapa de la materia y presentación del tema.
import { h, vaciar, rico, hoyISO } from './dom.js';
import { obtener, progresoSiExiste, guardar, almacenamientoDisponible } from '../estado.js';
import { obtenerIndice, listaTemas, buscarMateria, buscarTema } from '../contenido/cargar.js';
import { recomendar, repasoPendiente, FASES } from '../motor/adaptativo.js';
import { nombreFase } from '../motor/leccion.js';
import { botonAudio } from '../motor/ejecutar.js';

const ICONO_ESTADO = { logrado: '⭐', 'en-curso': '▶️', repasar: '🔁', nuevo: '' };
const TEXTO_ESTADO = { logrado: 'Logrado', 'en-curso': 'En camino', repasar: 'Para repasar', nuevo: 'Por descubrir' };

export function estadoTema(id) {
  const p = progresoSiExiste(id);
  return p ? p.estado : 'nuevo';
}

function contarMateria(m) {
  let total = 0, logrados = 0, enCurso = 0;
  for (const u of m.unidades) for (const t of u.temas) {
    total++;
    const e = estadoTema(t.id);
    if (e === 'logrado') logrados++;
    else if (e !== 'nuevo') enCurso++;
  }
  return { total, logrados, enCurso };
}

const MOTIVO = {
  asignado: 'Tu tarea de hoy',
  continuar: 'Continuar aprendiendo',
  reforzar: 'Vamos a reforzar',
  repaso: 'Repaso rápido',
  siguiente: 'Continuar aprendiendo',
  nuevo: 'Empezar a aprender',
  todo: '¡Aprendiste todo! Repasa',
};

export function pantallaInicio(raiz, { navegar, enLinea }) {
  const estado = obtener();
  const indice = obtenerIndice();
  const hoy = hoyISO();
  const rec = recomendar(indice, estado.temas, estado.ajustes, estado.ultimoTema, hoy);
  const temas = listaTemas();
  const nombre = estado.perfil.apodo ? `¡Hola, ${estado.perfil.apodo}!` : '¡Hola!';

  vaciar(raiz);
  const p = h('main', { class: 'pantalla', id: 'contenido' });
  raiz.appendChild(p);

  p.appendChild(h('div', { class: 'saludo' },
    h('div', { class: 'avatar', 'aria-hidden': 'true' }, estado.perfil.avatar || '🦙'),
    h('div', {}, h('h1', {}, nombre), h('p', {}, '¿Qué aprendemos hoy?'))));

  if (rec && rec.tema) {
    const t = temas.find((x) => x.id === rec.tema.id);
    const prog = progresoSiExiste(t.id);
    const modo = rec.motivo === 'repaso' || rec.repaso ? 'repaso' : 'normal';
    const detalle = prog && prog.estado !== 'nuevo' && rec.motivo !== 'repaso' ? `Sigue en: ${nombreFase(prog.fase)}` : t.materiaNombre;
    const b = h('button', { class: 'continuar', type: 'button', style: `background:${t.color};box-shadow:0 5px 0 rgba(0,0,0,.25)`, onclick: () => navegar(modo === 'repaso' ? `#/leccion/${t.id}/repaso` : `#/tema/${t.id}`) },
      h('span', { class: 'grande-emoji', 'aria-hidden': 'true' }, t.emoji),
      h('span', {}, h('span', { class: 'etiqueta' }, MOTIVO[rec.motivo] || 'Continuar aprendiendo'), h('br'),
        h('span', { class: 'titulo' }, t.titulo), h('br'), h('span', { class: 'etiqueta' }, detalle)),
      h('span', { class: 'flecha', 'aria-hidden': 'true' }, '➜'));
    p.appendChild(b);
    if (rec.motivo === 'asignado' && estado.ajustes.temaAsignado?.nota) {
      const nota = estado.ajustes.temaAsignado.nota;
      p.appendChild(h('div', { class: 'tarjeta aviso-asignado', style: 'margin-top:12px;display:flex;gap:10px;align-items:center' },
        h('div', { style: 'flex:1' }, h('strong', {}, '📝 Mensaje del adulto: '), nota),
        botonAudio(() => `Mensaje del adulto: ${nota}`, 'Escuchar el mensaje')));
    }
  }

  // Repasos pendientes
  const repasos = temas.filter((t) => repasoPendiente(progresoSiExiste(t.id), hoy) && (!rec || rec.tema.id !== t.id));
  const reforzar = temas.filter((t) => estadoTema(t.id) === 'repasar' && (!rec || rec.tema.id !== t.id));
  if (repasos.length || reforzar.length) {
    p.appendChild(h('div', { class: 'seccion-titulo' }, h('span', { 'aria-hidden': 'true' }, '🔁'), 'Para repasar'));
    p.appendChild(h('div', { class: 'lista-repaso' },
      [...reforzar, ...repasos].slice(0, 6).map((t) => h('button', { type: 'button', onclick: () => navegar(estadoTema(t.id) === 'repasar' ? `#/tema/${t.id}` : `#/leccion/${t.id}/repaso`) }, `${t.emoji} ${t.titulo}`))));
  }

  p.appendChild(h('div', { class: 'seccion-titulo' }, h('span', { 'aria-hidden': 'true' }, '🗺️'), 'Mis materias'));
  p.appendChild(h('div', { class: 'materias' }, indice.materias.map((m) => {
    const c = contarMateria(m);
    const pct = c.total ? Math.round((c.logrados / c.total) * 100) : 0;
    return h('button', { class: 'materia-tarjeta', type: 'button', style: `--c:${m.color}`, onclick: () => navegar(`#/materia/${m.id}`) },
      h('span', { class: 'emoji', 'aria-hidden': 'true' }, m.emoji),
      h('span', { class: 'nombre' }, m.nombre),
      h('span', { class: 'cuenta' }, `⭐ ${c.logrados} de ${c.total} temas`),
      h('span', { class: 'barra-progreso', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': `Progreso en ${m.nombre}` }, h('span', { style: `width:${pct}%` })));
  })));

  if (!almacenamientoDisponible()) {
    p.appendChild(h('p', { class: 'aviso-audio', role: 'alert', style: 'margin-top:18px' },
      '⚠️ Este navegador no deja guardar el avance. Pide a un adulto que revise el panel para adultos (pestaña Datos).'));
  }
  const sinCopia = !(navigator.serviceWorker && navigator.serviceWorker.controller);
  p.appendChild(h('div', { class: 'pie-inicio' },
    h('span', { class: 'estado-red' }, enLinea() ? '' : sinCopia ? '📴 Sin conexión. Para abrir lecciones nuevas hace falta internet la primera vez.' : '📴 Sin conexión: puedes seguir aprendiendo.'),
    h('button', { class: 'enlace-adulto', type: 'button', onclick: () => navegar('#/adulto') }, '🔒 Para adultos')));
}

export function pantallaMateria(raiz, { id, navegar }) {
  const m = buscarMateria(id);
  if (!m) { navegar('#/inicio'); return; }
  const estado = obtener();
  const c = contarMateria(m);
  const pct = c.total ? Math.round((c.logrados / c.total) * 100) : 0;
  vaciar(raiz);
  raiz.appendChild(h('header', { class: 'cabecera-materia', style: `--c:${m.color}` },
    h('div', { class: 'dentro' },
      h('div', { class: 'fila' },
        h('button', { class: 'icono-boton', type: 'button', 'aria-label': 'Volver al inicio', onclick: () => navegar('#/inicio') }, '←'),
        h('span', { style: 'font-size:34px', 'aria-hidden': 'true' }, m.emoji),
        h('h1', {}, m.nombre)),
      h('div', { class: 'resumen' }, `⭐ ${c.logrados} de ${c.total} temas logrados`),
      h('div', { class: 'barra-progreso', 'aria-hidden': 'true' }, h('span', { style: `width:${pct}%` })))));
  const p = h('main', { class: 'pantalla', id: 'contenido', style: `--c:${m.color}` });
  raiz.appendChild(p);
  p.appendChild(h('div', { class: 'leyenda', 'aria-label': 'Qué significan los íconos' },
    h('span', {}, '⭐ Logrado'), h('span', {}, '▶️ En camino'), h('span', {}, '🔁 Para repasar'), h('span', {}, '○ Por descubrir')));
  const asignado = estado.ajustes.temaAsignado?.id;
  for (const u of m.unidades) {
    p.appendChild(h('section', { class: 'unidad', 'aria-label': `Unidad ${u.numero}: ${u.titulo}` },
      h('div', { class: 'unidad-titulo' }, h('span', { class: 'num' }, String(u.numero)), h('span', {}, u.titulo)),
      h('div', { class: 'camino' }, u.temas.map((t) => {
        const e = estadoTema(t.id);
        const prog = progresoSiExiste(t.id);
        const sub = e === 'nuevo' ? 'Por descubrir' : e === 'logrado' ? (repasoPendiente(prog, hoyISO()) ? '¡Toca repaso!' : 'Logrado') : `${TEXTO_ESTADO[e]} · ${nombreFase(prog.fase)}`;
        return h('button', { class: `nodo ${asignado === t.id ? 'asignado' : ''}`, type: 'button', 'data-estado': e, onclick: () => navegar(`#/tema/${t.id}`) },
          h('span', { class: 'burbuja', 'aria-hidden': 'true' }, t.emoji, ICONO_ESTADO[e] ? h('span', { class: 'marca' }, ICONO_ESTADO[e]) : null),
          h('span', { class: 'texto' }, h('span', { class: 'titulo' }, t.titulo), h('br'), h('span', { class: 'sub' }, asignado === t.id ? `📝 Tarea · ${sub}` : sub)));
      }))));
  }
}

export function pantallaTema(raiz, { id, navegar, temaCargado, sinConexion = false }) {
  const info = buscarTema(id);
  if (!info) { navegar('#/inicio'); return; }
  const prog = progresoSiExiste(id);
  const e = prog ? prog.estado : 'nuevo';
  vaciar(raiz);
  raiz.appendChild(h('div', { class: 'barra' },
    h('button', { class: 'icono-boton', type: 'button', 'aria-label': 'Volver al mapa', onclick: () => navegar(`#/materia/${info.materia}`) }, '←'),
    h('span', { class: 'barra-titulo' }, info.materiaNombre)));
  const p = h('main', { class: 'pantalla', id: 'contenido', style: `--c:${info.color}` });
  raiz.appendChild(p);
  p.appendChild(h('div', { class: 'tema-cabecera' },
    h('div', { class: 'emoji', 'aria-hidden': 'true' }, info.emoji),
    h('h1', {}, info.titulo),
    temaCargado ? h('div', { style: 'display:flex;gap:8px;align-items:center;justify-content:center' }, rico(temaCargado.objetivo, 'p', { class: 'objetivo', style: 'margin:0' }), botonAudio(() => `${info.titulo}. ${temaCargado.objetivo}`)) : null,
    h('p', { style: 'margin-top:8px' }, h('span', { class: `chip ${e === 'logrado' ? 'exito' : e === 'repasar' ? 'aviso' : e === 'en-curso' ? 'ayuda' : ''}` }, `${ICONO_ESTADO[e] || '○'} ${TEXTO_ESTADO[e]}`))));

  if (!temaCargado) {
    p.appendChild(sinConexion
      ? h('div', { class: 'tarjeta' }, h('p', {}, '📴 Necesitas internet para abrir este tema la primera vez.'), h('p', { class: 'nota' }, 'Cuando haya conexión, abre la app unos segundos y las lecciones quedarán guardadas en el teléfono.'))
      : h('div', { class: 'tarjeta' }, h('p', {}, 'Este tema todavía no tiene lecciones cargadas.'), h('p', { class: 'nota' }, 'Pide a un adulto que revise el contenido de la app.')));
    return;
  }

  const actual = prog ? (prog.vistos.explicacion ? prog.fase : 'explicacion') : 'explicacion';
  const hechas = (f) => {
    if (!prog) return false;
    if (f === 'comprobacion') return prog.estado === 'logrado';
    return !!prog.vistos[f];
  };
  const ICONOS = { explicacion: '📖', ejemplo: '👀', guiada: '🤝', practica: '✏️', comprobacion: '🎯' };
  p.appendChild(h('ol', { class: 'pasos-tema', 'aria-label': 'Pasos del tema' }, FASES.map((f) => h('li', { class: f === actual && e !== 'logrado' ? 'actual' : '' },
    h('span', { class: 'ic', 'aria-hidden': 'true' }, ICONOS[f]),
    h('span', {}, nombreFase(f)),
    h('span', { class: 'ok', 'aria-label': hechas(f) ? 'hecho' : 'pendiente' }, hechas(f) ? '✅' : '')))));

  const acciones = h('div', { class: 'acciones' });
  p.appendChild(acciones);
  const boton = (texto, destino, clase = '') => h('button', { class: `boton grande ${clase}`, type: 'button', onclick: () => navegar(destino) }, texto);
  if (e === 'nuevo') acciones.appendChild(boton('¡Empezar!', `#/leccion/${id}/normal`));
  else if (e === 'logrado') {
    if (repasoPendiente(prog, hoyISO())) acciones.appendChild(boton('🔁 Repaso rápido', `#/leccion/${id}/repaso`));
    acciones.appendChild(boton('🏔️ Nuevo desafío', `#/leccion/${id}/desafio`, repasoPendiente(prog, hoyISO()) ? 'secundario' : ''));
    acciones.appendChild(boton('✏️ Practicar otra vez', `#/leccion/${id}/practica`, 'secundario'));
  } else {
    acciones.appendChild(boton(`Continuar: ${nombreFase(actual)}`, `#/leccion/${id}/normal`));
    if (prog.vistos.guiada) acciones.appendChild(boton('✏️ Practicar', `#/leccion/${id}/practica`, 'secundario'));
  }
  if (e !== 'nuevo') acciones.appendChild(boton('📖 Ver la explicación otra vez', `#/leccion/${id}/explicacion`, 'suave'));
  void guardar;
}

export function pantallaAcerca(raiz, { navegar }) {
  vaciar(raiz);
  raiz.appendChild(h('div', { class: 'barra' },
    h('button', { class: 'icono-boton', type: 'button', 'aria-label': 'Volver', onclick: () => history.length > 1 ? history.back() : navegar('#/inicio') }, '←'),
    h('span', { class: 'barra-titulo' }, 'Acerca de esta app')));
  const p = h('main', { class: 'pantalla', id: 'contenido' });
  raiz.appendChild(p);
  p.append(
    h('div', { class: 'tarjeta' },
      h('h2', {}, 'Aprendo en 2.º'),
      h('p', {}, 'Lecciones de Comunicación y Lenguajes, Matemática, Ciencias Sociales y Ciencias Naturales para segundo de primaria, con ejemplos de Bolivia.'),
      h('p', {}, 'Todo el avance se guarda solo en este dispositivo. La app no pide cuentas ni envía datos a internet.')),
    h('div', { class: 'tarjeta' },
      h('h2', {}, 'Lo que todavía no incluye'),
      h('ul', {},
        h('li', {}, 'No hay grabaciones de voz: el audio usa la voz en español del propio teléfono. Si el teléfono no tiene una, los botones de audio lo avisan.'),
        h('li', {}, 'Las imágenes de los escudos departamentales no están incluidas; se describen con palabras.'),
        h('li', {}, 'Los dibujos del dinero son simplificados; no son copias de los billetes reales.'),
        h('li', {}, 'La app revisa la forma de los textos que escribe el niño (mayúscula, punto, palabras pedidas), no su significado: un adulto puede leerlos en el panel de adultos.'),
        h('li', {}, 'No hay sincronización entre dispositivos. Para pasar el avance a otro teléfono, usa «Copia de seguridad» en el panel de adultos.'))),
    h('div', { class: 'tarjeta' },
      h('h2', {}, 'Créditos'),
      h('p', {}, 'Tipografía Andika (SIL International), licencia SIL Open Font License 1.1.'),
      h('p', {}, 'Textos, ejercicios e ilustraciones: originales de esta app.')));
}
