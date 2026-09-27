// Panel de adultos: progreso, ajustes, contenido editable y datos.
// Protegido con un PIN sencillo (evita cambios accidentales; no es seguridad fuerte).

import { h, vaciar, rico, aviso, dialogo, fechaCorta, hoyISO } from './dom.js';
import {
  obtener, guardar, exportar, importar, borrarProgreso, borrarTodo, progresoSiExiste, pedirPersistencia,
  almacenamientoDisponible,
} from '../estado.js';
import {
  obtenerIndice, listaTemas, buscarTema, cargarTema, fechasParaEditar, fechasOriginales, fechasPublicadas,
  datosContenido,
} from '../contenido/cargar.js';
import { validarTema } from '../contenido/validar.js';
import { MESES, formatoBs } from '../contenido/catalogo.js';
import { renderVisual } from '../visuales/visual.js';
import { hayVoz, hayVozEspanol, listaVoces, hablar, configurarVoz } from '../audio/voz.js';
import { nombreFase } from '../motor/leccion.js';
import { repasoPendiente } from '../motor/adaptativo.js';

let desbloqueadoHasta = 0;
// Al cambiar o restablecer el PIN, el anterior se conserva hasta que el nuevo quede confirmado.
let creandoPin = false;
export const adultoDesbloqueado = () => Date.now() < desbloqueadoHasta;
export const bloquearAdulto = () => { desbloqueadoHasta = 0; creandoPin = false; };
const desbloquear = () => { desbloqueadoHasta = Date.now() + 20 * 60 * 1000; };
const avisarDespues = (msg) => setTimeout(() => aviso(msg), 60);

const ESTADO_TXT = { nuevo: 'Sin empezar', 'en-curso': 'Practicando', logrado: 'Logrado', repasar: 'Para reforzar' };
const ESTADO_CHIP = { nuevo: '', 'en-curso': 'ayuda', logrado: 'exito', repasar: 'aviso' };
const MODO_TXT = { guiada: 'Actividad guiada', practica: 'Práctica', comprobacion: 'Comprobación', repaso: 'Repaso', desafio: 'Desafío' };

async function hashPin(pin) {
  const texto = `aprendo2:${pin}`;
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let x = 5381;
    for (const c of texto) x = ((x * 33) ^ c.charCodeAt(0)) >>> 0;
    return `s${x.toString(16)}`;
  }
}

