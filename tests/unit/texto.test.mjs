import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compararEscrito, tokenizarTocar, analizarCompletar, revisarRequisitos, paraVoz } from '../../js/contenido/texto.js';
import { numeroAPalabras, aRomano, horaTexto } from '../../js/contenido/generadores.js';

test('compararEscrito: tildes flexibles aceptan y recuerdan; estrictas no aceptan', () => {
  assert.equal(compararEscrito('arbol', ['árbol']).correcto, true);
  assert.match(compararEscrito('arbol', ['árbol']).nota, /tilde/);
  assert.equal(compararEscrito('arbol', ['árbol'], { tildes: 'estricto' }).correcto, false);
  assert.equal(compararEscrito('Casa', ['casa']).correcto, true);
  assert.equal(compararEscrito('sucre', ['Sucre'], { mayusculas: 'estricto' }).correcto, false);
  assert.equal(compararEscrito('pinguino', ['pingüino'], { tildes: 'estricto' }).correcto, false);
  assert.equal(compararEscrito('  perro. ', ['perro']).correcto, true);
});

test('tokenizarTocar marca las palabras correctas', () => {
  const { tokens } = tokenizarTocar('*Wara* vive en *La Paz*.');
  const correctas = tokens.filter((t) => t.correcta).map((t) => t.texto);
  assert.deepEqual(correctas, ['Wara', 'La Paz']);
  assert.ok(tokenizarTocar('*mal').error);
});

test('analizarCompletar encuentra huecos y alternativas', () => {
  const r = analizarCompletar('El ca[rr]o y el [bebé|bebe].');
  assert.equal(r.huecos.length, 2);
  assert.deepEqual(r.huecos[1].aceptadas, ['bebé', 'bebe']);
  assert.ok(analizarCompletar('sin [cerrar').error);
});

test('revisarRequisitos revisa mayúscula, punto y palabras', () => {
  const req = [{ tipo: 'mayuscula-inicial' }, { tipo: 'punto-final' }, { tipo: 'min-palabras', valor: 4 }, { tipo: 'incluye', palabras: ['feria'] }];
  assert.ok(revisarRequisitos('En la feria hay papas.', req).every((x) => x.ok));
  const r = revisarRequisitos('en la feria hay papas', req);
  assert.equal(r[0].ok, false);
  assert.equal(r[1].ok, false);
  assert.ok(revisarRequisitos('¿Dónde está mi gato?', [{ tipo: 'signos-pregunta' }, { tipo: 'mayuscula-inicial' }])[1].ok);
});

test('números en palabras, romanos y horas', () => {
  assert.equal(numeroAPalabras(247), 'doscientos cuarenta y siete');
  assert.equal(numeroAPalabras(116), 'ciento dieciséis');
  assert.equal(numeroAPalabras(500), 'quinientos');
  assert.equal(numeroAPalabras(100), 'cien');
  assert.equal(aRomano(49), 'XLIX');
  assert.equal(aRomano(14), 'XIV');
  assert.equal(horaTexto(3, 30), 'Las 3 y media');
  assert.equal(horaTexto(12, 45), 'La 1 menos cuarto');
  assert.equal(horaTexto(1, 0), 'La 1 en punto');
});

test('paraVoz limpia marcas y lee símbolos', () => {
  assert.equal(paraVoz('**Hola** 3 × 4 = 12'), 'Hola 3 por 4 es igual a 12');
  assert.equal(paraVoz('Cuesta 5 Bs'), 'Cuesta 5 bolivianos');
});
