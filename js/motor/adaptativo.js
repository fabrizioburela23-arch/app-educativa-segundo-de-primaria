// Lógica adaptativa (pura, sin DOM; se prueba en Node).
// r = resultado de un ejercicio: 1 (primer intento), 0.5 (segundo intento), 0 (no lo logró).

export const CONFIG = {
  minPractica: 5,          // ejercicios mínimos de práctica por sesión
  maxPractica: 14,         // después de esto se ofrece descansar o repasar
  ventana: 4,              // últimos ejercicios que se miran para decidir
  aciertosVentana: 3,      // suma mínima de r en la ventana
  subirTras: 2,            // aciertos seguidos al primer intento para subir de nivel
  umbralLogro: 0.8,        // puntaje de la comprobación para lograr el tema
  nivelesComprobacion: [1, 2, 2, 2, 3],
  intervalosRepaso: [3, 7, 14, 30],
  umbralRepaso: 0.75,
  itemsRepaso: 4,
  itemsDesafio: 5,
  reintentoTras: 2,        // un ejercicio fallado vuelve después de 2 ejercicios
};

export const FASES = ['explicacion', 'ejemplo', 'guiada', 'practica', 'comprobacion'];

export function progresoInicial(nivel = 2) {
  return {
    estado: 'nuevo',          // nuevo | en-curso | logrado | repasar
    fase: 'explicacion',
    nivel: Math.min(3, Math.max(1, nivel)),
    vistos: { explicacion: false, ejemplo: false, guiada: false, practica: false },
    intentos: 0, primer: 0, segundo: 0, fallos: 0,
    errores: {},
    vistosEj: {},
    recientes: [],
    comprobaciones: [],
    mejor: 0,
    logradoEn: null,
    repaso: null,             // { proximo: 'AAAA-MM-DD', indice }
    ultimaVez: null,
    desafios: 0,
  };
}

// ---------- registro de resultados ----------

export function registrarResultado(prog, { r, errores = [], ejercicioId, fase }) {
  prog.intentos++;
  if (r === 1) prog.primer++;
  else if (r === 0.5) prog.segundo++;
  else prog.fallos++;
  for (const e of errores) if (e) prog.errores[e] = (prog.errores[e] || 0) + 1;
  if (ejercicioId) prog.vistosEj[ejercicioId] = (prog.vistosEj[ejercicioId] || 0) + 1;
  prog.recientes.push(r);
  if (prog.recientes.length > 12) prog.recientes.shift();
  prog.ultimaVez = new Date().toISOString();
  if (prog.estado === 'nuevo') prog.estado = 'en-curso';
  void fase;
}

// ---------- sesión de práctica ----------

export function nuevaSesionPractica(prog, { enfoque = [] } = {}) {
  return {
    nivel: prog.nivel,
    resultados: [],      // { id, nivel, r }
    racha: 0,
    pendientes: [],      // { id, tras }  ejercicios fallados para reintentar
    usados: new Set(),
    enfoque,             // etiquetas de error para priorizar (después de una comprobación)
    repasoMostrado: false,
  };
}

// Devuelve { evento: 'sube' | 'baja' | null, mostrarRepaso: bool }
export function aplicarResultadoPractica(sesion, prog, { id, nivel, r }) {
  sesion.resultados.push({ id, nivel, r });
  sesion.pendientes.forEach((p) => { p.tras--; });
  let evento = null;
  let mostrarRepaso = false;
  if (r === 1) {
    sesion.racha++;
    if (sesion.racha >= CONFIG.subirTras && sesion.nivel < 3) {
      sesion.nivel++;
      sesion.racha = 0;
      evento = 'sube';
    }
  } else {
    sesion.racha = 0;
    const ultimos = sesion.resultados.slice(-2);
    const dosMedios = ultimos.length === 2 && ultimos.every((x) => x.r === 0.5);
    if (r === 0 || dosMedios) {
      if (sesion.nivel > 1) { sesion.nivel--; evento = 'baja'; }
      if (!sesion.repasoMostrado || r === 0) { mostrarRepaso = true; sesion.repasoMostrado = true; }
    }
    if (r === 0) sesion.pendientes.push({ id, tras: CONFIG.reintentoTras });
  }
  prog.nivel = sesion.nivel;
  return { evento, mostrarRepaso };
}

export function practicaSuficiente(sesion) {
  const res = sesion.resultados;
  if (res.length < CONFIG.minPractica) return false;
  const ventana = res.slice(-CONFIG.ventana);
  if (ventana.length < CONFIG.ventana) return false;
  const suma = ventana.reduce((a, x) => a + x.r, 0);
  const nivelOk = ventana.every((x) => x.nivel >= 2);
  return suma >= CONFIG.aciertosVentana && nivelOk;
}