function tecladoPin(alCompletar, largo = 4) {
  let valor = '';
  const puntos = h('div', { class: 'pin-puntos', 'aria-live': 'polite', 'aria-label': 'Números ingresados' });
  const pintar = () => { vaciar(puntos); for (let i = 0; i < largo; i++) puntos.appendChild(h('span', { class: i < valor.length ? 'lleno' : '' })); };
  const pulsar = (t) => {
    if (t === '⌫') valor = valor.slice(0, -1);
    else if (valor.length < largo) valor += t;
    pintar();
    if (valor.length === largo) { const v = valor; valor = ''; setTimeout(() => { pintar(); alCompletar(v); }, 150); }
  };
  const teclado = h('div', { class: 'teclado' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((t) => t ? h('button', { type: 'button', 'aria-label': t === '⌫' ? 'Borrar' : t, onclick: () => pulsar(t) }, t) : h('span')));
  pintar();
  return h('div', {}, puntos, teclado);
}

// ---------- puerta con PIN ----------
export function pantallaAdulto(raiz, { navegar, pestana = 'progreso' }) {
  if (adultoDesbloqueado()) { panel(raiz, { navegar, pestana }); return; }
  const estado = obtener();
  vaciar(raiz);
  raiz.appendChild(h('div', { class: 'barra' },
    h('button', { class: 'icono-boton', type: 'button', 'aria-label': 'Volver al inicio', onclick: () => navegar('#/inicio') }, '←'),
    h('span', { class: 'barra-titulo' }, 'Área para adultos')));
  const p = h('main', { class: 'pantalla adulto', id: 'contenido' });
  raiz.appendChild(p);
  const caja = h('div', { class: 'tarjeta', style: 'text-align:center' });
  p.appendChild(caja);

  if (!estado.ajustes.pin || creandoPin) {
    let primero = null;
    const titulo = h('h2', {}, estado.ajustes.pin ? 'Crea un PIN nuevo de 4 números' : 'Crea un PIN de 4 números');
    const nota = h('p', { class: 'nota' }, 'El PIN evita que el niño cambie los ajustes por accidente. No es una contraseña segura: no uses un PIN que uses en otro lugar.');
    const zona = h('div');
    const pedir = () => {
      vaciar(zona);
      zona.appendChild(tecladoPin(async (v) => {
        if (!primero) { primero = v; titulo.textContent = 'Escribe el PIN otra vez'; pedir(); return; }
        if (v !== primero) { primero = null; titulo.textContent = 'No coinciden. Crea un PIN de 4 números'; pedir(); return; }
        estado.ajustes.pin = await hashPin(v);
        creandoPin = false;
        guardar(true);
        desbloquear();
        panel(raiz, { navegar, pestana });
      }));
    };
    caja.append(titulo, nota, zona);
    pedir();
    return;
  }

  const titulo = h('h2', {}, 'Escribe el PIN de adultos');
  const zona = h('div');
  const pedir = () => {
    vaciar(zona);
    zona.appendChild(tecladoPin(async (v) => {
      if ((await hashPin(v)) === estado.ajustes.pin) { desbloquear(); panel(raiz, { navegar, pestana }); }
      else { titulo.textContent = 'PIN incorrecto. Intenta otra vez'; pedir(); }
    }));
  };
  const olvido = h('button', { class: 'boton suave pequeno', type: 'button', style: 'margin-top:16px', onclick: () => restablecer() }, '¿Olvidaste el PIN?');
  caja.append(titulo, zona, olvido);
  pedir();

  function restablecer() {
    const a = 23 + Math.floor(Math.random() * 60), b = 13 + Math.floor(Math.random() * 20);
    const input = h('input', { type: 'number', inputmode: 'numeric', class: 'campo-texto', 'aria-label': 'Resultado' });
    dialogo({
      titulo: 'Restablecer el PIN',
      contenido: h('div', { class: 'formulario' }, h('p', {}, `Para confirmar que eres un adulto, escribe el resultado de ${a} × ${b}. El progreso del niño no se borra.`), input),
      botones: [{ texto: 'Cancelar', clase: 'secundario', valor: false }, { texto: 'Confirmar', valor: true }],
    }).then((ok) => {
      if (!ok) return;
      if (Number(input.value) === a * b) { creandoPin = true; pantallaAdulto(raiz, { navegar, pestana }); }
      else aviso('El resultado no es correcto.');
    });
  }
}

// ---------- panel ----------
function panel(raiz, { navegar, pestana }) {
  vaciar(raiz);
  raiz.appendChild(h('div', { class: 'barra' },
    h('button', { class: 'icono-boton', type: 'button', 'aria-label': 'Volver al inicio', onclick: () => navegar('#/inicio') }, '←'),
    h('span', { class: 'barra-titulo' }, 'Panel para adultos'),
    h('button', { class: 'boton suave pequeno', type: 'button', onclick: () => { bloquearAdulto(); navegar('#/inicio'); } }, 'Cerrar 🔒')));
  if (!almacenamientoDisponible()) raiz.appendChild(h('p', { class: 'aviso-audio', role: 'alert', style: 'margin:8px 16px' }, '⚠️ Este navegador no permite guardar datos: el progreso y los ajustes se perderán al cerrar. Revisa la pestaña Datos.'));
  const p = h('main', { class: 'pantalla adulto', id: 'contenido' });
  raiz.appendChild(p);
  const PESTANAS = [['progreso', 'Progreso'], ['ajustes', 'Ajustes'], ['contenido', 'Contenido'], ['datos', 'Datos']];
  const barra = h('div', { class: 'pestanas', role: 'tablist' }, PESTANAS.map(([id, t]) => h('button', {
    type: 'button', role: 'tab', 'aria-selected': id === pestana ? 'true' : 'false', onclick: () => navegar(`#/adulto/${id}`),
  }, t)));
  const zona = h('div', { role: 'tabpanel' });
  p.append(barra, zona);
  const f = { progreso: tabProgreso, ajustes: tabAjustes, contenido: tabContenido, datos: tabDatos }[pestana] || tabProgreso;
  f(zona, { navegar });
}

// ---------- progreso ----------
async function tabProgreso(zona, { navegar }) {
  const estado = obtener();
  const indice = obtenerIndice();
  const temas = listaTemas();
  const conProgreso = temas.filter((t) => progresoSiExiste(t.id));
  const cache = new Map();
  await Promise.all(conProgreso.map(async (t) => { try { cache.set(t.id, await cargarTema(t.id)); } catch { /* sin archivo */ } }));
  const hoy = hoyISO();

  zona.appendChild(h('p', { class: 'nota' }, 'Aquí ves el avance en cada tema y qué conviene practicar. Los datos describen lo que el niño está aprendiendo; no son una calificación del niño.'));

  // Resumen por materia
  const resumen = h('div', { class: 'tarjeta' }, h('h2', {}, 'Resumen'));
  for (const m of indice.materias) {
    let total = 0, logr = 0, enc = 0;
    m.unidades.forEach((u) => u.temas.forEach((t) => { total++; const e = progresoSiExiste(t.id)?.estado; if (e === 'logrado') logr++; else if (e && e !== 'nuevo') enc++; }));
    resumen.appendChild(h('div', { style: 'margin:10px 0' },
      h('div', {}, h('strong', {}, `${m.emoji} ${m.nombre}`)), h('div', { class: 'nota' }, `${logr} logrados · ${enc} en práctica · ${total} temas`),
      h('div', { class: 'barra-progreso', style: `--c:${m.color}` }, h('span', { style: `width:${total ? (logr / total) * 100 : 0}%` }))));
  }
  zona.appendChild(resumen);

  // Qué reforzar
  const reforzar = conProgreso.filter((t) => {
    const pr = progresoSiExiste(t.id);
    const tasa = pr.intentos ? pr.primer / pr.intentos : 1;
    const ultimaComp = pr.comprobaciones.length ? pr.comprobaciones[pr.comprobaciones.length - 1].puntaje : null;
    return pr.estado === 'repasar' || (pr.estado === 'en-curso' && pr.intentos >= 6 && tasa < 0.6) || (pr.estado === 'en-curso' && ultimaComp !== null && ultimaComp < 0.8) || repasoPendiente(pr, hoy);
  });
  const cajaRef = h('div', { class: 'tarjeta' }, h('h2', {}, 'Qué conviene practicar'));
  if (!reforzar.length) cajaRef.appendChild(h('p', { class: 'nota' }, conProgreso.length ? 'Por ahora no hay temas que necesiten refuerzo especial.' : 'Todavía no hay actividad. Cuando el niño practique, aquí aparecerán sugerencias.'));
  reforzar.forEach((t) => {
    const pr = progresoSiExiste(t.id);
    const tema = cache.get(t.id);
    const nComp = pr.comprobaciones.length;
    const motivo = pr.estado === 'repasar' ? 'Le costó en el último repaso o comprobación.'
      : repasoPendiente(pr, hoy) ? 'Le toca un repaso para no olvidarlo.'
        : nComp && pr.comprobaciones[nComp - 1].puntaje < 0.8 ? `Intentó la comprobación final ${nComp === 1 ? 'una vez' : `${nComp} veces`} y todavía no llega al 80 %.`
          : 'Está practicando y todavía necesita varios intentos.';
    cajaRef.appendChild(h('div', { class: 'detalle-tema' },
      h('strong', {}, `${t.emoji} ${t.titulo}`), h('span', { class: 'nota' }, ` · ${t.materiaNombre}`),
      h('p', { style: 'margin:4px 0' }, motivo),
      tema ? h('ul', { style: 'margin:4px 0 6px;padding-left:20px' }, tema.adulto.sugerencias.slice(0, 2).map((s) => h('li', {}, s))) : null,
      h('button', { class: 'boton pequeno suave', type: 'button', onclick: () => asignar(t.id) }, '📝 Asignar este tema')));
  });
  zona.appendChild(cajaRef);

  // Errores frecuentes
  const errores = [];
  conProgreso.forEach((t) => {
    const pr = progresoSiExiste(t.id);
    for (const [tag, n] of Object.entries(pr.errores || {})) if (n >= 2) errores.push({ t, tag, n });
  });
  errores.sort((a, b) => b.n - a.n);
  const cajaErr = h('div', { class: 'tarjeta' }, h('h2', {}, 'Errores frecuentes'));
  if (!errores.length) cajaErr.appendChild(h('p', { class: 'nota' }, 'No hay errores que se repitan todavía.'));
  errores.slice(0, 8).forEach(({ t, tag, n }) => {
    const info = cache.get(t.id)?.adulto?.errores?.[tag] || GEN_ERR[tag];
    cajaErr.appendChild(h('div', { class: 'detalle-tema' },
      h('strong', {}, info ? info.descripcion : tag), h('span', { class: 'nota' }, ` · ${t.titulo} · ${n} veces`),
      info ? h('p', { style: 'margin:4px 0 0' }, '💡 ', info.sugerencia) : null));
  });
  zona.appendChild(cajaErr);

  // Por tema
  const cajaTemas = h('div', { class: 'tarjeta' }, h('h2', {}, 'Progreso por tema'));
  for (const m of indice.materias) {
    const det = h('details', { style: 'margin:8px 0' }, h('summary', { style: 'font-weight:700;min-height:44px;display:flex;align-items:center' }, `${m.emoji} ${m.nombre}`));
    m.unidades.forEach((u) => u.temas.forEach((t) => {
      const pr = progresoSiExiste(t.id);
      const e = pr?.estado || 'nuevo';
      const tasa = pr && pr.intentos ? Math.round((pr.primer / pr.intentos) * 100) : null;
      const partes = [];
      if (pr && pr.intentos) partes.push(`${pr.intentos} ejercicios · ${tasa} % al primer intento`);
      if (pr && pr.comprobaciones.length) partes.push(`mejor comprobación ${Math.round(pr.mejor * 100)} %`);
      if (pr && pr.ultimaVez) partes.push(`última vez ${fechaCorta(pr.ultimaVez)}`);
      if (pr && e !== 'logrado' && e !== 'nuevo') partes.push(`va en: ${nombreFase(pr.fase)}`);
      const detalle = h('div', { class: 'detalle-tema oculto' });
      const fila = h('div', { class: 'fila-tema' },
        h('div', { class: 't' }, h('div', { class: 'n' }, `${t.emoji} ${t.titulo}`), h('div', { class: 'd' }, partes.join(' · ') || 'Sin actividad')),
        h('span', { class: `chip ${ESTADO_CHIP[e]}` }, ESTADO_TXT[e]),
        h('button', { class: 'mas', type: 'button', 'aria-label': `Más sobre ${t.titulo}`, onclick: async () => {
          if (!detalle.classList.contains('oculto')) { detalle.classList.add('oculto'); return; }
          detalle.classList.remove('oculto');
          vaciar(detalle);
          let tema = cache.get(t.id);
          try { tema = tema || await cargarTema(t.id); } catch { detalle.textContent = 'Este tema no tiene contenido cargado.'; return; }
          const errs = Object.entries(pr?.errores || {}).sort((a, b) => b[1] - a[1]);
          detalle.append(
            h('p', { style: 'margin:0 0 6px' }, h('strong', {}, 'Objetivo: '), tema.adulto.objetivo),
            errs.length ? h('div', {}, h('strong', {}, 'Errores en este tema:'), h('ul', { style: 'margin:4px 0;padding-left:20px' }, errs.map(([tag, n]) => h('li', {}, `${(tema.adulto.errores[tag] || GEN_ERR[tag] || { descripcion: tag }).descripcion} (${n})`)))) : null,
            h('div', {}, h('strong', {}, 'Ideas para practicar en casa:'), h('ul', { style: 'margin:4px 0;padding-left:20px' }, tema.adulto.sugerencias.map((s) => h('li', {}, s)))),
            h('div', { class: 'fila-botones' },
              h('button', { class: 'boton pequeno', type: 'button', onclick: () => asignar(t.id) }, '📝 Asignar'),
              h('button', { class: 'boton pequeno secundario', type: 'button', onclick: () => navegar(`#/revisar/${t.id}`) }, '👀 Revisar contenido')));
        } }, '▾'));
      det.append(fila, detalle);
    }));
    cajaTemas.appendChild(det);
  }
  zona.appendChild(cajaTemas);

  // Actividad reciente
  const cajaAct = h('div', { class: 'tarjeta' }, h('h2', {}, 'Actividad reciente'));
  if (!estado.registro.length) cajaAct.appendChild(h('p', { class: 'nota' }, 'Sin actividad todavía.'));
  else cajaAct.appendChild(h('table', { class: 'tabla-simple' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Fecha'), h('th', {}, 'Tema'), h('th', {}, 'Actividad'), h('th', {}, 'Aciertos'))),
    h('tbody', {}, estado.registro.slice(0, 15).map((r) => h('tr', {},
      h('td', {}, fechaCorta(r.fecha)), h('td', {}, buscarTema(r.tema)?.titulo || r.tema), h('td', {}, MODO_TXT[r.modo] || r.modo),
      h('td', {}, `${String(Math.round(r.aciertos * 10) / 10).replace('.', ',')} de ${r.total}${r.logrado ? ' ⭐' : ''}`))))));
  zona.appendChild(cajaAct);

  // Textos escritos
  const cajaEsc = h('div', { class: 'tarjeta' }, h('h2', {}, 'Textos que escribió'),
    h('p', { class: 'nota' }, 'La app revisa la forma (mayúscula, punto, palabras pedidas). Léanlos juntos para conversar sobre el contenido. Se guardan solo en este dispositivo.'));
  if (!estado.escritos.length) cajaEsc.appendChild(h('p', { class: 'nota' }, 'Todavía no hay textos.'));
  estado.escritos.slice(0, 20).forEach((e, i) => cajaEsc.appendChild(h('div', { class: 'detalle-tema' },
    h('div', { class: 'nota' }, `${fechaCorta(e.fecha)} · ${buscarTema(e.tema)?.titulo || e.tema}`),
    h('div', { style: 'font-style:italic;margin:2px 0' }, e.enunciado),
    h('div', {}, e.texto),
    h('button', { class: 'boton pequeno suave', type: 'button', style: 'margin-top:6px', onclick: async () => {
      const ok = await dialogo({ titulo: 'Borrar texto', contenido: 'Se borrará este texto que escribió el niño. No se puede deshacer. ¿Continuar?', botones: [{ texto: 'Cancelar', clase: 'secundario', valor: false }, { texto: 'Borrar', clase: 'peligro', valor: true }] });
      if (ok) { estado.escritos.splice(i, 1); guardar(true); navegar('#/adulto/progreso', true); }
    } }, 'Borrar'))));
  if (estado.escritos.length) cajaEsc.appendChild(h('button', { class: 'boton pequeno secundario', type: 'button', onclick: async () => {
    const ok = await dialogo({ titulo: 'Borrar todos los textos', contenido: 'Se borrarán todos los textos que escribió el niño. No se puede deshacer. ¿Continuar?', botones: [{ texto: 'Cancelar', clase: 'secundario', valor: false }, { texto: 'Borrar todos', clase: 'peligro', valor: true }] });
    if (ok) { estado.escritos = []; guardar(true); navegar('#/adulto/progreso', true); }
  } }, 'Borrar todos los textos'));
  zona.appendChild(cajaEsc);

  function asignar(id) {
    estado.ajustes.temaAsignado = { id, nota: '', fecha: new Date().toISOString() };
    guardar(true);
    const logrado = progresoSiExiste(id)?.estado === 'logrado';
    aviso(`Tema asignado: ${buscarTema(id)?.titulo}. Aparecerá primero en la pantalla de inicio${logrado ? ' como repaso, porque ya está logrado' : ''}.`);
  }
}

// Descripciones para etiquetas de error de generadores si el tema no las trae
const GEN_ERR = {};

// ---------- ajustes ----------
function tabAjustes(zona, { navegar }) {
  const estado = obtener();
  const indice = obtenerIndice();

  // Perfil
  const apodo = h('input', { type: 'text', value: estado.perfil.apodo || '', maxlength: '20', autocomplete: 'off', placeholder: 'Opcional' });
  const avatares = ['🦙', '🐸', '🦜', '🐆', '🐢', '🦋', '🐬', '🦉', '🐞', '🐱', '🐶', '🌻'];
  const cajaAv = h('div', { class: 'avatares' }, avatares.map((a) => h('button', { type: 'button', 'aria-pressed': estado.perfil.avatar === a ? 'true' : 'false', 'aria-label': `Elegir ${a}`, onclick: (e) => {
    estado.perfil.avatar = a; guardar(); cajaAv.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true');
  } }, a)));
  zona.appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, 'Perfil del niño'),
    h('div', { class: 'formulario' },
      h('label', {}, 'Apodo para el saludo', apodo, h('span', { class: 'nota', style: 'font-weight:400' }, 'No hace falta el nombre real. Se guarda solo en este dispositivo.')),
      h('div', {}, h('strong', {}, 'Personaje'), cajaAv)),
    h('div', { class: 'fila-botones' }, h('button', { class: 'boton pequeno', type: 'button', onclick: () => { estado.perfil.apodo = apodo.value.trim().slice(0, 20); guardar(true); aviso('Perfil guardado.'); } }, 'Guardar perfil'))));

  // Nivel inicial
  const cajaNivel = h('div', { class: 'tarjeta' }, h('h2', {}, 'Nivel inicial por materia'),
    h('p', { class: 'nota' }, 'Define con qué dificultad empieza la práctica de cada tema nuevo. Después la app ajusta la dificultad según las respuestas.'));
  const NIV = [[1, 'Con más repaso'], [2, 'Nivel del grado'], [3, 'Con desafíos']];
  indice.materias.forEach((m) => {
    const fila = h('div', { class: 'selector-nivel', role: 'group', 'aria-label': m.nombre }, NIV.map(([n, t]) => h('button', {
      type: 'button', 'aria-pressed': estado.ajustes.nivelInicial[m.id] === n ? 'true' : 'false',
      onclick: (e) => { estado.ajustes.nivelInicial[m.id] = n; guardar(); fila.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true'); },
    }, t)));
    cajaNivel.append(h('p', { style: 'margin:12px 0 6px;font-weight:700' }, `${m.emoji} ${m.nombre}`), fila);
  });
  cajaNivel.appendChild(h('div', { class: 'fila-botones' }, h('button', { class: 'boton pequeno secundario', type: 'button', onclick: () => {
    let n = 0;
    for (const t of listaTemas()) {
      const pr = progresoSiExiste(t.id);
      if (pr && pr.estado !== 'logrado') { pr.nivel = estado.ajustes.nivelInicial[t.materia] || 2; n++; }
    }
    guardar(true);
    aviso(n ? `Nivel aplicado a ${n} temas empezados.` : 'No hay temas empezados sin lograr.');
  } }, 'Aplicar también a los temas ya empezados')));
  zona.appendChild(cajaNivel);

  // Tema asignado
  const sel = h('select', { 'aria-label': 'Tema para asignar' }, h('option', { value: '' }, '— Sin tarea asignada —'),
    indice.materias.map((m) => h('optgroup', { label: m.nombre }, m.unidades.flatMap((u) => u.temas.map((t) => h('option', { value: t.id, selected: estado.ajustes.temaAsignado?.id === t.id }, `${u.numero}. ${t.titulo}`))))));
  const nota = h('input', { type: 'text', maxlength: '120', value: estado.ajustes.temaAsignado?.nota || '', placeholder: 'Ej.: Practica esto antes del jueves' });
  zona.appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, 'Asignar un tema'),
    h('p', { class: 'nota' }, 'El tema asignado aparece primero en «Continuar aprendiendo» hasta que el niño lo logre.'),
    h('div', { class: 'formulario' }, h('label', {}, 'Tema', sel), h('label', {}, 'Mensaje para el niño (opcional)', nota)),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton pequeno', type: 'button', onclick: () => {
        estado.ajustes.temaAsignado = sel.value ? { id: sel.value, nota: nota.value.trim(), fecha: new Date().toISOString() } : null;
        guardar(true);
        aviso(sel.value ? 'Tema asignado.' : 'Tarea quitada.');
      } }, 'Guardar'),
      h('button', { class: 'boton pequeno secundario', type: 'button', onclick: () => { estado.ajustes.temaAsignado = null; sel.value = ''; nota.value = ''; guardar(true); aviso('Tarea quitada.'); } }, 'Quitar tarea'))));

  // Audio
  const voces = listaVoces();
  const estadoVoz = !hayVoz() ? '❌ Este navegador no tiene síntesis de voz: los botones de audio no funcionarán.'
    : hayVozEspanol() ? `✅ Voces en español detectadas: ${voces.length}.`
      : '⚠️ No se detectó una voz en español. El audio podría sonar en otro idioma o no sonar. En Android: Ajustes → Sistema → Idioma → Salida de texto a voz → instala «Español» en el motor de Google.';
  const selVoz = h('select', { 'aria-label': 'Voz' }, h('option', { value: '' }, 'Automática (español)'), voces.map((v) => h('option', { value: v.uri, selected: estado.ajustes.voz.uri === v.uri }, `${v.nombre} (${v.idioma})${v.local ? '' : ' · en línea'}`)));
  const vel = h('input', { type: 'range', min: '0.6', max: '1.2', step: '0.05', value: String(estado.ajustes.voz.velocidad) });
  const velTexto = h('output', { style: 'font-weight:700' }, `${String(estado.ajustes.voz.velocidad).replace('.', ',')}×`);
  vel.addEventListener('input', () => { velTexto.textContent = `${vel.value.replace('.', ',')}×`; });
  const auto = h('input', { type: 'checkbox', checked: estado.ajustes.voz.leerAuto });
  zona.appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, 'Audio'),
    h('p', {}, estadoVoz),
    h('p', { class: 'nota' }, 'La app usa la voz del teléfono; no incluye grabaciones. En «Automática» se prefieren las voces instaladas en el teléfono. Las marcadas «en línea» necesitan internet y envían el texto de la lección al servicio de voz (nunca datos del niño).'),
    h('div', { class: 'formulario' },
      h('label', {}, 'Voz', selVoz),
      h('label', {}, h('span', {}, 'Velocidad ', velTexto), vel),
      h('label', { style: 'display:flex;gap:10px;align-items:center;font-weight:400' }, auto, 'Leer en voz alta cada instrucción automáticamente')),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton pequeno', type: 'button', onclick: () => {
        estado.ajustes.voz = { uri: selVoz.value || null, velocidad: Number(vel.value), leerAuto: auto.checked };
        configurarVoz({ uri: estado.ajustes.voz.uri, velocidad: estado.ajustes.voz.velocidad });
        guardar(true);
        aviso('Audio guardado.');
      } }, 'Guardar'),
      h('button', { class: 'boton pequeno secundario', type: 'button', onclick: async () => {
        configurarVoz({ uri: selVoz.value || null, velocidad: Number(vel.value) });
        const ok = await hablar('Hola. Así suena la voz de la app. ¿Qué aprendemos hoy?');
        if (!ok) aviso('No se pudo reproducir la voz en este dispositivo.');
      } }, '🔊 Probar voz'))));

  // PIN
  zona.appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, 'PIN de adultos'),
    h('p', { class: 'nota' }, 'El PIN actual sigue valiendo hasta que confirmes el nuevo.'),
    h('button', { class: 'boton pequeno secundario', type: 'button', onclick: () => { desbloqueadoHasta = 0; creandoPin = true; navegar('#/adulto/ajustes', true); } }, 'Cambiar el PIN')));
}

