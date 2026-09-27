#!/usr/bin/env node
// Simula el sitio tal como queda publicado en GitHub Pages (en la subruta /app-educativa-segundo-de-primaria/)
// y comprueba en un celular: que abre sin archivos faltantes, que Chrome la considera instalable,
// que guarda todo para usarla sin conexión y que sin conexión abre lecciones nunca vistas.
// Uso: node tests/e2e/publicado.mjs
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ejercicioActual, responder } from './ayudante.mjs';
import { estrategiaManipular } from './manipular.mjs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium, devices } = playwright;
const RAIZ = new URL('../../', import.meta.url).pathname;
const SALIDA = `${RAIZ}test-results/publicado`;
const SUBRUTA = 'app-educativa-segundo-de-primaria';
mkdirSync(SALIDA, { recursive: true });
// Mismos pasos que .github/workflows/publicar.yml (sin regenerar precache.json, que ya viene al día).
execFileSync('node', [`${RAIZ}tools/preparar-sitio.mjs`, `${SALIDA}/sitio/${SUBRUTA}`], { stdio: 'inherit' });

const puerto = 8950 + Math.floor(Math.random() * 40);
const servidor = spawn('npx', ['http-server', `${SALIDA}/sitio`, '-p', String(puerto), '-c-1', '-s'], { stdio: 'ignore', cwd: RAIZ });
const BASE = `http://localhost:${puerto}/${SUBRUTA}/`;
for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* */ } await new Promise((r) => setTimeout(r, 250)); }

const res = [];
const ok = (n, c, d = '') => { res.push({ n, c: !!c }); console.log(`${c ? '✓' : '✗'} ${n}${d ? ` — ${d}` : ''}`); };
const nav = await chromium.launch();
try {
  const ctx = await nav.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  const errores404 = [];
  const erroresJS = [];
  page.on('response', (r) => { if (r.status() >= 400) errores404.push(`${r.status()} ${r.url()}`); });
  page.on('pageerror', (e) => erroresJS.push(String(e)));

  await page.goto(BASE);
  await page.waitForSelector('.continuar');
  ok('La app abre en la subruta de GitHub Pages', true, page.url());

  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForSelector('.continuar');
  const controlado = await page.evaluate(() => !!navigator.serviceWorker.controller);
  ok('El service worker controla la página', controlado);
  const alcance = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).scope);
  ok('Alcance del service worker = subruta', alcance === BASE, alcance);

  const enCache = await page.evaluate(async () => {
    const nombres = await caches.keys();
    let n = 0; for (const k of nombres) n += (await (await caches.open(k)).keys()).length;
    return { nombres, n };
  });
  const lista = await (await fetch(`${BASE}precache.json`)).json();
  ok('Todo guardado para usar sin conexión', enCache.n >= lista.archivos.length, `${enCache.n} en caché / ${lista.archivos.length} en la lista`);

  const cdp = await ctx.newCDPSession(page);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  ok('Chrome la considera instalable', inst.installabilityErrors.length === 0, JSON.stringify(inst.installabilityErrors));
  const man = await cdp.send('Page.getAppManifest');
  ok('Manifest sin errores', man.errors.length === 0, `${man.url} ${JSON.stringify(man.errors)}`);

  // Una lección con internet: responder bien una práctica.
  await page.goto(`${BASE}#/leccion/mat-1-2/practica`);
  await page.waitForSelector('.zona-ejercicio');
  const ej = await ejercicioActual(page);
  if (ej.tipo === 'manipular') await estrategiaManipular(page, ej, true);
  else await responder(page, ej, true);
  await page.waitForTimeout(420);
  await page.locator('#pie button', { hasText: 'Comprobar' }).click().catch(() => {});
  await page.waitForSelector('.retro', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);

  // Sin conexión: la app y un tema nunca abierto cargan desde el teléfono.
  await ctx.setOffline(true);
  await page.goto(`${BASE}#/inicio`).catch(() => {});
  ok('Sin conexión: abre el inicio', await page.waitForSelector('.continuar', { timeout: 8000 }).then(() => true).catch(() => false));
  await page.goto(`${BASE}#/tema/nat-7-1`).catch(() => {});
  await page.waitForSelector('.tema-cabecera', { timeout: 8000 }).catch(() => {});
  await page.locator('button', { hasText: /Empezar|Continuar|Repasar/ }).first().click().catch(() => {});
  ok('Sin conexión: abre una lección nunca vista (Naturales)', await page.waitForSelector('.tarjeta-explicacion, .zona-ejercicio', { timeout: 8000 }).then(() => true).catch(() => false));
  await page.goto(`${BASE}#/leccion/soc-6-2/practica`).catch(() => {});
  ok('Sin conexión: práctica de Sociales', await page.waitForSelector('.zona-ejercicio', { timeout: 8000 }).then(() => true).catch(() => false));
  const est = await page.evaluate(() => JSON.parse(localStorage.getItem('aprendo2:v1') || 'null'));
  ok('El progreso quedó guardado en el teléfono', !!(est && est.temas && est.temas['mat-1-2']));
  await page.screenshot({ path: `${SALIDA}/sin-conexion.png` });
  await ctx.setOffline(false);

  ok('Ningún archivo dio error 404', errores404.length === 0, errores404.slice(0, 5).join(' | '));
  ok('Sin errores de JavaScript', erroresJS.length === 0, erroresJS.slice(0, 3).join(' | '));
} catch (e) {
  ok('Sin excepciones', false, String(e.stack || e).slice(0, 500));
} finally {
  await nav.close();
  servidor.kill();
  const f = res.filter((r) => !r.c).length;
  console.log(`\n${res.length - f} de ${res.length} comprobaciones correctas.`);
  process.exit(f ? 1 : 0);
}
