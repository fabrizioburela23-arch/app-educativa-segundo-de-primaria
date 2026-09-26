// Utilidades para recorrer la app como lo haría un niño, en tamaño de celular.
// Lee el ejercicio actual desde window.__aprendoPrueba (solo para saber la respuesta)
// y responde tocando la interfaz real.

export async function ejercicioActual(page) {
  return page.evaluate(() => (window.__aprendoPrueba ? JSON.parse(JSON.stringify(window.__aprendoPrueba.ejercicio)) : null));
}

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const etiqueta = (x) => norm(typeof x === 'string' ? x : [x.emoji, x.texto].filter(Boolean).join(' '));

async function clicTexto(page, selector, texto, { exacto = true, excluir = '', opcional = false } = {}) {
  const els = page.locator(selector);
  const n = await els.count();
  for (let i = 0; i < n; i++) {
    const el = els.nth(i);
    const t = norm(await el.innerText());
    const clase = (await el.getAttribute('class')) || '';
    if (excluir && clase.split(' ').some((c) => excluir.split(' ').includes(c))) continue;
    if (await el.isDisabled().catch(() => false)) continue;
    if (exacto ? t === norm(texto) : t.includes(norm(texto))) { await el.click(); return true; }
  }
  if (opcional) return false;
  throw new Error(`No encontré «${texto}» en ${selector}`);
}

async function teclear(page, numero) {
  for (const d of String(numero)) await page.locator('.teclado button', { hasText: new RegExp(`^${d}$`) }).first().click();
}