export function practicaAgotada(sesion) {
  return sesion.resultados.length >= CONFIG.maxPractica && !practicaSuficiente(sesion);
}

// Progreso aproximado hacia el objetivo de la práctica (0..1), solo para mostrar ánimo.
export function avancePractica(sesion) {
  const n = sesion.resultados.length;
  const ventana = sesion.resultados.slice(-CONFIG.ventana);
  const buenos = ventana.filter((x) => x.r >= 0.5 && x.nivel >= 2).length;
  return Math.min(1, (Math.min(n, CONFIG.minPractica) / CONFIG.minPractica) * 0.5 + (buenos / CONFIG.ventana) * 0.5);
}

function azar(rng) { return rng ? rng() : Math.random(); }

// Elige el siguiente ejercicio de práctica.
export function elegirPractica(tema, prog, sesion, rng) {
  const banco = tema.practica || [];
  if (!banco.length) return null;
  // 1. reintento de un ejercicio fallado
  const listo = sesion.pendientes.find((p) => p.tras <= 0);
  if (listo) {
    sesion.pendientes = sesion.pendientes.filter((p) => p !== listo);
    const ej = banco.find((e) => e.id === listo.id);
    if (ej) return { ejercicio: ej, reintento: true };
  }
  // 2. candidatos del nivel actual (o el más cercano)
  let candidatos = [];
  for (const d of [0, -1, 1, -2, 2]) {
    candidatos = banco.filter((e) => e.nivel === sesion.nivel + d);
    if (candidatos.length) break;
  }
  const ultimo = sesion.resultados.length ? sesion.resultados[sesion.resultados.length - 1].id : null;
  const noUsados = candidatos.filter((e) => !sesion.usados.has(e.id) || e.tipo === 'generador');
  let pool = noUsados.length ? noUsados : candidatos;
  if (pool.length > 1) pool = pool.filter((e) => e.id !== ultimo);
  if (!pool.length) pool = candidatos;
  // 3. puntaje: menos vistos primero; prioriza errores frecuentes y el enfoque
  const puntaje = (e) => {
    let p = (prog.vistosEj[e.id] || 0) * 2;
    if (sesion.usados.has(e.id)) p += 5;
    const tag = e.error;
    if (tag && sesion.enfoque.includes(tag)) p -= 3;
    if (tag && prog.errores[tag]) p -= Math.min(2, prog.errores[tag] * 0.5);
    return p + azar(rng) * 1.5;
  };
  pool = pool.slice().sort((a, b) => puntaje(a) - puntaje(b));
  const elegido = pool[0];
  sesion.usados.add(elegido.id);
  return { ejercicio: elegido, reintento: false };
}