// ---------- contenido ----------
function tabContenido(zona, { navegar }) {
  zona.appendChild(h('p', { class: 'nota' }, 'Puedes revisar las lecciones antes de que el niño las use y corregir fechas o textos. Los cambios quedan como borrador hasta que los publiques, y siempre puedes volver al original.'));
  zona.appendChild(h('p', { class: 'nota' }, 'Conviene confirmar con el texto escolar algunos datos que no se pudieron volver a verificar en línea: los colores de las banderas departamentales, las descripciones de las fechas cívicas y algunos datos de transporte y ciencias. Puedes corregirlos aquí mismo.'));
  editorFechas(zona, { navegar });
  editorTemas(zona, { navegar });
  verificacion(zona);
}

function editorFechas(zona, { navegar }) {
  const estado = obtener();
  const c = estado.contenido.fechas;
  let lista = fechasParaEditar();
  const caja = h('div', { class: 'tarjeta' }, h('h2', {}, '📅 Fechas cívicas y conmemorativas'));
  zona.appendChild(caja);
  const estadoTxt = h('p', { class: 'nota' });
  const cuerpo = h('div');
  caja.append(estadoTxt, cuerpo);

  const TIPOS = { civica: 'Cívica', conmemorativa: 'Conmemorativa', departamental: 'Departamental' };
  function pintar() {
    estadoTxt.textContent = Array.isArray(c.borrador)
      ? '✏️ Hay cambios en borrador: el niño todavía ve la versión publicada.'
      : Array.isArray(c.publicado) ? `✅ Publicada tu versión (${fechaCorta(c.fechaPublicado)}).` : 'Versión original de la app.';
    vaciar(cuerpo);
    const ordenadas = lista.map((f, i) => ({ f, i })).sort((a, b) => a.f.mes - b.f.mes || a.f.dia - b.f.dia);
    cuerpo.appendChild(h('div', {}, ordenadas.map(({ f, i }) => h('div', { class: 'fila-tema' },
      h('div', { class: 't' }, h('div', { class: 'n', style: f.publicada === false ? 'text-decoration:line-through;opacity:.6' : '' }, `${f.dia} de ${MESES[f.mes - 1]} · ${f.nombre}`),
        h('div', { class: 'd' }, `${TIPOS[f.tipo] || f.tipo}${f.departamento ? ` · ${f.departamento}` : ''}${f.publicada === false ? ' · oculta' : ''}`)),
      h('button', { class: 'mas', type: 'button', onclick: () => editar(i) }, 'Editar')))));
    cuerpo.appendChild(h('div', { class: 'fila-botones' },
      h('button', { class: 'boton pequeno suave', type: 'button', onclick: () => editar(-1) }, '+ Agregar fecha'),
      Array.isArray(c.borrador) ? h('button', { class: 'boton pequeno', type: 'button', onclick: publicar }, 'Publicar cambios') : null,
      Array.isArray(c.borrador) ? h('button', { class: 'boton pequeno secundario', type: 'button', onclick: () => { c.borrador = null; guardar(true); lista = fechasParaEditar(); pintar(); } }, 'Descartar borrador') : null,
      h('button', { class: 'boton pequeno secundario', type: 'button', onclick: vistaPrevia }, 'Vista previa'),
      Array.isArray(c.publicado) || Array.isArray(c.borrador) ? h('button', { class: 'boton pequeno secundario', type: 'button', onclick: restaurar }, 'Volver a las originales') : null));
  }

  function guardarBorrador() { c.borrador = lista.map((f) => ({ ...f })); guardar(true); pintar(); }

  function editar(i) {
    const f = i >= 0 ? { ...lista[i] } : { id: `local-${Date.now()}`, dia: 1, mes: 1, tipo: 'conmemorativa', nombre: '', descripcion: '', publicada: true };
    const dia = h('input', { type: 'number', min: '1', max: '31', value: String(f.dia) });
    const mes = h('select', {}, MESES.map((m, k) => h('option', { value: String(k + 1), selected: f.mes === k + 1 }, m)));
    const nombre = h('input', { type: 'text', value: f.nombre, maxlength: '90' });
    const tipo = h('select', {}, Object.entries(TIPOS).map(([k, t]) => h('option', { value: k, selected: f.tipo === k }, t)));
    const depto = h('input', { type: 'text', value: f.departamento || '', maxlength: '40', placeholder: 'Solo si es departamental o local' });
    const desc = h('textarea', { maxlength: '300' }, f.descripcion);
    const visible = h('input', { type: 'checkbox', checked: f.publicada !== false });
    dialogo({
      titulo: i >= 0 ? 'Editar fecha' : 'Nueva fecha',
      contenido: h('div', { class: 'formulario' },
        h('div', { style: 'display:grid;grid-template-columns:1fr 2fr;gap:10px' }, h('label', {}, 'Día', dia), h('label', {}, 'Mes', mes)),
        h('label', {}, 'Nombre', nombre), h('label', {}, 'Tipo', tipo), h('label', {}, 'Departamento o lugar', depto),
        h('label', {}, 'Descripción para el niño (frases cortas)', desc),
        h('label', { style: 'display:flex;gap:10px;align-items:center;font-weight:400' }, visible, 'Mostrar esta fecha al niño')),
      botones: [
        ...(i >= 0 && String(f.id).startsWith('local-') ? [{ texto: 'Eliminar', clase: 'peligro', valor: 'borrar' }] : []),
        { texto: 'Cancelar', clase: 'secundario', valor: false }, { texto: 'Guardar borrador', valor: true },
      ],
      validar: (v) => {
        if (v !== true) return null;
        const d = Math.round(Number(dia.value)), m = Number(mes.value);
        const maxDia = new Date(2024, m, 0).getDate();
        if (!(d >= 1 && d <= maxDia)) return `El día debe estar entre 1 y ${maxDia} para ${MESES[m - 1]}.`;
        if (!nombre.value.trim()) return 'Escribe el nombre de la fecha.';
        if (!desc.value.trim()) return 'Escribe una descripción corta para el niño.';
        return null;
      },
    }).then((v) => {
      if (v === 'borrar') { lista.splice(i, 1); guardarBorrador(); return; }
      if (!v) return;
      const d = Math.round(Number(dia.value)), m = Number(mes.value);
      const maxDia = new Date(2024, m, 0).getDate();
      if (!nombre.value.trim() || !desc.value.trim() || !(d >= 1 && d <= maxDia)) { aviso('Revisa el día, el nombre y la descripción.'); return; }
      const nueva = { ...f, dia: d, mes: m, nombre: nombre.value.trim(), tipo: tipo.value, descripcion: desc.value.trim(), publicada: visible.checked };
      if (depto.value.trim()) nueva.departamento = depto.value.trim(); else delete nueva.departamento;
      if (i >= 0) lista[i] = nueva; else lista.push(nueva);
      guardarBorrador();
    });
  }

  async function publicar() {
    const ok = await dialogo({
      titulo: 'Publicar fechas',
      contenido: 'Se actualizarán la lista de fechas que ve el niño y los ejercicios de fechas que crea la app. Los textos y ejercicios fijos de los temas no cambian solos: después te mostraremos cuáles mencionan una fecha que cambiaste, para que los revises. ¿Publicar?',
      botones: [{ texto: 'Cancelar', clase: 'secundario', valor: false }, { texto: 'Publicar', valor: true }],
    });
    if (!ok) return;
    const antes = Array.isArray(c.publicado) ? c.publicado : fechasOriginales();
    c.publicado = lista.map((f) => ({ ...f }));
    c.borrador = null;
    c.fechaPublicado = new Date().toISOString();
    guardar(true);
    pintar();
    const afectados = await ejerciciosConFechasCambiadas(antes, c.publicado);
    if (!afectados.length) { aviso('Fechas publicadas.'); return; }
    dialogo({
      titulo: 'Fechas publicadas',
      contenido: h('div', {},
        h('p', {}, 'Estos temas tienen textos o ejercicios fijos que mencionan una fecha que cambiaste u ocultaste. Revísalos y corrígelos en «Lecciones → Editar texto» si hace falta:'),
        h('ul', {}, afectados.map((a) => h('li', {}, h('strong', {}, `${a.tema}: `), `${a.fecha} → ${a.lugares.join(', ')}`)))),
      botones: [{ texto: 'Entendido', valor: true }],
    });
  }

  async function restaurar() {
    const ok = await dialogo({ titulo: 'Volver a las fechas originales', contenido: 'Se borrarán tus cambios y el borrador. ¿Continuar?', botones: [{ texto: 'Cancelar', clase: 'secundario', valor: false }, { texto: 'Sí, volver', valor: true }] });
    if (!ok) return;
    c.publicado = null; c.borrador = null; c.fechaPublicado = null;
    guardar(true);
    lista = fechasOriginales();
    pintar();
  }

  function vistaPrevia() {
    dialogo({ titulo: 'Así lo verá el niño', contenido: h('div', {}, renderVisual({ tipo: 'fechas', filtro: 'todas' }, { fechas: lista.filter((f) => f.publicada !== false) })), botones: [{ texto: 'Cerrar', valor: true }] });
  }
  pintar();
  void navegar;
}

