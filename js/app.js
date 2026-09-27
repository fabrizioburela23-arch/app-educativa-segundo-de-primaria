// Punto de entrada: carga el estado y el contenido, y dirige las pantallas (#/ruta).
import { h, vaciar, aviso } from './ui/dom.js';
import { cargarEstado, obtener, pedirPersistencia, recuperarSesionAbierta, alCambiarDesdeOtraVentana } from './estado.js';
import { cargarBase, buscarTema, cargarTema, datosGeneradores, fechasPublicadas } from './contenido/cargar.js';
import { iniciarVoz, detener } from './audio/voz.js';
import { pantallaInicio, pantallaMateria, pantallaTema, pantallaAcerca } from './ui/pantallas.js';
import { pantallaAdulto, pantallaRevisar, bloquearAdulto } from './ui/adulto.js';
import { abrirLeccion } from './motor/leccion.js';
import { ejecutarEjercicio } from './motor/ejecutar.js';

const raiz = document.getElementById('app');
let enLinea = navigator.onLine;
window.addEventListener('online', () => { enLinea = true; });
window.addEventListener('offline', () => { enLinea = false; });

// navegar('#/ruta'); con { reemplazar: true } la pantalla actual no queda en el historial
// (así el botón Atrás de Android no vuelve a abrir una lección que ya se cerró).
export function navegar(hash, opciones = false) {
  const forzar = opciones === true || (opciones && opciones.forzar);
  const reemplazar = opciones && opciones.reemplazar;
  if (location.hash === hash) { if (forzar) rutear(); return; }
  if (reemplazar) {
    history.replaceState(null, '', hash);
    rutear();
  } else location.hash = hash;
}

function limpiarPantalla() {
  detener();
  document.querySelectorAll('.retro, .modal-fondo, .toast, .arrastrando').forEach((x) => x.remove());
  window.dispatchEvent(new Event('pantalla-cambia'));
}

const esErrorDeRed = (e) => !navigator.onLine || e instanceof TypeError;

let rutaActual = 'inicio';

async function rutear() {
  limpiarPantalla();
  const partes = (location.hash.replace(/^#\/?/, '') || 'inicio').split('/');
  const [ruta, a, b] = partes;
  rutaActual = ruta;
  // Al salir del área de adultos se vuelve a pedir el PIN.
  if (ruta !== 'adulto' && ruta !== 'revisar') bloquearAdulto();
  const ctx = { navegar, enLinea: () => enLinea };
  document.documentElement.classList.toggle('modo-adulto', ruta === 'adulto' || ruta === 'revisar');
  try {
    switch (ruta) {
      case 'materia': pantallaMateria(raiz, { ...ctx, id: a }); break;
      case 'tema': {
        let tema = null;
        let sinConexion = false;
        try { tema = await cargarTema(a); } catch (e) { sinConexion = esErrorDeRed(e); }
        pantallaTema(raiz, { ...ctx, id: a, temaCargado: tema, sinConexion });
        break;
      }
      case 'leccion': {
        const info = buscarTema(a);
        if (!info) { navegar('#/inicio', { reemplazar: true }); return; }
        let tema;
        try { tema = await cargarTema(a); } catch (e) { navegar(`#/tema/${a}`, { reemplazar: true }); return; }
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
      h('h2', {}, 'Algo no funcionó'), h('p', {}, 'Tu avance está guardado. Vuelve a intentarlo.'),
      h('button', { class: 'boton', onclick: () => navegar('#/inicio', { forzar: true, reemplazar: true }) }, 'Ir al inicio'))));
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
    materia: info?.materia,
    desafio: ejercicio.nivel === 3,
  }).then((res) => {
    if (!cuerpo.isConnected) return;
    volver();
    aviso(`Resultado: ${res.r === 1 ? 'correcto al primer intento' : res.r === 0.5 ? 'correcto al segundo intento' : 'resuelto con ayuda'}`);
  });
}

async function iniciar() {
  const estado = cargarEstado();
  recuperarSesionAbierta();
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
  // Si otra ventana de la app guardó cambios, se actualizan las pantallas que solo muestran datos.
  alCambiarDesdeOtraVentana(() => { if (['inicio', 'materia', 'tema', ''].includes(rutaActual)) rutear(); });
  await rutear();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline */ });
  }
  if (obtener().registro.length > 3) pedirPersistencia();
}

iniciar();