// Comprobación final: 5 ejercicios según CONFIG.nivelesComprobacion, de fácil a difícil.
export function elegirComprobacion(tema, rng) {
  const banco = (tema.comprobacion || []).slice();
  const mezcla = (arr) => {
    const r = arr.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(azar(rng) * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  };
  const disponibles = mezcla(banco);
  const elegidos = [];
  for (const nivel of CONFIG.nivelesComprobacion) {
    if (!disponibles.length) break;
    let idx = -1;
    for (const d of [0, 1, -1, 2, -2]) {
      idx = disponibles.findIndex((e) => e.nivel === nivel + d);
      if (idx >= 0) break;
    }
    if (idx < 0) idx = 0;
    elegidos.push(disponibles.splice(idx, 1)[0]);
  }
  return elegidos.sort((a, b) => a.nivel - b.nivel);
}

export function puntuar(resultados) {
  if (!resultados.length) return 0;
  return resultados.reduce((a, x) => a + x.r, 0) / resultados.length;
}

export function aplicarComprobacion(prog, resultados, hoy) {
  const puntaje = puntuar(resultados);
  prog.comprobaciones.push({ fecha: hoy, puntaje });
  if (prog.comprobaciones.length > 10) prog.comprobaciones.shift();
  prog.mejor = Math.max(prog.mejor || 0, puntaje);
  const logrado = puntaje >= CONFIG.umbralLogro - 1e-9;
  if (logrado) {
    prog.estado = 'logrado';
    prog.logradoEn = prog.logradoEn || hoy;
    prog.fase = 'comprobacion';
    prog.repaso = { proximo: sumarDias(hoy, CONFIG.intervalosRepaso[0]), indice: 0 };
  } else {
    prog.estado = prog.estado === 'logrado' ? 'repasar' : 'en-curso';
    prog.fase = 'practica';
    prog.nivel = Math.max(1, prog.nivel - (puntaje < 0.5 ? 1 : 0));
  }
  const fallados = resultados.filter((x) => x.r < 1).map((x) => x.error).filter(Boolean);
  return { puntaje, logrado, enfoque: [...new Set(fallados)] };
}

// Selección para el repaso espaciado y para los desafíos.
export function elegirRepaso(tema, rng, cantidad = CONFIG.itemsRepaso) {
  const banco = [...(tema.practica || []).filter((e) => e.nivel >= 2), ...(tema.comprobacion || [])];
  return tomarAlAzar(banco, cantidad, rng);
}

export function elegirDesafio(tema, rng, cantidad = CONFIG.itemsDesafio) {
  const banco = [...(tema.practica || []), ...(tema.comprobacion || [])].filter((e) => e.nivel === 3 && e.tipo !== 'memoria');
  const extra = banco.length < cantidad ? (tema.practica || []).filter((e) => e.nivel === 2) : [];
  return tomarAlAzar([...banco, ...extra], cantidad, rng, true);
}

function tomarAlAzar(banco, cantidad, rng, permitirGeneradorRepetido = false) {
  const disp = banco.slice();
  const r = [];
  while (r.length < cantidad && disp.length) {
    const i = Math.floor(azar(rng) * disp.length);
    const e = disp[i];
    r.push(e);
    if (!(permitirGeneradorRepetido && e.tipo === 'generador' && r.filter((x) => x === e).length < 2)) disp.splice(i, 1);
  }
  return r;
}

export function aplicarRepaso(prog, resultados, hoy) {
  const puntaje = puntuar(resultados);
  const indice = prog.repaso ? prog.repaso.indice : 0;
  if (puntaje >= CONFIG.umbralRepaso) {
    const sig = Math.min(indice + 1, CONFIG.intervalosRepaso.length - 1);
    prog.repaso = { proximo: sumarDias(hoy, CONFIG.intervalosRepaso[sig]), indice: sig };
    if (prog.estado === 'repasar') prog.estado = 'logrado';
    return { puntaje, bien: true };
  }
  prog.estado = 'repasar';
  prog.repaso = { proximo: sumarDias(hoy, 1), indice: 0 };
  prog.fase = 'practica';
  return { puntaje, bien: false };
}

export function repasoPendiente(prog, hoy) {
  return !!(prog && prog.estado === 'logrado' && prog.repaso && prog.repaso.proximo <= hoy);
}

// ---------- recomendación para «Continuar aprendiendo» ----------

export function recomendar(indice, temas, ajustes, ultimoTema, hoy) {
  const lista = [];
  for (const m of indice.materias) for (const u of m.unidades) for (const t of u.temas) lista.push({ ...t, materia: m.id });
  const existe = (id) => lista.find((t) => t.id === id);
  const asignado = ajustes.temaAsignado && existe(ajustes.temaAsignado.id);
  if (asignado && (temas[asignado.id]?.estado !== 'logrado')) return { tema: asignado, motivo: 'asignado' };
  const ultimo = ultimoTema && existe(ultimoTema);
  if (ultimo && ['en-curso', 'repasar'].includes(temas[ultimo.id]?.estado)) return { tema: ultimo, motivo: 'continuar' };
  const repasar = lista.find((t) => temas[t.id]?.estado === 'repasar');
  if (repasar) return { tema: repasar, motivo: 'reforzar' };
  const repasoDebido = lista.find((t) => repasoPendiente(temas[t.id], hoy));
  if (repasoDebido) return { tema: repasoDebido, motivo: 'repaso' };
  const enCurso = lista.find((t) => temas[t.id]?.estado === 'en-curso');
  if (enCurso) return { tema: enCurso, motivo: 'continuar' };
  // siguiente tema de la misma materia que el último, si no, el primero sin lograr
  if (ultimo) {
    const mismos = lista.filter((t) => t.materia === ultimo.materia);
    const i = mismos.findIndex((t) => t.id === ultimo.id);
    const sig = mismos.slice(i + 1).concat(mismos.slice(0, i)).find((t) => temas[t.id]?.estado !== 'logrado');
    if (sig) return { tema: sig, motivo: 'siguiente' };
  }
  const nuevo = lista.find((t) => temas[t.id]?.estado !== 'logrado');
  if (nuevo) return { tema: nuevo, motivo: 'nuevo' };
  return { tema: lista[0], motivo: 'todo' };
}

export function sumarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}
