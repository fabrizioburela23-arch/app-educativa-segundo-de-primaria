// Recorrido de una lección: Aprendo → Observo → Hacemos juntos → Practico → Demuestro.
// También los modos «repaso» (repaso espaciado) y «desafio» (tema ya logrado).

import { h, vaciar, rico, aviso, hoyISO, clicSeguro } from '../ui/dom.js';
import { renderVisual } from '../visuales/visual.js';
import { crearManipulable } from '../manipulables/index.js';
import { ejecutarEjercicio, botonAudio, mostrarRetro } from './ejecutar.js';
import {
  FASES, registrarResultado, nuevaSesionPractica, aplicarResultadoPractica, practicaSuficiente,
  practicaAgotada, elegirPractica, elegirComprobacion, aplicarComprobacion, elegirRepaso, aplicarRepaso,
  elegirDesafio, avancePractica,
} from './adaptativo.js';
import { obtener, progresoDe, guardar, anotarRegistro, anotarEscrito, anotarSesionAbierta, marcarAbierto } from '../estado.js';
import { datosGeneradores, fechasPublicadas } from '../contenido/cargar.js';
import { detener, hayVoz, hablar } from '../audio/voz.js';

const NOMBRE_FASE = {
  explicacion: 'Aprendo',
  ejemplo: 'Observo',
  guiada: 'Hacemos juntos',
  practica: 'Practico',
  comprobacion: 'Demuestro lo que sé',
  repaso: 'Repaso rápido',
  desafio: 'Nuevo desafío',
};

export function nombreFase(f) { return NOMBRE_FASE[f] || f; }