let temaEditado = null;

function editorTemas(zona, { navegar }) {
  const estado = obtener();
  const indice = obtenerIndice();
  const sel = h('select', { 'aria-label': 'Tema' }, indice.materias.map((m) => h('optgroup', { label: m.nombre }, m.unidades.flatMap((u) => u.temas.map((t) => h('option', { value: t.id }, `${t.id} · ${t.titulo}`))))));
  const info = h('p', { class: 'nota' });
  const area = h('div');
  const caja = h('div', { class: 'tarjeta' }, h('h2', {}, '📚 Lecciones'),
    h('p', { class: 'nota' }, 'Revisa cualquier tema: explicación, ejemplo y todos los ejercicios con sus respuestas. Puedes probar cada ejercicio sin que cuente en el progreso.'),
    h('div', { class: 'formulario' }, h('label', {}, 'Tema', sel)), info,
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton pequeno', type: 'button', onclick: () => navegar(`#/revisar/${sel.value}`) }, '👀 Revisar y probar'),
      h('button', { class: 'boton pequeno secundario', type: 'button', onclick: () => abrirEditor() }, '✏️ Editar texto (avanzado)')),
    area);
  zona.appendChild(caja);
  if (temaEditado) sel.value = temaEditado;
  sel.addEventListener('change', () => { temaEditado = sel.value; });
  const pintarInfo = () => {
    const ov = estado.contenido.temas[sel.value];
    info.textContent = !ov ? 'Versión original.' : ov.borrador ? '✏️ Tiene un borrador sin publicar.' : ov.publicado ? `✅ Publicada tu versión (${fechaCorta(ov.fechaPublicado)}).` : 'Versión original.';
  };
  sel.addEventListener('change', () => { vaciar(area); pintarInfo(); });
  pintarInfo();

  async function abrirEditor() {
    const id = sel.value;
    temaEditado = id;
    vaciar(area);
    const ov = estado.contenido.temas[id] || {};
    let texto;
    try {
      texto = JSON.stringify(ov.borrador || ov.publicado || await cargarTema(id, { original: true }), null, 2);
    } catch { area.appendChild(h('p', {}, 'No se encontró el archivo de este tema.')); return; }
    const ed = h('textarea', { class: 'editor-json', spellcheck: 'false', 'aria-label': 'Contenido del tema en formato JSON' }, texto);
    const res = h('div');
    const validar = () => {
      vaciar(res);
      let tema;
      try { tema = JSON.parse(ed.value); } catch (e) { res.appendChild(h('ul', { class: 'lista-errores' }, h('li', {}, `El texto no es JSON válido: ${e.message}`))); return null; }
      const { errores } = validarTema(tema, { idEsperado: id, datos: { feria: datosContenido().feria, fechas: fechasPublicadas() } });
      if (errores.length) { res.appendChild(h('ul', { class: 'lista-errores' }, errores.slice(0, 30).map((x) => h('li', {}, x)))); return null; }
      res.appendChild(h('p', { class: 'lista-ok' }, '✅ El tema es válido.'));
      return tema;
    };
    area.append(
      h('p', { class: 'nota' }, 'Formato descrito en docs/CONTENIDO.md. Cambia solo los textos si no conoces el formato.'),
      ed, res,
      h('div', { class: 'fila-botones' },
        h('button', { class: 'boton pequeno secundario', type: 'button', onclick: validar }, 'Validar'),
        h('button', { class: 'boton pequeno secundario', type: 'button', onclick: () => {
          const t = validar(); if (!t) return;
          estado.contenido.temas[id] = { ...(estado.contenido.temas[id] || {}), borrador: t };
          guardar(true); pintarInfo(); aviso('Borrador guardado.');
        } }, 'Guardar borrador'),
        h('button', { class: 'boton pequeno secundario', type: 'button', onclick: () => {
          const t = validar(); if (!t) return;
          estado.contenido.temas[id] = { ...(estado.contenido.temas[id] || {}), borrador: t };
          guardar(true); navegar(`#/revisar/${id}/borrador`);
        } }, 'Probar borrador'),
        h('button', { class: 'boton pequeno', type: 'button', onclick: async () => {
          const t = validar(); if (!t) return;
          const ok = await dialogo({ titulo: 'Publicar', contenido: 'El niño verá esta versión del tema. ¿Publicar?', botones: [{ texto: 'Cancelar', clase: 'secundario', valor: false }, { texto: 'Publicar', valor: true }] });
          if (!ok) return;
          estado.contenido.temas[id] = { borrador: null, publicado: t, fechaPublicado: new Date().toISOString() };
          guardar(true); pintarInfo(); aviso('Tema publicado.');
        } }, 'Publicar'),
        h('button', { class: 'boton pequeno peligro', type: 'button', onclick: async () => {
          const ok = await dialogo({ titulo: 'Volver al original', contenido: 'Se borrarán el borrador y tu versión publicada de este tema. ¿Continuar?', botones: [{ texto: 'Cancelar', clase: 'secundario', valor: false }, { texto: 'Sí, volver', valor: true }] });
          if (!ok) return;
          delete estado.contenido.temas[id]; guardar(true); pintarInfo(); vaciar(area); aviso('Se restauró el original.');
        } }, 'Volver al original')));
  }
}

