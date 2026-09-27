// Catálogo compartido (navegador y Node): tipos, visuales, ilustraciones y dinero.
// Si agregas una ilustración o un tipo nuevo, regístralo aquí para que el
// validador lo acepte.

export const TIPOS_EJERCICIO = [
  'opcion', 'multiple', 'tocar', 'completar', 'escribir', 'numero', 'ordenar',
  'relacionar', 'clasificar', 'memoria', 'escribir-libre', 'manipular', 'pasos', 'generador',
];

export const NIVELES = [1, 2, 3];

export const TIPOS_VISUAL = [
  'emoji', 'emojis', 'ilustracion', 'bloques', 'recta', 'fraccion', 'dinero', 'reloj',
  'grupos', 'arreglo', 'pictograma', 'tabla', 'calendario', 'simetria', 'regla',
  'balanza', 'operacion', 'bandera', 'secuencia', 'fechas',
];

export const TIPOS_MANIPULABLE = [
  'bloques', 'recta', 'fraccion', 'dinero', 'reloj', 'grupos', 'repartir', 'simetria',
  'calendario', 'pictograma', 'patron',
];

// id → partes que se pueden resaltar
export const ILUSTRACIONES = {
  'planta-partes': ['raiz', 'tallo', 'hoja', 'flor', 'fruto'],
  'ciclo-planta': [],
  'estados-agua': ['solido', 'liquido', 'gaseoso'],
  'ciclo-agua': ['evaporacion', 'condensacion', 'precipitacion'],
  'tierra-rotacion': ['dia', 'noche'],
  'tierra-traslacion': [],
  'sistema-solar': [],
  'fases-luna': [],
  'esqueleto': ['craneo', 'columna', 'costillas', 'brazo', 'pelvis', 'pierna'],
  'aparato-digestivo': ['boca', 'esofago', 'estomago', 'intestino-delgado', 'intestino-grueso'],
  'sentidos': ['vista', 'oido', 'olfato', 'gusto', 'tacto'],
  'paisaje-altiplano': [],
  'paisaje-valle': [],
  'paisaje-llanos': [],
  'paisaje-chaco': [],
  'estaciones': ['verano', 'otono', 'invierno', 'primavera'],
  'ciclo-rana': [],
  'ciclo-mariposa': [],
  'ciclo-gallina': [],
  'palanca': [],
  'polea': [],
  'rueda-eje': [],
  'plano-inclinado': [],
  'deforestacion': [],
  'cubo': [],
  'esfera': [],
  'cilindro': [],
  'cono': [],
  'piramide': [],
  'prisma': [],
  'bandera-bolivia': [],
  'wiphala': [],
  'escarapela': [],
  'kantuta': [],
  'patuju': [],
};

// Dinero boliviano. valor en centavos.
export const DINERO = {
  c10: { valor: 10, nombre: '10 centavos', clase: 'moneda' },
  c20: { valor: 20, nombre: '20 centavos', clase: 'moneda' },
  c50: { valor: 50, nombre: '50 centavos', clase: 'moneda' },
  m1: { valor: 100, nombre: '1 boliviano', clase: 'moneda' },
  m2: { valor: 200, nombre: '2 bolivianos', clase: 'moneda' },
  m5: { valor: 500, nombre: '5 bolivianos', clase: 'moneda' },
  b10: { valor: 1000, nombre: 'billete de 10 bolivianos', clase: 'billete' },
  b20: { valor: 2000, nombre: 'billete de 20 bolivianos', clase: 'billete' },
  b50: { valor: 5000, nombre: 'billete de 50 bolivianos', clase: 'billete' },
  b100: { valor: 10000, nombre: 'billete de 100 bolivianos', clase: 'billete' },
  b200: { valor: 20000, nombre: 'billete de 200 bolivianos', clase: 'billete' },
};

export const REQUISITOS_ESCRITURA = [
  'mayuscula-inicial', 'punto-final', 'min-palabras', 'max-palabras', 'min-oraciones',
  'incluye', 'incluye-todas', 'signos-pregunta', 'signos-exclamacion',
];

export const DIAS_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function formatoBs(centavos) {
  const bs = Math.floor(centavos / 100);
  const ct = centavos % 100;
  if (ct === 0) return `${bs} Bs`;
  if (bs === 0) return `${ct} centavos`;
  return `${bs} Bs con ${ct} centavos`;
}

export function diasDelMes(mes, anio) {
  return new Date(anio, mes, 0).getDate();
}
