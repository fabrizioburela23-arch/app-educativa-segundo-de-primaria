// Validador de temas (navegador y Node). Devuelve { errores: [], avisos: [] }.
// Lo usa tools/validar-contenido.mjs y el editor de contenido del adulto.

import {
  TIPOS_EJERCICIO, TIPOS_VISUAL, TIPOS_MANIPULABLE, ILUSTRACIONES, DINERO,
  REQUISITOS_ESCRITURA, diasDelMes,
} from './catalogo.js';
import { GENERADORES, generar, crearRng } from './generadores.js';
import { tokenizarTocar, analizarCompletar, revisarRequisitos, textoOpcion } from './texto.js';

const esTexto = (x) => typeof x === 'string' && x.trim().length > 0;
const esEntero = (x) => Number.isInteger(x);
const esNumero = (x) => typeof x === 'number' && Number.isFinite(x);

export function validarTema(tema, opciones = {}) {
  const errores = [];
  const avisos = [];
  const datos = opciones.datos || {};
  const E = (ruta, msg) => errores.push(`${ruta}: ${msg}`);
  const A = (ruta, msg) => avisos.push(`${ruta}: ${msg}`);

  if (!tema || typeof tema !== 'object') {
    E('tema', 'no es un objeto JSON');
    return { errores, avisos };
  }
  if (!esTexto(tema.id)) E('id', 'falta');
  if (opciones.idEsperado && tema.id !== opciones.idEsperado) E('id', `debe ser "${opciones.idEsperado}"`);
  if (!esTexto(tema.titulo)) E('titulo', 'falta');
  if (!esTexto(tema.objetivo)) E('objetivo', 'falta');

  const etiquetasUsadas = new Map(); // etiqueta → ruta
  const usar = (tag, ruta) => { if (tag !== undefined) { if (!esTexto(tag)) E(ruta, 'etiqueta de error vacía'); else if (!etiquetasUsadas.has(tag)) etiquetasUsadas.set(tag, ruta); } };

  // --- lecturas ---
  const lecturas = new Set();
  if (tema.lecturas !== undefined) {
    if (!Array.isArray(tema.lecturas)) E('lecturas', 'debe ser una lista');
    else tema.lecturas.forEach((l, i) => {
      const r = `lecturas[${i}]`;
      if (!esTexto(l.id)) E(r, 'falta id');
      else if (lecturas.has(l.id)) E(r, `id repetido "${l.id}"`);
      else lecturas.add(l.id);
      if (!esTexto(l.titulo)) E(r, 'falta titulo');
      if (!Array.isArray(l.parrafos) || l.parrafos.length === 0 || !l.parrafos.every(esTexto)) E(r, 'parrafos debe ser una lista de textos');
    });
  }

  // --- explicación ---
  if (!Array.isArray(tema.explicacion)) E('explicacion', 'debe ser una lista de tarjetas');
  else {
    if (tema.explicacion.length < 2 || tema.explicacion.length > 5) E('explicacion', 'debe tener de 2 a 5 tarjetas');
    let conVisual = 0;
    tema.explicacion.forEach((t, i) => {
      const r = `explicacion[${i}]`;
      if (!esTexto(t.texto)) E(r, 'falta texto');
      else if (t.texto.length > 300) E(r, `texto muy largo (${t.texto.length} caracteres, máx. 300)`);
      else if (t.texto.length > 240) A(r, `texto largo (${t.texto.length} caracteres)`);
      if (t.visual) { conVisual++; validarVisual(t.visual, `${r}.visual`, E); }
    });
    if (conVisual === 0) E('explicacion', 'al menos una tarjeta debe tener visual');
  }

  // --- ejemplo ---
  const ej = tema.ejemplo;
  if (!ej || typeof ej !== 'object') E('ejemplo', 'falta');
  else {
    if (!esTexto(ej.instruccion)) E('ejemplo', 'falta instruccion');
    if (!ej.pasos && !ej.explorar) E('ejemplo', 'necesita pasos o explorar');
    if (ej.pasos) {
      if (!Array.isArray(ej.pasos) || ej.pasos.length < 2 || ej.pasos.length > 5) E('ejemplo.pasos', 'debe tener de 2 a 5 pasos');
      else ej.pasos.forEach((p, i) => {
        if (!esTexto(p.texto)) E(`ejemplo.pasos[${i}]`, 'falta texto');
        if (p.visual) validarVisual(p.visual, `ejemplo.pasos[${i}].visual`, E);
      });
    }
    if (ej.explorar) validarManipulable(ej.explorar, 'ejemplo.explorar', E, true);
  }

  // --- ejercicios ---
  const ids = new Set();
  const formas = new Set();
  let manuales = 0, opciones1 = 0;
  const firmasPractica = new Set();

  const revisarEjercicio = (ejer, r, { requiereNivel, requiereApoyo, esPaso, seccion }) => {
    if (!ejer || typeof ejer !== 'object') { E(r, 'no es un objeto'); return; }
    if (!esPaso) {
      if (!esTexto(ejer.id)) E(r, 'falta id');
      else if (ids.has(ejer.id)) E(r, `id repetido "${ejer.id}"`);
      else ids.add(ejer.id);
    }
    if (!TIPOS_EJERCICIO.includes(ejer.tipo)) { E(r, `tipo desconocido "${ejer.tipo}"`); return; }
    if (requiereNivel && ![1, 2, 3].includes(ejer.nivel)) E(r, 'nivel debe ser 1, 2 o 3');
    if (esPaso && (ejer.tipo === 'pasos' || ejer.tipo === 'memoria' || ejer.tipo === 'generador')) E(r, `un paso no puede ser de tipo ${ejer.tipo}`);
    if (requiereApoyo && !esTexto(ejer.apoyo)) E(r, 'en la actividad guiada cada paso necesita "apoyo"');
    if (seccion === 'comprobacion' && ejer.tipo === 'memoria') E(r, 'memoria no se usa en la comprobación');

    if (ejer.tipo === 'generador') {
      const g = GENERADORES[ejer.generador];
      if (!g) { E(r, `generador desconocido "${ejer.generador}"`); return; }
      g.errores.forEach((t) => usar(t, r));
      const rng = crearRng(opciones.semilla ?? 12345);
      const muestras = opciones.muestras ?? 25;
      for (let k = 0; k < muestras; k++) {
        let gen;
        try { gen = generar(ejer, rng, datos); } catch (e) { E(r, `el generador falló: ${e.message}`); break; }
        const antes = errores.length;
        revisarEjercicio({ ...gen, id: undefined }, `${r}(muestra ${k + 1})`, { esPaso: true, seccion, generado: true });
        formas.add(formaDe(gen));
        if (errores.length > antes) break;
      }
      return;
    }

    if (!esPaso || ejer.tipo !== undefined) {
      if (!esTexto(ejer.enunciado)) E(r, 'falta enunciado');
      else if (ejer.enunciado.length > 200) E(r, `enunciado muy largo (${ejer.enunciado.length})`);
      else if (ejer.enunciado.length > 140) A(r, `enunciado largo (${ejer.enunciado.length})`);
      if (!esTexto(ejer.pista)) E(r, 'falta pista');
      if (!esTexto(ejer.explicacion)) E(r, 'falta explicacion');
      if (!esTexto(ejer.error)) E(r, 'falta etiqueta error');
      else usar(ejer.error, r);
    }
    if (ejer.visual) validarVisual(ejer.visual, `${r}.visual`, E);
    if (ejer.lectura !== undefined && !lecturas.has(ejer.lectura)) E(r, `lectura "${ejer.lectura}" no existe`);
    if (ejer.escuchar !== undefined && !esTexto(ejer.escuchar)) E(r, 'escuchar debe ser un texto');

    if (!esPaso || seccion) {
      if (ejer.tipo !== 'pasos') formas.add(formaDe(ejer));
      if (ejer.escuchar) formas.add('escuchar');
    }

    switch (ejer.tipo) {
      case 'opcion':
      case 'multiple': {
        const ops = ejer.opciones;
        const max = ejer.tipo === 'opcion' ? 4 : 6;
        if (!Array.isArray(ops) || ops.length < 2 || ops.length > max) { E(r, `opciones: de 2 a ${max}`); break; }
        const correctas = ops.filter((o) => o && o.correcta === true).length;
        if (ejer.tipo === 'opcion' && correctas !== 1) E(r, `debe haber exactamente 1 opción correcta (hay ${correctas})`);
        if (ejer.tipo === 'multiple' && (correctas < 1 || correctas === ops.length)) E(r, 'multiple necesita al menos 1 correcta y al menos 1 incorrecta');
        const vistos = new Set();
        ops.forEach((o, i) => {
          if (typeof o !== 'object' || o === null) { E(`${r}.opciones[${i}]`, 'debe ser un objeto'); return; }
          if (!esTexto(o.texto) && !esTexto(o.emoji) && !o.visual) E(`${r}.opciones[${i}]`, 'necesita texto, emoji o visual');
          if (o.visual) validarVisual(o.visual, `${r}.opciones[${i}].visual`, E);
          const k = textoOpcion(o) + JSON.stringify(o.visual || '');
          if (vistos.has(k)) E(`${r}.opciones[${i}]`, 'opción repetida');
          vistos.add(k);
          if (o.error !== undefined) usar(o.error, `${r}.opciones[${i}]`);
          if (o.correcta === true && (o.pista || o.error)) A(`${r}.opciones[${i}]`, 'la opción correcta no necesita pista ni error');
        });
        if (ejer.columnas !== undefined && ![1, 2, 3, 4].includes(ejer.columnas)) E(r, 'columnas: 1 a 4');
        break;
      }
      case 'tocar': {
        if (!esTexto(ejer.texto)) { E(r, 'falta texto'); break; }
        const toks = tokenizarTocar(ejer.texto);
        if (toks.error) { E(r, toks.error); break; }
        const palabras = toks.tokens.filter((t) => t.palabra);
        if (!palabras.some((t) => t.correcta)) E(r, 'marca al menos una palabra correcta con *asteriscos*');
        if (!palabras.some((t) => !t.correcta)) E(r, 'debe haber palabras que no sean correctas');
        break;
      }
      case 'completar': {
        if (!esTexto(ejer.texto)) { E(r, 'falta texto'); break; }
        const c = analizarCompletar(ejer.texto);
        if (c.error) { E(r, c.error); break; }
        if (c.huecos.length === 0) E(r, 'no hay huecos [ ]');
        if (c.huecos.length > 6) A(r, 'muchos huecos (más de 6)');
        if (ejer.modo !== undefined && !['banco', 'escribir'].includes(ejer.modo)) E(r, 'modo: banco o escribir');
        if (ejer.banco !== undefined) {
          if (!Array.isArray(ejer.banco) || !ejer.banco.every(esTexto)) E(r, 'banco debe ser una lista de textos');
          else {
            const resp = new Set(c.huecos.map((h) => h.aceptadas[0]));
            ejer.banco.forEach((b) => { if (resp.has(b)) A(r, `el distractor "${b}" también es una respuesta (se mostrará dos veces)`); });
          }
        }
        if ((ejer.modo || 'banco') === 'banco' && c.huecos.length === 1 && !(ejer.banco || []).length) E(r, 'con un solo hueco, agrega distractores en banco');
        break;
      }
      case 'escribir': {
        if (!Array.isArray(ejer.respuestas) || ejer.respuestas.length === 0 || !ejer.respuestas.every(esTexto)) E(r, 'respuestas debe ser una lista de textos');
        if (ejer.mayusculas !== undefined && !['flexible', 'estricto'].includes(ejer.mayusculas)) E(r, 'mayusculas: flexible o estricto');
        if (ejer.tildes !== undefined && !['flexible', 'estricto'].includes(ejer.tildes)) E(r, 'tildes: flexible o estricto');
        break;
      }
      case 'numero': {
        const tieneResp = ejer.respuesta !== undefined;
        const tieneCampos = ejer.campos !== undefined;
        if (tieneResp === tieneCampos) { E(r, 'usa respuesta o campos (uno de los dos)'); break; }
        if (tieneResp && !esNumero(ejer.respuesta)) E(r, 'respuesta debe ser un número');
        if (tieneCampos) {
          if (!Array.isArray(ejer.campos) || ejer.campos.length < 1 || ejer.campos.length > 4) E(r, 'campos: de 1 a 4');
          else ejer.campos.forEach((c, i) => {
            if (!esTexto(c.etiqueta)) E(`${r}.campos[${i}]`, 'falta etiqueta');
            if (!esNumero(c.respuesta)) E(`${r}.campos[${i}]`, 'respuesta debe ser un número');
          });
        }
        (ejer.erroresComunes || []).forEach((ec, i) => {
          const rr = `${r}.erroresComunes[${i}]`;
          if (tieneResp) {
            if (!esNumero(ec.respuesta)) E(rr, 'respuesta debe ser un número');
            else if (ec.respuesta === ejer.respuesta) E(rr, 'el error común no puede ser la respuesta correcta');
          }
          if (!esTexto(ec.pista)) E(rr, 'falta pista');
          if (ec.error !== undefined) usar(ec.error, rr);
        });
        break;
      }
      case 'ordenar': {
        const el = ejer.elementos;
        if (!Array.isArray(el) || el.length < 2 || el.length > 8) { E(r, 'elementos: de 2 a 8'); break; }
        const txt = el.map((x) => (typeof x === 'string' ? x : textoOpcion(x)));
        if (txt.some((t) => !t)) E(r, 'cada elemento necesita texto o emoji');
        if (new Set(txt).size !== txt.length) E(r, 'hay elementos repetidos: el orden sería ambiguo');
        break;
      }
      case 'relacionar':
      case 'memoria': {
        const pares = ejer.pares;
        const [mn, mx] = ejer.tipo === 'relacionar' ? [2, 6] : [2, 8];
        if (!Array.isArray(pares) || pares.length < mn || pares.length > mx) { E(r, `pares: de ${mn} a ${mx}`); break; }
        const izq = [], der = [];
        pares.forEach((p, i) => {
          if (!Array.isArray(p) || p.length !== 2) { E(`${r}.pares[${i}]`, 'cada par es una lista de 2'); return; }
          const a = typeof p[0] === 'string' ? p[0] : textoOpcion(p[0]);
          const b = typeof p[1] === 'string' ? p[1] : textoOpcion(p[1]);
          if (!a || !b) E(`${r}.pares[${i}]`, 'cada lado necesita texto o emoji');
          izq.push(a); der.push(b);
        });
        if (new Set(izq).size !== izq.length) E(r, 'hay elementos repetidos a la izquierda');
        if (new Set(der).size !== der.length) E(r, 'hay elementos repetidos a la derecha');
        if (ejer.tipo === 'memoria' && new Set([...izq, ...der]).size !== izq.length + der.length) E(r, 'en memoria todas las cartas deben ser distintas');
        break;
      }
      case 'clasificar': {
        const cats = ejer.categorias;
        if (!Array.isArray(cats) || cats.length < 2 || cats.length > 4) { E(r, 'categorias: de 2 a 4'); break; }
        const idsCat = new Set();
        cats.forEach((c, i) => {
          if (!esTexto(c.id) || !esTexto(c.texto)) E(`${r}.categorias[${i}]`, 'necesita id y texto');
          if (idsCat.has(c.id)) E(`${r}.categorias[${i}]`, 'id repetido');
          idsCat.add(c.id);
        });
        const el = ejer.elementos;
        if (!Array.isArray(el) || el.length < 3 || el.length > 10) { E(r, 'elementos: de 3 a 10'); break; }
        const usadas = new Set();
        const txt = [];
        el.forEach((x, i) => {
          if (!idsCat.has(x.categoria)) E(`${r}.elementos[${i}]`, `categoria "${x.categoria}" no existe`);
          usadas.add(x.categoria);
          const t = textoOpcion(x);
          if (!t) E(`${r}.elementos[${i}]`, 'necesita texto o emoji');
          txt.push(t);
        });
        if (new Set(txt).size !== txt.length) E(r, 'hay elementos repetidos');
        if (usadas.size < idsCat.size) E(r, 'cada categoría necesita al menos un elemento');
        break;
      }
      case 'escribir-libre': {
        if (!Array.isArray(ejer.requisitos) || ejer.requisitos.length === 0) { E(r, 'faltan requisitos'); break; }
        ejer.requisitos.forEach((q, i) => {
          if (!REQUISITOS_ESCRITURA.includes(q.tipo)) E(`${r}.requisitos[${i}]`, `requisito desconocido "${q.tipo}"`);
          if (['min-palabras', 'max-palabras', 'min-oraciones'].includes(q.tipo) && !esEntero(q.valor)) E(`${r}.requisitos[${i}]`, 'falta valor');
          if (['incluye', 'incluye-todas'].includes(q.tipo) && (!Array.isArray(q.palabras) || !q.palabras.every(esTexto))) E(`${r}.requisitos[${i}]`, 'falta palabras');
        });
        if (!esTexto(ejer.modelo)) E(r, 'falta modelo (ejemplo de respuesta)');
        else {
          const fallos = revisarRequisitos(ejer.modelo, ejer.requisitos).filter((x) => !x.ok);
          if (fallos.length) E(r, `el modelo no cumple: ${fallos.map((f) => f.tipo).join(', ')}`);
        }
        if (ejer.guia !== undefined && (!Array.isArray(ejer.guia) || !ejer.guia.every(esTexto))) E(r, 'guia debe ser una lista de textos');
        break;
      }
      case 'manipular':
        validarManipulable(ejer.manipulable, `${r}.manipulable`, E, false);
        break;
      case 'pasos': {
        if (!Array.isArray(ejer.pasos) || ejer.pasos.length < 2 || ejer.pasos.length > 4) { E(r, 'pasos: de 2 a 4'); break; }
        ejer.pasos.forEach((p, i) => {
          revisarEjercicio(p, `${r}.pasos[${i}]`, { esPaso: true });
          formas.add(formaDe(p));
        });
        formas.add('pasos');
        break;
      }
      default:
        break;
    }
  };

  // guiada
  const g = tema.guiada;
  if (!g || !Array.isArray(g.pasos)) E('guiada', 'falta guiada.pasos');
  else {
    if (g.pasos.length < 2 || g.pasos.length > 4) E('guiada.pasos', 'de 2 a 4 pasos');
    g.pasos.forEach((p, i) => {
      revisarEjercicio(p, `guiada.pasos[${i}]`, { requiereApoyo: true, seccion: 'guiada' });
      if (p.tipo !== 'generador') { manuales++; if (p.tipo === 'opcion') opciones1++; }
    });
  }

  // práctica
  const pr = tema.practica;
  if (!Array.isArray(pr)) E('practica', 'debe ser una lista');
  else {
    if (pr.length < 9) E('practica', `necesita al menos 9 ejercicios (tiene ${pr.length})`);
    const porNivel = { 1: 0, 2: 0, 3: 0 };
    pr.forEach((p, i) => {
      revisarEjercicio(p, `practica[${i}]`, { requiereNivel: true, seccion: 'practica' });
      if (porNivel[p.nivel] !== undefined) porNivel[p.nivel]++;
      if (p.tipo !== 'generador') { manuales++; if (p.tipo === 'opcion') opciones1++; firmasPractica.add(firma(p)); }
    });
    [1, 2, 3].forEach((n) => { if (porNivel[n] < 2) E('practica', `necesita al menos 2 ejercicios de nivel ${n} (tiene ${porNivel[n]})`); });
  }

  // comprobación
  const co = tema.comprobacion;
  if (!Array.isArray(co)) E('comprobacion', 'debe ser una lista');
  else {
    if (co.length < 6) E('comprobacion', `necesita al menos 6 ejercicios (tiene ${co.length})`);
    const niveles = new Set();
    const tipos = new Set();
    co.forEach((p, i) => {
      revisarEjercicio(p, `comprobacion[${i}]`, { requiereNivel: true, seccion: 'comprobacion' });
      niveles.add(p.nivel);
      tipos.add(p.tipo === 'manipular' ? `manipular:${p.manipulable?.tipo}` : p.tipo === 'generador' ? `gen:${p.generador}` : p.tipo);
      if (p.tipo !== 'generador') {
        manuales++; if (p.tipo === 'opcion') opciones1++;
        if (firmasPractica.has(firma(p))) E(`comprobacion[${i}]`, 'repite un ejercicio de la práctica');
      }
    });
    if (niveles.size < 2) E('comprobacion', 'debe incluir al menos 2 niveles');
    if (tipos.size < 3) E('comprobacion', `debe usar al menos 3 tipos distintos (usa ${tipos.size})`);
  }

  if (formas.size < 4) E('tema', `usa al menos 4 formas de interacción distintas (usa ${formas.size}: ${[...formas].join(', ')})`);
  if (manuales > 0 && opciones1 / manuales > 0.4) E('tema', `demasiadas preguntas de opción múltiple (${opciones1} de ${manuales}, máx. 40 %)`);

  // repaso
  if (!tema.repaso || !esTexto(tema.repaso.texto)) E('repaso', 'falta repaso.texto');
  else if (tema.repaso.visual) validarVisual(tema.repaso.visual, 'repaso.visual', E);

  // adulto
  const ad = tema.adulto;
  if (!ad || typeof ad !== 'object') E('adulto', 'falta');
  else {
    if (!esTexto(ad.objetivo)) E('adulto.objetivo', 'falta');
    if (!Array.isArray(ad.sugerencias) || ad.sugerencias.filter(esTexto).length < 2) E('adulto.sugerencias', 'al menos 2 sugerencias');
    if (!ad.errores || typeof ad.errores !== 'object') E('adulto.errores', 'falta');
    else {
      for (const [tag, info] of Object.entries(ad.errores)) {
        if (!info || !esTexto(info.descripcion) || !esTexto(info.sugerencia)) E(`adulto.errores.${tag}`, 'necesita descripcion y sugerencia');
      }
      for (const [tag, ruta] of etiquetasUsadas) {
        if (!ad.errores[tag]) E(ruta, `la etiqueta de error "${tag}" no está en adulto.errores`);
      }
      for (const tag of Object.keys(ad.errores)) if (!etiquetasUsadas.has(tag)) A(`adulto.errores.${tag}`, 'etiqueta declarada pero no usada');
    }
  }

  return { errores, avisos, formas: [...formas] };
}