function verificacion(zona) {
  const res = h('div');
  zona.appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, '🔎 Verificar todo el contenido'),
    h('p', { class: 'nota' }, 'Comprueba que cada tema tenga explicación, ejemplo, actividad guiada, práctica y comprobación con respuestas verificables.'),
    h('button', { class: 'boton pequeno secundario', type: 'button', onclick: async () => {
      vaciar(res);
      res.appendChild(h('p', {}, 'Verificando…'));
      const temas = listaTemas();
      let ok = 0;
      const problemas = [];
      for (const t of temas) {
        try {
          const tema = await cargarTema(t.id);
          const { errores } = validarTema(tema, { idEsperado: t.id, datos: { feria: datosContenido().feria, fechas: fechasPublicadas() }, muestras: 5 });
          if (errores.length) problemas.push(`${t.id}: ${errores[0]}${errores.length > 1 ? ` (+${errores.length - 1})` : ''}`);
          else ok++;
        } catch (e) { problemas.push(`${t.id}: no se pudo cargar`); }
      }
      vaciar(res);
      res.appendChild(h('p', { class: problemas.length ? '' : 'lista-ok' }, `${ok} de ${temas.length} temas correctos.`));
      if (problemas.length) res.appendChild(h('ul', { class: 'lista-errores' }, problemas.map((x) => h('li', {}, x))));
    } }, 'Verificar'), res));
}

