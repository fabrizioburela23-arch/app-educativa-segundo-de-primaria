#!/usr/bin/env node
// Copia a una carpeta solo los archivos que la app necesita para publicarse:
// los de precache.json (lo mismo que se guarda para usar sin conexión), sw.js, precache.json
// y la licencia de la fuente Andika, que debe acompañar a la fuente.
// Uso:  node tools/generar-precache.mjs && node tools/preparar-sitio.mjs _sitio
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = resolve(process.argv[2] || '_sitio');
const { archivos } = JSON.parse(readFileSync(join(raiz, 'precache.json'), 'utf8'));
const lista = [...archivos.filter((a) => a !== './'), 'sw.js', 'precache.json', 'fonts/OFL.txt'];

const faltan = lista.filter((a) => !existsSync(join(raiz, a)));
if (faltan.length) {
  console.error(`Faltan archivos de precache.json (ejecuta «npm run precache»): ${faltan.join(', ')}`);
  process.exit(1);
}
// La carpeta de destino se borra antes de copiar: nunca puede ser el proyecto ni una carpeta que lo contenga.
const desdeDestino = relative(destino, raiz);
if (desdeDestino === '' || (!desdeDestino.startsWith('..') && !isAbsolute(desdeDestino))) {
  console.error(`El destino no puede ser la carpeta del proyecto ni una que la contenga: ${destino}`);
  process.exit(1);
}
rmSync(destino, { recursive: true, force: true });
for (const a of lista) {
  mkdirSync(dirname(join(destino, a)), { recursive: true });
  cpSync(join(raiz, a), join(destino, a));
}
console.log(`Sitio listo en ${destino}: ${lista.length} archivos.`);