function formaDe(e) {
  if (e.tipo === 'manipular') return `manipular:${e.manipulable?.tipo}`;
  return e.tipo;
}

function firma(e) {
  const copia = { ...e };
  delete copia.id; delete copia.nivel; delete copia.pista; delete copia.explicacion; delete copia.error;
  return JSON.stringify(copia);
}

export function validarVisual(v, r, E) {
  if (!v || typeof v !== 'object') { E(r, 'visual inválido'); return; }
  if (!TIPOS_VISUAL.includes(v.tipo)) { E(r, `tipo de visual desconocido "${v.tipo}"`); return; }
  const n = (x) => esEntero(x) && x >= 0;
  switch (v.tipo) {
    case 'emoji':
      if (!esTexto(v.valor)) E(r, 'falta valor');
      if (v.cantidad !== undefined && (!esEntero(v.cantidad) || v.cantidad < 0 || v.cantidad > 30)) E(r, 'cantidad: 0 a 30');
      break;
    case 'emojis':
      if (!Array.isArray(v.items) || v.items.length === 0 || v.items.length > 12) E(r, 'items: de 1 a 12');
      if (v.etiquetas !== undefined && (!Array.isArray(v.etiquetas) || v.etiquetas.length !== v.items?.length)) E(r, 'etiquetas debe tener el mismo largo que items');
      break;
    case 'ilustracion':
      if (!(v.id in ILUSTRACIONES)) E(r, `ilustración desconocida "${v.id}"`);
      else if (v.resaltar !== undefined && !ILUSTRACIONES[v.id].includes(v.resaltar)) E(r, `"${v.id}" no tiene la parte "${v.resaltar}"`);
      break;
    case 'bloques':
      ['centenas', 'decenas', 'unidades'].forEach((k) => { if (v[k] !== undefined && (!n(v[k]) || v[k] > 20)) E(r, `${k}: 0 a 20`); });
      break;
    case 'recta':
      if (!esEntero(v.min) || !esEntero(v.max) || v.max <= v.min) E(r, 'min y max enteros (max > min)');
      else {
        const paso = v.paso || 1;
        if ((v.max - v.min) / paso > 20) E(r, 'demasiadas marcas (máx. 20 pasos)');
      }
      break;
    case 'fraccion':
      if (!['circulo', 'rectangulo', 'barra'].includes(v.forma)) E(r, 'forma: circulo, rectangulo o barra');
      if (!esEntero(v.partes) || v.partes < 1 || v.partes > 12) E(r, 'partes: 1 a 12');
      if (v.coloreadas !== undefined && (!n(v.coloreadas) || v.coloreadas > v.partes)) E(r, 'coloreadas: 0 a partes');
      break;
    case 'dinero':
      if (!Array.isArray(v.items) || v.items.length === 0 || v.items.length > 12) E(r, 'items: de 1 a 12');
      else v.items.forEach((c) => { if (!DINERO[c]) E(r, `código de dinero desconocido "${c}"`); });
      break;
    case 'reloj':
      if (!esEntero(v.hora) || v.hora < 1 || v.hora > 12) E(r, 'hora: 1 a 12');
      if (!esEntero(v.minutos) || v.minutos < 0 || v.minutos > 59) E(r, 'minutos: 0 a 59');
      break;
    case 'grupos':
      if (!esEntero(v.grupos) || v.grupos < 1 || v.grupos > 10) E(r, 'grupos: 1 a 10');
      if (!esEntero(v.porGrupo) || v.porGrupo < 0 || v.porGrupo > 10) E(r, 'porGrupo: 0 a 10');
      if (!esTexto(v.emoji)) E(r, 'falta emoji');
      break;
    case 'arreglo':
      if (!esEntero(v.filas) || v.filas < 1 || v.filas > 10) E(r, 'filas: 1 a 10');
      if (!esEntero(v.columnas) || v.columnas < 1 || v.columnas > 10) E(r, 'columnas: 1 a 10');
      break;
    case 'pictograma':
      if (!esTexto(v.icono)) E(r, 'falta icono');
      if (!Array.isArray(v.datos) || v.datos.length < 2 || v.datos.length > 6) E(r, 'datos: de 2 a 6 filas');
      else v.datos.forEach((d, i) => {
        if (!esTexto(d.etiqueta) || !n(d.valor)) E(`${r}.datos[${i}]`, 'necesita etiqueta y valor');
        else if (d.valor % (v.escala || 1) !== 0 && (v.escala || 1) !== 2) E(`${r}.datos[${i}]`, 'el valor debe ser múltiplo de la escala');
        else if (d.valor / (v.escala || 1) > 12) E(`${r}.datos[${i}]`, 'demasiados íconos (máx. 12 por fila)');
      });
      break;
    case 'tabla':
      if (!Array.isArray(v.columnas) || !Array.isArray(v.filas)) E(r, 'necesita columnas y filas');
      else v.filas.forEach((f, i) => { if (!Array.isArray(f) || f.length !== v.columnas.length) E(`${r}.filas[${i}]`, 'largo distinto a columnas'); });
      break;
    case 'calendario':
      if (!esEntero(v.mes) || v.mes < 1 || v.mes > 12) E(r, 'mes: 1 a 12');
      if (!esEntero(v.anio)) E(r, 'falta anio');
      break;
    case 'simetria':
      validarCuadricula(v, r, E, !!v.completa);
      break;
    case 'regla':
      if (!esEntero(v.longitud) || v.longitud < 1 || v.longitud > 20) E(r, 'longitud: 1 a 20 cm');
      break;
    case 'balanza':
      if (!Array.isArray(v.izquierda) || !Array.isArray(v.derecha)) E(r, 'izquierda y derecha deben ser listas');
      if (v.inclinada !== undefined && !['izquierda', 'derecha', 'no'].includes(v.inclinada)) E(r, 'inclinada: izquierda, derecha o no');
      break;
    case 'operacion':
      if (!Array.isArray(v.numeros) || v.numeros.length < 2 || v.numeros.length > 3 || !v.numeros.every(esNumero)) E(r, 'numeros: lista de 2 o 3 números');
      if (!['+', '-', '×', '÷'].includes(v.op)) E(r, 'op: + - × ÷');
      break;
    case 'bandera':
      if (!Array.isArray(v.franjas) || v.franjas.length < 1 || v.franjas.length > 7) E(r, 'franjas: de 1 a 7 colores');
      break;
    case 'secuencia':
      if (!Array.isArray(v.items) || v.items.length < 2 || v.items.length > 10) E(r, 'items: de 2 a 10');
      break;
    case 'fechas':
      if (v.filtro !== undefined && !['civica', 'conmemorativa', 'departamental', 'todas'].includes(v.filtro)) E(r, 'filtro: civica, conmemorativa, departamental o todas');
      if (v.mes !== undefined && (!esEntero(v.mes) || v.mes < 1 || v.mes > 12)) E(r, 'mes: 1 a 12');
      break;
    default:
      break;
  }
}

