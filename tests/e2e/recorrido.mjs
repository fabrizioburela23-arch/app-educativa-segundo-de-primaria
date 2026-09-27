#!/usr/bin/env node
// Recorrido completo en tamaño de celular (Pixel 7 y 360 px):
//  - una lección de cada materia, con respuestas correctas e incorrectas;
//  - guardado del progreso (recargar y comprobar);
//  - panel del adulto (PIN, progreso, tarea asignada, nivel inicial, fechas, revisar contenido);
//  - uso sin conexión.
// Uso: node tests/e2e/recorrido.mjs   (BASE=http://... para usar un servidor ya abierto)
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { jugar } from './jugar.mjs';
import { estrategiaManipular } from './manipular.mjs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium, devices } = playwright;

const RAIZ = new URL('../../', import.meta.url).pathname;
const SALIDA = `${RAIZ}test-results/e2e`;
mkdirSync(SALIDA, { recursive: true });

let servidor = null;
let BASE = process.env.BASE;
if (!BASE) {
  const puerto = 8700 + Math.floor(Math.random() * 200);
  servidor = spawn('npx', ['http-server', RAIZ, '-p', String(puerto), '-c-1', '-s'], { stdio: 'ignore' });
  BASE = `http://localhost:${puerto}/`;
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(BASE); if (r.ok) break; } catch { /* esperando */ }
    await new Promise((r) => setTimeout(r, 250));
  }
}

