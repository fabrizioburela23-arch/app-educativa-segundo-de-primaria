#!/usr/bin/env node
// Valida el contenido educativo.
//   node tools/validar-contenido.mjs              → todo (falla si falta algún tema)
//   node tools/validar-contenido.mjs mat-1-2 ...  → solo esos temas
//   node tools/validar-contenido.mjs --parcial    → todo, sin fallar por temas faltantes
//   --avisos  muestra también los avisos
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarTema } from '../js/contenido/validar.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (rel) => JSON.parse(readFileSync(join(raiz, rel), 'utf8'));

const args = process.argv.slice(2);
const parcial = args.includes('--parcial');
const verAvisos = args.includes('--avisos');
const pedidos = args.filter((a) => !a.startsWith('--'));

let fallos = 0;
const indice = leer('content/indice.json');
const datosJson = leer('content/datos.json');
const fechasJson = leer('content/fechas-civicas.json');
const datos = { feria: datosJson.feria, fechas: fechasJson.fechas };

// índice
const idsTema = [];
const vistos = new Set();
for (const m of indice.materias) {
  for (const u of m.unidades) {
    for (const t of u.temas) {
      if (vistos.has(t.id)) { console.error(`✗ índice: id repetido ${t.id}`); fallos++; }
      vistos.add(t.id);
      idsTema.push(t.id);
    }
  }
}

// fechas
const idsF = new Set();
for (const f of fechasJson.fechas) {
  const ok = f.id && !idsF.has(f.id) && Number.isInteger(f.dia) && f.dia >= 1 && f.dia <= 31 && Number.isInteger(f.mes) && f.mes >= 1 && f.mes <= 12
    && ['civica', 'conmemorativa', 'departamental'].includes(f.tipo) && f.nombre && f.descripcion;
  if (!ok) { console.error(`✗ fechas-civicas: entrada inválida ${JSON.stringify(f)}`); fallos++; }
  idsF.add(f.id);
}

// archivos sobrantes
const archivos = readdirSync(join(raiz, 'content/temas')).filter((f) => f.endsWith('.json'));
for (const a of archivos) {
  if (!vistos.has(a.replace(/\.json$/, ''))) { console.error(`✗ content/temas/${a} no está en indice.json`); fallos++; }
}

const lista = pedidos.length ? pedidos : idsTema;
let validos = 0, faltantes = 0;
for (const id of lista) {
  const ruta = `content/temas/${id}.json`;
  if (!existsSync(join(raiz, ruta))) {
    faltantes++;
    if (!parcial) { console.error(`✗ ${id}: falta ${ruta}`); fallos++; }
    continue;
  }
  let tema;
  try { tema = leer(ruta); } catch (e) { console.error(`✗ ${id}: JSON inválido — ${e.message}`); fallos++; continue; }
  const { errores, avisos, formas } = validarTema(tema, { idEsperado: id, datos });
  if (errores.length) {
    fallos++;
    console.error(`✗ ${id} (${errores.length} errores)`);
    errores.forEach((e) => console.error(`    - ${e}`));
  } else {
    validos++;
    console.log(`✓ ${id}  [${formas.join(', ')}]`);
  }
  if (verAvisos) avisos.forEach((a) => console.log(`    · aviso ${a}`));
}
console.log(`\n${validos} temas válidos de ${lista.length}${faltantes ? `, ${faltantes} faltantes` : ''}.`);
process.exit(fallos ? 1 : 0);
