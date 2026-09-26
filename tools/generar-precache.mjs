#!/usr/bin/env node
// Genera precache.json (lista de archivos para uso sin conexión) y actualiza VERSION en sw.js.
// Ejecutar después de cambiar código o contenido:  node tools/generar-precache.mjs
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const incluir = ['index.html', 'manifest.webmanifest', 'css', 'js', 'fonts', 'icons', 'content'];
const extensiones = /\.(html|css|js|json|woff2|png|svg|webmanifest)$/;

function recorrer(ruta, lista) {
  const abs = join(raiz, ruta);
  if (statSync(abs).isDirectory()) {
    for (const f of readdirSync(abs).sort()) recorrer(join(ruta, f), lista);
  } else if (extensiones.test(ruta)) lista.push(relative(raiz, abs).split('\\').join('/'));
}

const archivos = [];
incluir.forEach((r) => recorrer(r, archivos));
const hash = createHash('sha256');
for (const a of archivos) hash.update(a).update(readFileSync(join(raiz, a)));
const version = hash.digest('hex').slice(0, 12);
archivos.unshift('./');
writeFileSync(join(raiz, 'precache.json'), `${JSON.stringify({ version, archivos }, null, 1)}\n`);
const sw = readFileSync(join(raiz, 'sw.js'), 'utf8').replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
writeFileSync(join(raiz, 'sw.js'), sw);
console.log(`precache.json: ${archivos.length} archivos · versión ${version}`);
