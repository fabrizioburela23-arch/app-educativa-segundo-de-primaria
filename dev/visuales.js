// Galería de desarrollo: todos los visuales y manipulables.
import { h } from '../js/ui/dom.js';
import { renderVisual, textoAlternativo } from '../js/visuales/visual.js';
import { crearManipulable } from '../js/manipulables/index.js';

const VISUALES = {
  emoji: [
    { tipo: 'emoji', valor: '🦅' },
    { tipo: 'emoji', valor: '🧦', cantidad: 3, etiqueta: 'medias' },
    { tipo: 'emoji', valor: '🍊', cantidad: 7 },
    { tipo: 'emoji', valor: '🥚', cantidad: 13 },
    { tipo: 'emoji', valor: '🌽', cantidad: 30 },
    { tipo: 'emoji', valor: '🐤', cantidad: 0, etiqueta: 'cero pollitos' },
  ],
  emojis: [
    { tipo: 'emojis', items: ['👧', '🦙', '🥔', '🏫'], etiquetas: ['niña', 'llama', 'papa', 'escuela'] },
    { tipo: 'emojis', items: ['🍌', '🍊', '🍎'], etiquetas: ['3 Bs', '2 Bs', '1 Bs'] },
    { tipo: 'emojis', items: ['🐕', '🐈', '🦜', '🐢', '🐇', '🐓', '🦙', '🐑'] },
    { tipo: 'emojis', items: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪', '🟥', '🟧', '🟨'] },
  ],
  ilustracion: [
    { tipo: 'ilustracion', id: 'planta-partes' },
    { tipo: 'ilustracion', id: 'planta-partes', resaltar: 'flor' },
    { tipo: 'ilustracion', id: 'ciclo-agua' },
    { tipo: 'ilustracion', id: 'bandera-bolivia' },
  ],
  bloques: [
    { tipo: 'bloques', centenas: 2, decenas: 4, unidades: 3 },
    { tipo: 'bloques', decenas: 1, unidades: 3 },
    { tipo: 'bloques', centenas: 1 },
    { tipo: 'bloques', centenas: 2, decenas: 13, unidades: 4 },
    { tipo: 'bloques', decenas: 20 },
    { tipo: 'bloques', unidades: 20 },
    { tipo: 'bloques', centenas: 9, decenas: 9, unidades: 9 },
    { tipo: 'bloques', centenas: 20, decenas: 20, unidades: 20 },
    { tipo: 'bloques' },
  ],
  recta: [
    { tipo: 'recta', min: 0, max: 10 },
    { tipo: 'recta', min: 0, max: 20, marcar: [13] },
    { tipo: 'recta', min: 0, max: 100, paso: 10, marcar: [20], saltos: [[20, 30], [30, 40], [40, 50]] },
    { tipo: 'recta', min: 243, max: 247, paso: 1, marcar: [245], ocultar: [244, 246] },
    { tipo: 'recta', min: 300, max: 700, paso: 100, marcar: [500], ocultar: [400, 600] },
    { tipo: 'recta', min: 100, max: 120, paso: 1, saltos: [[102, 106], [106, 110]], ocultar: [110] },
    { tipo: 'recta', min: 0, max: 1000, paso: 100, saltos: [[0, 300]], ocultar: [300] },
    { tipo: 'recta', min: 0, max: 20, paso: 2, saltos: [[10, 4]] },
    // del contenido real
    { tipo: 'recta', min: 400, max: 500, paso: 10, marcar: [470], ocultar: [410, 420, 430, 440, 450, 460, 470, 480, 490] },
    { tipo: 'recta', min: 350, max: 365, paso: 1, marcar: [356, 362] },
    { tipo: 'recta', min: 44, max: 52, paso: 1, marcar: [48], saltos: [[48, 47], [48, 49]] },
    { tipo: 'recta', min: 0, max: 1, paso: 0.1 },
  ],
  fraccion: [
    { tipo: 'fraccion', forma: 'circulo', partes: 4, coloreadas: 1 },
    { tipo: 'fraccion', forma: 'circulo', partes: 3, coloreadas: 1, iguales: false },
    { tipo: 'fraccion', forma: 'rectangulo', partes: 6, coloreadas: 3 },
    { tipo: 'fraccion', forma: 'rectangulo', partes: 4, coloreadas: 0, iguales: false },
    { tipo: 'fraccion', forma: 'barra', partes: 8, coloreadas: 5 },
    { tipo: 'fraccion', forma: 'barra', partes: 2, coloreadas: 1, iguales: false },
    { tipo: 'fraccion', forma: 'circulo', partes: 12, coloreadas: 7 },
    { tipo: 'fraccion', forma: 'rectangulo', partes: 1, coloreadas: 1 },
  ],
  dinero: [
    { tipo: 'dinero', items: ['c10', 'c20', 'c50', 'm1', 'm2', 'm5'] },
    { tipo: 'dinero', items: ['b10', 'b20', 'b50', 'b100', 'b200'] },
    { tipo: 'dinero', items: ['m5', 'b20', 'c50', 'm2', 'c50', 'b10'] },
  ],
  reloj: [
    { tipo: 'reloj', hora: 12, minutos: 45 },
    { tipo: 'reloj', hora: 3, minutos: 30 },
    { tipo: 'reloj', hora: 9, minutos: 0 },
    { tipo: 'reloj', hora: 6, minutos: 5 },
    { tipo: 'reloj', hora: 11, minutos: 55 },
  ],
  grupos: [
    { tipo: 'grupos', grupos: 3, porGrupo: 4, emoji: '🍎' },
    { tipo: 'grupos', grupos: 5, porGrupo: 2, emoji: '🥚' },
    { tipo: 'grupos', grupos: 2, porGrupo: 10, emoji: '🍬' },
    { tipo: 'grupos', grupos: 10, porGrupo: 10, emoji: '🌽' },
    { tipo: 'grupos', grupos: 4, porGrupo: 0, emoji: '🍞' },
  ],
  arreglo: [
    { tipo: 'arreglo', filas: 3, columnas: 4, emoji: '🌻' },
    { tipo: 'arreglo', filas: 2, columnas: 5, emoji: '🟡' },
    { tipo: 'arreglo', filas: 10, columnas: 10, emoji: '🟡' },
    { tipo: 'arreglo', filas: 1, columnas: 7, emoji: '🥔' },
  ],
  pictograma: [
    {
      tipo: 'pictograma', titulo: 'Frutas que vendió Wara', icono: '🙂', escala: 1,
      datos: [{ etiqueta: 'plátanos', valor: 5, emoji: '🍌' }, { etiqueta: 'naranjas', valor: 3, emoji: '🍊' }, { etiqueta: 'manzanas', valor: 6, emoji: '🍎' }],
    },
    {
      tipo: 'pictograma', titulo: 'Libros leídos', icono: '📘', escala: 2,
      datos: [{ etiqueta: 'Kusi', valor: 7 }, { etiqueta: 'Ana', valor: 4 }, { etiqueta: 'Inti', valor: 9 }, { etiqueta: 'Nayra', valor: 1 }],
    },
    {
      tipo: 'pictograma', titulo: 'Animales de la granja', icono: '⭐', escala: 1,
      datos: [
        { etiqueta: 'llamas', valor: 12, emoji: '🦙' }, { etiqueta: 'ovejas', valor: 8, emoji: '🐑' },
        { etiqueta: 'gallinas', valor: 11, emoji: '🐓' }, { etiqueta: 'patos', valor: 2, emoji: '🦆' },
        { etiqueta: 'vacas', valor: 5, emoji: '🐄' }, { etiqueta: 'conejos', valor: 10, emoji: '🐇' },
      ],
    },
  ],
  tabla: [
    { tipo: 'tabla', columnas: ['C', 'D', 'U'], filas: [[2, 4, 3]] },
    { tipo: 'tabla', columnas: ['D', 'U'], filas: [[5, '?']] },
    { tipo: 'tabla', columnas: ['Producto', 'Precio', 'Cantidad', 'Total'], filas: [['papa', '5 Bs', 2, '?'], ['choclo', '2 Bs', 3, '6 Bs']] },
    // del contenido real
    { tipo: 'tabla', columnas: ['Al empezar', '1.ª hora', '2.ª hora', '3.ª hora', '4.ª hora'], filas: [['60', '?', '?', '?', '?']] },
    { tipo: 'tabla', columnas: ['Paisaje', '¿Cómo es?'], filas: [['Altiplano', 'alto y frío'], ['Valles', 'templado, entre montañas'], ['Llanos y Amazonía', 'tierra baja y calurosa, con ríos y selva'], ['Chaco', 'caluroso y seco, con plantas espinosas']] },
    { tipo: 'tabla', columnas: ['Propiedad', 'Ejemplo'], filas: [['Conmutativa', '3 + 5 = 5 + 3'], ['Asociativa', '(2 + 8) + 4 = 2 + (8 + 4)'], ['Elemento neutro', '7 + 0 = 7']] },
  ],
  calendario: [
    { tipo: 'calendario', mes: 9, anio: 2026, marcar: [21] },
    { tipo: 'calendario', mes: 2, anio: 2028, marcar: [1, 29] },
    { tipo: 'calendario', mes: 8, anio: 2026, marcar: [6], titulo: 'Fiestas patrias' },
  ],
  simetria: [
    { tipo: 'simetria', filas: 6, columnas: 6, celdas: [[0, 2], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 2], [4, 2], [5, 1]] },
    { tipo: 'simetria', filas: 4, columnas: 8, completa: true, celdas: [[0, 3], [0, 4], [1, 2], [1, 5], [2, 1], [2, 6], [3, 0], [3, 7]] },
    { tipo: 'simetria', filas: 10, columnas: 10, celdas: [[0, 4], [1, 3], [2, 2], [3, 1], [4, 0], [5, 0], [6, 1], [7, 2], [8, 3], [9, 4]] },
    // del contenido real: figura completa que NO es simétrica (para preguntar)
    { tipo: 'simetria', filas: 4, columnas: 6, completa: true, celdas: [[0, 0], [1, 0], [1, 1], [2, 2], [3, 1], [0, 3], [1, 3], [1, 4], [2, 5], [3, 4]] },
  ],
  regla: [
    { tipo: 'regla', longitud: 5, objeto: '✏️' },
    { tipo: 'regla', longitud: 12, objeto: '🥄' },
    { tipo: 'regla', longitud: 17, objeto: '🐛' },
    { tipo: 'regla', longitud: 1, objeto: '📎' },
    { tipo: 'regla', longitud: 20, objeto: '🍌' },
  ],
  balanza: [
    { tipo: 'balanza', izquierda: ['🍉'], derecha: ['🍎', '🍎'], inclinada: 'izquierda' },
    { tipo: 'balanza', izquierda: ['🪶'], derecha: ['🧱'], inclinada: 'derecha' },
    { tipo: 'balanza', izquierda: ['🍎', '🍎', '🍎'], derecha: ['🍐', '🍐', '🍐'], inclinada: 'no' },
    { tipo: 'balanza', izquierda: ['🥔', '🥔', '🥔', '🥔', '🥔', '🥔', '🥔'], derecha: ['🍞', '🍞', '🍞', '🍞', '🍞', '🍞', '🍞', '🍞', '🍞', '🍞'] },
  ],
  operacion: [
    { tipo: 'operacion', numeros: [34, 28], op: '+', vertical: true },
    { tipo: 'operacion', numeros: [305, 128], op: '-', vertical: true },
    { tipo: 'operacion', numeros: [125, 34, 8], op: '+', vertical: true },
    { tipo: 'operacion', numeros: [23, 3], op: '×', vertical: true },
    { tipo: 'operacion', numeros: [12, 3], op: '÷', vertical: true },
    { tipo: 'operacion', numeros: [3, 4], op: '×', vertical: false },
    { tipo: 'operacion', numeros: [15, 7], op: '-' },
    { tipo: 'operacion', numeros: [20, 5], op: '÷' },
    { tipo: 'operacion', numeros: [12, 5, 3], op: '+' },
  ],
  bandera: [
    { tipo: 'bandera', franjas: ['rojo', 'amarillo', 'verde'], etiqueta: 'Bolivia' },
    { tipo: 'bandera', franjas: ['#1F7A70', 'blanco', '#C94F28'], orientacion: 'vertical', etiqueta: 'Mi bandera inventada' },
    { tipo: 'bandera', franjas: ['rojo', 'naranja', 'amarillo', 'blanco', 'verde', 'azul', 'violeta'] },
  ],
  secuencia: [
    { tipo: 'secuencia', items: ['🔴', '🔵', '🔴', '🔵', '?'] },
    { tipo: 'secuencia', items: ['2', '4', '6', '8', '10'], oculto: 3 },
    { tipo: 'secuencia', items: ['45', '☐', '54'] },
    { tipo: 'secuencia', items: ['100', '200', '300', '400', '500', '600', '700', '800', '900', '?'] },
    { tipo: 'secuencia', items: ['356', '<', '362'] },
  ],
  fechas: [
    { tipo: 'fechas', filtro: 'civica' },
    { tipo: 'fechas', filtro: 'todas', mes: 9 },
    { tipo: 'fechas', filtro: 'departamental' },
    { tipo: 'fechas', filtro: 'conmemorativa', mes: 8 },
  ],
};

