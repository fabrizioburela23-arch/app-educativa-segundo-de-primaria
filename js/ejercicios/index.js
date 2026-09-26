// Registro de tipos de ejercicio. Cada tipo recibe (contenedor, ejercicio, ctx) y
// devuelve un controlador: { listo, evaluar, prepararReintento, mostrarSolucion, bloquear, enfocar?, autoCompleta? }.
import opcion from './opcion.js';
import tocar from './tocar.js';
import completar from './completar.js';
import escribir from './escribir.js';
import numero from './numero.js';
import ordenar from './ordenar.js';
import relacionar from './relacionar.js';
import clasificar from './clasificar.js';
import memoria from './memoria.js';
import escribirLibre from './escribir-libre.js';
import manipular from './manipular.js';

const TIPOS = {
  opcion,
  multiple: opcion,
  tocar,
  completar,
  escribir,
  numero,
  ordenar,
  relacionar,
  clasificar,
  memoria,
  'escribir-libre': escribirLibre,
  manipular,
};

export function renderEjercicio(contenedor, ejercicio, ctx) {
  const f = TIPOS[ejercicio.tipo];
  if (!f) throw new Error(`Tipo de ejercicio no disponible: ${ejercicio.tipo}`);
  return f(contenedor, ejercicio, ctx);
}

export const tiposDisponibles = () => Object.keys(TIPOS);
