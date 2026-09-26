// Audio con la síntesis de voz del dispositivo (Web Speech API).
// No hay grabaciones: si el teléfono no tiene voz en español, se avisa con honestidad.

import { paraVoz } from '../contenido/texto.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voces = [];
let ajustes = { uri: null, velocidad: 0.9 };
let hablandoBoton = null;
let ultimoError = null;

const PREFERENCIA = ['es-BO', 'es-419', 'es-US', 'es-MX', 'es-PE', 'es-AR', 'es-CO', 'es-CL', 'es-ES', 'es'];

function cargarVoces() {
  if (!synth) return;
  voces = synth.getVoices().filter((v) => /^es([-_]|$)/i.test(v.lang));
}

export function iniciarVoz(conf = {}) {
  ajustes = { ...ajustes, ...conf };
  if (!synth) return;
  cargarVoces();
  if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', cargarVoces);
  else synth.onvoiceschanged = cargarVoces;
}

export function configurarVoz(conf) { ajustes = { ...ajustes, ...conf }; }

// ¿Existe la síntesis de voz en el navegador?
export const hayVoz = () => !!synth && typeof window.SpeechSynthesisUtterance === 'function';
// ¿Se detectó una voz en español?
export const hayVozEspanol = () => voces.length > 0;
export const listaVoces = () => voces.map((v) => ({ uri: v.voiceURI, nombre: v.name, idioma: v.lang, local: v.localService }));
export const errorVoz = () => ultimoError;

function elegirVoz() {
  if (ajustes.uri) {
    const v = voces.find((x) => x.voiceURI === ajustes.uri);
    if (v) return v;
  }
  for (const pref of PREFERENCIA) {
    const v = voces.find((x) => x.lang.replace('_', '-').toLowerCase().startsWith(pref.toLowerCase()));
    if (v) return v;
  }
  return voces[0] || null;
}

export function detener() {
  if (synth) synth.cancel();
  if (hablandoBoton) hablandoBoton.classList.remove('hablando');
  hablandoBoton = null;
}

// Devuelve una promesa que se resuelve al terminar (true) o si no se pudo (false).
export function hablar(texto, { boton = null, velocidad } = {}) {
  return new Promise((resolver) => {
    const limpio = paraVoz(texto);
    if (!hayVoz() || !limpio) { resolver(false); return; }
    detener();
    const u = new SpeechSynthesisUtterance(limpio);
    const v = elegirVoz();
    if (v) u.voice = v;
    u.lang = v ? v.lang : 'es-ES';
    u.rate = velocidad || ajustes.velocidad || 0.9;
    u.pitch = 1;
    if (boton) { hablandoBoton = boton; boton.classList.add('hablando'); }
    const fin = (ok) => {
      if (boton) boton.classList.remove('hablando');
      if (hablandoBoton === boton) hablandoBoton = null;
      resolver(ok);
    };
    u.onend = () => fin(true);
    u.onerror = (e) => { ultimoError = e.error || 'error'; fin(e.error === 'interrupted' || e.error === 'canceled'); };
    try {
      synth.speak(u);
      // Algunos Android pausan la síntesis si la pestaña estuvo en segundo plano.
      if (synth.paused) synth.resume();
    } catch (e) {
      ultimoError = String(e);
      fin(false);
    }
  });
}
