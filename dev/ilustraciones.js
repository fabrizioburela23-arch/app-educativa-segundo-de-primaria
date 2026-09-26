// Galería de desarrollo: muestra todas las ilustraciones y cada parte resaltada,
// y avisa si falta un dibujo, una parte o si algún SVG no es XML válido.
import { ilustracion, ILUSTRACIONES_DISPONIBLES } from '../js/visuales/ilustraciones.js';
import { ILUSTRACIONES } from '../js/contenido/catalogo.js';

const params = new URLSearchParams(location.search);
const solo = params.get('solo');
const conVariantes = params.get('variantes') !== 'no';

const ids = Object.keys(ILUSTRACIONES);
const faltan = ids.filter((id) => !ILUSTRACIONES_DISPONIBLES.includes(id));
const sobran = ILUSTRACIONES_DISPONIBLES.filter((id) => !ids.includes(id));
const problemas = [];
if (faltan.length) problemas.push(`Faltan ${faltan.length}: ${faltan.join(', ')}.`);
if (sobran.length) problemas.push(`No están en el catálogo: ${sobran.join(', ')}.`);

// Navegación con controles de 48 px (se usa también en el celular).
const url = (cambios) => {
  const p = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(cambios)) {
    if (v === null) p.delete(k);
    else p.set(k, v);
  }
  const q = p.toString();
  return q ? `?${q}` : location.pathname;
};
const elegir = document.getElementById('elegir');
elegir.append(new Option('todas', ''));
for (const id of ids) elegir.append(new Option(ILUSTRACIONES[id].length ? `${id} (${ILUSTRACIONES[id].length} partes)` : id, id));
elegir.value = solo && ids.includes(solo) ? solo : '';
elegir.addEventListener('change', () => { location.href = url({ solo: elegir.value || null }); });
const enlaceVariantes = document.getElementById('variantes');
enlaceVariantes.textContent = conVariantes ? 'Solo la versión normal' : 'Ver todas las variantes';
enlaceVariantes.href = url({ variantes: conVariantes ? 'no' : null });

function figura(svg, texto) {
  const fig = document.createElement('figure');
  fig.className = 'variante';
  fig.innerHTML = svg;
  const cap = document.createElement('figcaption');
  cap.textContent = texto;
  fig.append(cap);
  return fig;
}

// Revisa el texto SVG antes de mostrarlo: XML válido, rol y etiqueta accesible,
// partes con nombre y copia resaltada.
function revisar(id, svg, que, parte) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return problemas.push(`${id} (${que}): SVG inválido.`);
  const raiz = doc.documentElement;
  if (raiz.getAttribute('role') !== 'img' || !raiz.getAttribute('aria-label')) problemas.push(`${id} (${que}): falta role="img" o aria-label.`);
  if (que === 'normal') {
    for (const p of ILUSTRACIONES[id]) {
      if (!doc.querySelector(`[data-parte="${p}"]`)) problemas.push(`${id}: falta la parte «${p}».`);
    }
  }
  if (parte && !doc.querySelector(`[data-parte="${parte}"][data-resaltada="true"]`)) problemas.push(`${id}: no se resalta «${parte}».`);
  return 0;
}

const lista = document.getElementById('lista');
for (const id of ids) {
  if (solo && solo !== id) continue;
  if (!ILUSTRACIONES_DISPONIBLES.includes(id)) continue;
  const ficha = document.createElement('section');
  ficha.className = 'muestra';
  ficha.id = id;
  const h2 = document.createElement('h2');
  h2.append(id, ' ', document.createElement('code'));
  ficha.append(h2);
  const cont = document.createElement('div');
  cont.className = 'variantes';
  const variantes = [[{}, 'normal (con etiquetas)', 'normal']];
  if (conVariantes) {
    for (const parte of ILUSTRACIONES[id]) variantes.push([{ resaltar: parte }, `resaltar: ${parte}`, 'resaltar', parte]);
    if (ILUSTRACIONES[id].length) {
      const p0 = ILUSTRACIONES[id][0];
      variantes.push([{ resaltar: p0, etiquetas: true }, `resaltar: ${p0} + etiquetas: true`, 'resaltar + etiquetas', p0]);
    }
    variantes.push([{ etiquetas: false }, 'etiquetas: false', 'sin etiquetas']);
  }
  for (const [opciones, texto, que, parte] of variantes) {
    const svg = ilustracion(id, opciones);
    revisar(id, svg, que, parte);
    cont.append(figura(svg, texto));
  }
  ficha.append(cont);
  lista.append(ficha);
  const svgEl = ficha.querySelector('svg');
  h2.querySelector('code').textContent = svgEl ? `aria-label: ${svgEl.getAttribute('aria-label')}` : '';
}

const resumen = document.getElementById('resumen');
resumen.textContent = problemas.length
  ? problemas.join(' ')
  : `Las ${ids.length} ilustraciones del catálogo están disponibles y sus SVG son válidos.`;
if (problemas.length) resumen.classList.add('mal');
window.__galeriaLista = true;