// app: { navegar(hash), color }
export async function abrirLeccion(raiz, { tema, info, modo = 'normal', navegar }) {
  const estado = obtener();
  const prog = progresoDe(tema.id, info.materia);
  estado.ultimoTema = tema.id;
  marcarAbierto(tema.id);
  guardar();
  let vivo = true;
  let registroPendiente = null; // práctica a medias: se anota si el niño sale
  const anotarPendiente = () => {
    if (registroPendiente && registroPendiente.total) anotarRegistro(registroPendiente);
    registroPendiente = null;
    anotarSesionAbierta(null);
  };
  const alSalir = () => { vivo = false; anotarPendiente(); marcarAbierto(null); window.removeEventListener('pantalla-cambia', alSalir); };
  // Las fases solo avanzan: repasar la explicación no borra lo ya hecho.
  const avanzarFase = (f) => { if (FASES.indexOf(f) > FASES.indexOf(prog.fase)) prog.fase = f; };
  const salidaDe = (hash) => navegar(hash, { reemplazar: true });
  window.addEventListener('pantalla-cambia', alSalir);

  // ---------- esqueleto de pantalla ----------
  vaciar(raiz);
  const fasesEl = h('div', { class: 'fases', 'aria-hidden': 'true' }, FASES.map(() => h('span')));
  const nombreEl = h('p', { class: 'fase-nombre' });
  const salir = h('button', { class: 'icono-boton', type: 'button', 'aria-label': 'Salir de la lección', onclick: () => cerrar() }, '✕');
  const cuerpo = h('main', { class: 'leccion-cuerpo', id: 'contenido' });
  const pie = h('div', { class: 'dentro' });
  const contenedor = h('div', { class: 'leccion', style: `--c: ${info.color}` },
    h('div', { class: 'leccion-barra' }, salir, fasesEl),
    nombreEl,
    cuerpo,
    h('footer', { class: 'leccion-pie' }, pie));
  raiz.appendChild(contenedor);

  const opcionesEj = () => ({
    cuerpo, pie,
    datosGen: datosGeneradores(),
    datosVisual: { fechas: fechasPublicadas() },
    lecturas: tema.lecturas || [],
    leerAuto: estado.ajustes.voz.leerAuto,
    materia: info.materia,
    guardarEscrito: (texto, ej) => anotarEscrito({ tema: tema.id, enunciado: ej.enunciado, texto }),
  });

  function cerrar() {
    alSalir();
    detener();
    document.querySelectorAll('.retro').forEach((x) => x.remove());
    salidaDe(`#/tema/${tema.id}`);
  }
  const sigueViva = () => vivo && raiz.isConnected && contenedor.isConnected;

  function marcarFase(f) {
    const idx = FASES.indexOf(f);
    [...fasesEl.children].forEach((s, i) => {
      s.className = idx < 0 ? 'hecha' : i < idx ? 'hecha' : i === idx ? 'actual' : '';
    });
    nombreEl.textContent = nombreFase(f);
    window.scrollTo(0, 0);
  }

  function botonPie(texto, clase = '') {
    return new Promise((resolver) => {
      vaciar(pie);
      const b = h('button', { class: `boton grande ${clase}`, type: 'button', onclick: clicSeguro(() => resolver()) }, texto);
      pie.appendChild(b);
    });
  }

  // Muestra una pantalla con botones; resuelve con el valor del botón.
  function elegir(contenido, botones) {
    return new Promise((resolver) => {
      vaciar(cuerpo); vaciar(pie);
      window.scrollTo(0, 0);
      cuerpo.appendChild(contenido);
      // Audio del título y el mensaje de la pantalla de resultado
      const leer = [...contenido.querySelectorAll('h2, p')].map((x) => x.textContent).join('. ');
      if (leer) contenido.appendChild(h('div', { class: 'fila-audio', style: 'display:flex;justify-content:center;margin-top:8px' }, botonAudio(() => leer)));
      const elegido = clicSeguro((v) => resolver(v));
      const col = h('div', { class: 'acciones', style: 'width:100%' },
        botones.map((b) => h('button', { class: `boton grande ${b.clase || ''}`, type: 'button', onclick: () => elegido(b.valor) }, b.texto)));
      pie.appendChild(col);
      pie.parentElement.style.position = botones.length > 2 ? 'static' : '';
    });
  }

  function tarjeta({ texto, emoji, visual, audio }) {
    return h('div', { class: 'tarjeta tarjeta-explicacion' },
      emoji ? h('div', { class: 'emoji-grande', 'aria-hidden': 'true' }, emoji) : null,
      visual ? h('div', { class: 'visual-caja' }, renderVisual(visual, { fechas: fechasPublicadas() })) : null,
      rico(texto, 'p', { class: 'texto' }),
      h('div', { class: 'fila-audio' }, botonAudio(() => audio || texto)));
  }

  function puntos(n, i) {
    return h('div', { class: 'puntos-avance', 'aria-hidden': 'true' }, Array.from({ length: n }, (_, k) => h('span', { class: k <= i ? 'si' : '' })));
  }

  // Tarjetas con Atrás / Siguiente.
  async function carrusel(items, textoFinal) {
    let i = 0;
    while (sigueViva()) {
      vaciar(cuerpo);
      cuerpo.appendChild(tarjeta(items[i]));
      cuerpo.appendChild(puntos(items.length, i));
      if (estado.ajustes.voz.leerAuto && hayVoz()) hablar(items[i].audio || items[i].texto);
      const accion = await new Promise((resolver) => {
        vaciar(pie);
        const una = clicSeguro((v) => resolver(v));
        if (i > 0) pie.appendChild(h('button', { class: 'boton secundario', type: 'button', style: 'flex:0 0 auto;white-space:nowrap;padding-left:14px;padding-right:14px', onclick: () => una(-1) }, '← Atrás'));
        pie.appendChild(h('button', { class: 'boton grande', type: 'button', onclick: () => una(1) }, i === items.length - 1 ? textoFinal : 'Siguiente →'));
      });
      window.scrollTo(0, 0);
      detener();
      if (accion < 0) i--;
      else if (i === items.length - 1) return;
      else i++;
    }
  }

  // ---------- fases ----------
  async function faseExplicacion() {
    marcarFase('explicacion');
    await carrusel(tema.explicacion, '¡Entendido!');
    if (!sigueViva()) return;
    prog.vistos.explicacion = true;
    if (prog.estado === 'nuevo') prog.estado = 'en-curso';
    avanzarFase('ejemplo');
    guardar();
  }

  async function faseEjemplo() {
    marcarFase('ejemplo');
    const ej = tema.ejemplo;
    // «Mira cómo… Después, explora…»: la primera parte va con los pasos; la segunda, con el manipulable.
    const [verTexto, ...resto] = String(ej.instruccion).split(/\s*Después,\s*/);
    const luego = resto.join(' ').trim();
    const consignaExplorar = !ej.pasos || !ej.pasos.length ? ej.instruccion
      : luego ? luego.charAt(0).toUpperCase() + luego.slice(1) : '¡Ahora explora tú! Mueve, agrega y quita.';
    if (ej.pasos && ej.pasos.length) {
      const primero = ej.explorar && luego ? verTexto : ej.instruccion;
      const items = ej.pasos.map((p, k) => ({ ...p, texto: k === 0 ? `${primero} ${p.texto}` : p.texto }));
      await carrusel(items, ej.explorar ? 'Ahora yo →' : '¡Ya vi el ejemplo!');
    }
    if (ej.explorar && sigueViva()) {
      vaciar(cuerpo);
      window.scrollTo(0, 0);
      const m = crearManipulable(ej.explorar, { libre: true, alCambiar: () => {} });
      cuerpo.append(
        h('div', { class: 'enunciado' }, rico(consignaExplorar, 'div', { class: 'texto' }), botonAudio(() => consignaExplorar)),
        m.el);
      await botonPie('Terminé de explorar');
    }
    if (!sigueViva()) return;
    prog.vistos.ejemplo = true;
    avanzarFase('guiada');
    guardar();
  }

  async function faseGuiada() {
    marcarFase('guiada');
    const g = tema.guiada;
    vaciar(cuerpo);
    cuerpo.appendChild(tarjeta({ texto: g.intro || 'Vamos a hacerlo juntos, paso a paso.', emoji: '🤝' }));
    await botonPie('¡Vamos!');
    let aciertos = 0;
    for (const paso of g.pasos) {
      if (!sigueViva()) return;
      const res = await ejecutarEjercicio({ ...opcionesEj(), ejercicio: paso });
      registrarResultado(prog, { r: res.r, errores: res.errores, ejercicioId: paso.id, fase: 'guiada' });
      aciertos += res.r;
      guardar();
    }
    prog.vistos.guiada = true;
    avanzarFase('practica');
    guardar();
    anotarRegistro({ tema: tema.id, modo: 'guiada', aciertos, total: g.pasos.length });
  }

  async function mostrarRepaso() {
    const rep = tema.repaso;
    vaciar(cuerpo);
    const t = tarjeta({ texto: rep.texto, emoji: '🔁', visual: rep.visual, audio: rep.audio });
    t.classList.add('repaso-caja');
    cuerpo.append(h('h2', { style: 'text-align:center' }, 'Recordemos'), t);
    await botonPie('Seguir practicando');
  }

  async function fasePractica(enfoque = []) {
    marcarFase('practica');
    const sesion = nuevaSesionPractica(prog, { enfoque });
    let aciertos = 0;
    registroPendiente = { tema: tema.id, modo: 'practica', aciertos: 0, total: 0 };
    try {
      while (sigueViva()) {
        const sel = elegirPractica(tema, prog, sesion);
        if (!sel) break;
        nombreEl.textContent = `${nombreFase('practica')} · ${Math.round(avancePractica(sesion) * 100)} %`;
        const res = await ejecutarEjercicio({ ...opcionesEj(), ejercicio: sel.ejercicio, desafio: sel.ejercicio.nivel === 3 });
        if (!sigueViva()) return 'salir';
        registrarResultado(prog, { r: res.r, errores: res.errores, ejercicioId: sel.ejercicio.id, fase: 'practica' });
        aciertos += res.r;
        registroPendiente = { tema: tema.id, modo: 'practica', aciertos, total: sesion.resultados.length + 1 };
        anotarSesionAbierta(registroPendiente);
        const { evento, mostrarRepaso: rep } = aplicarResultadoPractica(sesion, prog, { id: sel.ejercicio.id, nivel: sel.ejercicio.nivel, r: res.r });
        guardar();
        if (evento === 'sube' && !practicaSuficiente(sesion)) aviso('⭐ ¡Vienen ejercicios un poco más desafiantes!');
        if (rep) await mostrarRepaso();
        if (practicaSuficiente(sesion)) {
          prog.vistos.practica = true;
          avanzarFase('comprobacion');
          guardar();
          const v = await elegir(
            h('div', { class: 'resultado' }, h('div', { class: 'grande celebra', 'aria-hidden': 'true' }, '🙌'),
              h('h2', {}, '¡Practicaste muy bien!'), h('p', {}, 'Ya puedes demostrar lo que aprendiste.')),
            [{ texto: 'Ir a demostrar lo que sé', valor: 'comprobar' }, { texto: 'Practicar un poco más', valor: 'mas', clase: 'secundario' }]);
          if (v === 'comprobar') return 'comprobar';
          sesion.resultados = sesion.resultados.slice(-2);
          continue;
        }
        if (practicaAgotada(sesion)) {
          const v = await elegir(
            h('div', { class: 'resultado' }, h('div', { class: 'grande', 'aria-hidden': 'true' }, '🌱'),
              h('h2', {}, '¡Hoy practicaste mucho!'),
              h('p', {}, 'Aprender lleva tiempo. Puedes volver a mirar la explicación, seguir practicando o descansar y seguir otro día.')),
            [{ texto: 'Ver la explicación otra vez', valor: 'explicacion' }, { texto: 'Seguir practicando', valor: 'seguir', clase: 'secundario' }, { texto: 'Descansar', valor: 'salir', clase: 'suave' }]);
          pie.parentElement.style.position = '';
          if (v === 'explicacion') return 'explicacion';
          if (v === 'salir') return 'salir';
          sesion.resultados = [];
          sesion.nivel = Math.max(1, sesion.nivel);
        }
      }
      return 'salir';
    } finally {
      if (sigueViva()) anotarPendiente();
      pie.parentElement.style.position = '';
    }
  }

  async function correrSerie(items, titulo, intro) {
    vaciar(cuerpo);
    cuerpo.appendChild(tarjeta({ texto: intro, emoji: titulo === 'desafio' ? '🏔️' : titulo === 'repaso' ? '🔁' : '🎯' }));
    await botonPie('¡Empezar!');
    const resultados = [];
    for (let k = 0; k < items.length; k++) {
      if (!sigueViva()) return null;
      nombreEl.textContent = `${nombreFase(titulo)} · ${k + 1} de ${items.length}`;
      const ej = items[k];
      const res = await ejecutarEjercicio({ ...opcionesEj(), ejercicio: ej, desafio: titulo === 'desafio' });
      if (!sigueViva()) return null;
      registrarResultado(prog, { r: res.r, errores: res.errores, ejercicioId: ej.id, fase: titulo });
      resultados.push({ r: res.r, error: res.errores[0] || null });
      guardar();
    }
    return resultados;
  }

  function estrellas(resultados) {
    return h('div', { class: 'estrellas', 'aria-label': `${resultados.filter((x) => x.r === 1).length} estrellas` },
      resultados.map((x) => h('span', { class: x.r === 1 ? '' : x.r > 0 ? '' : 'apagada' }, x.r === 1 ? '⭐' : x.r > 0 ? '✨' : '⭐')));
  }

  async function faseComprobacion() {
    marcarFase('comprobacion');
    // Si ya la intentó, se prefieren ejercicios distintos a los del intento anterior.
    const items = elegirComprobacion(tema, undefined, prog.ultimaComprobacion || []);
    const res = await correrSerie(items, 'comprobacion', `¡Demuestra lo que aprendiste! Son ${items.length} preguntas. Si te equivocas, tendrás una pista.`);
    if (!res) return 'salir';
    prog.ultimaComprobacion = items.filter((e) => e.tipo !== 'generador').map((e) => e.id);
    const hoy = hoyISO();
    const { logrado, enfoque } = aplicarComprobacion(prog, res, hoy);
    guardar(true);
    anotarRegistro({ tema: tema.id, modo: 'comprobacion', aciertos: res.reduce((a, x) => a + x.r, 0), total: res.length, logrado });
    if (logrado) {
      const v = await elegir(
        h('div', { class: 'resultado' },
          h('div', { class: 'grande celebra', 'aria-hidden': 'true' }, '🏆'),
          h('h2', {}, '¡Lo lograste!'), estrellas(res),
          h('p', {}, `Aprendiste: ${info.titulo}.`),
          h('p', { style: 'color:var(--tinta-suave)' }, 'Este tema volverá en unos días para un repaso rápido.')),
        [{ texto: 'Ir al mapa de temas', valor: 'mapa' }, { texto: 'Nuevo desafío', valor: 'desafio', clase: 'secundario' }]);
      return v;
    }
    const v = await elegir(
      h('div', { class: 'resultado' },
        h('div', { class: 'grande', 'aria-hidden': 'true' }, '💪'),
        h('h2', {}, '¡Buen esfuerzo!'), estrellas(res),
        h('p', {}, 'Vamos a practicar un poco más lo que te costó. Después podrás intentarlo otra vez.')),
      [{ texto: 'Practicar', valor: 'practicar' }, { texto: 'Volver a la explicación', valor: 'explicacion', clase: 'secundario' }]);
    return v === 'practicar' ? { practicar: enfoque } : v;
  }

  async function modoRepaso() {
    marcarFase('repaso');
    [...fasesEl.children].forEach((s) => { s.className = 'hecha'; });
    const res = await correerOrNull(elegirRepaso(tema), 'repaso', 'Repaso rápido: 4 preguntas de este tema que ya aprendiste.');
    if (!res) return;
    const { bien } = aplicarRepaso(prog, res, hoyISO());
    guardar(true);
    anotarRegistro({ tema: tema.id, modo: 'repaso', aciertos: res.reduce((a, x) => a + x.r, 0), total: res.length });
    const v = await elegir(
      h('div', { class: 'resultado' }, h('div', { class: 'grande celebra', 'aria-hidden': 'true' }, bien ? '🌟' : '🔁'),
        h('h2', {}, bien ? '¡Lo recuerdas muy bien!' : 'Vamos a practicar un poquito más'), estrellas(res),
        h('p', {}, bien ? 'Este tema volverá más adelante para otro repaso.' : 'Practicar un poco más te ayudará a recordarlo.')),
      bien ? [{ texto: 'Volver al inicio', valor: 'inicio' }] : [{ texto: 'Practicar', valor: 'practicar' }, { texto: 'Más tarde', valor: 'inicio', clase: 'secundario' }]);
    if (v === 'practicar') { await flujoDesde('practica'); return; }
    salidaDe('#/inicio');
  }

  async function correerOrNull(items, titulo, intro) {
    if (!items.length) { aviso('Este tema no tiene ejercicios para esto.'); return null; }
    return correrSerie(items, titulo, intro);
  }

  async function modoDesafio() {
    marcarFase('desafio');
    [...fasesEl.children].forEach((s) => { s.className = 'hecha'; });
    const res = await correerOrNull(elegirDesafio(tema), 'desafio', '¡Nuevo desafío! Ejercicios más difíciles de este tema. ¡Tú puedes!');
    if (!res) return;
    prog.desafios = (prog.desafios || 0) + 1;
    guardar(true);
    anotarRegistro({ tema: tema.id, modo: 'desafio', aciertos: res.reduce((a, x) => a + x.r, 0), total: res.length });
    const v = await elegir(
      h('div', { class: 'resultado' }, h('div', { class: 'grande celebra', 'aria-hidden': 'true' }, '🏔️'),
        h('h2', {}, '¡Completaste el desafío!'), estrellas(res)),
      [{ texto: 'Otro desafío', valor: 'otro' }, { texto: 'Ir al mapa de temas', valor: 'mapa', clase: 'secundario' }]);
    if (v === 'otro') return modoDesafio();
    salidaDe(`#/materia/${info.materia}`);
  }

  // Recorre las fases desde «inicio».
  async function flujoDesde(inicio, enfoque = []) {
    let fase = inicio;
    while (sigueViva()) {
      if (fase === 'explicacion') { await faseExplicacion(); fase = 'ejemplo'; continue; }
      if (fase === 'ejemplo') {
        await faseEjemplo();
        fase = prog.fase === 'comprobacion' && prog.estado !== 'logrado' ? 'comprobacion' : prog.vistos.guiada ? 'practica' : 'guiada';
        continue;
      }
      if (fase === 'guiada') { await faseGuiada(); fase = 'practica'; continue; }
      if (fase === 'practica') {
        const r = await fasePractica(enfoque);
        enfoque = [];
        if (r === 'comprobar') { fase = 'comprobacion'; continue; }
        if (r === 'explicacion') { fase = 'explicacion'; continue; }
        if (sigueViva()) salidaDe(`#/tema/${tema.id}`);
        return;
      }
      if (fase === 'comprobacion') {
        const r = await faseComprobacion();
        if (r && r.practicar) { enfoque = r.practicar; fase = 'practica'; continue; }
        if (r === 'explicacion') { fase = 'explicacion'; continue; }
        if (r === 'desafio') { await modoDesafio(); return; }
        if (sigueViva()) salidaDe(`#/materia/${info.materia}`);
        return;
      }
      return;
    }
  }

  try {
    if (modo === 'repaso') await modoRepaso();
    else if (modo === 'desafio') await modoDesafio();
    else if (FASES.includes(modo)) await flujoDesde(modo);
    else {
      const inicio = !prog.vistos.explicacion ? 'explicacion' : FASES.includes(prog.fase) ? prog.fase : 'practica';
      await flujoDesde(inicio === 'comprobacion' && prog.estado === 'logrado' ? 'practica' : inicio);
    }
  } catch (e) {
    console.error(e);
    if (sigueViva()) {
      vaciar(cuerpo);
      cuerpo.appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, 'Algo no funcionó'), h('p', {}, 'Tu avance está guardado. Vuelve a intentarlo.')));
      vaciar(pie);
      pie.appendChild(h('button', { class: 'boton grande', onclick: () => salidaDe('#/inicio') }, 'Ir al inicio'));
    }
  }
  void mostrarRetro;
}
