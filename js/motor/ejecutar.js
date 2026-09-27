// Ejecuta UN ejercicio con su ciclo de retroalimentación:
// 1.er error → pista y otro intento; 2.º error → explicación y respuesta correcta.
// Resuelve con { r: 1 | 0.5 | 0, errores: [...], respuesta, ejercicio }.

import { h, vaciar, rico, aviso } from '../ui/dom.js';
import { renderEjercicio } from '../ejercicios/index.js';
import { renderVisual } from '../visuales/visual.js';
import { generar } from '../contenido/generadores.js';
import { hablar, hayVoz, hayVozEspanol, detener } from '../audio/voz.js';
import { textoOpcion } from '../contenido/texto.js';

const BIEN = ['¡Muy bien!', '¡Excelente!', '¡Lo lograste!', '¡Así se hace!', '¡Bien pensado!', '¡Genial!'];
const BIEN_2 = ['¡Bien! Lo corregiste.', '¡Muy bien! Lo pensaste otra vez y lo lograste.', '¡Eso es! Aprender es intentar de nuevo.'];
const azar = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function botonAudio(obtenerTexto, etiqueta = 'Escuchar') {
  const b = h('button', { class: 'icono-boton boton-audio', type: 'button', 'aria-label': etiqueta, title: etiqueta }, '🔊');
  if (!hayVoz()) b.setAttribute('aria-disabled', 'true');
  b.addEventListener('click', async () => {
    if (!hayVoz()) { aviso('Este teléfono no tiene voz para leer en voz alta. Pide a un adulto que te lea.'); return; }
    if (b.classList.contains('hablando')) { detener(); return; }
    const ok = await hablar(obtenerTexto(), { boton: b });
    if (!ok && !b.isConnected) return;
    if (!ok) aviso('No se pudo reproducir el audio en este teléfono.');
  });
  return b;
}

// Panel de retroalimentación. Devuelve una promesa que se resuelve al tocar el botón.
export function mostrarRetro({ clase, icono, titulo, mensaje, boton }) {
  document.querySelectorAll('.retro').forEach((x) => x.remove());
  return new Promise((resolver) => {
    const b = h('button', { class: 'boton grande', type: 'button' }, boton);
    const caja = h('section', { class: `retro ${clase}`, role: 'alertdialog', 'aria-live': 'assertive', 'aria-label': titulo },
      h('div', { class: 'dentro' },
        h('div', { class: 'titulo' }, h('span', { class: 'ic', 'aria-hidden': 'true' }, icono), titulo),
        mensaje ? h('div', { class: 'mensaje' }, rico(mensaje, 'div', { class: 'txt' }), botonAudio(() => `${titulo}. ${mensaje}`)) : null,
        b));
    const t0 = performance.now();
    const cuerpo = document.querySelector('.leccion-cuerpo');
    b.addEventListener('click', () => {
      // Un doble toque en «Comprobar» no debe cerrar la pista antes de verla.
      if (performance.now() - t0 < 450) return;
      detener();
      caja.remove();
      if (cuerpo) cuerpo.style.paddingBottom = '';
      resolver();
    });
    document.body.appendChild(caja);
    b.focus({ preventScroll: true });
    // Que el panel no tape la respuesta: se deja espacio debajo y se sube lo necesario.
    if (cuerpo) {
      const alto = caja.offsetHeight;
      cuerpo.style.paddingBottom = `${alto + 16}px`;
      const zona = cuerpo.querySelector('.zona-ejercicio');
      if (zona) {
        const r = zona.getBoundingClientRect();
        const tope = window.innerHeight - alto - 8;
        if (r.bottom > tope) window.scrollBy({ top: Math.min(r.bottom - tope, Math.max(0, r.top - 70)), behavior: 'smooth' });
      }
    }
  });
}

function avisoSinVoz(texto, titulo = '🔇 Este teléfono no tiene voz en español para leer. ') {
  const det = h('details', {}, h('summary', {}, 'Mostrar el texto (para que un adulto lo lea en voz alta)'), h('p', { style: 'font-size:1.3rem;font-weight:700;margin-top:6px' }, texto));
  return h('div', { class: 'aviso-audio', role: 'note' },
    h('strong', {}, titulo),
    'Pide a un adulto que te lea el texto sin mostrártelo.', det);
}

