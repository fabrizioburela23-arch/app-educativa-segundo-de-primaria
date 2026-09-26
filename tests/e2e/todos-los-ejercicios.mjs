#!/usr/bin/env node
// Responde CADA ejercicio de cada tema desde la interfaz real (tamaño celular):
// 1.º una respuesta incorrecta → debe aparecer la pista; 2.º la correcta → debe aceptarse.
// Así se comprueba que todas las claves de respuesta del contenido funcionan con la app.
// Uso: node tests/e2e/todos-los-ejercicios.mjs [mat-1-2 ...]
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ejercicioActual, responder } from './ayudante.mjs';
import { estrategiaManipular } from './manipular.mjs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium, devices } = playwright;
const RAIZ = new URL('../../', import.meta.url).pathname;
const SALIDA = `${RAIZ}test-results/ejercicios`;
mkdirSync(SALIDA, { recursive: true });

const indice = JSON.parse(readFileSync(`${RAIZ}content/indice.json`, 'utf8'));
let ids = indice.materias.flatMap((m) => m.unidades.flatMap((u) => u.temas.map((t) => t.id)));
const pedidos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (pedidos.length) ids = ids.filter((i) => pedidos.includes(i));
const HILOS = Number(process.env.HILOS || 4);

let servidor = null;
let BASE = process.env.BASE;
if (!BASE) {
  const puerto = 8500 + Math.floor(Math.random() * 150);
  servidor = spawn('npx', ['http-server', RAIZ, '-p', String(puerto), '-c-1', '-s'], { stdio: 'ignore' });
  BASE = `http://localhost:${puerto}/`;
  for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* */ } await new Promise((r) => setTimeout(r, 250)); }
}

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const fallos = [];
let revisados = 0;

async function retro(page) {
  const r = page.locator('.retro');
  await r.waitFor({ state: 'visible', timeout: 6000 });
  const t = norm(await r.innerText());
  await r.locator('button.boton').click();
  await r.waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
  return t;
}

async function probarEjercicio(page, tema, id) {
  const errores = [];
  const onErr = (e) => errores.push(e.message || String(e));
  page.on('pageerror', onErr);
  try {
    await page.goto(`${BASE}dev/ejercicio.html?tema=${tema}&ej=${encodeURIComponent(id)}`);
    await page.waitForFunction(() => window.__aprendoPrueba && document.querySelector('.zona-ejercicio'), null, { timeout: 8000 });
    for (let paso = 0; paso < 6; paso++) {
      const ej = await ejercicioActual(page);
      if (ej.tipo === 'memoria') {
        await responder(page, ej, true);
        const t = await retro(page);
        if (!/Muy bien|Excelente|Lo lograste|Así se hace|Bien pensado|Genial/.test(t)) throw new Error(`memoria sin celebración: ${t}`);
      } else {
        const comprobar = page.locator('#pie button', { hasText: /^Comprobar$/ });
        await responder(page, ej, false, estrategiaManipular);
        await page.waitForTimeout(60);
        if (!(await comprobar.isEnabled())) throw new Error(`${ej.tipo}: Comprobar no se activó con una respuesta incorrecta`);
        await comprobar.click();
        const t1 = await retro(page);
        if (!t1.includes('Casi')) throw new Error(`${ej.tipo}: la respuesta incorrecta no mostró pista («${t1.slice(0, 80)}»)`);
        await responder(page, ej, true, estrategiaManipular);
        await page.waitForTimeout(60);
        if (!(await comprobar.isEnabled())) throw new Error(`${ej.tipo}: Comprobar no se activó con la respuesta correcta`);
        await comprobar.click();
        const t2 = await retro(page);
        if (!/Bien|Eso es|Muy bien/.test(t2)) throw new Error(`${ej.tipo}: la respuesta correcta no fue aceptada («${t2.slice(0, 100)}»)`);
      }
      await page.waitForTimeout(80);
      const res = await page.evaluate(() => window.__resultado);
      if (res) {
        if (res.r !== 0.5 && res.r !== 1) throw new Error(`resultado inesperado r=${res.r}`);
        break;
      }
    }
    const fin = await page.evaluate(() => window.__resultado);
    if (!fin) throw new Error('el ejercicio no terminó');
    if (errores.length) throw new Error(`errores JS: ${errores.join(' | ')}`);
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (desborde) throw new Error('desborde horizontal');
    return null;
  } catch (e) {
    await page.screenshot({ path: `${SALIDA}/${tema}-${id}.png` }).catch(() => {});
    return String(e.message || e).split('\n')[0].slice(0, 300);
  } finally {
    page.off('pageerror', onErr);
  }
}

const navegador = await chromium.launch();
const cola = ids.slice();
async function hilo() {
  const ctx = await navegador.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  while (cola.length) {
    const tema = cola.shift();
    let lista;
    try { lista = JSON.parse(readFileSync(`${RAIZ}content/temas/${tema}.json`, 'utf8')); } catch { fallos.push({ tema, id: '-', error: 'no existe el archivo' }); continue; }
    const ejIds = [...lista.guiada.pasos, ...lista.practica, ...lista.comprobacion].map((e) => e.id);
    let malos = 0;
    for (const id of ejIds) {
      const error = await probarEjercicio(page, tema, id);
      revisados++;
      if (error) { malos++; fallos.push({ tema, id, error }); }
    }
    console.log(`${malos ? '✗' : '✓'} ${tema}: ${ejIds.length - malos}/${ejIds.length}`);
  }
  await ctx.close();
}
await Promise.all(Array.from({ length: HILOS }, hilo));
await navegador.close();
if (servidor) servidor.kill();
writeFileSync(`${SALIDA}/fallos.json`, JSON.stringify(fallos, null, 1));
console.log(`\n${revisados} ejercicios probados, ${fallos.length} con problemas.`);
fallos.forEach((f) => console.log(`  ✗ ${f.tema} ${f.id}: ${f.error}`));
process.exit(fallos.length ? 1 : 0);
