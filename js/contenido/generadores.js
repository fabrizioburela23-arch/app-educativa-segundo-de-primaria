// Generadores de ejercicios (navegador y Node, sin DOM).
// Cada generador recibe (params, rng, datos) y devuelve un ejercicio normal
// (tipo numero, opcion, ordenar...) con respuestas verificables.

import { DIAS_SEMANA, MESES, DINERO } from './catalogo.js';

// ---------- utilidades ----------

export function crearRng(semilla = Date.now()) {
  let a = semilla >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ent = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const elegir = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function mezclar(rng, arr) {
  const r = arr.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
const cifras = (n) => String(n).split('').reverse().map(Number); // unidades primero
const lista = (v, def) => (Array.isArray(v) ? v : v == null ? def : [v]);

const UNIDADES = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho',
  'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro',
  'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve',
];
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

export function numeroAPalabras(n) {
  if (n < 30) return UNIDADES[n];
  if (n < 100) {
    const d = Math.floor(n / 10), u = n % 10;
    return DECENAS[d] + (u ? ' y ' + UNIDADES[u] : '');
  }
  if (n === 100) return 'cien';
  if (n < 1000) {
    const c = Math.floor(n / 100), r = n % 100;
    return CENTENAS[c] + (r ? ' ' + numeroAPalabras(r) : '');
  }
  if (n === 1000) return 'mil';
  return String(n);
}

const ORDINALES = [
  '', 'primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo',
  'noveno', 'décimo', 'undécimo', 'duodécimo', 'decimotercero', 'decimocuarto',
  'decimoquinto', 'decimosexto', 'decimoséptimo', 'decimoctavo', 'decimonoveno', 'vigésimo',
];
export const ordinalPalabra = (n) => ORDINALES[n];

export function aRomano(n) {
  const tabla = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let r = '';
  for (const [v, s] of tabla) while (n >= v) { r += s; n -= v; }
  return r;
}
function romanoSumandoTodo(s) {
  const v = { I: 1, V: 5, X: 10, L: 50 };
  return s.split('').reduce((a, c) => a + v[c], 0);
}
function romanoAditivo(n) { // forma incorrecta típica: 4 → IIII, 9 → VIIII
  const tabla = [[50, 'L'], [10, 'X'], [5, 'V'], [1, 'I']];
  let r = '';
  for (const [v, s] of tabla) while (n >= v) { r += s; n -= v; }
  return r;
}

function horaTexto(h, m) {
  const art = (x) => (x === 1 ? 'La' : 'Las');
  const sig = h === 12 ? 1 : h + 1;
  if (m === 0) return `${art(h)} ${h} en punto`;
  if (m === 15) return `${art(h)} ${h} y cuarto`;
  if (m === 30) return `${art(h)} ${h} y media`;
  if (m === 45) return `${art(sig)} ${sig} menos cuarto`;
  return `${h}:${String(m).padStart(2, '0')}`;
}
export { horaTexto };

const OBJETOS_CONTAR = ['🍊', '🍎', '🥚', '🌽', '🍋', '🐤', '🥔', '🍞', '⚽', '🌸'];
const NOMBRES = ['Wara', 'Mateo', 'Kusi', 'Ana', 'Inti', 'Sofía', 'Arami', 'Juan', 'Nayra', 'Luis', 'Rosa', 'Tomás'];

const EXPLICA_SUMA_COL = (nums, op) => nums.join(` ${op} `);

// ---------- generadores ----------

export const GENERADORES = {
  suma: {
    errores: ['suma-olvida-llevar', 'suma-calculo'],
    crear({ digitos = 2, llevar = false, sumandos = 2 } = {}, rng) {
      const min = digitos === 1 ? 1 : 10 ** (digitos - 1);
      const max = 10 ** digitos - 1;
      let nums, suma;
      for (let intento = 0; intento < 500; intento++) {
        nums = Array.from({ length: sumandos }, () => ent(rng, min, max));
        suma = nums.reduce((a, b) => a + b, 0);
        if (suma > 999) continue;
        const cols = Math.max(...nums.map((n) => String(n).length));
        let hayLlevada = false;
        for (let i = 0; i < cols; i++) {
          const s = nums.reduce((a, n) => a + (cifras(n)[i] || 0), 0);
          if (s >= 10) hayLlevada = true;
        }
        if (digitos === 1) hayLlevada = suma >= 10;
        if (hayLlevada === !!llevar) break;
      }
      const cols = Math.max(...nums.map((n) => String(n).length));
      // error típico: no sumar lo que se lleva
      let sinLlevar = '';
      for (let i = 0; i < cols; i++) {
        const s = nums.reduce((a, n) => a + (cifras(n)[i] || 0), 0);
        sinLlevar = (i === cols - 1 ? String(s) : String(s % 10)) + sinLlevar;
      }
      const pasos = [];
      let lleva = 0;
      const nombresCol = ['unidades', 'decenas', 'centenas'];
      for (let i = 0; i < cols; i++) {
        const partes = nums.map((n) => cifras(n)[i] || 0);
        const s = partes.reduce((a, b) => a + b, 0) + lleva;
        const txtLleva = lleva ? ` + ${lleva} que llevabas` : '';
        if (s >= 10 && i < cols - 1) {
          pasos.push(`${nombresCol[i]}: ${partes.join(' + ')}${txtLleva} = ${s}, escribes ${s % 10} y llevas ${Math.floor(s / 10)}`);
        } else {
          pasos.push(`${nombresCol[i]}: ${partes.join(' + ')}${txtLleva} = ${s}`);
        }
        lleva = i < cols - 1 ? Math.floor(s / 10) : 0;
      }
      const erroresComunes = [];
      if (Number(sinLlevar) !== suma && digitos > 1) {
        erroresComunes.push({
          respuesta: Number(sinLlevar),
          pista: 'Casi. Parece que olvidaste sumar lo que llevabas a la siguiente columna.',
          error: 'suma-olvida-llevar',
        });
      }
      return {
        tipo: 'numero',
        enunciado: `¿Cuánto es ${EXPLICA_SUMA_COL(nums, '+')}?`,
        visual: { tipo: 'operacion', numeros: nums, op: '+', vertical: digitos > 1 },
        respuesta: suma,
        erroresComunes,
        pista: llevar
          ? 'Suma primero las unidades. Si pasan de 9, lleva 1 a la columna siguiente.'
          : digitos === 1 ? 'Puedes contar hacia adelante desde el número mayor.' : 'Suma primero las unidades y después las decenas.',
        explicacion: digitos === 1 ? `${nums.join(' + ')} = ${suma}.` : `${pasos.join('. ')}. El resultado es ${suma}.`,
        error: 'suma-calculo',
      };
    },
  },

  resta: {
    errores: ['resta-invierte', 'resta-calculo'],
    crear({ digitos = 2, prestar = false } = {}, rng) {
      const min = digitos === 1 ? 1 : 10 ** (digitos - 1);
      const max = 10 ** digitos - 1;
      let a, b;
      for (let intento = 0; intento < 500; intento++) {
        a = ent(rng, Math.max(min, 2), max);
        b = ent(rng, digitos === 1 ? 1 : Math.max(1, Math.floor(min / 2)), a - 1);
        if (digitos > 1 && b < 10) continue;
        const ca = cifras(a), cb = cifras(b);
        let necesita = false;
        for (let i = 0; i < ca.length; i++) if ((cb[i] || 0) > ca[i]) necesita = true;
        if (digitos === 1) necesita = false;
        if (necesita === !!prestar || digitos === 1) break;
      }
      const ca = cifras(a), cb = cifras(b);
      let invertida = '';
      for (let i = 0; i < ca.length; i++) invertida = String(Math.abs(ca[i] - (cb[i] || 0))) + invertida;
      const inv = Number(invertida);
      const erroresComunes = [];
      if (inv !== a - b) {
        erroresComunes.push({
          respuesta: inv,
          pista: 'Ojo: en cada columna restamos el número de abajo al de arriba. Si arriba hay menos, pide prestada una decena.',
          error: 'resta-invierte',
        });
      }
      return {
        tipo: 'numero',
        enunciado: `¿Cuánto es ${a} − ${b}?`,
        visual: { tipo: 'operacion', numeros: [a, b], op: '-', vertical: digitos > 1 },
        respuesta: a - b,
        erroresComunes,
        pista: prestar
          ? 'Empieza por las unidades. Si arriba hay menos, pide 1 decena prestada: son 10 unidades más.'
          : digitos === 1 ? 'Puedes contar hacia atrás.' : 'Resta primero las unidades y luego las decenas.',
        explicacion: `${a} − ${b} = ${a - b}. Puedes comprobarlo sumando: ${a - b} + ${b} = ${a}.`,
        error: 'resta-calculo',
      };
    },
  },

  comparar: {
    errores: ['comparar-signo'],
    crear({ max = 999 } = {}, rng) {
      let a = ent(rng, 1, max), b;
      const r = rng();
      if (r < 0.15) b = a;
      else if (r < 0.6 && max >= 100) {
        // mismas centenas o decenas para que haya que pensar
        const base = Math.floor(a / 10) * 10;
        b = Math.min(max, base + ent(rng, 0, 9));
        if (b === a) b = Math.min(max, a + ent(rng, 1, 9));
        if (b === a) b = a - 1;
      } else b = ent(rng, 1, max);
      if (b < 1) b = a + 1;
      const signo = a > b ? '>' : a < b ? '<' : '=';
      const nombre = { '>': 'es mayor que', '<': 'es menor que', '=': 'es igual a' };
      return {
        tipo: 'opcion',
        enunciado: `Elige el signo correcto: ${a} ☐ ${b}`,
        visual: { tipo: 'secuencia', items: [String(a), '☐', String(b)] },
        opciones: ['>', '<', '='].map((s) => ({
          texto: s,
          correcta: s === signo || undefined,
          pista: s === signo ? undefined : 'Compara primero las centenas; si son iguales, las decenas; y al final las unidades.',
          error: s === signo ? undefined : 'comparar-signo',
        })),
        columnas: 3,
        mezclar: false,
        pista: 'La boca del signo se abre hacia el número mayor.',
        explicacion: `${a} ${nombre[signo]} ${b}, por eso va el signo ${signo}.`,
        error: 'comparar-signo',
      };
    },
  },

  'anterior-siguiente': {
    errores: ['anterior-siguiente'],
    crear({ max = 999, salto = 1 } = {}, rng) {
      const n = ent(rng, salto + 1, max - salto);
      const texto = salto === 1
        ? `Escribe el número anterior y el siguiente de ${n}.`
        : `Cuenta de ${salto} en ${salto}. ¿Qué número va antes y cuál va después de ${n}?`;
      return {
        tipo: 'numero',
        enunciado: texto,
        visual: { tipo: 'recta', min: n - 2 * salto, max: n + 2 * salto, paso: salto, marcar: [n], ocultar: [n - salto, n + salto] },
        campos: [
          { etiqueta: 'Anterior', respuesta: n - salto },
          { etiqueta: 'Siguiente', respuesta: n + salto },
        ],
        pista: salto === 1 ? 'El anterior es 1 menos. El siguiente es 1 más.' : `Antes hay ${salto} menos; después hay ${salto} más.`,
        explicacion: `Antes de ${n} va ${n - salto} y después va ${n + salto}.`,
        error: 'anterior-siguiente',
      };
    },
  },

  'valor-posicional': {
    errores: ['valor-posicional'],
    crear({ max = 999 } = {}, rng) {
      const n = ent(rng, max >= 100 ? 101 : 11, max);
      const cs = cifras(n);
      const lugares = cs.length === 3 ? ['unidades', 'decenas', 'centenas'] : ['unidades', 'decenas'];
      let i = ent(rng, 0, lugares.length - 1);
      if (cs[i] === 0) i = cs.findIndex((d) => d !== 0);
      const valor = cs[i] * 10 ** i;
      const modo = rng() < 0.5 ? 'cifra' : 'valor';
      const tabla = cs.length === 3
        ? { tipo: 'tabla', columnas: ['C', 'D', 'U'], filas: [[cs[2], cs[1], cs[0]]] }
        : { tipo: 'tabla', columnas: ['D', 'U'], filas: [[cs[1], cs[0]]] };
      if (modo === 'cifra') {
        return {
          tipo: 'numero',
          enunciado: `En el número ${n}, ¿qué cifra está en el lugar de las ${lugares[i]}?`,
          visual: tabla,
          respuesta: cs[i],
          pista: 'C son las centenas, D las decenas y U las unidades. Busca la columna.',
          explicacion: `En ${n}, la cifra de las ${lugares[i]} es ${cs[i]}.`,
          error: 'valor-posicional',
        };
      }
      const erroresComunes = valor !== cs[i] ? [{ respuesta: cs[i], pista: `Esa es la cifra. Pero ¿cuánto vale estando en las ${lugares[i]}?`, error: 'valor-posicional' }] : [];
      return {
        tipo: 'numero',
        enunciado: `¿Cuánto vale el ${cs[i]} en el número ${n}?`,
        visual: tabla,
        respuesta: valor,
        erroresComunes,
        pista: 'Una decena vale 10 y una centena vale 100. Mira en qué lugar está la cifra.',
        explicacion: `El ${cs[i]} está en las ${lugares[i]}, por eso vale ${valor}.`,
        error: 'valor-posicional',
      };
    },
  },

  descomponer: {
    errores: ['descomponer'],
    crear({ max = 999 } = {}, rng) {
      const n = ent(rng, max >= 100 ? 100 : 10, max);
      const cs = cifras(n);
      const tres = cs.length === 3;
      if (rng() < 0.5) {
        return {
          tipo: 'numero',
          enunciado: `¿Cuántas centenas, decenas y unidades tiene ${n}?`,
          visual: { tipo: 'bloques', centenas: cs[2] || 0, decenas: cs[1] || 0, unidades: cs[0] },
          campos: [
            ...(tres ? [{ etiqueta: 'Centenas', respuesta: cs[2] }] : []),
            { etiqueta: 'Decenas', respuesta: cs[1] },
            { etiqueta: 'Unidades', respuesta: cs[0] },
          ],
          pista: 'Cuenta las placas (centenas), las barras (decenas) y los cubitos (unidades).',
          explicacion: `${n} tiene ${tres ? cs[2] + ' centenas, ' : ''}${cs[1]} decenas y ${cs[0]} unidades.`,
          error: 'descomponer',
        };
      }
      return {
        tipo: 'numero',
        enunciado: `Descompón ${n} en la suma de sus valores.`,
        campos: [
          ...(tres ? [{ etiqueta: 'Centenas', respuesta: cs[2] * 100 }] : []),
          { etiqueta: 'Decenas', respuesta: cs[1] * 10 },
          { etiqueta: 'Unidades', respuesta: cs[0] },
        ],
        pista: `Por ejemplo, 352 = 300 + 50 + 2.`,
        explicacion: `${n} = ${tres ? cs[2] * 100 + ' + ' : ''}${cs[1] * 10} + ${cs[0]}.`,
        error: 'descomponer',
      };
    },
  },

  'leer-numero': {
    errores: ['lectura-numeros'],
    crear({ max = 999, modo = 'a-palabras' } = {}, rng) {
      const n = ent(rng, max >= 100 ? 21 : 11, max);
      if (modo === 'a-cifras') {
        const cs = cifras(n);
        const pegado = Number(cs.map((d, i) => (d ? String(d * 10 ** i) : '')).reverse().join('') || '0');
        const erroresComunes = pegado !== n && pegado > 0
          ? [{ respuesta: pegado, pista: 'Escribiste cada parte por separado. Piensa cuántas centenas, decenas y unidades hay.', error: 'lectura-numeros' }]
          : [];
        return {
          tipo: 'numero',
          enunciado: `Escribe con cifras: ${numeroAPalabras(n)}.`,
          respuesta: n,
          erroresComunes,
          pista: 'Primero las centenas, después las decenas y al final las unidades.',
          explicacion: `«${numeroAPalabras(n)}» se escribe ${n}.`,
          error: 'lectura-numeros',
        };
      }
      const cs = cifras(n);
      const distractores = new Set();
      const candidatos = [
        Number(String(n).split('').reverse().join('')),
        cs.length === 3 ? cs[2] * 100 + cs[0] * 10 + cs[1] : n + 10,
        n + 100 <= 999 ? n + 100 : n - 100,
        n + 1, n - 10,
      ];
      for (const c of candidatos) if (c !== n && c > 0 && c <= 999) distractores.add(c);
      const opts = mezclar(rng, [n, ...[...distractores].slice(0, 2)]);
      return {
        tipo: 'opcion',
        enunciado: `¿Cómo se lee el número ${n}?`,
        opciones: opts.map((x) => ({
          texto: numeroAPalabras(x),
          correcta: x === n || undefined,
          error: x === n ? undefined : 'lectura-numeros',
        })),
        columnas: 1,
        pista: 'Lee primero las centenas, luego las decenas y las unidades.',
        explicacion: `${n} se lee «${numeroAPalabras(n)}».`,
        error: 'lectura-numeros',
      };
    },
  },

  'par-impar': {
    errores: ['par-impar'],
    crear({ max = 99 } = {}, rng) {
      if (rng() < 0.5) {
        const n = ent(rng, 1, max);
        const par = n % 2 === 0;
        return {
          tipo: 'opcion',
          enunciado: `¿El número ${n} es par o impar?`,
          visual: n <= 20 ? { tipo: 'emoji', valor: '🧦', cantidad: n } : undefined,
          opciones: [
            { texto: 'Par', correcta: par || undefined, error: par ? undefined : 'par-impar' },
            { texto: 'Impar', correcta: !par || undefined, error: !par ? undefined : 'par-impar' },
          ],
          columnas: 2,
          mezclar: false,
          pista: 'Mira la última cifra. Si es 0, 2, 4, 6 u 8, el número es par.',
          explicacion: `${n} termina en ${n % 10}, por eso es ${par ? 'par' : 'impar'}.`,
          error: 'par-impar',
        };
      }
      const nums = new Set();
      while (nums.size < 6) nums.add(ent(rng, 1, max));
      const arr = [...nums];
      if (arr.every((x) => x % 2 === 0)) arr[0] = arr[0] + 1 <= max ? arr[0] + 1 : arr[0] - 1;
      if (arr.every((x) => x % 2 === 1)) arr[0] = arr[0] + 1 <= max ? arr[0] + 1 : arr[0] - 1;
      const unicos = [...new Set(arr)];
      return {
        tipo: 'clasificar',
        enunciado: 'Separa los números pares y los impares.',
        categorias: [{ id: 'par', texto: 'Pares' }, { id: 'impar', texto: 'Impares' }],
        elementos: unicos.map((x) => ({ texto: String(x), categoria: x % 2 === 0 ? 'par' : 'impar' })),
        pista: 'Fíjate solo en la última cifra de cada número.',
        explicacion: 'Los pares terminan en 0, 2, 4, 6 u 8. Los impares terminan en 1, 3, 5, 7 o 9.',
        error: 'par-impar',
      };
    },
  },

  'ordenar-numeros': {
    errores: ['orden-numeros'],
    crear({ max = 999, cantidad = 4, orden = 'asc' } = {}, rng) {
      const s = new Set();
      const base = ent(rng, 1, max);
      while (s.size < cantidad) {
        // números cercanos para que haya que fijarse en todas las cifras
        const v = rng() < 0.5 ? ent(rng, 1, max) : Math.min(max, Math.max(1, base + ent(rng, -40, 40)));
        s.add(v);
      }
      const nums = [...s].sort((a, b) => (orden === 'asc' ? a - b : b - a));
      return {
        tipo: 'ordenar',
        enunciado: orden === 'asc' ? 'Ordena de menor a mayor.' : 'Ordena de mayor a menor.',
        elementos: nums.map(String),
        pista: 'Compara primero las centenas, después las decenas y al final las unidades.',
        explicacion: `El orden correcto es: ${nums.join(', ')}.`,
        error: 'orden-numeros',
      };
    },
  },

  romano: {
    errores: ['romanos'],
    crear({ max = 20, modo = 'a-cifras' } = {}, rng) {
      const n = ent(rng, 1, Math.min(50, max));
      const r = aRomano(n);
      if (modo === 'a-cifras') {
        const todo = romanoSumandoTodo(r);
        const erroresComunes = todo !== n
          ? [{ respuesta: todo, pista: 'Cuando la I está antes de la V o de la X, se resta. Por ejemplo, IV es 4.', error: 'romanos' }]
          : [];
        return {
          tipo: 'numero',
          enunciado: `¿Qué número es ${r}?`,
          respuesta: n,
          erroresComunes,
          pista: 'I vale 1, V vale 5, X vale 10 y L vale 50.',
          explicacion: `${r} = ${n}.`,
          error: 'romanos',
        };
      }
      const cand = new Set([romanoAditivo(n), aRomano(n + 1), aRomano(Math.max(1, n - 1)), r.split('').reverse().join('')]);
      cand.delete(r);
      const dis = mezclar(rng, [...cand]).slice(0, 2);
      return {
        tipo: 'opcion',
        enunciado: `¿Cómo se escribe ${n} en números romanos?`,
        opciones: mezclar(rng, [r, ...dis]).map((x) => ({
          texto: x,
          correcta: x === r || undefined,
          pista: x === romanoAditivo(n) && x !== r ? 'No se repite la misma letra más de 3 veces seguidas.' : undefined,
          error: x === r ? undefined : 'romanos',
        })),
        columnas: 3,
        pista: 'I vale 1, V vale 5, X vale 10 y L vale 50.',
        explicacion: `${n} se escribe ${r}.`,
        error: 'romanos',
      };
    },
  },

  ordinal: {
    errores: ['ordinales'],
    crear({ max = 10 } = {}, rng) {
      const tope = Math.min(20, Math.max(4, max));
      if (rng() < 0.5) {
        const s = new Set();
        while (s.size < 4) s.add(ent(rng, 1, tope));
        const ns = [...s];
        return {
          tipo: 'relacionar',
          enunciado: 'Une cada número ordinal con su nombre.',
          pares: ns.map((n) => [`${n}.º`, ORDINALES[n]]),
          pista: '1.º es primero, 2.º es segundo, 3.º es tercero...',
          explicacion: ns.map((n) => `${n}.º = ${ORDINALES[n]}`).join(', ') + '.',
          error: 'ordinales',
        };
      }
      const largo = Math.min(tope, ent(rng, 5, 8));
      const animales = mezclar(rng, ['🦙', '🐸', '🐢', '🦜', '🐇', '🐑', '🐓', '🐕', '🐈', '🐖']).slice(0, largo);
      const pos = ent(rng, 1, largo);
      const cand = new Set([pos, pos + 1, pos - 1, largo - pos + 1].filter((x) => x >= 1 && x <= largo));
      const otros = mezclar(rng, [...cand].filter((x) => x !== pos)).slice(0, 2);
      while (otros.length < 2) {
        const x = ent(rng, 1, largo);
        if (x !== pos && !otros.includes(x)) otros.push(x);
      }
      return {
        tipo: 'opcion',
        enunciado: `Los animales hacen una fila. Cuenta desde la izquierda. ¿En qué lugar está ${animales[pos - 1]}?`,
        visual: { tipo: 'emojis', items: animales },
        opciones: mezclar(rng, [pos, ...otros]).map((x) => ({
          texto: `${ORDINALES[x]} (${x}.º)`,
          correcta: x === pos || undefined,
          error: x === pos ? undefined : 'ordinales',
        })),
        columnas: 1,
        pista: 'Empieza a contar desde el primero de la izquierda: primero, segundo, tercero...',
        explicacion: `Está en el lugar número ${pos}: es el ${ORDINALES[pos]}.`,
        error: 'ordinales',
      };
    },
  },

  'patron-numerico': {
    errores: ['patron-numerico'],
    crear({ paso = 2, max = 100, operacion = 'suma' } = {}, rng) {
      const p = elegir(rng, lista(paso, [2]));
      const largo = 5;
      let inicio;
      if (operacion === 'resta') inicio = ent(rng, p * largo, Math.max(p * largo, max));
      else inicio = ent(rng, 0, Math.max(0, max - p * largo));
      const serie = Array.from({ length: largo }, (_, i) => (operacion === 'resta' ? inicio - i * p : inicio + i * p));
      const oculto = rng() < 0.6 ? largo - 1 : ent(rng, 1, largo - 2);
      const items = serie.map((x, i) => (i === oculto ? '?' : String(x)));
      return {
        tipo: 'numero',
        enunciado: '¿Qué número falta en el patrón?',
        visual: { tipo: 'secuencia', items, oculto },
        respuesta: serie[oculto],
        pista: `Mira cuánto ${operacion === 'resta' ? 'baja' : 'sube'} de un número al siguiente.`,
        explicacion: `Cada número ${operacion === 'resta' ? 'baja' : 'sube'} de ${p} en ${p}. El que falta es ${serie[oculto]}.`,
        error: 'patron-numerico',
      };
    },
  },

  tabla: {
    errores: ['tabla-multiplicar'],
    crear({ tablas = [2, 3, 4, 5], visual = false } = {}, rng) {
      const a = elegir(rng, lista(tablas, [2]));
      const b = ent(rng, 1, 10);
      const erroresComunes = [];
      if (a + b !== a * b) erroresComunes.push({ respuesta: a + b, pista: 'Eso es sumar. Multiplicar es sumar grupos iguales.', error: 'tabla-multiplicar' });
      return {
        tipo: 'numero',
        enunciado: `¿Cuánto es ${a} × ${b}?`,
        visual: visual ? { tipo: 'arreglo', filas: b, columnas: a, emoji: '🟡' } : { tipo: 'operacion', numeros: [a, b], op: '×', vertical: false },
        respuesta: a * b,
        erroresComunes,
        pista: `Puedes contar de ${a} en ${a}, ${b} veces.`,
        explicacion: `${a} × ${b} = ${a * b}, porque ${Array(b).fill(a).join(' + ')} = ${a * b}.`,
        error: 'tabla-multiplicar',
      };
    },
  },

  'multiplicar-grupos': {
    errores: ['multiplicacion-grupos'],
    crear({ maxGrupos = 5, maxPorGrupo = 5 } = {}, rng) {
      const g = ent(rng, 2, maxGrupos);
      const p = ent(rng, 2, maxPorGrupo);
      const e = elegir(rng, OBJETOS_CONTAR);
      return {
        tipo: 'numero',
        enunciado: `Hay ${g} grupos con ${p} ${e} cada uno. Escribe la suma y la multiplicación.`,
        visual: { tipo: 'grupos', grupos: g, porGrupo: p, emoji: e },
        campos: [
          { etiqueta: `${Array(g).fill(p).join(' + ')} =`, respuesta: g * p },
          { etiqueta: `${g} × ${p} =`, respuesta: g * p },
        ],
        pista: `Cuenta cuántos hay en un grupo y súmalo ${g} veces.`,
        explicacion: `${Array(g).fill(p).join(' + ')} = ${g * p}. Es lo mismo que ${g} × ${p} = ${g * p}.`,
        error: 'multiplicacion-grupos',
      };
    },
  },

  'por-10-100-1000': {
    errores: ['multiplicar-10-100'],
    crear({ factores = [10, 100], max = 9 } = {}, rng) {
      const f = elegir(rng, lista(factores, [10]));
      const n = ent(rng, 1, max);
      const erroresComunes = [];
      if (f > 10) erroresComunes.push({ respuesta: n * (f / 10), pista: `Cuenta los ceros de ${f}: agrega todos al final.`, error: 'multiplicar-10-100' });
      return {
        tipo: 'numero',
        enunciado: `¿Cuánto es ${n} × ${f}?`,
        respuesta: n * f,
        erroresComunes,
        pista: `Para multiplicar por ${f}, escribe el número y agrega ${String(f).length - 1} cero${f > 10 ? 's' : ''} al final.`,
        explicacion: `${n} × ${f} = ${n * f}.`,
        error: 'multiplicar-10-100',
      };
    },
  },

  division: {
    errores: ['division'],
    crear({ divisores = [2, 3, 4, 5], maxCociente = 5, contexto = 'repartir' } = {}, rng) {
      const d = elegir(rng, lista(divisores, [2]));
      const q = ent(rng, 2, Math.max(2, maxCociente));
      const total = d * q;
      const persona = elegir(rng, NOMBRES);
      if (contexto === 'agrupar') {
        const e = elegir(rng, ['🥚', '🍞', '🍊', '🌽']);
        const erroresComunes = d !== q ? [{ respuesta: d, pista: `${d} es lo que va en cada grupo. ¿Cuántos grupos se forman?`, error: 'division' }] : [];
        return {
          tipo: 'numero',
          enunciado: `${persona} tiene ${total} ${e}. Pone ${d} en cada bolsa. ¿Cuántas bolsas llena?`,
          visual: { tipo: 'emoji', valor: e, cantidad: Math.min(total, 30) },
          respuesta: q,
          erroresComunes,
          pista: `Forma grupos de ${d} y cuenta cuántos grupos salen.`,
          explicacion: `${total} ÷ ${d} = ${q}, porque ${q} × ${d} = ${total}.`,
          error: 'division',
        };
      }
      const e = elegir(rng, ['🍞', '🍊', '🍬', '🥭']);
      const erroresComunes = d !== q ? [{ respuesta: d, pista: `${d} es el número de platos. ¿Cuántos van en cada plato?`, error: 'division' }] : [];
      return {
        tipo: 'numero',
        enunciado: `${persona} reparte ${total} ${e} en ${d} platos iguales. ¿Cuántos van en cada plato?`,
        visual: { tipo: 'emoji', valor: e, cantidad: Math.min(total, 30) },
        respuesta: q,
        erroresComunes,
        pista: `Reparte uno por uno en los ${d} platos hasta que no quede ninguno.`,
        explicacion: `${total} ÷ ${d} = ${q}, porque ${d} × ${q} = ${total}.`,
        error: 'division',
      };
    },
  },

  'division-relacion': {
    errores: ['division-multiplicacion'],
    crear({ tablas = [2, 3, 4, 5] } = {}, rng) {
      const a = elegir(rng, lista(tablas, [2]));
      const b = ent(rng, 1, 10);
      return {
        tipo: 'numero',
        enunciado: `Si ${a} × ${b} = ${a * b}, ¿cuánto es ${a * b} ÷ ${a}?`,
        respuesta: b,
        pista: 'La división es lo contrario de la multiplicación. Mira la multiplicación.',
        explicacion: `${a * b} ÷ ${a} = ${b}, porque ${a} × ${b} = ${a * b}.`,
        error: 'division-multiplicacion',
      };
    },
  },

  fraccion: {
    errores: ['fraccion-reconocer'],
    crear({ partes = [2, 4] } = {}, rng) {
      const p = elegir(rng, lista(partes, [2]));
      const forma = elegir(rng, ['circulo', 'rectangulo', 'barra']);
      if (rng() < 0.25) {
        const iguales = rng() < 0.5;
        return {
          tipo: 'opcion',
          enunciado: '¿Esta figura está dividida en partes iguales?',
          visual: { tipo: 'fraccion', forma: forma === 'circulo' ? 'rectangulo' : forma, partes: p, coloreadas: 0, iguales },
          opciones: [
            { texto: 'Sí', correcta: iguales || undefined, error: iguales ? undefined : 'fraccion-reconocer' },
            { texto: 'No', correcta: !iguales || undefined, error: !iguales ? undefined : 'fraccion-reconocer' },
          ],
          columnas: 2,
          mezclar: false,
          pista: 'Para que sean mitades o cuartos, todas las partes deben ser del mismo tamaño.',
          explicacion: iguales ? 'Todas las partes tienen el mismo tamaño.' : 'Las partes no tienen el mismo tamaño, así que no son mitades ni cuartos.',
          error: 'fraccion-reconocer',
        };
      }
      const k = p === 2 ? 1 : ent(rng, 1, 3);
      const nombres = { '2-1': 'un medio (la mitad)', '4-1': 'un cuarto', '4-2': 'dos cuartos (la mitad)', '4-3': 'tres cuartos', '2-2': 'un entero', '4-4': 'un entero' };
      const correcta = nombres[`${p}-${k}`];
      const todas = ['un medio (la mitad)', 'un cuarto', 'tres cuartos', 'dos cuartos (la mitad)', 'un entero'];
      const dis = mezclar(rng, todas.filter((x) => x !== correcta && !(p === 4 && k === 2 && x === 'un medio (la mitad)') && !(p === 2 && x === 'dos cuartos (la mitad)'))).slice(0, 2);
      return {
        tipo: 'opcion',
        enunciado: '¿Qué parte de la figura está pintada?',
        visual: { tipo: 'fraccion', forma, partes: p, coloreadas: k },
        opciones: mezclar(rng, [correcta, ...dis]).map((x) => ({ texto: x, correcta: x === correcta || undefined, error: x === correcta ? undefined : 'fraccion-reconocer' })),
        columnas: 1,
        pista: `Cuenta en cuántas partes iguales está dividida y cuántas están pintadas.`,
        explicacion: `La figura tiene ${p} partes iguales y ${k} está${k > 1 ? 'n' : ''} pintada${k > 1 ? 's' : ''}: es ${correcta}.`,
        error: 'fraccion-reconocer',
      };
    },
  },

  'dinero-contar': {
    errores: ['dinero-contar'],
    crear({ maxBs = 50, centavos = false } = {}, rng) {
      const codigosBs = ['m1', 'm2', 'm5', 'b10', 'b20', 'b50', 'b100', 'b200'].filter((c) => DINERO[c].valor <= maxBs * 100);
      const codigosCt = ['c10', 'c20', 'c50'];
      let items, total;
      for (let intento = 0; intento < 200; intento++) {
        const n = ent(rng, 2, 5);
        items = Array.from({ length: n }, () => elegir(rng, codigosBs));
        if (centavos) items.push(...Array.from({ length: ent(rng, 1, 2) }, () => elegir(rng, codigosCt)));
        total = items.reduce((a, c) => a + DINERO[c].valor, 0);
        if (total <= maxBs * 100 + (centavos ? 99 : 0) && (!centavos || total % 100 !== 0)) break;
      }
      items.sort((a, b) => DINERO[b].valor - DINERO[a].valor);
      const bs = Math.floor(total / 100), ct = total % 100;
      const base = {
        tipo: 'numero',
        enunciado: '¿Cuánto dinero hay en total?',
        visual: { tipo: 'dinero', items },
        pista: 'Empieza por el billete o la moneda de más valor y ve sumando.',
        explicacion: `Hay ${bs} Bs${ct ? ` con ${ct} centavos` : ''}.`,
        error: 'dinero-contar',
      };
      if (!centavos) {
        const erroresComunes = items.length !== bs ? [{ respuesta: items.length, pista: 'Contaste cuántas piezas hay. Suma lo que vale cada una.', error: 'dinero-contar' }] : [];
        return { ...base, respuesta: bs, sufijo: 'Bs', erroresComunes };
      }
      return { ...base, campos: [{ etiqueta: 'Bolivianos', respuesta: bs }, { etiqueta: 'Centavos', respuesta: ct }] };
    },
  },

  'dinero-total': {
    errores: ['dinero-total'],
    crear({ productos = 2, maxPrecio = 10 } = {}, rng, datos) {
      const feria = (datos?.feria || FERIA_BASE).filter((p) => p.precio <= maxPrecio);
      const elegidos = mezclar(rng, feria).slice(0, Math.max(2, Math.min(3, productos)));
      const total = elegidos.reduce((a, p) => a + p.precio, 0);
      const persona = elegir(rng, NOMBRES);
      return {
        tipo: 'numero',
        enunciado: `${persona} compra en la feria: ${elegidos.map((p) => `${p.nombre} a ${p.precio} Bs`).join(', ')}. ¿Cuánto paga en total?`,
        visual: { tipo: 'emojis', items: elegidos.map((p) => p.emoji), etiquetas: elegidos.map((p) => `${p.precio} Bs`) },
        respuesta: total,
        sufijo: 'Bs',
        pista: 'Para saber el total, suma los precios.',
        explicacion: `${elegidos.map((p) => p.precio).join(' + ')} = ${total} Bs.`,
        error: 'dinero-total',
      };
    },
  },

  'dinero-cambio': {
    errores: ['dinero-cambio'],
    crear({ maxPrecio = 20, pagos = [10, 20, 50] } = {}, rng, datos) {
      const feria = (datos?.feria || FERIA_BASE).filter((p) => p.precio <= maxPrecio);
      const prod = elegir(rng, feria.length ? feria : FERIA_BASE);
      const billetes = lista(pagos, [10, 20]).filter((b) => b > prod.precio).sort((a, b) => a - b);
      const paga = billetes.length ? elegir(rng, billetes.slice(0, 2)) : 100;
      const codigo = { 10: 'b10', 20: 'b20', 50: 'b50', 100: 'b100', 200: 'b200', 5: 'm5', 2: 'm2', 1: 'm1' }[paga] || 'b100';
      const cambio = paga - prod.precio;
      const persona = elegir(rng, NOMBRES);
      return {
        tipo: 'numero',
        enunciado: `${persona} compra ${prod.nombre} a ${prod.precio} Bs y paga con ${paga} Bs. ¿Cuánto cambio recibe?`,
        visual: { tipo: 'dinero', items: [codigo] },
        respuesta: cambio,
        sufijo: 'Bs',
        erroresComunes: [{ respuesta: paga + prod.precio, pista: 'El cambio es lo que sobra. ¿Sumar o restar?', error: 'dinero-cambio' }],
        pista: `Cuenta desde ${prod.precio} hasta ${paga}, o resta ${paga} − ${prod.precio}.`,
        explicacion: `${paga} − ${prod.precio} = ${cambio} Bs de cambio.`,
        error: 'dinero-cambio',
      };
    },
  },

  reloj: {
    errores: ['reloj-lectura'],
    crear({ precision = 'hora' } = {}, rng) {
      const h = ent(rng, 1, 12);
      const minutosPosibles = { hora: [0], media: [0, 30], cuarto: [0, 15, 30, 45], cinco: [5, 10, 20, 25, 35, 40, 50, 55, 15, 45] }[precision] || [0];
      const m = elegir(rng, minutosPosibles);
      const correcta = horaTexto(h, m);
      if (rng() < 0.35) {
        const paso = precision === 'cinco' ? 5 : precision === 'cuarto' ? 15 : 30;
        return {
          tipo: 'manipular',
          enunciado: `Mueve las agujas para que el reloj marque: ${correcta.toLowerCase()}.`,
          manipulable: { tipo: 'reloj', objetivo: { hora: h, minutos: m }, paso, inicial: { hora: h === 12 ? 6 : 12, minutos: 0 } },
          pista: 'La aguja larga marca los minutos. La aguja corta marca la hora.',
          explicacion: `Para ${correcta.toLowerCase()}, la aguja corta apunta ${m === 0 ? 'al ' + h : 'cerca del ' + h} y la larga ${m === 0 ? 'al 12' : 'al ' + (m / 5)}.`,
          error: 'reloj-lectura',
        };
      }
      const cand = new Set();
      const hInv = m === 0 ? 12 : m / 5; // agujas confundidas
      if (hInv >= 1 && hInv <= 12) cand.add(horaTexto(hInv, (h * 5) % 60));
      cand.add(horaTexto(h === 12 ? 1 : h + 1, m));
      cand.add(horaTexto(h, m === 30 ? 0 : 30));
      if (m % 15 === 0) cand.add(horaTexto(h, (m + 15) % 60));
      cand.delete(correcta);
      const dis = mezclar(rng, [...cand]).slice(0, 2);
      return {
        tipo: 'opcion',
        enunciado: '¿Qué hora marca el reloj?',
        visual: { tipo: 'reloj', hora: h, minutos: m },
        opciones: mezclar(rng, [correcta, ...dis]).map((x) => ({ texto: x, correcta: x === correcta || undefined, error: x === correcta ? undefined : 'reloj-lectura' })),
        columnas: 1,
        pista: 'La aguja corta marca la hora. La aguja larga marca los minutos.',
        explicacion: `El reloj marca ${correcta.toLowerCase()}.`,
        error: 'reloj-lectura',
      };
    },
  },

  regla: {
    errores: ['medir-longitud'],
    crear({ max = 15 } = {}, rng) {
      const l = ent(rng, 2, Math.min(20, max));
      const obj = elegir(rng, ['✏️', '🖍️', '🔑', '🥄', '🐛', '🍌', '📎']);
      return {
        tipo: 'numero',
        enunciado: '¿Cuántos centímetros mide?',
        visual: { tipo: 'regla', longitud: l, objeto: obj },
        respuesta: l,
        sufijo: 'cm',
        erroresComunes: [{ respuesta: l + 1, pista: 'Ojo: empieza a contar desde el 0, no desde el 1.', error: 'medir-longitud' }],
        pista: 'Mira dónde empieza el objeto (en el 0) y dónde termina.',
        explicacion: `Empieza en 0 y termina en ${l}: mide ${l} cm.`,
        error: 'medir-longitud',
      };
    },
  },

  'suma-propiedad': {
    errores: ['propiedades-suma'],
    crear({ propiedad = 'conmutativa' } = {}, rng) {
      const a = ent(rng, 2, 60), b = ent(rng, 2, 39), c = ent(rng, 2, 20);
      if (propiedad === 'asociativa') {
        return {
          tipo: 'numero',
          enunciado: `Completa: (${a} + ${b}) + ${c} = ${a} + (${b} + ☐)`,
          respuesta: c,
          pista: 'Si agrupamos los sumandos de otra forma, el resultado no cambia. ¿Qué número falta?',
          explicacion: `Los sumandos son los mismos: ${a}, ${b} y ${c}. Falta el ${c}.`,
          error: 'propiedades-suma',
        };
      }
      if (propiedad === 'neutro') {
        return {
          tipo: 'numero',
          enunciado: `¿Cuánto es ${a} + 0?`,
          respuesta: a,
          pista: 'Si sumas 0, no agregas nada.',
          explicacion: `${a} + 0 = ${a}. El 0 no cambia el número.`,
          error: 'propiedades-suma',
        };
      }
      return {
        tipo: 'numero',
        enunciado: `Si ${a} + ${b} = ${a + b}, ¿cuánto es ${b} + ${a}?`,
        respuesta: a + b,
        pista: 'Si cambias el orden de los sumandos, ¿cambia el resultado?',
        explicacion: `${b} + ${a} = ${a + b}. El orden de los sumandos no cambia la suma.`,
        error: 'propiedades-suma',
      };
    },
  },

  calendario: {
    errores: ['calendario'],
    crear({ pregunta = 'dia-siguiente' } = {}, rng) {
      const mod = (x, n) => ((x % n) + n) % n;
      if (pregunta === 'mes-siguiente' || pregunta === 'mes-anterior') {
        const i = ent(rng, 0, 11);
        const j = pregunta === 'mes-siguiente' ? mod(i + 1, 12) : mod(i - 1, 12);
        const dis = mezclar(rng, [mod(i + 2, 12), mod(i - 2, 12), pregunta === 'mes-siguiente' ? mod(i - 1, 12) : mod(i + 1, 12)]).slice(0, 2);
        return {
          tipo: 'opcion',
          enunciado: `¿Qué mes viene ${pregunta === 'mes-siguiente' ? 'después' : 'antes'} de ${MESES[i]}?`,
          opciones: mezclar(rng, [j, ...dis]).map((x) => ({ texto: MESES[x], correcta: x === j || undefined, error: x === j ? undefined : 'calendario' })),
          columnas: 1,
          pista: 'Recita los meses en orden: enero, febrero, marzo...',
          explicacion: `${pregunta === 'mes-siguiente' ? 'Después' : 'Antes'} de ${MESES[i]} viene ${MESES[j]}.`,
          error: 'calendario',
        };
      }
      if (pregunta === 'dias-semana') {
        const i = ent(rng, 0, 6), k = ent(rng, 2, 4);
        const j = mod(i + k, 7);
        const dis = mezclar(rng, [mod(j + 1, 7), mod(j - 1, 7), mod(i + 1, 7)].filter((x) => x !== j));
        const opts = [...new Set([j, ...dis])].slice(0, 3);
        return {
          tipo: 'opcion',
          enunciado: `Hoy es ${DIAS_SEMANA[i]}. ¿Qué día será dentro de ${k} días?`,
          opciones: mezclar(rng, opts).map((x) => ({ texto: DIAS_SEMANA[x], correcta: x === j || undefined, error: x === j ? undefined : 'calendario' })),
          columnas: 1,
          pista: `Cuenta ${k} días desde ${DIAS_SEMANA[i]} sin contar hoy.`,
          explicacion: `Contando ${k} días desde ${DIAS_SEMANA[i]} llegamos al ${DIAS_SEMANA[j]}.`,
          error: 'calendario',
        };
      }
      const i = ent(rng, 0, 6);
      const j = pregunta === 'dia-anterior' ? mod(i - 1, 7) : mod(i + 1, 7);
      const dis = mezclar(rng, [mod(i + 2, 7), mod(i - 2, 7), pregunta === 'dia-anterior' ? mod(i + 1, 7) : mod(i - 1, 7)]).slice(0, 2);
      return {
        tipo: 'opcion',
        enunciado: `¿Qué día viene ${pregunta === 'dia-anterior' ? 'antes del' : 'después del'} ${DIAS_SEMANA[i]}?`,
        opciones: mezclar(rng, [j, ...dis]).map((x) => ({ texto: DIAS_SEMANA[x], correcta: x === j || undefined, error: x === j ? undefined : 'calendario' })),
        columnas: 1,
        pista: 'Los días de la semana son: lunes, martes, miércoles, jueves, viernes, sábado y domingo.',
        explicacion: `${pregunta === 'dia-anterior' ? 'Antes' : 'Después'} del ${DIAS_SEMANA[i]} viene el ${DIAS_SEMANA[j]}.`,
        error: 'calendario',
      };
    },
  },

  'fechas-civicas': {
    errores: ['fechas-civicas'],
    crear({ tipo = 'todas', modo = 'que-se-celebra' } = {}, rng, datos) {
      let fechas = (datos?.fechas || []).filter((f) => f.publicada !== false);
      const filtradas = tipo === 'todas' ? fechas : fechas.filter((f) => f.tipo === tipo);
      if (filtradas.length >= 3) fechas = filtradas;
      if (fechas.length < 3) {
        return {
          tipo: 'opcion',
          enunciado: '¿Cuántos meses tiene un año?',
          opciones: [{ texto: '12', correcta: true }, { texto: '10', error: 'fechas-civicas' }, { texto: '7', error: 'fechas-civicas' }],
          pista: 'Piensa en el calendario: de enero a diciembre.',
          explicacion: 'Un año tiene 12 meses.',
          error: 'fechas-civicas',
        };
      }
      const f = elegir(rng, fechas);
      const fechaTxt = (x) => `${x.dia} de ${MESES[x.mes - 1]}`;
      const otras = [];
      for (const x of mezclar(rng, fechas)) {
        if (otras.length === 2) break;
        const usadas = [f, ...otras];
        if (usadas.some((u) => u.id === x.id || fechaTxt(u) === fechaTxt(x) || u.nombre === x.nombre)) continue;
        otras.push(x);
      }
      if (modo === 'cuando') {
        return {
          tipo: 'opcion',
          enunciado: `¿Cuándo recordamos: ${f.nombre}?`,
          opciones: mezclar(rng, [f, ...otras]).map((x) => ({ texto: fechaTxt(x), correcta: x.id === f.id || undefined, error: x.id === f.id ? undefined : 'fechas-civicas' })),
          columnas: 1,
          pista: f.pista || f.descripcion,
          explicacion: `${f.nombre}: ${fechaTxt(f)}. ${f.descripcion}`,
          error: 'fechas-civicas',
        };
      }
      return {
        tipo: 'opcion',
        enunciado: `¿Qué recordamos el ${fechaTxt(f)}?`,
        opciones: mezclar(rng, [f, ...otras]).map((x) => ({ texto: x.nombre, correcta: x.id === f.id || undefined, error: x.id === f.id ? undefined : 'fechas-civicas' })),
        columnas: 1,
        pista: f.pista || f.descripcion,
        explicacion: `El ${fechaTxt(f)} recordamos: ${f.nombre}. ${f.descripcion}`,
        error: 'fechas-civicas',
      };
    },
  },
};

// Productos por defecto si no se cargó content/datos.json
export const FERIA_BASE = [
  { nombre: 'un kilo de papa', emoji: '🥔', precio: 5 },
  { nombre: 'un kilo de tomate', emoji: '🍅', precio: 6 },
  { nombre: 'un choclo', emoji: '🌽', precio: 2 },
  { nombre: 'un kilo de arroz', emoji: '🍚', precio: 8 },
  { nombre: 'un pan', emoji: '🍞', precio: 1 },
];

// Crea un ejercicio concreto a partir de una plantilla {tipo:'generador', ...}
export function generar(plantilla, rng, datos) {
  const g = GENERADORES[plantilla.generador];
  if (!g) throw new Error(`Generador desconocido: ${plantilla.generador}`);
  const ej = g.crear(plantilla.params || {}, rng, datos);
  // quitar claves undefined (JSON limpio) y marcar el origen
  const limpio = JSON.parse(JSON.stringify(ej));
  return { ...limpio, id: plantilla.id, nivel: plantilla.nivel, generado: true, generador: plantilla.generador };
}

export function erroresDeGenerador(nombre) {
  return GENERADORES[nombre]?.errores || [];
}