// Responde el ejercicio actual. bien=true: respuesta correcta; bien=false: incorrecta.
export async function responder(page, ej, bien, manipular = null) {
  switch (ej.tipo) {
    case 'opcion': {
      const op = bien ? ej.opciones.find((o) => o.correcta) : ej.opciones.find((o) => !o.correcta);
      const ops = page.locator('.opcion');
      const n = await ops.count();
      const esperado = norm([op.emoji, op.texto].filter(Boolean).join(' '));
      for (let i = 0; i < n; i++) {
        const t = norm(await ops.nth(i).innerText());
        if (t === esperado || (op.texto && t.endsWith(norm(op.texto)) && t.length - norm(op.texto).length <= 4) || (!op.texto && t === norm(op.emoji || ''))) {
          if (!(await ops.nth(i).isDisabled())) { await ops.nth(i).click(); return; }
        }
      }
      throw new Error(`Opción no encontrada: ${esperado}`);
    }
    case 'multiple': {
      const lista = bien ? ej.opciones.filter((o) => o.correcta) : [ej.opciones.find((o) => !o.correcta)];
      for (const op of lista) await clicTexto(page, '.opcion', [op.emoji, op.texto].filter(Boolean).join(' '), { excluir: 'elegida', opcional: true });
      return;
    }
    case 'tocar': {
      const correctas = (ej.texto.match(/\*([^*]+)\*/g) || []).map((x) => x.replace(/\*/g, ''));
      if (bien) { for (const c of correctas) await clicTexto(page, '.palabra', c, { excluir: 'elegida', opcional: true }); return; }
      const todas = page.locator('.palabra');
      const n = await todas.count();
      for (let i = 0; i < n; i++) {
        const t = norm(await todas.nth(i).innerText());
        if (!correctas.includes(t)) { await todas.nth(i).click(); return; }
      }
      return;
    }
    case 'completar': {
      const respuestas = (ej.texto.match(/\[([^\]]+)\]/g) || []).map((x) => x.slice(1, -1).split('|')[0]);
      if (ej.modo === 'escribir') {
        const inputs = page.locator('.hueco input');
        for (let i = 0; i < respuestas.length; i++) await inputs.nth(i).fill(bien ? respuestas[i] : 'x');
        return;
      }
      const orden = bien ? respuestas : [...(ej.banco && ej.banco.length ? [ej.banco[0]] : [respuestas[respuestas.length - 1]]), ...respuestas.slice(1)];
      if (!bien && respuestas.length === 1 && orden[0] === respuestas[0]) orden[0] = ej.banco[0];
      const huecos = page.locator('.texto-completar .hueco');
      for (let i = 0; i < orden.length; i++) {
        const cls = (await huecos.nth(i).getAttribute('class')) || '';
        if (cls.includes('lleno')) continue;
        await huecos.nth(i).click();
        await clicTexto(page, '.banco .ficha', orden[i], { excluir: 'usada' });
      }
      return;
    }
    case 'escribir':
      await page.locator('input.campo-texto').fill(bien ? ej.respuestas[0] : 'zzzz');
      return;
    case 'numero': {
      const campos = ej.campos || [{ respuesta: ej.respuesta }];
      const cajas = page.locator('.caja-numero');
      for (let i = 0; i < campos.length; i++) {
        await cajas.nth(i).click();
        for (let k = 0; k < 7; k++) await page.locator('.teclado button.borrar').first().click();
        const valor = bien ? campos[i].respuesta : campos[i].respuesta + 1;
        await teclear(page, valor);
      }
      return;
    }
    case 'ordenar': {
      const els = ej.elementos.map((e) => norm(typeof e === 'string' ? e : [e.emoji, e.texto].filter(Boolean).join(' ')));
      const orden = bien ? els : [...els].reverse();
      for (const e of orden) await clicTexto(page, '.ordenar-origen .ficha', e, { excluir: 'usada', opcional: true });
      return;
    }
    case 'relacionar': {
      const pares = ej.pares.map((p) => [etiqueta(p[0]), etiqueta(p[1])]);
      const der = pares.map((p) => p[1]);
      const usar = bien ? der : [der[1], der[0], ...der.slice(2)];
      for (let i = 0; i < pares.length; i++) {
        if (!(await clicTexto(page, '.relacionar .col:first-child .ficha', pares[i][0], { excluir: 'unida', opcional: true }))) continue;
        await clicTexto(page, '.relacionar .col:nth-child(2) .ficha', usar[i]);
      }
      return;
    }
    case 'clasificar': {
      for (let i = 0; i < ej.elementos.length; i++) {
        const e = ej.elementos[i];
        let cat = ej.categorias.find((c) => c.id === e.categoria);
        if (!bien && i === 0) cat = ej.categorias.find((c) => c.id !== e.categoria);
        if (!(await clicTexto(page, '.clasificar-origen .ficha', [e.emoji, e.texto].filter(Boolean).join(' '), { opcional: true }))) continue;
        await page.locator('.categoria', { hasText: cat.texto }).first().locator('.cab').click();
      }
      return;
    }
    case 'memoria': {
      const cartas = page.locator('.carta');
      const n = await cartas.count();
      const pares = ej.pares.map((p) => p.map(etiqueta));
      const parDe = (t) => { for (const [a, b] of pares) { if (a === t) return b; if (b === t) return a; } return null; };
      const conocidas = new Map();
      const hechas = new Set();
      for (let i = 0; i < n; i++) {
        if (hechas.has(i)) continue;
        await cartas.nth(i).click();
        const t = norm(await cartas.nth(i).innerText());
        const pareja = parDe(t);
        if (conocidas.has(pareja)) {
          const j = conocidas.get(pareja);
          await cartas.nth(j).click();
          hechas.add(i); hechas.add(j);
          await page.waitForTimeout(150);
          continue;
        }
        // abrir la siguiente para ver si es su pareja
        let k = i + 1;
        while (k < n && hechas.has(k)) k++;
        if (k >= n) break;
        await cartas.nth(k).click();
        const t2 = norm(await cartas.nth(k).innerText());
        if (parDe(t2) === t) { hechas.add(i); hechas.add(k); await page.waitForTimeout(150); continue; }
        conocidas.set(t, i); conocidas.set(t2, k);
        await page.waitForTimeout(1250);
        // si la pareja de t2 ya se conocía, ciérrala ahora
        const p2 = parDe(t2);
        if (conocidas.has(p2) && conocidas.get(p2) !== k) {
          await cartas.nth(conocidas.get(p2)).click();
          await cartas.nth(k).click();
          hechas.add(conocidas.get(p2)); hechas.add(k);
          await page.waitForTimeout(150);
        }
        i = i; // continúa
      }
      // repasar las que falten con lo que ya se sabe
      for (let guard = 0; guard < 20 && hechas.size < n; guard++) {
        const pend = [...Array(n).keys()].filter((x) => !hechas.has(x));
        const a = pend[0];
        await cartas.nth(a).click();
        const ta = norm(await cartas.nth(a).innerText());
        const objetivo = parDe(ta);
        let b = [...conocidas].find(([t, idx]) => t === objetivo && !hechas.has(idx) && idx !== a)?.[1];
        if (b === undefined) b = pend[1];
        await cartas.nth(b).click();
        const tb = norm(await cartas.nth(b).innerText());
        conocidas.set(ta, a); conocidas.set(tb, b);
        if (parDe(ta) === tb) { hechas.add(a); hechas.add(b); await page.waitForTimeout(150); } else await page.waitForTimeout(1250);
      }
      return;
    }
    case 'escribir-libre':
      await page.locator('textarea.campo-texto').fill(bien ? ej.modelo : 'hola');
      return;
    case 'manipular':
      if (manipular) { await manipular(page, ej, bien); return; }
      throw new Error('Sin estrategia para manipular');
    default:
      throw new Error(`Tipo sin estrategia: ${ej.tipo}`);
  }
}

export async function pulsarComprobar(page) {
  const b = page.locator('.leccion-pie button', { hasText: 'Comprobar' });
  if (await b.count() && await b.isVisible()) {
    await b.click();
  }
}

export async function textoRetro(page) {
  const r = page.locator('.retro');
  await r.waitFor({ state: 'visible', timeout: 8000 });
  return norm(await r.innerText());
}

export async function cerrarRetro(page) {
  const b = page.locator('.retro button.boton');
  await b.click();
  await page.locator('.retro').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
}
