// Valida todos los temas existentes con el mismo validador de la app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validarTema } from '../../js/contenido/validar.js';

const raiz = new URL('../../', import.meta.url);
const leer = (r) => JSON.parse(readFileSync(new URL(r, raiz), 'utf8'));
const datos = { feria: leer('content/datos.json').feria, fechas: leer('content/fechas-civicas.json').fechas };
const indice = leer('content/indice.json');
const ids = indice.materias.flatMap((m) => m.unidades.flatMap((u) => u.temas.map((t) => t.id)));

test('cada archivo de tema está en el índice', () => {
  for (const f of readdirSync(new URL('content/temas/', raiz))) assert.ok(ids.includes(f.replace('.json', '')), f);
});

for (const id of ids) {
  test(`tema ${id}`, { skip: !readdirSync(new URL('content/temas/', raiz)).includes(`${id}.json`) && 'sin archivo' }, () => {
    const { errores } = validarTema(leer(`content/temas/${id}.json`), { idEsperado: id, datos, muestras: 10 });
    assert.deepEqual(errores, []);
  });
}