// ---------- datos ----------
function tabDatos(zona, { navegar }) {
  const estado = obtener();
  zona.appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, '🔐 Privacidad'),
    h('ul', {},
      h('li', {}, 'La app no tiene cuentas ni sincronización: no pide correo, teléfono ni nombre real.'),
      h('li', {}, 'Todo el progreso se guarda solo en este dispositivo (almacenamiento del navegador).'),
      h('li', {}, 'La app no envía datos a ningún servidor ni usa publicidad o analítica.'),
      h('li', {}, 'Si borras los datos del navegador, se borra el progreso. Haz una copia de seguridad si quieres conservarlo.')),
    almacenamientoDisponible() ? null : h('p', { class: 'aviso-audio' }, '⚠️ Este navegador no permite guardar datos (¿modo incógnito?). El progreso se perderá al cerrar.')));

  const archivo = h('input', { type: 'file', accept: 'application/json,.json', class: 'oculto', onchange: async () => {
    const f = archivo.files[0]; if (!f) return;
    try {
      const texto = await f.text();
      const ok = await dialogo({ titulo: 'Restaurar copia', contenido: 'Se reemplazará el progreso actual por el de la copia. ¿Continuar?', botones: [{ texto: 'Cancelar', clase: 'secundario', valor: false }, { texto: 'Restaurar', valor: true }] });
      if (!ok) return;
      importar(texto);
      navegar('#/adulto/datos', true);
      avisarDespues('Copia restaurada.');
    } catch (e) { aviso(`No se pudo restaurar: ${e.message}`); }
  } });
  zona.appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, '💾 Copia de seguridad'),
    h('p', { class: 'nota' }, 'Descarga un archivo con el progreso y los ajustes para guardarlo o pasarlo a otro teléfono. Contiene el apodo y los textos que escribió el niño: guárdalo en un lugar privado.'),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton pequeno', type: 'button', onclick: () => {
        const blob = new Blob([exportar()], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: `aprendo2-copia-${hoyISO()}.json` });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      } }, 'Descargar copia'),
      h('button', { class: 'boton pequeno secundario', type: 'button', onclick: () => archivo.click() }, 'Restaurar copia'), archivo)));

  const infoAlm = h('p', { class: 'nota' }, 'Calculando…');
  const offline = h('p', { class: 'nota' });
  zona.appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, '📴 Uso sin conexión'), offline, infoAlm,
    h('div', { class: 'fila-botones' }, h('button', { class: 'boton pequeno secundario', type: 'button', onclick: async () => { const ok = await pedirPersistencia(); aviso(ok ? 'El navegador conservará los datos.' : 'El navegador no confirmó la protección de los datos (instalar la app ayuda).'); } }, 'Proteger los datos en este teléfono')),
    h('p', { class: 'nota' }, 'Para instalarla: en Chrome para Android, abre el menú ⋮ y elige «Instalar app» o «Agregar a la pantalla principal».')));
  (async () => {
    try {
      const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
      const persist = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
      infoAlm.textContent = `${est ? `Espacio usado: ${(est.usage / 1024 / 1024).toFixed(1)} MB. ` : ''}${persist ? 'Datos protegidos contra borrado automático.' : 'Datos no protegidos contra borrado automático del navegador.'}`;
    } catch { infoAlm.textContent = ''; }
    try {
      const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
      const cacheNombres = typeof caches !== 'undefined' ? await caches.keys() : [];
      let n = 0;
      for (const k of cacheNombres) { const c = await caches.open(k); n += (await c.keys()).filter((r) => r.url.includes('/content/temas/')).length; }
      offline.textContent = reg && reg.active ? `✅ La app funciona sin conexión. Lecciones guardadas en el teléfono: ${n}.` : '⚠️ El modo sin conexión todavía no está activo (abre la app con internet una vez y espera unos segundos).';
    } catch { offline.textContent = 'No se pudo comprobar el modo sin conexión.'; }
  })();

  zona.appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, '🗑️ Borrar datos'),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton pequeno secundario', type: 'button', onclick: async () => {
        const ok = await dialogo({ titulo: 'Borrar el progreso', contenido: 'Se borrará el avance de todos los temas, la actividad y los textos. Los ajustes se conservan. ¿Continuar?', botones: [{ texto: 'Cancelar', clase: 'secundario', valor: false }, { texto: 'Borrar progreso', clase: 'peligro', valor: true }] });
        if (ok) { borrarProgreso(); navegar('#/adulto/datos', true); avisarDespues('Progreso borrado.'); }
      } }, 'Borrar el progreso'),
      h('button', { class: 'boton pequeno peligro', type: 'button', onclick: async () => {
        const ok = await dialogo({ titulo: 'Borrar todo', contenido: 'Se borrará todo: progreso, ajustes, PIN y contenidos editados. ¿Continuar?', botones: [{ texto: 'Cancelar', clase: 'secundario', valor: false }, { texto: 'Borrar todo', clase: 'peligro', valor: true }] });
        if (ok) { borrarTodo(); bloquearAdulto(); navegar('#/inicio'); }
      } }, 'Borrar todo'))));
  zona.appendChild(h('p', { class: 'nota', style: 'text-align:center' }, h('a', { href: '#/acerca' }, 'Acerca de la app y sus limitaciones')));
  void estado;
}

