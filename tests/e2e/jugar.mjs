// Motor de recorrido: avanza por la lección respondiendo según una política.
import { ejercicioActual, responder, pulsarComprobar } from './ayudante.mjs';

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// politica(ej, n) → true (responder bien) | false (responder mal). n = número de ejercicio visto.
// elegir(textos) → texto del botón a tocar en pantallas con opciones.
export async function jugar(page, { politica = () => true, fallarReintento = () => false, elegir = (t) => t[0], parar = async () => false, manipular = null, max = 400, registro = [] } = {}) {
  let ultimo = null;
  let n = 0;
  let reintento = false;
  for (let paso = 0; paso < max; paso++) {
    if (await parar(page)) return registro;
    const retro = page.locator('.retro');
    if (await retro.count() && await retro.isVisible()) {
      const t = norm(await retro.innerText());
      registro.push({ tipo: 'retro', texto: t.slice(0, 160) });
      reintento = t.startsWith('💡') || t.includes('Casi');
      await retro.locator('button.boton').click();
      await page.waitForTimeout(120);
      continue;
    }
    const comprobar = page.locator('.leccion-pie button', { hasText: /^Comprobar$/ });
    if (await comprobar.count() && await comprobar.isVisible()) {
      const ej = await ejercicioActual(page);
      const clave = JSON.stringify(ej);
      let bien = true;
      if (clave !== ultimo || !reintento) {
        n++;
        bien = politica(ej, n);
        registro.push({ tipo: 'ejercicio', ej: ej.tipo, id: ej.id, bien, enunciado: ej.enunciado });
      } else {
        bien = !fallarReintento(ej, n);
        registro.push({ tipo: 'reintento', ej: ej.tipo, id: ej.id, bien });
      }
      ultimo = clave;
      reintento = false;
      await responder(page, ej, bien, manipular);
      await page.waitForTimeout(80);
      if (await comprobar.isEnabled()) await pulsarComprobar(page);
      else registro.push({ tipo: 'aviso', texto: `Comprobar sigue desactivado en ${ej.id} (${ej.tipo})` });
      await page.waitForTimeout(150);
      continue;
    }
    // memoria: sin botón Comprobar
    const ej = await ejercicioActual(page);
    if (ej && ej.tipo === 'memoria' && await page.locator('.memoria').count() && JSON.stringify(ej) !== ultimo) {
      ultimo = JSON.stringify(ej);
      n++;
      registro.push({ tipo: 'ejercicio', ej: 'memoria', id: ej.id, bien: true });
      await responder(page, ej, true);
      await page.waitForTimeout(700);
      continue;
    }
    const botones = page.locator('.leccion-pie button:visible');
    const k = await botones.count();
    if (k) {
      const textos = [];
      for (let i = 0; i < k; i++) textos.push(norm(await botones.nth(i).innerText()));
      const t = elegir(textos.filter((x) => x !== '← Atrás'));
      registro.push({ tipo: 'boton', texto: t });
      await botones.filter({ hasText: t }).first().click();
      await page.waitForTimeout(150);
      continue;
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`jugar: se alcanzó el máximo de pasos. Último registro: ${JSON.stringify(registro.slice(-5))}`);
}