const MANIPULABLES = {
  bloques: [
    { cfg: { tipo: 'bloques', objetivo: 243, canonico: true } },
    { cfg: { tipo: 'bloques', objetivo: 132, canonico: true, inicial: { centenas: 0, decenas: 13, unidades: 2 } } },
    { cfg: { tipo: 'bloques' }, libre: true },
  ],
  recta: [
    { cfg: { tipo: 'recta', min: 0, max: 20, paso: 1, objetivo: 13 } },
    { cfg: { tipo: 'recta', min: 0, max: 100, paso: 10, objetivo: 70 } },
    { cfg: { tipo: 'recta', min: 0, max: 10 }, libre: true },
  ],
  fraccion: [
    { cfg: { tipo: 'fraccion', forma: 'circulo', partes: 4, objetivo: 3 } },
    { cfg: { tipo: 'fraccion', forma: 'rectangulo', partes: 6, objetivo: 2 } },
    { cfg: { tipo: 'fraccion', forma: 'barra', partes: 8, objetivo: 5 } },
    { cfg: { tipo: 'fraccion', forma: 'circulo', partes: 8 }, libre: true },
  ],
  dinero: [
    { cfg: { tipo: 'dinero', objetivo: 750, disponibles: ['c50', 'm1', 'm2', 'm5', 'b10'] } },
    { cfg: { tipo: 'dinero', objetivo: 3520, mostrarTotal: true } },
    { cfg: { tipo: 'dinero' }, libre: true },
  ],
  reloj: [
    { cfg: { tipo: 'reloj', objetivo: { hora: 3, minutos: 30 }, paso: 15 } },
    { cfg: { tipo: 'reloj', objetivo: { hora: 12, minutos: 45 }, paso: 5, inicial: { hora: 6, minutos: 0 } } },
    { cfg: { tipo: 'reloj' }, libre: true },
    // como en el contenido real (paso de 30 minutos)
    { cfg: { tipo: 'reloj', objetivo: { hora: 9, minutos: 0 }, paso: 30, inicial: { hora: 12, minutos: 0 } } },
  ],
  grupos: [
    { cfg: { tipo: 'grupos', grupos: 3, porGrupo: 4, emoji: '🍎' } },
    { cfg: { tipo: 'grupos', grupos: 4, emoji: '🥚' }, libre: true },
    { cfg: { tipo: 'grupos', grupos: 5, porGrupo: 3, emoji: '🍊' } },
  ],
  repartir: [
    { cfg: { tipo: 'repartir', total: 12, grupos: 3, emoji: '🍬' } },
    { cfg: { tipo: 'repartir', total: 30, grupos: 2, emoji: '🥔' } },
    { cfg: { tipo: 'repartir', total: 10, grupos: 4, emoji: '🍪' }, libre: true },
    // no es exacto: 4 en cada plato y sobra 1
    { cfg: { tipo: 'repartir', total: 9, grupos: 2, emoji: '🍊' } },
  ],
  simetria: [
    { cfg: { tipo: 'simetria', filas: 6, columnas: 6, celdas: [[0, 2], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 2], [4, 2], [5, 1]], color: '#F4A259' } },
    { cfg: { tipo: 'simetria', filas: 5, columnas: 10, celdas: [[0, 4], [1, 3], [2, 2], [3, 3], [4, 4]], color: '#7FB3E6' }, libre: true },
  ],
  calendario: [
    { cfg: { tipo: 'calendario', mes: 9, anio: 2026, objetivo: 21 } },
    { cfg: { tipo: 'calendario', mes: 2, anio: 2028 }, libre: true },
  ],
  pictograma: [
    {
      cfg: {
        tipo: 'pictograma', titulo: 'Manzanas que juntamos', icono: '🍎', escala: 2,
        categorias: [{ etiqueta: 'Wara', objetivo: 6 }, { etiqueta: 'Kusi', objetivo: 4 }, { etiqueta: 'Inti', objetivo: 20 }],
      },
    },
    { cfg: { tipo: 'pictograma', icono: '⭐', escala: 1, categorias: [{ etiqueta: 'Lunes' }, { etiqueta: 'Martes' }, { etiqueta: 'Miércoles' }] }, libre: true },
  ],
  patron: [
    { cfg: { tipo: 'patron', secuencia: ['🔴', '🔵', '🔴', '🔵'], opciones: ['🔴', '🔵', '🟢'], completar: 2, solucion: ['🔴', '🔵'] } },
    { cfg: { tipo: 'patron', secuencia: ['2', '4', '6'], opciones: ['7', '8', '10', '12'], completar: 3, solucion: ['8', '10', '12'] } },
    { cfg: { tipo: 'patron', secuencia: ['🌞', '🌙', '🌙'], opciones: ['🌞', '🌙', '⭐'], completar: 3 }, libre: true },
  ],
};

