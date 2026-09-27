#!/usr/bin/env node
// Pruebas de robustez (celular): doble toque, botón Atrás, dos ventanas, sin voz en español,
// panel de adultos que se vuelve a bloquear, copia de seguridad incompleta y service worker.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ejercicioActual, responder } from './ayudante.mjs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium, devices } = playwright;
const RAIZ = new URL('../../', import.meta.url).pathname;
const SALIDA = `${RAIZ}test-results/robustez`;
mkdirSync(SALIDA, { recursive: true });

const puerto = 8800 + Math.floor(Math.random() * 100);
const servidor = spawn('npx', ['http-server', RAIZ, '-p', String(puerto), '-c-1', '-s'], { stdio: 'ignore' });
const BASE = `http://localhost:${puerto}/`;
for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* */ } await new Promise((r) => setTimeout(r, 250)); }

const resultados = [];
const ok = (nombre, cond, detalle = '') => { resultados.push({ nombre, ok: !!cond, detalle }); console.log(`${cond ? '✓' : '✗'} ${nombre}${detalle ? ` — ${detalle}` : ''}`); };
const navegador = await chromium.launch();
const estadoDe = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('aprendo2:v1') || 'null'));

try {
  // 1. Doble toque en «Comprobar» con respuesta incorrecta: la pista sigue visible.
  {
    const ctx = await navegador.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    await page.goto(`${BASE}dev/ejercicio.html?tema=com-1-1&ej=c5`);
    await page.waitForSelector('.opcion');
    const ej = await ejercicioActual(page);
    await responder(page, ej, false);
    const b = page.locator('#pie button', { hasText: 'Comprobar' });
    const caja = await b.boundingBox();
    await page.touchscreen.tap(caja.x + caja.width / 2, caja.y + caja.height / 2);
    await page.waitForTimeout(200);
    await page.touchscreen.tap(caja.x + caja.width / 2, caja.y + caja.height / 2);
    await page.waitForTimeout(300);
    ok('Doble toque: la pista no se cierra sola', (await page.locator('.retro').count()) === 1 && (await page.locator('.retro').innerText()).includes('Casi'));
    await ctx.close();
  }

  // 2. Botón Atrás después de salir de la lección con ✕: no vuelve a abrirla.
  {
    const ctx = await navegador.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    await page.goto(`${BASE}#/materia/matematica`);
    await page.waitForSelector('.nodo');
    await page.goto(`${BASE}#/tema/mat-2-1`);
    await page.waitForSelector('.tema-cabecera');
    await page.locator('button', { hasText: '¡Empezar!' }).click();
    await page.waitForSelector('.tarjeta-explicacion');
    await page.locator('button[aria-label="Salir de la lección"]').click();
    await page.waitForSelector('.tema-cabecera');
    await page.goBack();
    await page.waitForTimeout(800);
    ok('Atrás tras salir con ✕ no vuelve a la lección', !page.url().includes('#/leccion/') && (await page.locator('.leccion').count()) === 0, page.url());
    // 2b. Después de ver «Aprendo», el tema cuenta como empezado.
    await page.goto(`${BASE}#/tema/com-2-1`);
    await page.waitForSelector('.tema-cabecera');
    await page.locator('button', { hasText: '¡Empezar!' }).click();
    await page.waitForSelector('.tarjeta-explicacion');
    for (let i = 0; i < 6 && await page.locator('.fase-nombre', { hasText: 'Aprendo' }).count(); i++) {
      await page.waitForTimeout(420);
      await page.locator('.leccion-pie button').last().click();
    }
    await page.waitForTimeout(500);
    const est = await estadoDe(page);
    ok('Ver «Aprendo» marca el tema como empezado', est.temas['com-2-1'].estado === 'en-curso');
    await page.goto(`${BASE}#/inicio`);
    await page.waitForSelector('.continuar');
    ok('«Continuar aprendiendo» lleva al tema empezado', (await page.locator('.continuar').innerText()).includes('abecedario'));
    await ctx.close();
  }

  // 3. Dos ventanas: la que queda en segundo plano no borra el progreso de la otra.
  {
    const ctx = await navegador.newContext({ ...devices['Pixel 7'] });
    const a = await ctx.newPage();
    const b = await ctx.newPage();
    await a.goto(`${BASE}#/inicio`); await a.waitForSelector('.continuar');
    await b.goto(`${BASE}#/inicio`); await b.waitForSelector('.continuar');
    await a.goto(`${BASE}#/leccion/com-1-1/practica`);
    await a.waitForSelector('.zona-ejercicio');
    await a.waitForTimeout(600);
    await b.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('pagehide'));
    });
    await a.waitForTimeout(400);
    const est = await estadoDe(a);
    ok('Dos ventanas: la de fondo no borra el progreso', !!(est && est.temas['com-1-1']), est ? Object.keys(est.temas).join(',') : 'sin estado');
    // la ventana B ve los cambios de A
    const enB = await b.evaluate(() => document.querySelector('.continuar')?.innerText.includes('Continuar aprendiendo'));
    ok('Dos ventanas: la otra ventana se actualiza', enB);
    await ctx.close();
  }

  // 4. Sin voz en español: los dictados muestran el texto para que un adulto lo lea.
  {
    const ctx = await navegador.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    await page.goto(`${BASE}dev/ejercicio.html?tema=com-1-1&ej=c4`);
    await page.waitForSelector('.zona-ejercicio');
    const hayAviso = await page.locator('.aviso-audio details').count();
    ok('Sin voz en español: aparece la alternativa con el texto', hayAviso === 1);
    await ctx.close();
  }

  // 5. Panel de adultos: al salir con «←» se vuelve a pedir el PIN.
  {
    const ctx = await navegador.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    await page.goto(`${BASE}#/adulto`);
    await page.waitForSelector('.teclado');
    for (const d of '13571357') await page.locator('.teclado button', { hasText: new RegExp(`^${d}$`) }).click();
    await page.waitForSelector('.pestanas');
    await page.locator('button[aria-label="Volver al inicio"]').click();
    await page.waitForSelector('.continuar');
    await page.locator('button', { hasText: 'Para adultos' }).click();
    await page.waitForTimeout(500);
    ok('Panel de adultos: pide el PIN al volver', (await page.locator('.teclado').count()) === 1);
    // 5b. Un PIN equivocado seguido rápido del correcto: ningún número se pierde.
    for (const d of '00001357') await page.locator('.teclado button', { hasText: new RegExp(`^${d}$`) }).click();
    ok('PIN escrito rápido tras un error: entra igual', await page.waitForSelector('.pestanas', { timeout: 5000 }).then(() => true).catch(() => false));
    // 5c. «Cambiar el PIN» no borra el anterior hasta confirmar el nuevo.
    await page.goto(`${BASE}#/adulto/ajustes`);
    await page.locator('button', { hasText: 'Cambiar el PIN' }).click();
    await page.waitForTimeout(300);
    const pinGuardado = (await estadoDe(page)).ajustes.pin;
    ok('Cambiar el PIN conserva el anterior hasta confirmar', !!pinGuardado);
    await ctx.close();
  }

  // 6. Copia de seguridad con un tema incompleto: el tema abre sin error técnico.
  {
    const ctx = await navegador.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('sembrado')) {
        localStorage.setItem('aprendo2:v1', JSON.stringify({ temas: { 'mat-1-1': { estado: 'en-curso', fase: 'practica' } } }));
        sessionStorage.setItem('sembrado', '1');
      }
    });
    await page.goto(`${BASE}#/tema/mat-1-1`);
    await page.waitForSelector('.tema-cabecera');
    const texto = await page.locator('main').innerText();
    ok('Estado incompleto: el tema abre sin error', !texto.includes('Algo no funcionó') && !texto.includes('undefined'));
    await ctx.close();
  }

  // 7. Service worker: una página 404 visitada con conexión no rompe la app sin conexión.
  {
    const ctx = await navegador.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    await page.goto(`${BASE}#/inicio`);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}no-existe.html`).catch(() => {});
    await page.goto(`${BASE}dev/ejercicio.html?tema=mat-1-1&ej=p1`).catch(() => {});
    await page.waitForTimeout(500);
    await ctx.setOffline(true);
    await page.goto(`${BASE}#/inicio`).catch(() => {});
    const abre = await page.waitForSelector('.continuar', { timeout: 8000 }).then(() => true).catch(() => false);
    ok('Sin conexión, la app abre aunque antes se visitó una página inexistente', abre);
    await page.screenshot({ path: `${SALIDA}/sin-conexion.png` });
    await ctx.close();
  }
} catch (e) {
  ok('Las pruebas terminaron sin excepciones', false, String(e.stack || e).slice(0, 600));
} finally {
  await navegador.close();
  servidor.kill();
  writeFileSync(`${SALIDA}/resultados.json`, JSON.stringify(resultados, null, 1));
  const fallos = resultados.filter((r) => !r.ok).length;
  console.log(`\n${resultados.length - fallos} de ${resultados.length} comprobaciones correctas.`);
  process.exit(fallos ? 1 : 0);
}
