// Punto de entrada: carga el estado y el contenido, y dirige las pantallas (#/ruta).
import { h, vaciar, aviso } from './ui/dom.js';
import { cargarEstado, obtener, pedirPersistencia } from './estado.js';
import { cargarBase, buscarTema, cargarTema, datosGeneradores, fechasPublicadas } from './contenido/cargar.js';
import { iniciarVoz, detener } from './audio/voz.js';
import { pantallaInicio, pantallaMateria, pantallaTema, pantallaAcerca } from './ui/pantallas.js';
import { pantallaAdulto, pantallaRevisar } from './ui/adulto.js';
import { abrirLeccion } from './motor/leccion.js';
import { ejecutarEjercicio } from './motor/ejecutar.js';

const raiz = document.getElementById('app');
let enLinea = navigator.onLine;
window.addEventListener('online', () => { enLinea = true; });
window.addEventListener('offline', () => { enLinea = false; });

export function navegar(hash, forzar = false) {
  if (location.hash === hash && forzar) rutear();
  else location.hash = hash;
}

function limpiarPantalla() {
  detener();
  document.querySelectorAll('.retro, .modal-fondo, .toast').forEach((x) => x.remove());
  window.dispatchEvent(new Event('pantalla-cambia'));
}

async function rutear() {
  limpiarPantalla();
  const partes = (location.hash.replace(/^#\/?/, '') || 'inicio').split('/');
  const [ruta, a, b] = partes;
  const ctx = { navegar, enLinea: () => enLinea };
  document.documentElement.classList.toggle('modo-adulto', ruta === 'adulto' || ruta === 'revisar');
  try {
    switch (ruta) {
      case 'materia': pantallaMateria(raiz, { ...ctx, id: a }); break;
      case 'tema': {
        let tema = null;
        try { tema = await cargarTema(a); } catch { tema = null; }
        pantallaTema(raiz, { ...ctx, id: a, temaCargado: tema });
        break;
      }
      case 'leccion': {
        const info = buscarTema(a);
        if (!info) { navegar('#/inicio'); return; }
        let tema;
        try { tema = await cargarTema(a); } catch { aviso('Este tema todavía no tiene lecciones.'); navegar(`#/tema/${a}`); return; }
        await abrirLeccion(raiz, { tema, info, modo: b || 'normal', navegar });
        break;
      }
      case 'adulto': pantallaAdulto(raiz, { ...ctx, pestana: a || 'progreso' }); break;
      case 'revisar': await pantallaRevisar(raiz, { ...ctx, id: a, fuente: b, ejecutarEjercicioAislado }); break;
      case 'acerca': pantallaAcerca(raiz, ctx); break;
      default: pantallaInicio(raiz, ctx);
    }
  } catch (e) {
    console.error(e);
    vaciar(raiz);
    raiz.appendChild(h('main', { class: 'pantalla' }, h('div', { class: 'tarjeta' },
      h('h2', {}, 'Algo no funcionó'), h('p', {}, 'Tu avance está guardado.'), h('p', { class: 'nota' }, String(e.message || e)),
      h('button', { class: 'boton', onclick: () => navegar('#/inicio', true) }, 'Ir al inicio'))));
  }
}

// Prueba un ejercicio suelto (vista del adulto). No cuenta en el progreso.
function ejecutarEjercicioAislado(tema, ejercicio, volver) {
  limpiarPantalla();
  vaciar(raiz);
  const info = buscarTema(tema.id);
  const cuerpo = h('main', { class: 'leccion-cuerpo' });
  const pie = h('div', { class: 'dentro' });
  raiz.appendChild(h('div', { class: 'leccion', style: `--c:${info?.color || '#1F7A70'}` },
    h('div', { class: 'leccion-barra' }, h('button', { class: 'icono-boton', type: 'button', 'aria-label': 'Volver', onclick: () => { limpiarPantalla(); volver(); } }, '✕'),
      h('span', { class: 'barra-titulo' }, 'Vista previa (no cuenta en el progreso)')),
    cuerpo, h('footer', { class: 'leccion-pie' }, pie)));
  ejecutarEjercicio({
    cuerpo, pie, ejercicio,
    datosGen: datosGeneradores(),
    datosVisual: { fechas: fechasPublicadas() },
    lecturas: tema.lecturas || [],
    desafio: ejercicio.nivel === 3,
  }).then((res) => {
    if (!cuerpo.isConnected) return;
    aviso(`Resultado: ${res.r === 1 ? 'correcto al primer intento' : res.r === 0.5 ? 'correcto al segundo intento' : 'resuelto con ayuda'}`);
    volver();
  });
}

async function iniciar() {
  const estado = cargarEstado();
  iniciarVoz({ uri: estado.ajustes.voz.uri, velocidad: estado.ajustes.voz.velocidad });
  try {
    await cargarBase();
  } catch (e) {
    vaciar(raiz);
    raiz.appendChild(h('main', { class: 'pantalla' }, h('div', { class: 'tarjeta' },
      h('h2', {}, 'No se pudo abrir la app'),
      h('p', {}, 'Revisa la conexión a internet la primera vez que abres la app. Después funcionará sin conexión.'),
      h('button', { class: 'boton', onclick: () => location.reload() }, 'Intentar otra vez'))));
    return;
  }
  window.addEventListener('hashchange', rutear);
  await rutear();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline */ });
  }
  if (obtener().registro.length > 3) pedirPersistencia();
}

iniciar();