// ---------- revisar un tema (adulto) ----------
export async function pantallaRevisar(raiz, { id, fuente, navegar, ejecutarEjercicioAislado }) {
  if (!adultoDesbloqueado()) { navegar('#/adulto'); return; }
  const info = buscarTema(id);
  const estado = obtener();
  let tema;
  try {
    tema = fuente === 'borrador' ? estado.contenido.temas[id]?.borrador : await cargarTema(id);
    if (!tema) throw new Error('sin borrador');
  } catch { navegar('#/adulto/contenido'); aviso('No se encontró el tema.'); return; }
  vaciar(raiz);
  raiz.appendChild(h('div', { class: 'barra' },
    h('button', { class: 'icono-boton', type: 'button', 'aria-label': 'Volver', onclick: () => navegar('#/adulto/contenido') }, '←'),
    h('span', { class: 'barra-titulo' }, `Revisar: ${info?.titulo || id}${fuente === 'borrador' ? ' (borrador)' : ''}`)));
  const p = h('main', { class: 'pantalla adulto', id: 'contenido', style: `--c:${info?.color || '#1F7A70'}` });
  raiz.appendChild(p);
  const datosVisual = { fechas: fechasPublicadas() };

  p.appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, 'Objetivo'), rico(tema.objetivo, 'p'), h('p', { class: 'nota' }, tema.adulto.objetivo)));
  p.appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, '1. Aprendo (explicación)'), tema.explicacion.map((t) => h('div', { class: 'vista-ejercicio' },
    t.emoji ? h('div', { style: 'font-size:32px' }, t.emoji) : null, t.visual ? renderVisual(t.visual, datosVisual) : null, rico(t.texto, 'p')))));
  p.appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, '2. Observo (ejemplo)'), rico(tema.ejemplo.instruccion, 'p'),
    (tema.ejemplo.pasos || []).map((s) => h('div', { class: 'vista-ejercicio' }, s.visual ? renderVisual(s.visual, datosVisual) : null, rico(s.texto, 'p'))),
    tema.ejemplo.explorar ? h('p', { class: 'nota' }, `Incluye exploración libre: ${tema.ejemplo.explorar.tipo}.`) : null));

  const seccion = (titulo, lista) => h('div', { class: 'tarjeta' }, h('h2', {}, titulo), lista.map((ej) => h('div', { class: 'vista-ejercicio' },
    h('div', { class: 'nota' }, `${ej.id} · ${ej.tipo}${ej.nivel ? ` · nivel ${ej.nivel}` : ''}${ej.generador ? ` · generador «${ej.generador}»` : ''}`),
    ej.apoyo ? h('p', { style: 'margin:4px 0' }, '💡 ', ej.apoyo) : null,
    rico(ej.enunciado || '(ejercicio creado por la app, distinto cada vez)', 'p', { style: 'font-weight:700;margin:4px 0' }),
    h('p', { class: 'nota', style: 'margin:0' }, 'Respuesta: ', resumenRespuesta(ej)),
    ej.pista ? h('p', { class: 'nota', style: 'margin:0' }, 'Pista: ', ej.pista) : null,
    h('button', { class: 'boton pequeno suave', type: 'button', style: 'margin-top:6px', onclick: () => ejecutarEjercicioAislado(tema, ej, () => pantallaRevisar(raiz, { id, fuente, navegar, ejecutarEjercicioAislado })) }, '▶ Probar'))));
  p.appendChild(seccion('3. Hacemos juntos (guiada)', tema.guiada.pasos));
  p.appendChild(seccion('4. Practico (banco adaptativo)', tema.practica));
  p.appendChild(seccion('5. Demuestro lo que sé (comprobación)', tema.comprobacion));
  p.appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, 'Repaso'), rico(tema.repaso.texto, 'p')));
}

