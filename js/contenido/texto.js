// Utilidades de texto compartidas (navegador y Node, sin DOM).

export const textoOpcion = (o) => {
  if (o == null) return '';
  if (typeof o === 'string') return o;
  return (o.texto || o.emoji || '').toString();
};

const TILDES = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U' };
export const quitarTildes = (s) => s.replace(/[áéíóúÁÉÍÓÚ]/g, (c) => TILDES[c]);

// Escapa HTML y convierte **negrita** en <strong>.
export function aHtml(texto) {
  const esc = String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// Texto apto para la voz sintética.
export function paraVoz(texto) {
  return String(texto ?? '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[([^\]|]*)(\|[^\]]*)?\]/g, ' ... ')
    .replace(/☐|_{2,}/g, ' ... ')
    .replace(/(\d)\s*×\s*(\d)/g, '$1 por $2')
    .replace(/(\d)\s*÷\s*(\d)/g, '$1 entre $2')
    .replace(/(\d)\s*[−-]\s*(\d)/g, '$1 menos $2')
    .replace(/(\d)\s*\+\s*(\d)/g, '$1 más $2')
    .replace(/\s=\s/g, ' es igual a ')
    .replace(/(\d+)\s*Bs\b/g, '$1 bolivianos')
    .replace(/\bBs\b/g, 'bolivianos')
    .replace(/(\d+)\s*cm\b/g, '$1 centímetros')
    .replace(/(\d+)\s*kg\b/g, '$1 kilos')
    .replace(/(\d+)\.º/g, '$1')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// "*Wara* vive en *Oruro*." → tokens
export function tokenizarTocar(texto) {
  const tokens = [];
  const partes = String(texto).split('*');
  if (partes.length % 2 === 0) return { tokens: [], error: 'asteriscos desbalanceados en el texto' };
  const reTok = /([\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*)|(\s+)|([^\s\p{L}\p{N}]+)/gu;
  partes.forEach((parte, i) => {
    if (i % 2 === 1) {
      if (!parte.trim()) return;
      tokens.push({ texto: parte, palabra: true, correcta: true });
      return;
    }
    let m;
    while ((m = reTok.exec(parte))) {
      if (m[1]) tokens.push({ texto: m[1], palabra: true, correcta: false });
      else if (m[2]) tokens.push({ texto: ' ', espacio: true });
      else tokens.push({ texto: m[3], palabra: false });
    }
  });
  return { tokens };
}

// "El ca[rr]o [es|está]." → partes y huecos
export function analizarCompletar(texto) {
  const partes = [];
  const huecos = [];
  let i = 0;
  const s = String(texto);
  let buf = '';
  while (i < s.length) {
    const c = s[i];
    if (c === '[') {
      const fin = s.indexOf(']', i);
      if (fin < 0) return { partes, huecos, error: 'falta cerrar un corchete ]' };
      const dentro = s.slice(i + 1, fin);
      if (dentro.includes('[')) return { partes, huecos, error: 'corchetes anidados' };
      const aceptadas = dentro.split('|').map((x) => x.trim()).filter(Boolean);
      if (!aceptadas.length) return { partes, huecos, error: 'hueco vacío []' };
      if (buf) { partes.push({ texto: buf }); buf = ''; }
      partes.push({ hueco: huecos.length });
      huecos.push({ aceptadas });
      i = fin + 1;
      continue;
    }
    if (c === ']') return { partes, huecos, error: 'corchete ] sin abrir' };
    buf += c;
    i++;
  }
  if (buf) partes.push({ texto: buf });
  return { partes, huecos };
}

function normalizarEspacios(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

// Compara una respuesta escrita con las aceptadas.
// Devuelve { correcto, nota, motivo } — nota: recordatorio amable aunque sea correcto.
export function compararEscrito(resp, aceptadas, { mayusculas = 'flexible', tildes = 'flexible' } = {}) {
  let r = normalizarEspacios(resp);
  if (!r) return { correcto: false, vacio: true };
  const lista = aceptadas.map(normalizarEspacios);
  const terminaPunto = lista.some((a) => /[.!?]$/.test(a));
  if (!terminaPunto) r = r.replace(/[.!?]+$/, '');
  for (const a of lista) if (r === a) return { correcto: true };
  const minus = (x) => x.toLocaleLowerCase('es');
  for (const a of lista) {
    if (minus(r) === minus(a)) {
      if (mayusculas === 'estricto') return { correcto: false, motivo: 'mayusculas', esperada: a };
      return { correcto: true };
    }
  }
  for (const a of lista) {
    const base = (x) => minus(quitarTildes(x));
    if (base(r) === base(a)) {
      const soloMayus = mayusculas === 'estricto' && quitarTildes(r) !== quitarTildes(a) && minus(quitarTildes(r)) === minus(quitarTildes(a));
      if (tildes === 'estricto' || soloMayus) return { correcto: false, motivo: 'tildes', esperada: a };
      return { correcto: true, nota: `¡Muy bien! Recuerda que se escribe «${a}», con tilde.` };
    }
  }
  return { correcto: false };
}

const palabrasDe = (t) => (String(t).match(/[\p{L}\p{N}]+/gu) || []);

export const MENSAJES_REQUISITO = {
  'mayuscula-inicial': () => 'Empieza con letra mayúscula.',
  'punto-final': () => 'Termina con un punto (o con ? o !).',
  'min-palabras': (q) => `Escribe al menos ${q.valor} palabras.`,
  'max-palabras': (q) => `Usa como máximo ${q.valor} palabras.`,
  'min-oraciones': (q) => `Escribe al menos ${q.valor} oraciones.`,
  incluye: (q) => (q.palabras.length === 1 ? `Usa la palabra «${q.palabras[0]}».` : `Usa alguna de estas palabras: ${q.palabras.join(', ')}.`),
  'incluye-todas': (q) => `Usa estas palabras: ${q.palabras.join(', ')}.`,
  'signos-pregunta': () => 'Escribe una pregunta con ¿ al inicio y ? al final.',
  'signos-exclamacion': () => 'Usa ¡ al inicio y ! al final.',
};

export function revisarRequisitos(texto, requisitos) {
  const t = normalizarEspacios(texto);
  const palabras = palabrasDe(t);
  const norm = (x) => quitarTildes(String(x).toLocaleLowerCase('es'));
  const palabrasN = palabras.map(norm);
  const tiene = (p) => {
    const objetivo = norm(p).split(/\s+/);
    if (objetivo.length > 1) return norm(t).includes(objetivo.join(' '));
    return palabrasN.some((w) => w === objetivo[0] || (objetivo[0].length >= 3 && w.startsWith(objetivo[0])));
  };
  return requisitos.map((q) => {
    let ok = false;
    switch (q.tipo) {
      case 'mayuscula-inicial': {
        const m = t.match(/[\p{L}]/u);
        ok = !!m && m[0] === m[0].toLocaleUpperCase('es') && m[0] !== m[0].toLocaleLowerCase('es');
        break;
      }
      case 'punto-final': ok = /[.!?…]["»”)]?$/.test(t); break;
      case 'min-palabras': ok = palabras.length >= q.valor; break;
      case 'max-palabras': ok = palabras.length > 0 && palabras.length <= q.valor; break;
      case 'min-oraciones': {
        const oraciones = t.split(/[.!?…]+/).filter((o) => palabrasDe(o).length > 0);
        ok = oraciones.length >= q.valor && /[.!?…]["»”)]?$/.test(t);
        break;
      }
      case 'incluye': ok = q.palabras.some(tiene); break;
      case 'incluye-todas': ok = q.palabras.every(tiene); break;
      case 'signos-pregunta': ok = /¿[^?]+\?/.test(t); break;
      case 'signos-exclamacion': ok = /¡[^!]+!/.test(t); break;
      default: ok = false;
    }
    const msg = MENSAJES_REQUISITO[q.tipo] ? MENSAJES_REQUISITO[q.tipo](q) : q.tipo;
    return { tipo: q.tipo, ok, mensaje: msg };
  });
}
