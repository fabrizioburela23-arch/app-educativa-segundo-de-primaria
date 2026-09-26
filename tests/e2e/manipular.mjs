// Estrategia de prueba para ejercicios «manipular».
// Respuesta incorrecta: siempre tocando la interfaz real.
// Respuesta correcta: bloques con la interfaz real; el resto usa mostrarSolucion() del
// manipulable (su interacción fina se prueba en la galería dev/visuales.html).

async function solucionar(page) {
  await page.evaluate(() => {
    const { ctrl, ctx } = window.__aprendoPrueba;
    ctrl.manipulable.mostrarSolucion();
    ctx.alCambiar();
  });
}

async function clicVeces(loc, n) { for (let i = 0; i < n; i++) await loc.click(); }

export async function estrategiaManipular(page, ej, bien) {
  const m = ej.manipulable;
  const raiz = page.locator('.zona-ejercicio');
  switch (m.tipo) {
    case 'bloques': {
      const ini = m.inicial || {};
      const cif = { centenas: Math.floor(m.objetivo / 100), decenas: Math.floor((m.objetivo % 100) / 10), unidades: m.objetivo % 10 };
      if (!bien) cif.unidades = cif.unidades === 9 ? 8 : cif.unidades + 1;
      await page.evaluate(() => window.__aprendoPrueba.ctrl.manipulable.reiniciar());
      for (const k of ['centenas', 'decenas', 'unidades']) {
        const dif = cif[k] - (ini[k] || 0);
        if (dif > 0) await clicVeces(raiz.locator(`.bqm-${k} .mas`), dif);
        if (dif < 0) await clicVeces(raiz.locator(`.bqm-${k} .menos`), -dif);
      }
      return;
    }
    default:
      if (bien) { await solucionar(page); return; }
  }
  // respuestas incorrectas tocando la interfaz
  switch (m.tipo) {
    case 'dinero': await raiz.locator('button[aria-label^="Poner"]').first().click(); await raiz.locator('button[aria-label^="Poner"]').first().click(); return;
    case 'reloj': await raiz.locator('button[aria-label^="Más"]').first().click(); return;
    case 'recta': await raiz.locator('button[aria-label*="derecha"]').first().click(); return;
    case 'calendario': {
      const dias = raiz.locator('button');
      const n = await dias.count();
      for (let i = 0; i < n; i++) {
        const t = (await dias.nth(i).innerText()).trim();
        if (/^\d+$/.test(t) && Number(t) !== m.objetivo) { await dias.nth(i).click(); return; }
      }
      return;
    }
    case 'fraccion': await clicVeces(raiz.locator('.fr-parte').first(), 1); if (m.objetivo === 1) await raiz.locator('.fr-parte').nth(1).click(); return;
    case 'grupos': await raiz.locator('.grm-grupo .mas').first().click(); if (m.porGrupo === 1 && m.grupos === 1) await raiz.locator('.grm-grupo .mas').first().click(); return;
    case 'pictograma': await raiz.locator('.pim-fila .mas').first().click(); await raiz.locator('.pim-fila .mas').first().click(); return;
    case 'repartir': await clicVeces(raiz.locator('.rep-poner').first(), m.total); return;
    case 'patron': {
      const primera = raiz.locator('button[aria-label^="Poner"]').first();
      const segunda = raiz.locator('button[aria-label^="Poner"]').nth(1);
      for (let i = 0; i < m.completar; i++) await (i === 0 && m.solucion[0] === m.opciones[0] ? segunda : primera).click();
      return;
    }
    case 'simetria': {
      const espejo = new Set(m.celdas.map(([f, c]) => `${f},${m.columnas - 1 - c}`));
      for (let f = 0; f < m.filas; f++) {
        for (let c = m.columnas / 2; c < m.columnas; c++) {
          if (!espejo.has(`${f},${c}`)) {
            const celda = raiz.locator(`[aria-label^="Fila ${f + 1}, columna ${c + 1}"]`);
            if (await celda.count()) { await celda.first().click(); return; }
          }
        }
      }
      return;
    }
    default: await solucionar(page);
  }
}