function resumenManipulable(m) {
  const lista = (x) => (Array.isArray(x) ? x.join(' ') : '');
  switch (m.tipo) {
    case 'bloques': return `armar ${m.objetivo}`;
    case 'recta': return `marcar el ${m.objetivo}`;
    case 'fraccion': return `pintar ${m.objetivo} de ${m.partes} partes`;
    case 'dinero': return `juntar ${formatoBs(m.objetivo)}`;
    case 'reloj': return `poner las ${m.objetivo.hora}:${String(m.objetivo.minutos).padStart(2, '0')}`;
    case 'grupos': return `${m.grupos} grupos de ${m.porGrupo}`;
    case 'repartir': return `${m.total / m.grupos} en cada uno de los ${m.grupos} grupos`;
    case 'simetria': return 'pintar el reflejo exacto de las celdas del lado izquierdo';
    case 'calendario': return `tocar el día ${m.objetivo} de ${MESES[m.mes - 1]} de ${m.anio}`;
    case 'pictograma': return (m.categorias || []).map((c) => `${c.etiqueta}: ${c.objetivo}`).join('; ');
    case 'patron': return `completar con ${lista(m.solucion)}`;
    default: return m.tipo;
  }
}

// Busca en los temas los textos y ejercicios fijos que mencionan fechas cambiadas u ocultas.
async function ejerciciosConFechasCambiadas(antes, despues) {
  const porId = new Map(despues.map((f) => [f.id, f]));
  const cambios = [];
  for (const f of antes) {
    const n = porId.get(f.id);
    const oculta = !n || n.publicada === false;
    const movida = n && (n.dia !== f.dia || n.mes !== f.mes || n.nombre !== f.nombre);
    if ((oculta && f.publicada !== false) || movida) cambios.push({ texto: `${f.dia} de ${MESES[f.mes - 1]}`, nombre: f.nombre });
  }
  if (!cambios.length) return [];
  const resultado = [];
  for (const t of listaTemas()) {
    let tema;
    try { tema = await cargarTema(t.id); } catch { continue; }
    const partes = [
      ...tema.explicacion.map((x, i) => [`tarjeta ${i + 1}`, x]),
      ...(tema.ejemplo.pasos || []).map((x, i) => [`ejemplo ${i + 1}`, x]),
      ...[...tema.guiada.pasos, ...tema.practica, ...tema.comprobacion].map((x) => [x.id, x]),
    ];
    for (const c of cambios) {
      const lugares = partes.filter(([, x]) => { const j = JSON.stringify(x); return j.includes(c.texto) || j.includes(c.nombre); }).map(([k]) => k);
      if (lugares.length) resultado.push({ tema: `${t.id} ${t.titulo}`, fecha: `${c.nombre} (${c.texto})`, lugares });
    }
  }
  return resultado;
}

function resumenRespuesta(ej) {
  switch (ej.tipo) {
    case 'opcion': case 'multiple': return ej.opciones.filter((o) => o.correcta).map((o) => o.texto || o.emoji).join(', ');
    case 'tocar': return (ej.texto.match(/\*([^*]+)\*/g) || []).map((x) => x.replace(/\*/g, '')).join(', ');
    case 'completar': return (ej.texto.match(/\[([^\]]+)\]/g) || []).map((x) => x.slice(1, -1)).join(', ');
    case 'escribir': return ej.respuestas.join(' / ');
    case 'numero': return ej.campos ? ej.campos.map((c) => `${c.etiqueta} ${c.respuesta}`).join('; ') : `${ej.prefijo || ''}${ej.respuesta}${ej.sufijo ? ` ${ej.sufijo}` : ''}`;
    case 'ordenar': return ej.elementos.map((e) => (typeof e === 'string' ? e : e.texto || e.emoji)).join(' → ');
    case 'relacionar': case 'memoria': return ej.pares.map((p) => p.map((x) => (typeof x === 'string' ? x : x.texto || x.emoji)).join('–')).join(', ');
    case 'clasificar': return ej.categorias.map((c) => `${c.texto}: ${ej.elementos.filter((e) => e.categoria === c.id).map((e) => e.texto || e.emoji).join(', ')}`).join(' | ');
    case 'escribir-libre': return `revisa: ${ej.requisitos.map((q) => q.tipo).join(', ')}. Ejemplo: ${ej.modelo}`;
    case 'manipular': return resumenManipulable(ej.manipulable);
    case 'pasos': return ej.pasos.map((s, i) => `${i + 1}) ${resumenRespuesta(s)}`).join('  ');
    case 'generador': return 'la calcula la app';
    default: return '';
  }
}
