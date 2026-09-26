import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  progresoInicial, nuevaSesionPractica, aplicarResultadoPractica, practicaSuficiente, practicaAgotada,
  elegirPractica, elegirComprobacion, aplicarComprobacion, aplicarRepaso, repasoPendiente, recomendar, registrarResultado,
  CONFIG,
} from '../../js/motor/adaptativo.js';
import { crearRng } from '../../js/contenido/generadores.js';

const tema = {
  practica: [1, 1, 1, 2, 2, 2, 3, 3, 3].map((n, i) => ({ id: `p${i}`, nivel: n, tipo: 'numero', error: `e${n}` })),
  comprobacion: [1, 1, 2, 2, 2, 3, 3].map((n, i) => ({ id: `c${i}`, nivel: n, tipo: 'numero' })),
};

test('sube de nivel tras dos aciertos seguidos al primer intento', () => {
  const prog = progresoInicial(1);
  const s = nuevaSesionPractica(prog);
  assert.equal(aplicarResultadoPractica(s, prog, { id: 'p0', nivel: 1, r: 1 }).evento, null);
  assert.equal(aplicarResultadoPractica(s, prog, { id: 'p1', nivel: 1, r: 1 }).evento, 'sube');
  assert.equal(s.nivel, 2);
  assert.equal(prog.nivel, 2);
});

test('baja de nivel y muestra repaso cuando falla', () => {
  const prog = progresoInicial(2);
  const s = nuevaSesionPractica(prog);
  const r = aplicarResultadoPractica(s, prog, { id: 'p3', nivel: 2, r: 0 });
  assert.equal(r.evento, 'baja');
  assert.equal(r.mostrarRepaso, true);
  assert.equal(s.nivel, 1);
  assert.equal(s.pendientes.length, 1);
});

test('dos aciertos al segundo intento seguidos bajan el nivel', () => {
  const prog = progresoInicial(3);
  const s = nuevaSesionPractica(prog);
  aplicarResultadoPractica(s, prog, { id: 'p6', nivel: 3, r: 0.5 });
  const r = aplicarResultadoPractica(s, prog, { id: 'p7', nivel: 3, r: 0.5 });
  assert.equal(r.evento, 'baja');
  assert.equal(s.nivel, 2);
});

test('la práctica no termina solo por tocar botones: exige aciertos recientes en nivel 2 o más', () => {
  const prog = progresoInicial(1);
  const s = nuevaSesionPractica(prog);
  for (let i = 0; i < 6; i++) aplicarResultadoPractica(s, prog, { id: `x${i}`, nivel: 1, r: 0.5 });
  assert.equal(practicaSuficiente(s), false);
  const s2 = nuevaSesionPractica(prog);
  for (let i = 0; i < 4; i++) aplicarResultadoPractica(s2, prog, { id: `y${i}`, nivel: 2, r: 1 });
  assert.equal(practicaSuficiente(s2), false, 'mínimo de ejercicios');
  aplicarResultadoPractica(s2, prog, { id: 'y5', nivel: 2, r: 1 });
  assert.equal(practicaSuficiente(s2), true);
});

test('después de muchos intentos sin lograrlo se ofrece descansar', () => {
  const prog = progresoInicial(1);
  const s = nuevaSesionPractica(prog);
  for (let i = 0; i < CONFIG.maxPractica; i++) aplicarResultadoPractica(s, prog, { id: `z${i}`, nivel: 1, r: 0 });
  assert.equal(practicaAgotada(s), true);
});

test('elegirPractica respeta el nivel y reintenta lo fallado', () => {
  const prog = progresoInicial(2);
  const s = nuevaSesionPractica(prog);
  const rng = crearRng(1);
  const a = elegirPractica(tema, prog, s, rng);
  assert.equal(a.ejercicio.nivel, 2);
  aplicarResultadoPractica(s, prog, { id: a.ejercicio.id, nivel: 2, r: 0 });
  const b = elegirPractica(tema, prog, s, rng);
  aplicarResultadoPractica(s, prog, { id: b.ejercicio.id, nivel: b.ejercicio.nivel, r: 1 });
  const c = elegirPractica(tema, prog, s, rng);
  aplicarResultadoPractica(s, prog, { id: c.ejercicio.id, nivel: c.ejercicio.nivel, r: 1 });
  const d = elegirPractica(tema, prog, s, rng);
  assert.equal(d.ejercicio.id, a.ejercicio.id);
  assert.equal(d.reintento, true);
});

test('la comprobación elige 5 ejercicios de fácil a difícil', () => {
  const sel = elegirComprobacion(tema, crearRng(3));
  assert.equal(sel.length, 5);
  assert.deepEqual(sel.map((x) => x.nivel), [1, 2, 2, 2, 3]);
});

test('logro con 80 % y repaso espaciado', () => {
  const prog = progresoInicial(2);
  const r = aplicarComprobacion(prog, [{ r: 1 }, { r: 1 }, { r: 1 }, { r: 0.5 }, { r: 0.5 }], '2026-09-26');
  assert.equal(r.logrado, true);
  assert.equal(prog.estado, 'logrado');
  assert.equal(prog.repaso.proximo, '2026-09-29');
  assert.equal(repasoPendiente(prog, '2026-09-28'), false);
  assert.equal(repasoPendiente(prog, '2026-09-29'), true);
  aplicarRepaso(prog, [{ r: 1 }, { r: 1 }, { r: 1 }, { r: 0.5 }], '2026-09-29');
  assert.equal(prog.repaso.proximo, '2026-10-06');
  aplicarRepaso(prog, [{ r: 0 }, { r: 0 }, { r: 1 }, { r: 0.5 }], '2026-10-06');
  assert.equal(prog.estado, 'repasar');
});

test('sin llegar al 80 % el tema vuelve a práctica con enfoque en lo fallado', () => {
  const prog = progresoInicial(2);
  const r = aplicarComprobacion(prog, [{ r: 1 }, { r: 0, error: 'a' }, { r: 1 }, { r: 0.5, error: 'b' }, { r: 1 }], '2026-09-26');
  assert.equal(r.logrado, false);
  assert.equal(prog.estado, 'en-curso');
  assert.deepEqual(r.enfoque.sort(), ['a', 'b']);
});

test('recomendar prioriza el tema asignado y luego el que está en curso', () => {
  const indice = { materias: [{ id: 'm', unidades: [{ temas: [{ id: 't1' }, { id: 't2' }, { id: 't3' }] }] }] };
  const temas = { t2: { ...progresoInicial(2), estado: 'en-curso' } };
  assert.equal(recomendar(indice, temas, { temaAsignado: { id: 't3' } }, 't2', '2026-09-26').tema.id, 't3');
  assert.equal(recomendar(indice, temas, { temaAsignado: null }, 't2', '2026-09-26').tema.id, 't2');
  assert.equal(recomendar(indice, {}, { temaAsignado: null }, null, '2026-09-26').tema.id, 't1');
});

test('registrarResultado cuenta errores y aciertos', () => {
  const prog = progresoInicial(2);
  registrarResultado(prog, { r: 1, errores: [], ejercicioId: 'a' });
  registrarResultado(prog, { r: 0, errores: ['x', 'x'], ejercicioId: 'b' });
  assert.equal(prog.intentos, 2);
  assert.equal(prog.primer, 1);
  assert.equal(prog.errores.x, 2);
  assert.equal(prog.estado, 'en-curso');
});