function cajaEscuchar(texto) {
  if (!hayVoz() || !hayVozEspanol()) return avisoSinVoz(texto);
  const caja = h('div', { class: 'escuchar-caja' });
  let avisado = false;
  const reproducir = async (boton, velocidad) => {
    const ok = await hablar(texto, { boton, velocidad });
    if (!ok && caja.isConnected && !avisado) {
      avisado = true;
      caja.appendChild(avisoSinVoz(texto, '🔇 No se pudo reproducir el audio. '));
    }
  };
  const b = h('button', { class: 'boton suave', type: 'button', onclick: () => reproducir(b, 0.8) }, h('span', { class: 'emoji', 'aria-hidden': 'true' }, '🔊'), 'Escuchar');
  const lento = h('button', { class: 'boton secundario pequeno', type: 'button', onclick: () => reproducir(b, 0.6) }, '🐢 Más despacio');
  caja.append(b, lento);
  return caja;
}

// Texto que lee el 🔊 del enunciado. En opciones con frases, se leen también las opciones
// (salvo en Comunicación, donde leer las opciones puede ser parte de lo que se evalúa).
function textoAudioEnunciado(ej, materia) {
  const base = ej.audio || ej.enunciado;
  if (!['opcion', 'multiple'].includes(ej.tipo) || ej.escuchar) return base;
  const leer = ej.leerOpciones === true || (ej.leerOpciones !== false && materia !== 'comunicacion');
  const textos = (ej.opciones || []).map(textoOpcion).filter((t) => t && t.length > 1);
  if (!leer || textos.length < 2) return base;
  return `${base} Opciones: ${textos.join('. ')}.`;
}

function cajaLectura(lectura) {
  const cuerpo = h('div', { class: 'cuerpo' }, lectura.parrafos.map((p) => rico(p, 'p')));
  const det = h('details', { class: 'lectura', open: true },
    h('summary', {}, h('span', { 'aria-hidden': 'true' }, lectura.emoji || '📖'), h('span', { style: 'flex:1' }, lectura.titulo),
      botonAudio(() => `${lectura.titulo}. ${lectura.parrafos.join(' ')}`, 'Escuchar la lectura')),
    cuerpo);
  return det;
}

export async function ejecutarEjercicio(opts) {
  let ej = opts.ejercicio;
  if (ej.tipo === 'generador') ej = generar(ej, Math.random, opts.datosGen);
  if (ej.tipo === 'pasos') return ejecutarPasos(opts, ej);
  const res = await ejecutarSimple(opts, ej, {});
  return { ...res, ejercicio: ej };
}

async function ejecutarPasos(opts, ej) {
  const hechos = [];
  const errores = [];
  let suma = 0;
  for (let i = 0; i < ej.pasos.length; i++) {
    const paso = { ...ej.pasos[i] };
    const res = await ejecutarSimple(opts, paso, { contexto: ej, numero: i + 1, total: ej.pasos.length, hechos });
    if (res.cancelado) return res;
    suma += res.r;
    errores.push(...res.errores);
    const valor = paso.tipo === 'numero' && res.respuesta ? `${paso.prefijo || ''}${res.respuesta}${paso.sufijo ? ` ${paso.sufijo}` : ''}` : '';
    hechos.push(`Paso ${i + 1}: ${res.r > 0 ? (valor || 'resuelto') : `lo revisamos juntos${valor ? ` (${valor})` : ''}`}`);
  }
  const r = suma / ej.pasos.length;
  return { r: r >= 1 ? 1 : r >= 0.5 ? 0.5 : 0, errores, respuesta: hechos.join('; '), ejercicio: ej };
}