const cont = document.getElementById('contenido');
const indice = document.getElementById('indice');
window.galeria = { manips: {}, listo: false };

function detallesJson(obj) {
  return h('details', {}, h('summary', {}, 'Configuración'), h('pre', {}, JSON.stringify(obj)));
}

async function iniciar() {
  let fechas = [];
  try {
    const r = await fetch('../content/fechas-civicas.json');
    fechas = (await r.json()).fechas || [];
  } catch (err) {
    console.warn('No se pudieron leer las fechas', err);
  }
  const ctx = { fechas };
  cont.replaceChildren();

  cont.append(h('h2', { id: 'visuales' }, 'Visuales'));
  indice.append(h('a', { href: '#visuales' }, 'Visuales'));
  for (const [tipo, lista] of Object.entries(VISUALES)) {
    const sec = h('section', { class: 'tarjeta', id: `v-${tipo}`, 'data-tipo': tipo }, h('h3', {}, `visual: ${tipo}`));
    lista.forEach((v, i) => {
      const el = renderVisual(v, ctx);
      sec.append(h('div', { class: 'muestra', 'data-muestra': `v-${tipo}-${i}` },
        detallesJson(v),
        h('div', { class: 'visual-caja' }, el),
        h('div', { class: 'alt' }, `Alt: ${textoAlternativo(v)}`)));
    });
    cont.append(sec);
    indice.append(h('a', { href: `#v-${tipo}` }, tipo));
  }

  // Visuales dentro de botones de opción (como en el ejercicio «opcion»).
  const enOpciones = [
    { tipo: 'fraccion', forma: 'circulo', partes: 4, coloreadas: 3 },
    { tipo: 'fraccion', forma: 'rectangulo', partes: 3, coloreadas: 1, iguales: false },
    { tipo: 'reloj', hora: 4, minutos: 15 },
    { tipo: 'emoji', valor: '🍎', cantidad: 8 },
    { tipo: 'dinero', items: ['b10', 'm5'] },
    { tipo: 'bloques', centenas: 1, decenas: 3, unidades: 5 },
  ];
  cont.append(h('section', { class: 'tarjeta', id: 'v-en-opciones', 'data-tipo': 'en-opciones' },
    h('h3', {}, 'Visuales dentro de opciones'),
    h('div', { class: 'muestra', 'data-muestra': 'v-opciones-0' },
      h('div', { class: 'opciones c2' }, enOpciones.map((v) => h('button', { class: 'opcion', type: 'button' },
        h('span', { class: 'visual-mini' }, renderVisual(v, ctx))))))));
  indice.append(h('a', { href: '#v-en-opciones' }, 'en opciones'));

  // Datos incompletos o inválidos: no deben romper la página.
  const raros = [null, { tipo: 'desconocido' }, { tipo: 'recta' }, { tipo: 'dinero', items: ['x', 'm1'] },
    { tipo: 'reloj' }, { tipo: 'pictograma' }, { tipo: 'tabla' }, { tipo: 'calendario' }, { tipo: 'simetria' },
    { tipo: 'fechas' }, { tipo: 'operacion', numeros: [7] }, { tipo: 'secuencia' }, { tipo: 'bandera' },
    { tipo: 'secuencia', items: ['a', null, 'b'] }, { tipo: 'pictograma', datos: [null, { etiqueta: 'x', valor: 2 }] },
    { tipo: 'pictograma', datos: 'x' }, { tipo: 'recta', ocultar: 5, marcar: 3, saltos: 'a' }, { tipo: 'operacion', numeros: 5 },
    { tipo: 'simetria', celdas: 'x' }, { tipo: 'tabla', columnas: ['a'], filas: [[{ texto: 'b' }]] },
    { tipo: 'fechas', mes: 'x' }, { tipo: 'calendario', mes: 13, anio: 'x' }];
  cont.append(h('section', { class: 'tarjeta', id: 'v-raros', 'data-tipo': 'raros' },
    h('h3', {}, 'Datos incompletos (no deben romper nada)'),
    raros.map((v, i) => h('div', { class: 'muestra', 'data-muestra': `v-raros-${i}` },
      h('div', { class: 'alt' }, JSON.stringify(v)),
      h('div', { class: 'visual-caja' }, renderVisual(v, {}))))));
  indice.append(h('a', { href: '#v-raros' }, 'raros'));

  cont.append(h('h2', { id: 'manipulables' }, 'Manipulables'));
  indice.append(h('a', { href: '#manipulables' }, 'Manipulables'));
  for (const [tipo, lista] of Object.entries(MANIPULABLES)) {
    const sec = h('section', { class: 'tarjeta', id: `m-${tipo}`, 'data-tipo': tipo }, h('h3', {}, `manipulable: ${tipo}`));
    lista.forEach(({ cfg, libre }, i) => {
      const id = `m-${tipo}-${i}`;
      const salida = h('output', { class: 'salida' });
      const cambios = { n: 0 };
      const m = crearManipulable(cfg, { libre: !!libre, alCambiar: () => { cambios.n += 1; mostrarEstado(); } });
      window.galeria.manips[id] = { api: m, cfg, libre: !!libre, cambios };
      function mostrarEstado(extra = '') {
        salida.textContent = `${extra}listo: ${m.listo()} · valor: ${m.valorTexto()} · cambios: ${cambios.n}`;
      }
      const controles = h('div', { class: 'controles' },
        h('button', { class: 'boton pequeno', type: 'button', 'data-accion': 'comprobar', onclick: () => mostrarEstado(`evaluar: ${JSON.stringify(m.evaluar())}\n`) }, 'Comprobar'),
        h('button', { class: 'boton pequeno suave', type: 'button', 'data-accion': 'solucion', onclick: () => { m.mostrarSolucion(); mostrarEstado('solución mostrada\n'); } }, 'Solución'),
        h('button', { class: 'boton pequeno secundario', type: 'button', 'data-accion': 'bloquear', onclick: () => { m.bloquear(); mostrarEstado('bloqueado\n'); } }, 'Bloquear'),
        h('button', { class: 'boton pequeno secundario', type: 'button', 'data-accion': 'reiniciar', onclick: () => { m.reiniciar(); mostrarEstado('reiniciado\n'); } }, 'Reiniciar'));
      sec.append(h('div', { class: 'muestra', 'data-muestra': id },
        h('h3', {}, `Ejemplo ${i + 1}`, h('span', { class: `modo${libre ? ' libre' : ''}` }, libre ? 'libre' : 'ejercicio')),
        detallesJson(cfg),
        h('div', { class: 'zona-ejercicio' }, m.el),
        controles, salida));
      mostrarEstado();
    });
    cont.append(sec);
    indice.append(h('a', { href: `#m-${tipo}` }, tipo));
  }
  window.galeria.listo = true;
}

iniciar().catch((err) => {
  console.error(err);
  cont.textContent = `Error: ${err.message}`;
});
