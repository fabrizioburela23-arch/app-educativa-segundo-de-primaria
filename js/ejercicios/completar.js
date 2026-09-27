// Tipo «completar»: arrastrar o tocar fichas para llenar huecos (o escribir en ellos).
import { h, mezclar, hacerArrastrable } from '../ui/dom.js';
import { analizarCompletar, compararEscrito } from '../contenido/texto.js';

export default function completar(cont, ej, ctx) {
  const { partes, huecos } = analizarCompletar(ej.texto);
  const escribir = ej.modo === 'escribir';
  const caja = h('div', { class: 'texto-completar' });
  const elHuecos = [];
  const valores = huecos.map(() => null); // banco: índice de ficha; escribir: texto
  let activo = 0;

  // fichas del banco
  const fichasDatos = escribir ? [] : mezclar([...huecos.map((x) => x.aceptadas[0]), ...(ej.banco || [])]).map((texto, k) => ({ texto, k, en: null }));
  const banco = h('div', { class: 'banco', role: 'group', 'aria-label': 'Fichas para completar' });
  let fichaElegida = null;

  partes.forEach((p) => {
    if (p.texto !== undefined) {
      p.texto.split('\n').forEach((linea, k) => { if (k) caja.appendChild(h('br')); caja.appendChild(document.createTextNode(linea)); });
      return;
    }
    const i = p.hueco;
    let el;
    if (escribir) {
      const input = h('input', {
        type: 'text', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
        'aria-label': `Espacio ${i + 1}`,
        oninput: () => { valores[i] = input.value; ctx.alCambiar(); },
        onkeydown: (e) => { if (e.key === 'Enter') ctx.enviar(); },
      });
      input.style.width = `${Math.max(4, huecos[i].aceptadas[0].length + 2)}ch`;
      el = h('span', { class: 'hueco' }, input);
    } else {
      el = h('button', { class: 'hueco', type: 'button', 'aria-label': `Espacio ${i + 1}`, onclick: () => tocarHueco(i) }, '');
    }
    el.dataset.i = String(i);
    elHuecos.push(el);
    caja.appendChild(el);
  });
  cont.appendChild(caja);

  const elFichas = fichasDatos.map((f) => {
    const b = h('button', { class: 'ficha', type: 'button' }, f.texto);
    hacerArrastrable(b, {
      destinos: () => elHuecos.filter((x) => !x.disabled),
      alSoltar: (destino) => { if (destino) ponerEn(Number(destino.dataset.i), f.k); },
      alTocar: () => tocarFicha(f.k),
    });
    banco.appendChild(b);
    return b;
  });
  if (!escribir) cont.appendChild(banco);

  function pintar() {
    elHuecos.forEach((el, i) => {
      if (escribir) return;
      const k = valores[i];
      el.textContent = k === null ? '' : fichasDatos[k].texto;
      el.classList.toggle('lleno', k !== null);
      el.classList.toggle('activo', i === activo && k === null && !el.disabled);
    });
    elFichas.forEach((b, k) => {
      b.classList.toggle('usada', fichasDatos[k].en !== null);
      b.classList.toggle('elegida', fichaElegida === k);
    });
  }

  function siguienteVacio() {
    const i = valores.findIndex((v) => v === null);
    return i < 0 ? 0 : i;
  }

  function ponerEn(i, k) {
    if (elHuecos[i].disabled) return;
    const anterior = valores[i];
    if (anterior !== null) fichasDatos[anterior].en = null;
    if (fichasDatos[k].en !== null) valores[fichasDatos[k].en] = null;
    valores[i] = k;
    fichasDatos[k].en = i;
    fichaElegida = null;
    activo = siguienteVacio();
    pintar();
    ctx.alCambiar();
  }

  function tocarFicha(k) {
    if (fichasDatos[k].en !== null) return;
    const vacio = valores.findIndex((v) => v === null);
    if (valores[activo] === null && !elHuecos[activo].disabled) ponerEn(activo, k);
    else if (vacio >= 0) ponerEn(vacio, k);
    else { fichaElegida = k; pintar(); }
  }

  function tocarHueco(i) {
    if (elHuecos[i].disabled) return;
    if (fichaElegida !== null) { ponerEn(i, fichaElegida); return; }
    const k = valores[i];
    if (k !== null) { fichasDatos[k].en = null; valores[i] = null; ctx.alCambiar(); }
    activo = i;
    pintar();
  }

  pintar();

  const correcto = (i) => {
    const v = valores[i];
    if (v === null || v === undefined || v === '') return false;
    if (escribir) return compararEscrito(v, huecos[i].aceptadas, { mayusculas: ej.mayusculas, tildes: ej.tildes }).correcto;
    return huecos[i].aceptadas.includes(fichasDatos[v].texto);
  };
  const texto = (i) => (valores[i] === null ? '' : escribir ? valores[i] : fichasDatos[valores[i]].texto);

  return {
    listo: () => valores.every((v) => v !== null && v !== ''),
    evaluar() {
      const malos = huecos.map((_, i) => i).filter((i) => !correcto(i));
      const respuesta = huecos.map((_, i) => texto(i)).join(' | ');
      if (!malos.length) {
        const nota = escribir ? huecos.map((hu, i) => compararEscrito(valores[i], hu.aceptadas, { mayusculas: ej.mayusculas, tildes: ej.tildes }).nota).find(Boolean) : undefined;
        return { correcto: true, respuesta, nota };
      }
      let extra = huecos.length > 1 ? (malos.length === 1 ? 'Revisa el espacio marcado.' : `Revisa los ${malos.length} espacios marcados.`) : '';
      if (escribir) {
        const motivos = malos.map((i) => compararEscrito(valores[i], huecos[i].aceptadas, { mayusculas: ej.mayusculas, tildes: ej.tildes }).motivo);
        if (motivos.includes('tildes')) extra = `Casi: revisa las tildes. ${extra}`;
        else if (motivos.includes('mayusculas')) extra = `Casi: revisa las mayúsculas. ${extra}`;
      }
      return { correcto: false, pista: `${extra} ${ej.pista}`.trim(), error: ej.error, respuesta };
    },
    prepararReintento() {
      huecos.forEach((_, i) => {
        if (correcto(i)) return;
        const el = elHuecos[i];
        el.classList.add('revisar');
        setTimeout(() => el.classList.remove('revisar'), 1800);
        if (escribir) { el.querySelector('input').select(); return; }
        const k = valores[i];
        if (k !== null) { fichasDatos[k].en = null; valores[i] = null; }
      });
      activo = siguienteVacio();
      pintar();
    },
    mostrarSolucion() {
      huecos.forEach((hu, i) => {
        const el = elHuecos[i];
        el.classList.remove('revisar', 'activo');
        el.classList.add('correcta');
        if (escribir) { const inp = el.querySelector('input'); inp.value = hu.aceptadas[0]; }
        else el.textContent = hu.aceptadas[0];
      });
      elFichas.forEach((b) => b.classList.add('usada'));
    },
    bloquear() {
      elHuecos.forEach((el) => { el.disabled = true; const inp = el.querySelector && el.querySelector('input'); if (inp) inp.disabled = true; });
      elFichas.forEach((b) => { b.disabled = true; });
    },
    enfocar() { if (escribir) { const inp = elHuecos[0]?.querySelector('input'); if (inp) inp.focus(); } },
  };
}