function ejecutarSimple(opts, ej, { contexto, numero, total, hechos }) {
  const { cuerpo, pie } = opts;
  vaciar(cuerpo);
  vaciar(pie);
  document.querySelectorAll('.retro').forEach((x) => x.remove());
  cuerpo.style.paddingBottom = '';
  window.scrollTo(0, 0);

  if (contexto) {
    cuerpo.appendChild(h('div', { class: 'contexto-problema' },
      h('div', { class: 'enunciado', style: 'margin:0' }, rico(contexto.enunciado, 'div', { class: 'txt', style: 'flex:1' }), botonAudio(() => contexto.enunciado)),
      contexto.visual ? h('div', { class: 'visual-caja' }, renderVisual(contexto.visual, opts.datosVisual)) : null));
    cuerpo.appendChild(h('span', { class: 'chip ayuda paso-contador' }, `Paso ${numero} de ${total}`));
    if (hechos && hechos.length) cuerpo.appendChild(h('div', { class: 'pasos-hechos' }, hechos.map((x) => h('div', {}, `✓ ${x}`))));
  }
  if (opts.desafio && !contexto) cuerpo.appendChild(h('div', { class: 'insignia-desafio' }, '⭐ Desafío'));
  if (ej.apoyo) cuerpo.appendChild(h('div', { class: 'apoyo' }, h('span', { class: 'ic', 'aria-hidden': 'true' }, '💡'), rico(ej.apoyo, 'div', { style: 'flex:1' }), botonAudio(() => ej.apoyo, 'Escuchar la ayuda')));
  const textoEnunciado = textoAudioEnunciado(ej, opts.materia);
  cuerpo.appendChild(h('div', { class: 'enunciado' }, rico(ej.enunciado, 'div', { class: 'texto' }), botonAudio(() => textoEnunciado)));
  if (ej.lectura && opts.lecturas) {
    const lec = opts.lecturas.find((l) => l.id === ej.lectura);
    if (lec) cuerpo.appendChild(cajaLectura(lec));
  }
  if (ej.escuchar) cuerpo.appendChild(cajaEscuchar(ej.escuchar));
  if (ej.visual) cuerpo.appendChild(h('div', { class: 'visual-caja' }, renderVisual(ej.visual, opts.datosVisual)));
  const zona = h('div', { class: 'zona-ejercicio' });
  cuerpo.appendChild(zona);

  return new Promise((resolver) => {
    let intento = 1;
    const errores = [];
    let terminado = false;
    const comprobar = h('button', { class: 'boton grande', type: 'button', disabled: true }, 'Comprobar');
    pie.appendChild(comprobar);

    const ctx = {
      alCambiar: () => { comprobar.disabled = !ctrl.listo(); },
      enviar: () => { if (!comprobar.disabled) comprobar.click(); },
      alTerminar: async ({ r, respuesta }) => {
        if (terminado) return;
        terminado = true;
        ctrl.bloquear();
        vaciar(pie);
        await mostrarRetro({ clase: 'bien', icono: '🎉', titulo: azar(BIEN), mensaje: ej.explicacion, boton: 'Continuar' });
        resolver({ r, errores, respuesta });
      },
      guardarEscrito: (texto) => opts.guardarEscrito && opts.guardarEscrito(texto, ej),
      datosVisual: opts.datosVisual,
    };
    let ctrl;
    try {
      ctrl = renderEjercicio(zona, ej, ctx);
    } catch (e) {
      zona.appendChild(h('p', { class: 'aviso-audio' }, `No se pudo mostrar este ejercicio (${e.message}).`));
      comprobar.textContent = 'Continuar';
      comprobar.disabled = false;
      comprobar.addEventListener('click', () => resolver({ r: 1, errores: [], respuesta: '', omitido: true }));
      return;
    }
    // Gancho para las pruebas automáticas (solo lectura del ejercicio actual).
    window.__aprendoPrueba = { ejercicio: ej, ctrl, ctx };
    if (ctrl.autoCompleta) comprobar.classList.add('oculto');
    if (ctrl.enfocar) setTimeout(() => ctrl.enfocar(), 50);
    if (opts.leerAuto && hayVoz()) hablar(ej.escuchar ? `${textoEnunciado}. ${ej.escuchar}` : textoEnunciado);

    comprobar.addEventListener('click', async () => {
      if (terminado || !ctrl.listo()) return;
      detener();
      const res = ctrl.evaluar();
      comprobar.disabled = true;
      if (res.correcto) {
        terminado = true;
        ctrl.bloquear();
        const titulo = intento === 1 ? azar(BIEN) : azar(BIEN_2);
        const mensaje = [res.nota, intento === 1 && opts.explicarSiempre ? ej.explicacion : ''].filter(Boolean).join(' ');
        pie.classList.add('oculto');
        await mostrarRetro({ clase: 'bien', icono: intento === 1 ? '🌟' : '👍', titulo, mensaje, boton: 'Continuar' });
        pie.classList.remove('oculto');
        resolver({ r: intento === 1 ? 1 : 0.5, errores, respuesta: res.respuesta });
        return;
      }
      errores.push(res.error || ej.error);
      if (intento === 1) {
        intento = 2;
        pie.classList.add('oculto');
        await mostrarRetro({ clase: 'pista', icono: '💡', titulo: 'Casi. Mira esta pista:', mensaje: res.pista || ej.pista, boton: 'Intentar otra vez' });
        pie.classList.remove('oculto');
        ctrl.prepararReintento(res);
        comprobar.disabled = !ctrl.listo();
        if (ctrl.enfocar) ctrl.enfocar();
        return;
      }
      terminado = true;
      ctrl.bloquear();
      ctrl.mostrarSolucion();
      pie.classList.add('oculto');
      await mostrarRetro({ clase: 'juntos', icono: '🤝', titulo: 'Veamos juntos:', mensaje: ej.explicacion, boton: 'Continuar' });
      pie.classList.remove('oculto');
      resolver({ r: 0, errores, respuesta: res.respuesta });
    });
  });
}
