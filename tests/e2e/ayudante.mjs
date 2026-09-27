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
    case 'opcion':
    case 'multiple': {
      const idx = ej.opciones.map((o, i) => i).filter((i) => (bien ? ej.opciones[i].correcta : !ej.opciones[i].correcta));
      const lista = ej.tipo === 'multiple' && bien ? idx : idx.slice();
      for (const i of lista) {
        const b = page.locator(`.opcion[data-i="${i}"]`);
        if (await b.isDisabled()) continue;
        const cls = (await b.getAttribute('class')) || '';
        if (cls.includes('elegida')) { if (ej.tipo === 'opcion') return; continue; }
        await b.click();
        if (ej.tipo === 'opcion' || !bien) return;
      }
      if (ej.tipo === 'opcion') throw new Error(`Opción no encontrada (${bien ? 'correcta' : 'incorrecta'}) en ${ej.id}`);
      return;
    }
    case 'tocar': {
      const toks = await page.evaluate(async (texto) => {
        const m = await import(`${location.origin}/js/contenido/texto.js`);
        return m.tokenizarTocar(texto).tokens.map((t, i) => ({ i, palabra: !!t.palabra, correcta: !!t.correcta }));
      }, ej.texto);
      const objetivo = bien ? toks.filter((t) => t.correcta) : [toks.find((t) => t.palabra && !t.correcta)];
      for (const t of objetivo) {
        const b = page.locator(`.palabra[data-i="${t.i}"]`);
        const cls = (await b.getAttribute('class')) || '';
        if (bien && cls.includes('elegida')) continue;
        await b.click();
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
      let orden = respuestas.slice();
      if (!bien) {
        const k = respuestas.findIndex((r, i) => i > 0 && r !== respuestas[0]);
        if (ej.banco && ej.banco.length && !respuestas.includes(ej.banco[0])) orden[0] = ej.banco[0];
        else if (k > 0) { orden[0] = respuestas[k]; orden[k] = respuestas[0]; }
        else orden = [...respuestas].reverse();
      }
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
      const orden = ej.elementos.map((e, k) => k);
      if (!bien) orden.reverse();
      for (const k of orden) {
        const b = page.locator(`.ordenar-origen .ficha[data-k="${k}"]`);
        if (await b.isDisabled()) continue;
        await b.click();
      }
      return;
    }
    case 'relacionar': {
      const n = ej.pares.length;
      for (let i = 0; i < n; i++) {
        const izq = page.locator(`.relacionar .col:first-child .ficha[data-i="${i}"]`);
        if (((await izq.getAttribute('class')) || '').includes('unida')) continue;
        const j = bien ? i : (i === 0 ? 1 : i === 1 ? 0 : i);
        await izq.click();
        await page.locator(`.relacionar .col:nth-child(2) .ficha[data-i="${j}"]`).click();
      }
      return;
    }
    case 'clasificar': {
      for (let k = 0; k < ej.elementos.length; k++) {
        const e = ej.elementos[k];
        const ficha = page.locator(`.clasificar-origen .ficha[data-k="${k}"]`);
        if (!(await ficha.count())) continue;
        let cat = e.categoria;
        if (!bien && k === 0) cat = ej.categorias.find((c) => c.id !== e.categoria).id;
        await ficha.click();
        await page.locator(`.categoria[data-cat="${cat}"] .cab`).click();
      }
      return;
    }
    case 'memoria': {
      const cartas = page.locator('.carta');
      const n = await cartas.count();
      const pares = ej.pares.map((p) => p.map(etiqueta));
      const parDe = (t) => { for (const [a, b] of pares) { if (a === t) return b; if (b === t) return a; } return null; };
      const conocidas = new Map(); // índice → texto
      const hecha = async (i) => ((await cartas.nth(i).getAttribute('class')) || '').includes('hecha');
      const abrir = async (i) => {
        await cartas.nth(i).click();
        const t = norm(await cartas.nth(i).innerText());
        conocidas.set(i, t);
        return t;
      };
      for (let guardia = 0; guardia < 60; guardia++) {
        const pendientes = [];
        for (let i = 0; i < n; i++) if (!(await hecha(i))) pendientes.push(i);
        if (!pendientes.length) return;
        const a = pendientes[0];
        const ta = await abrir(a);
        const buscado = parDe(ta);
        let b = pendientes.find((i) => i !== a && conocidas.get(i) === buscado);
        if (b === undefined) b = pendientes.find((i) => i !== a && !conocidas.has(i));
        if (b === undefined) b = pendientes.find((i) => i !== a);
        await abrir(b);
        await page.waitForTimeout(parDe(ta) === conocidas.get(b) ? 200 : 1300);
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
  await page.waitForTimeout(480);
  const b = page.locator('.retro button.boton');
  await b.click();
  await page.locator('.retro').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
}