function validarCuadricula(v, r, E, completa) {
  if (!esEntero(v.filas) || v.filas < 2 || v.filas > 10) E(r, 'filas: 2 a 10');
  if (!esEntero(v.columnas) || v.columnas < 2 || v.columnas > 10 || v.columnas % 2) E(r, 'columnas: número par de 2 a 10');
  if (!Array.isArray(v.celdas)) { E(r, 'celdas debe ser una lista'); return; }
  const mitad = v.columnas / 2;
  v.celdas.forEach((c, i) => {
    if (!Array.isArray(c) || c.length !== 2 || !esEntero(c[0]) || !esEntero(c[1])) { E(`${r}.celdas[${i}]`, 'formato [fila, columna]'); return; }
    if (c[0] < 0 || c[0] >= v.filas || c[1] < 0 || c[1] >= v.columnas) E(`${r}.celdas[${i}]`, 'fuera de la cuadrícula');
    else if (!completa && c[1] >= mitad) E(`${r}.celdas[${i}]`, 'debe estar en la mitad izquierda');
  });
}

export function validarManipulable(m, r, E, libre) {
  if (!m || typeof m !== 'object') { E(r, 'falta manipulable'); return; }
  if (!TIPOS_MANIPULABLE.includes(m.tipo)) { E(r, `manipulable desconocido "${m.tipo}"`); return; }
  const req = (cond, msg) => { if (!cond) E(r, msg); };
  const obj = m.objetivo;
  switch (m.tipo) {
    case 'bloques':
      if (!libre) req(esEntero(obj) && obj >= 0 && obj <= 999, 'objetivo: 0 a 999');
      break;
    case 'recta': {
      req(esEntero(m.min) && esEntero(m.max) && m.max > m.min, 'min y max enteros');
      const paso = m.paso || 1;
      req((m.max - m.min) / paso <= 20, 'máx. 20 pasos en la recta');
      if (!libre) req(esEntero(obj) && obj >= m.min && obj <= m.max && (obj - m.min) % paso === 0, 'objetivo debe estar en una marca de la recta');
      break;
    }
    case 'fraccion':
      req(['circulo', 'rectangulo', 'barra'].includes(m.forma), 'forma: circulo, rectangulo o barra');
      req(esEntero(m.partes) && m.partes >= 2 && m.partes <= 12, 'partes: 2 a 12');
      if (!libre) req(esEntero(obj) && obj >= 1 && obj <= m.partes, 'objetivo: 1 a partes');
      break;
    case 'dinero': {
      const disp = m.disponibles || Object.keys(DINERO);
      req(Array.isArray(disp) && disp.every((c) => DINERO[c]), 'disponibles: códigos de dinero válidos');
      if (!libre) {
        req(esEntero(obj) && obj > 0, 'objetivo en centavos (entero > 0)');
        const minimo = Math.min(...disp.filter((c) => DINERO[c]).map((c) => DINERO[c].valor));
        req(esEntero(obj) && obj % minimo === 0, `no se puede formar ${obj} centavos con esas monedas`);
      }
      break;
    }
    case 'reloj': {
      const paso = m.paso || 5;
      req([5, 15, 30].includes(paso), 'paso: 5, 15 o 30');
      if (!libre) {
        req(obj && esEntero(obj.hora) && obj.hora >= 1 && obj.hora <= 12, 'objetivo.hora: 1 a 12');
        req(obj && esEntero(obj.minutos) && obj.minutos >= 0 && obj.minutos < 60 && obj.minutos % paso === 0, 'objetivo.minutos debe ser múltiplo del paso');
      }
      break;
    }
    case 'grupos':
      req(esEntero(m.grupos) && m.grupos >= 1 && m.grupos <= 6, 'grupos: 1 a 6');
      if (!libre) req(esEntero(m.porGrupo) && m.porGrupo >= 1 && m.porGrupo <= 10, 'porGrupo: 1 a 10');
      break;
    case 'repartir':
      req(esEntero(m.grupos) && m.grupos >= 2 && m.grupos <= 6, 'grupos: 2 a 6');
      req(esEntero(m.total) && m.total >= 2 && m.total <= 30, 'total: 2 a 30');
      if (!libre) req(m.total % m.grupos === 0, 'total debe poder repartirse en partes iguales');
      break;
    case 'simetria':
      validarCuadricula(m, r, E, false);
      break;
    case 'calendario':
      req(esEntero(m.mes) && m.mes >= 1 && m.mes <= 12, 'mes: 1 a 12');
      req(esEntero(m.anio), 'falta anio');
      if (!libre) req(esEntero(obj) && obj >= 1 && obj <= diasDelMes(m.mes, m.anio), 'objetivo: un día del mes');
      break;
    case 'pictograma':
      req(esTexto(m.icono), 'falta icono');
      req(Array.isArray(m.categorias) && m.categorias.length >= 2 && m.categorias.length <= 5, 'categorias: 2 a 5');
      (m.categorias || []).forEach((c, i) => {
        if (!esTexto(c.etiqueta)) E(`${r}.categorias[${i}]`, 'falta etiqueta');
        if (!libre && (!esEntero(c.objetivo) || c.objetivo < 0 || c.objetivo % (m.escala || 1) !== 0 || c.objetivo / (m.escala || 1) > 10)) E(`${r}.categorias[${i}]`, 'objetivo: múltiplo de la escala, máx. 10 íconos');
      });
      break;
    case 'patron':
      req(Array.isArray(m.secuencia) && m.secuencia.length >= 2, 'secuencia: al menos 2');
      req(Array.isArray(m.opciones) && m.opciones.length >= 2 && m.opciones.length <= 5, 'opciones: 2 a 5');
      if (!libre) {
        req(esEntero(m.completar) && m.completar >= 1 && m.completar <= 4, 'completar: 1 a 4');
        req(Array.isArray(m.solucion) && m.solucion.length === m.completar && m.solucion.every((s) => (m.opciones || []).includes(s)), 'solucion debe tener "completar" elementos tomados de opciones');
      }
      break;
    default:
      break;
  }
}