const resultados = [];
const ok = (nombre, cond, detalle = '') => {
  resultados.push({ nombre, ok: !!cond, detalle });
  console.log(`${cond ? '✓' : '✗'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ ...devices['Pixel 7'], locale: 'es-BO' });
const page = await contexto.newPage();
const erroresPagina = [];
page.on('pageerror', (e) => erroresPagina.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') erroresPagina.push(m.text()); });
const foto = async (n) => { await page.waitForTimeout(200); await page.screenshot({ path: `${SALIDA}/${n}.png` }); };
// Entra al área de adultos (la app vuelve a pedir el PIN cada vez que se sale de ella).
async function entrarAdulto(ruta) {
  await page.goto(`${BASE}${ruta}`);
  await page.waitForSelector('.teclado, .pestanas, main.adulto');
  if (await page.locator('.teclado').count()) {
    for (const d of '2468') await page.locator('.teclado button', { hasText: new RegExp(`^${d}$`) }).click();
    await page.waitForSelector('.pestanas, h2:has-text("Revisar"), text=4. Practico', { timeout: 10000 }).catch(() => {});
  }
}
const sinDesborde = async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

try {
  // ---------- inicio ----------
  await page.goto(BASE);
  await page.waitForSelector('.continuar');
  ok('Inicio muestra «Continuar aprendiendo» y 4 materias', (await page.locator('.materia-tarjeta').count()) === 4);
  ok('Inicio sin desborde horizontal', await sinDesborde());
  await foto('01-inicio');

  // ---------- una lección por materia ----------
  const LECCIONES = [
    { id: 'com-1-1', materia: 'comunicacion' },
    { id: 'mat-1-2', materia: 'matematica' },
    { id: 'soc-1-1', materia: 'sociales' },
    { id: 'nat-1-2', materia: 'naturales' },
  ];
  for (const [k, lec] of LECCIONES.entries()) {
    await page.goto(`${BASE}#/tema/${lec.id}`);
    await page.waitForSelector('.tema-cabecera');
    await foto(`1${k}-a-tema-${lec.id}`);
    await page.locator('button', { hasText: '¡Empezar!' }).click();
    await page.waitForSelector('.tarjeta-explicacion');
    await foto(`1${k}-b-explicacion-${lec.id}`);
    let fotos = 0;
    const registro = await jugar(page, {
      // cada 4.º ejercicio se responde mal; el 3.º se falla dos veces (para ver «Veamos juntos»)
      politica: (ej, n) => n % 4 !== 2 && n !== 3,
      fallarReintento: (ej, n) => n === 3,
      elegir: (t) => t.find((x) => /demostrar|Ir al mapa|Ahora yo|Terminé|Entendido|Siguiente|Vamos|Empezar|Seguir practicando|Continuar|ejemplo/.test(x)) || t[0],
      parar: async (p) => {
        if (fotos < 6 && (await p.locator('.zona-ejercicio').count())) { fotos++; await foto(`1${k}-c${fotos}-ejercicio-${lec.id}`); }
        return p.url().includes('#/materia/');
      },
      manipular: estrategiaManipular,
      max: 600,
    });
    const retros = registro.filter((r) => r.tipo === 'retro');
    ok(`${lec.id}: hubo pista tras el primer error`, retros.some((r) => r.texto.includes('Casi')));
    ok(`${lec.id}: hubo «Veamos juntos» tras el segundo error`, retros.some((r) => r.texto.includes('Veamos juntos')));
    ok(`${lec.id}: hubo respuestas correctas celebradas`, retros.some((r) => /Muy bien|Excelente|Lo lograste|Así se hace|Bien pensado|Genial|Bien!|Eso es/.test(r.texto)));
    const tipos = [...new Set(registro.filter((r) => r.tipo === 'ejercicio').map((r) => r.ej))];
    ok(`${lec.id}: recorrió varios tipos de actividad`, tipos.length >= 4, tipos.join(', '));
    const estado = await page.evaluate((id) => JSON.parse(localStorage.getItem('aprendo2:v1')).temas[id], lec.id);
    ok(`${lec.id}: tema logrado y guardado`, estado && estado.estado === 'logrado', estado ? `${estado.intentos} ejercicios, ${estado.primer} al primer intento` : 'sin estado');
    writeFileSync(`${SALIDA}/registro-${lec.id}.json`, JSON.stringify(registro, null, 1));
    await foto(`1${k}-d-mapa-${lec.materia}`);
  }

  // ---------- persistencia ----------
  await page.reload();
  await page.goto(`${BASE}#/materia/matematica`);
  await page.waitForSelector('.nodo');
  const estadoNodo = await page.locator('.nodo', { hasText: 'Unidades, decenas y centenas' }).getAttribute('data-estado');
  ok('Tras recargar, el mapa muestra el tema logrado', estadoNodo === 'logrado');
  await page.goto(`${BASE}#/inicio`);
  await page.waitForSelector('.materia-tarjeta');
  const cuenta = await page.locator('.materia-tarjeta', { hasText: 'Matemática' }).innerText();
  ok('Inicio cuenta los temas logrados', cuenta.includes('1 de'), cuenta.replace(/\s+/g, ' '));

  // ---------- panel del adulto ----------
  await page.goto(`${BASE}#/adulto`);
  await page.waitForSelector('.teclado');
  for (const d of '2468') await page.locator('.teclado button', { hasText: new RegExp(`^${d}$`) }).click();
  await page.waitForTimeout(300);
  for (const d of '2468') await page.locator('.teclado button', { hasText: new RegExp(`^${d}$`) }).click();
  await page.waitForSelector('.pestanas');
  await foto('20-adulto-progreso');
  const textoProg = await page.locator('main').innerText();
  ok('Adulto: resumen muestra temas logrados', /1 logrados/.test(textoProg));
  ok('Adulto: actividad reciente registrada', (await page.locator('.tabla-simple tbody tr').count()) > 0);
  ok('Adulto: errores frecuentes con sugerencia', (await page.locator('text=💡').count()) > 0 || textoProg.includes('No hay errores que se repitan'));
  // detalle de un tema
  await page.locator('summary', { hasText: 'Matemática' }).click();
  await page.locator('.fila-tema', { hasText: 'Unidades, decenas y centenas' }).locator('button.mas').click();
  await page.waitForSelector('.detalle-tema:not(.oculto) >> text=Ideas para practicar');
  ok('Adulto: detalle del tema con ideas para practicar', true);
  await foto('21-adulto-detalle');

  // ajustes: nivel inicial y tarea asignada
  await page.goto(`${BASE}#/adulto/ajustes`);
  await page.waitForSelector('.selector-nivel');
  ok('Adulto: navegar entre pestañas no vuelve a pedir el PIN', (await page.locator('.teclado').count()) === 0);
  await page.locator('.selector-nivel').nth(1).locator('button', { hasText: 'Con más repaso' }).click();
  await page.selectOption('select[aria-label="Tema para asignar"]', 'mat-1-3');
  await page.fill('input[placeholder^="Ej.:"]', 'Practica la recta numérica');
  await page.locator('.tarjeta', { hasText: 'Asignar un tema' }).locator('button', { hasText: 'Guardar' }).click();
  await foto('22-adulto-ajustes');
  const aj = await page.evaluate(() => JSON.parse(localStorage.getItem('aprendo2:v1')).ajustes);
  ok('Adulto: nivel inicial de Matemática guardado', aj.nivelInicial.matematica === 1);
  ok('Adulto: tema asignado guardado', aj.temaAsignado && aj.temaAsignado.id === 'mat-1-3');
  await page.goto(`${BASE}#/inicio`);
  await page.waitForSelector('.continuar');
  const cont = await page.locator('.continuar').innerText();
  ok('Inicio muestra la tarea asignada primero', cont.includes('Tu tarea de hoy') && cont.includes('recta'), cont.replace(/\s+/g, ' '));
  ok('Inicio muestra el mensaje del adulto', (await page.locator('.aviso-asignado').innerText()).includes('recta numérica'));
  await foto('23-inicio-tarea');
  const progNuevo = await page.evaluate(async () => { location.hash = '#/leccion/mat-1-3/normal'; await new Promise((r) => setTimeout(r, 800)); return JSON.parse(localStorage.getItem('aprendo2:v1')).temas['mat-1-3']; });
  ok('El nivel inicial se aplica al empezar un tema nuevo', progNuevo && progNuevo.nivel === 1);

  // contenido: editar una fecha cívica como borrador y publicarla
  await page.goto(`${BASE}#/adulto/contenido`);
  ok('Adulto: al volver después de salir, la app pide el PIN otra vez', (await page.locator('.teclado').count()) === 1);
  await entrarAdulto('#/adulto/contenido');
  await page.waitForSelector('text=Fechas cívicas');
  await page.locator('.fila-tema', { hasText: 'Día del Mar' }).locator('button').click();
  await page.fill('.modal textarea', 'Recordamos a Eduardo Abaroa. (Texto revisado por el adulto.)');
  await page.locator('.modal button', { hasText: 'Guardar borrador' }).click();
  const borr = await page.evaluate(() => JSON.parse(localStorage.getItem('aprendo2:v1')).contenido.fechas);
  ok('Adulto: el cambio queda como borrador (no publicado)', Array.isArray(borr.borrador) && borr.publicado === null);
  await page.locator('button', { hasText: 'Publicar cambios' }).click();
  await page.locator('.modal button', { hasText: 'Publicar' }).click();
  await page.waitForTimeout(300);
  const pub = await page.evaluate(() => JSON.parse(localStorage.getItem('aprendo2:v1')).contenido.fechas);
  ok('Adulto: la fecha publicada llega a la versión del niño', Array.isArray(pub.publicado) && pub.publicado.some((f) => f.descripcion.includes('revisado por el adulto')) && pub.borrador === null);
  await foto('24-adulto-fechas');

  // revisar y probar un ejercicio sin que cuente
  await page.goto(`${BASE}#/revisar/nat-1-2`);
  await page.waitForSelector('text=4. Practico');
  ok('Adulto: «Revisar» muestra las respuestas de los manipulables', !(await page.locator('main').innerText()).includes('Respuesta: pictograma: ""'));
  await foto('25-adulto-revisar');
  const antes = await page.evaluate(() => JSON.parse(localStorage.getItem('aprendo2:v1')).temas['nat-1-2'].intentos);
  await page.locator('button', { hasText: '▶ Probar' }).first().click();
  await page.waitForSelector('.zona-ejercicio');
  const despues = await page.evaluate(() => JSON.parse(localStorage.getItem('aprendo2:v1')).temas['nat-1-2'].intentos);
  ok('Adulto: probar un ejercicio no cambia el progreso', antes === despues);

  // verificación de todo el contenido desde el panel
  await page.goto(`${BASE}#/adulto/contenido`);
  await page.locator('button', { hasText: 'Verificar' }).click();
  await page.waitForSelector('text=/temas correctos/', { timeout: 60000 });
  const verif = await page.locator('text=/temas correctos/').innerText();
  ok('Adulto: verificación de contenido', /(\d+) de \1 temas correctos/.test(verif), verif);

  // ---------- sin conexión ----------
  await page.goto(`${BASE}#/inicio`);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForTimeout(2500);
  await contexto.setOffline(true);
  await page.reload();
  await page.waitForSelector('.continuar', { timeout: 15000 });
  await page.goto(`${BASE}#/tema/soc-3-3`);
  await page.waitForSelector('.tema-cabecera');
  const hayBoton = await page.locator('button', { hasText: /Empezar|Continuar/ }).count();
  ok('Sin conexión: la app abre y carga un tema no visitado', hayBoton > 0);
  if (hayBoton) {
    await page.locator('button', { hasText: /Empezar|Continuar/ }).first().click();
    await page.waitForSelector('.tarjeta-explicacion', { timeout: 10000 });
    ok('Sin conexión: la lección se puede usar', true);
    await foto('30-sin-conexion');
  }
  await contexto.setOffline(false);

  // ---------- 360 px ----------
  const chico = await navegador.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p2 = await chico.newPage();
  for (const ruta of ['#/inicio', '#/materia/comunicacion', '#/tema/mat-7-3', '#/leccion/mat-7-3/explicacion', '#/acerca']) {
    await p2.goto(`${BASE}${ruta}`);
    await p2.waitForTimeout(700);
    ok(`360 px sin desborde: ${ruta}`, await p2.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  }
  await p2.screenshot({ path: `${SALIDA}/40-360px.png` });
  await chico.close();
} catch (e) {
  ok('El recorrido terminó sin excepciones', false, String(e.stack || e).slice(0, 800));
  await foto('99-error').catch(() => {});
} finally {
  ok('Sin errores de JavaScript en la página', erroresPagina.length === 0, erroresPagina.slice(0, 5).join(' | '));
  writeFileSync(`${SALIDA}/resultados.json`, JSON.stringify(resultados, null, 1));
  await navegador.close();
  if (servidor) servidor.kill();
  const fallos = resultados.filter((r) => !r.ok);
  console.log(`\n${resultados.length - fallos.length} de ${resultados.length} comprobaciones correctas. Capturas en test-results/e2e/`);
  process.exit(fallos.length ? 1 : 0);
}
