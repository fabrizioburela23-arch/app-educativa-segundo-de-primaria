#!/usr/bin/env node
// Dibuja cada visual de cada tema (tarjetas, ejemplos, repaso, ejercicios, opciones y pasos)
// en un ancho de celular (328 px de contenido) y detecta errores o desbordes.
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const RAIZ = new URL('../../', import.meta.url).pathname;
mkdirSync(`${RAIZ}test-results`, { recursive: true });

let servidor = null;
let BASE = process.env.BASE;
if (!BASE) {
  const puerto = 8450 + Math.floor(Math.random() * 40);
  servidor = spawn('npx', ['http-server', RAIZ, '-p', String(puerto), '-c-1', '-s'], { stdio: 'ignore' });
  BASE = `http://localhost:${puerto}/`;
  for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* */ } await new Promise((r) => setTimeout(r, 250)); }
}

const visuales = [];
const agregar = (tema, ruta, v) => { if (v && typeof v === 'object' && v.tipo) visuales.push({ tema, ruta, v }); };
const recorrerEj = (tema, ej, ruta) => {
  agregar(tema, `${ruta}.visual`, ej.visual);
  (ej.opciones || []).forEach((o, i) => agregar(tema, `${ruta}.opciones[${i}]`, o.visual));
  (ej.pasos || []).forEach((p, i) => recorrerEj(tema, p, `${ruta}.pasos[${i}]`));
};
for (const f of readdirSync(`${RAIZ}content/temas`)) {
  const t = JSON.parse(readFileSync(`${RAIZ}content/temas/${f}`, 'utf8'));
  t.explicacion.forEach((c, i) => agregar(t.id, `explicacion[${i}]`, c.visual));
  (t.ejemplo.pasos || []).forEach((p, i) => agregar(t.id, `ejemplo.pasos[${i}]`, p.visual));
  agregar(t.id, 'repaso', t.repaso.visual);
  t.guiada.pasos.forEach((e) => recorrerEj(t.id, e, e.id));
  t.practica.forEach((e) => recorrerEj(t.id, e, e.id));
  t.comprobacion.forEach((e) => recorrerEj(t.id, e, e.id));
}

const navegador = await playwright.chromium.launch();
const page = await navegador.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1 });
const erroresJs = [];
page.on('pageerror', (e) => erroresJs.push(e.message));
await page.goto(`${BASE}dev/ejercicio.html?tema=mat-1-2`);
await page.waitForTimeout(800);
const fechas = JSON.parse(readFileSync(`${RAIZ}content/fechas-civicas.json`, 'utf8')).fechas;
const problemas = await page.evaluate(async ({ lista, fechas }) => {
  const { renderVisual } = await import(`${location.origin}/js/visuales/visual.js`);
  const caja = document.createElement('div');
  caja.style.cssText = 'width:328px;position:absolute;left:0;top:0;background:#fff';
  document.body.appendChild(caja);
  const malos = [];
  for (const item of lista) {
    caja.textContent = '';
    try {
      const el = renderVisual(item.v, { fechas });
      caja.appendChild(el);
      await new Promise((r) => requestAnimationFrame(r));
      const aviso = el.querySelector('.visual-aviso') || (el.classList.contains('visual-aviso') ? el : null);
      if (aviso) malos.push({ ...item, problema: `aviso: ${aviso.textContent.slice(0, 80)}` });
      else if (el.scrollWidth > 330 || caja.scrollWidth > 330) malos.push({ ...item, problema: `desborda (${Math.max(el.scrollWidth, caja.scrollWidth)} px)` });
      else if (el.getBoundingClientRect().height < 8) malos.push({ ...item, problema: 'no se ve (alto < 8 px)' });
    } catch (e) {
      malos.push({ ...item, problema: `error: ${e.message}` });
    }
  }
  return malos;
}, { lista: visuales, fechas });
await navegador.close();
if (servidor) servidor.kill();
writeFileSync(`${RAIZ}test-results/visuales.json`, JSON.stringify(problemas, null, 1));
console.log(`${visuales.length} visuales dibujados, ${problemas.length} con problemas.`);
problemas.slice(0, 60).forEach((p) => console.log(`  ✗ ${p.tema} ${p.ruta} (${p.v.tipo}${p.v.id ? ` ${p.v.id}` : ''}): ${p.problema}`));
if (erroresJs.length) console.log('Errores JS:', erroresJs.slice(0, 5));
process.exit(problemas.length || erroresJs.length ? 1 : 0);
