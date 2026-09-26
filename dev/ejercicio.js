// Muestra un solo ejercicio de un tema con el mismo ejecutor de la app.
// Uso: dev/ejercicio.html?tema=mat-1-2&ej=p3   ·   &todos=1 lista los ids.
import { ejecutarEjercicio } from '../js/motor/ejecutar.js';

const q = new URLSearchParams(location.search);
const temaId = q.get('tema');
const [tema, datos, fechas] = await Promise.all([
  fetch(`../content/temas/${temaId}.json`).then((r) => r.json()),
  fetch('../content/datos.json').then((r) => r.json()),
  fetch('../content/fechas-civicas.json').then((r) => r.json()),
]);
const todos = [...tema.guiada.pasos, ...tema.practica, ...tema.comprobacion];
window.__ids = todos.map((e) => e.id);
const ej = todos.find((e) => e.id === q.get('ej')) || todos[0];
document.getElementById('titulo').textContent = `${temaId} · ${ej.id} · ${ej.tipo}${ej.nivel ? ` · nivel ${ej.nivel}` : ''}`;
window.__resultado = null;
ejecutarEjercicio({
  cuerpo: document.getElementById('cuerpo'),
  pie: document.getElementById('pie'),
  ejercicio: ej,
  datosGen: { feria: datos.feria, fechas: fechas.fechas },
  datosVisual: { fechas: fechas.fechas },
  lecturas: tema.lecturas || [],
  guardarEscrito: () => {},
}).then((r) => { window.__resultado = { r: r.r, errores: r.errores }; document.getElementById('titulo').textContent += ` → r = ${r.r}`; });
