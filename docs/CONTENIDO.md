# Formato del contenido (lecciones editables)

Todo el contenido educativo vive en archivos JSON dentro de `content/`. La app los
lee al abrirse, así que **se puede corregir o ampliar una lección editando el JSON,
sin tocar el código**. Después de editar, ejecuta:

```bash
node tools/validar-contenido.mjs            # valida todo
node tools/validar-contenido.mjs mat-1-2    # valida un tema
```

El validador (`js/contenido/validar.js`) es el mismo que usa la app en el panel del
adulto, así que un tema que pasa la validación se puede mostrar sin errores.

```
content/
  indice.json            materias → unidades → temas (orden y títulos)
  datos.json             datos compartidos (productos de la feria, etc.)
  fechas-civicas.json    fechas cívicas y conmemorativas (editables por el adulto)
  temas/<id>.json        un archivo por tema
```

---

## 1. `indice.json`

```json
{
  "version": 1,
  "materias": [
    {
      "id": "matematica", "nombre": "Matemática", "emoji": "🔢", "color": "#2F6FDE",
      "unidades": [
        {
          "id": "mat-1", "numero": 1, "titulo": "Números hasta el 999", "emoji": "🔢",
          "temas": [
            { "id": "mat-1-1", "titulo": "Leo y escribo números", "emoji": "✏️",
              "cubre": ["lectura y escritura de números del 1 al 999"] }
          ]
        }
      ]
    }
  ]
}
```

El archivo de cada tema es `content/temas/<id>.json`. `cubre` lista los puntos del
temario oficial que ese tema trabaja (sirve para revisar la cobertura).

---

## 2. Archivo de un tema (`content/temas/<id>.json`)

```jsonc
{
  "id": "mat-1-2",                        // igual al del índice y al nombre del archivo
  "titulo": "Unidades, decenas y centenas",
  "objetivo": "Sé cuánto vale cada cifra de un número.",   // en lenguaje del niño
  "lecturas": [ ... ],                    // opcional: textos para leer (cuentos, etc.)
  "explicacion": [ ...tarjetas... ],      // 2 a 5 tarjetas
  "ejemplo": { ... },                     // ejemplo visual paso a paso o para explorar
  "guiada": { "intro": "...", "pasos": [ ...ejercicios con "apoyo"... ] },  // 2 a 4
  "practica": [ ...ejercicios... ],       // banco adaptativo, mínimo 9, niveles 1-2-3
  "comprobacion": [ ...ejercicios... ],   // banco de la comprobación final, mínimo 6
  "repaso": { "texto": "...", "visual": { ... } },          // recordatorio breve
  "adulto": {
    "objetivo": "Descripción para el adulto.",
    "sugerencias": ["Actividad concreta 1", "Actividad concreta 2"],
    "errores": {
      "confunde-decenas": {
        "descripcion": "Confunde el valor de las decenas con el de las unidades.",
        "sugerencia": "Agrupen palitos o fideos de 10 en 10 y cuenten los atados."
      }
    }
  }
}
```

### 2.1 Texto con formato

En cualquier texto para el niño se puede usar `**negrita**` para resaltar (por ejemplo
la sílaba tónica: `ca-**mión**`). No se admite HTML. El audio lee el texto sin los
asteriscos.

### 2.2 Tarjetas de explicación

```json
{ "texto": "Una **decena** es un grupo de 10 unidades.", "emoji": "📦",
  "visual": { "tipo": "bloques", "decenas": 1 } }
```

- `texto` (obligatorio, máximo ~240 caracteres, frases cortas).
- `emoji` y `visual` opcionales (al menos una tarjeta del tema debe tener `visual`).
- `audio` opcional: texto distinto para leer en voz alta.

### 2.3 Ejemplo (visual o interactivo)

Paso a paso (el niño avanza con «Siguiente»):

```json
{ "instruccion": "Mira cómo armamos el 243.",
  "pasos": [
    { "texto": "2 centenas son 200.", "visual": { "tipo": "bloques", "centenas": 2 } },
    { "texto": "4 decenas son 40.", "visual": { "tipo": "bloques", "centenas": 2, "decenas": 4 } }
  ] }
```

Para explorar (manipulable libre, sin puntaje):

```json
{ "instruccion": "Agrega y quita bloques. Mira cómo cambia el número.",
  "explorar": { "tipo": "bloques" } }
```

Puede tener `pasos` y `explorar` a la vez (primero se muestran los pasos).

### 2.4 Lecturas

```json
"lecturas": [
  { "id": "cuento-1", "titulo": "La llama que quería volar", "genero": "cuento",
    "emoji": "🦙", "parrafos": ["Había una vez...", "..."] }
]
```

Un ejercicio que tenga `"lectura": "cuento-1"` muestra el texto (con botón de
audio) encima de la pregunta. Todos los textos deben ser **originales**.

---

## 3. Ejercicios

### 3.1 Campos comunes

| Campo | Obligatorio | Descripción |
|---|---|---|
| `id` | sí | Único dentro del tema (`g1`, `p1`, `c1`...). |
| `tipo` | sí | Ver tabla 3.2. |
| `nivel` | sí (práctica y comprobación) | 1 = repaso/básico, 2 = nivel del grado, 3 = desafío. |
| `enunciado` | sí | Instrucción corta (máx. ~140 caracteres). |
| `pista` | sí | Se muestra tras el **primer** error. Ayuda a pensar, no da la respuesta. |
| `explicacion` | sí | Se muestra tras el **segundo** error, junto con la respuesta correcta. |
| `error` | sí | Etiqueta del error típico (debe existir en `adulto.errores`). |
| `visual` | no | Ilustración encima del ejercicio (ver sección 4). |
| `escuchar` | no | Texto que la app dice en voz alta **sin mostrarlo** (dictados, «escucha y responde»). |
| `lectura` | no | `id` de una lectura del tema que se muestra encima. |
| `apoyo` | sí en `guiada` | Andamiaje visible desde el inicio en la actividad guiada. |
| `audio` | no | Texto alternativo para leer en voz alta el enunciado. |

Si el dispositivo no tiene voz en español, los ejercicios con `escuchar` muestran
un aviso honesto y el texto queda oculto detrás de «Pide a un adulto que lo lea».

### 3.2 Tipos de ejercicio

#### `opcion` — elegir una respuesta
```json
{ "id": "p1", "tipo": "opcion", "nivel": 1, "enunciado": "¿Qué palabra es un sustantivo?",
  "opciones": [
    { "texto": "perro", "emoji": "🐕", "correcta": true },
    { "texto": "saltar", "pista": "«Saltar» es algo que hacemos. Busca el nombre de un ser.", "error": "confunde-verbo" },
    { "texto": "rápido" }
  ],
  "pista": "Un sustantivo nombra personas, animales o cosas.",
  "explicacion": "«Perro» nombra a un animal, por eso es un sustantivo.",
  "error": "no-identifica-sustantivo" }
```
2 a 4 opciones, **exactamente una** con `"correcta": true`. La app **mezcla** las opciones
(salvo que el ejercicio tenga `"mezclar": false`, útil para «Sí/No» o para «>, <, =»). Cada opción incorrecta puede
tener su propia `pista` y `error` (más precisos que los generales). Una opción puede
tener `visual` en lugar de (o además de) `texto`. `columnas` opcional (1-4).

#### `multiple` — elegir todas las correctas
Igual que `opcion`, pero con **una o más** opciones correctas (2 a 6 opciones).

#### `tocar` — tocar palabras en un texto
```json
{ "id": "p2", "tipo": "tocar", "nivel": 2, "enunciado": "Toca los sustantivos propios.",
  "texto": "*Wara* vive en *Oruro* con su gato *Misi*.", ... }
```
En `tocar` y `completar` se puede usar `\n` para cambiar de línea (por ejemplo, turnos de un diálogo).
Las palabras correctas van entre asteriscos simples `*...*` (pueden ser dos palabras:
`*La Paz*`). Todas las demás palabras también se pueden tocar (son distractores).

#### `completar` — llenar huecos
```json
{ "id": "p3", "tipo": "completar", "nivel": 1, "enunciado": "Completa con la letra correcta.",
  "texto": "El ca[rr]o es rojo y el [p]erro ladra.", "banco": ["r", "b"], ... }
```
Cada `[respuesta]` es un hueco (puede ir dentro de una palabra). El niño arrastra
o toca fichas del banco: el banco se forma con todas las respuestas más los
distractores de `banco`. Con `"modo": "escribir"` los huecos son campos de texto y
se aceptan alternativas separadas por `|`: `[bebé|bebe]`.

#### `escribir` — escribir la respuesta
```json
{ "id": "p4", "tipo": "escribir", "nivel": 2, "enunciado": "Escribe la palabra que escuchas.",
  "escuchar": "brazo", "respuestas": ["brazo"], "mayusculas": "flexible", "tildes": "estricto", ... }
```
- `respuestas`: lista de respuestas aceptadas.
- `mayusculas`: `"flexible"` (por defecto) o `"estricto"`.
- `tildes`: `"flexible"` (por defecto: acepta sin tilde pero lo recuerda) o `"estricto"`.

#### `numero` — responder con números (teclado grande en pantalla)
```json
{ "id": "p5", "tipo": "numero", "nivel": 2, "enunciado": "¿Cuánto es 34 + 28?",
  "respuesta": 62,
  "erroresComunes": [ { "respuesta": 52, "pista": "¿Sumaste la decena que llevabas?", "error": "olvida-llevar" } ],
  ... }
```
Varios campos: `"campos": [ { "etiqueta": "Anterior", "respuesta": 244 }, { "etiqueta": "Siguiente", "respuesta": 246 } ]`
(en lugar de `respuesta`). `prefijo` / `sufijo` opcionales (`"Bs"`, `"cm"`).

#### `ordenar` — poner en orden
```json
{ "id": "p6", "tipo": "ordenar", "nivel": 1, "enunciado": "Ordena las sílabas.",
  "elementos": ["ma", "ri", "po", "sa"], "unir": "", ... }
```
`elementos` se escribe **en el orden correcto**; la app los mezcla. Cada elemento puede
ser texto o `{ "texto": "...", "emoji": "..." }`. `unir` opcional: `""` junta como una
palabra, `" "` como oración. `vertical: true` para listas largas (secuencias de un cuento).

#### `relacionar` — unir parejas
```json
{ "id": "p7", "tipo": "relacionar", "nivel": 2, "enunciado": "Une cada palabra con su contraria.",
  "pares": [ ["alto", "bajo"], ["frío", "caliente"], ["día", "noche"] ], ... }
```
3 a 5 pares. Cada lado puede ser texto o `{ "texto": "...", "emoji": "..." }`.

#### `clasificar` — arrastrar a grupos
```json
{ "id": "p8", "tipo": "clasificar", "nivel": 2, "enunciado": "¿Vive en el agua o en la tierra?",
  "categorias": [ { "id": "agua", "texto": "Agua", "emoji": "💧" }, { "id": "tierra", "texto": "Tierra", "emoji": "⛰️" } ],
  "elementos": [ { "texto": "bufeo", "emoji": "🐬", "categoria": "agua" }, { "texto": "llama", "emoji": "🦙", "categoria": "tierra" } ],
  ... }
```
2 o 3 categorías, 4 a 8 elementos, al menos un elemento por categoría.

#### `memoria` — juego de parejas
```json
{ "id": "p9", "tipo": "memoria", "nivel": 1, "enunciado": "Encuentra las parejas.",
  "pares": [ [ { "texto": "3 × 2" }, { "texto": "6" } ], [ "grande", "enorme" ] ], ... }
```
3 a 6 pares. Solo en `practica` (no en la comprobación).

#### `escribir-libre` — producir oraciones o textos breves
```json
{ "id": "p10", "tipo": "escribir-libre", "nivel": 2, "enunciado": "Escribe una oración sobre la feria.",
  "guia": ["En la feria hay...", "Mi mamá compra..."],
  "requisitos": [
    { "tipo": "mayuscula-inicial" }, { "tipo": "punto-final" },
    { "tipo": "min-palabras", "valor": 5 },
    { "tipo": "incluye", "palabras": ["feria"] }
  ],
  "modelo": "En la feria hay papas, choclos y quinua.", ... }
```
Requisitos disponibles: `mayuscula-inicial`, `punto-final` (acepta `.`, `?`, `!`),
`min-palabras` (`valor`), `max-palabras` (`valor`), `min-oraciones` (`valor`),
`incluye` (`palabras`, basta **una**), `incluye-todas` (`palabras`) —ambos aceptan `"exacto": true` para exigir las tildes—,
`signos-pregunta` (abre `¿` y cierra `?`), `signos-exclamacion` (`¡...!`).
La app revisa solo lo verificable (forma), y el adulto puede leer los textos.

#### `manipular` — manipular objetos
```json
{ "id": "p11", "tipo": "manipular", "nivel": 2, "enunciado": "Arma el número 243 con bloques.",
  "manipulable": { "tipo": "bloques", "objetivo": 243 }, ... }
```
Ver sección 5.

#### `pasos` — problema en varios pasos
```json
{ "id": "p12", "tipo": "pasos", "nivel": 3,
  "enunciado": "Wara compra 2 kilos de papa a 5 Bs cada kilo. Paga con 20 Bs.",
  "visual": { "tipo": "dinero", "items": ["b20"] },
  "pasos": [
    { "tipo": "numero", "enunciado": "¿Cuánto cuestan las papas?", "respuesta": 10, "sufijo": "Bs", "pista": "...", "explicacion": "...", "error": "..." },
    { "tipo": "numero", "enunciado": "¿Cuánto cambio recibe?", "respuesta": 10, "sufijo": "Bs", "pista": "...", "explicacion": "...", "error": "..." }
  ],
  "pista": "Resuelve un paso a la vez.", "explicacion": "...", "error": "problema-pasos" }
```
Cada paso es un ejercicio completo (sin `nivel`), de cualquier tipo salvo `pasos`
y `memoria`. El puntaje del problema es el promedio de sus pasos.

#### `generador` — ejercicios creados por la app
```json
{ "id": "p13", "tipo": "generador", "nivel": 2, "generador": "suma",
  "params": { "digitos": 2, "llevar": true } }
```
Crea un ejercicio nuevo cada vez (práctica ilimitada). Lista de generadores y sus
parámetros en la sección 6. Un generador no necesita `enunciado`/`pista`/`explicacion`/`error`:
los crea él mismo con etiquetas de error fijas que ya describe (sección 6), pero el
tema debe declarar esas etiquetas en `adulto.errores`.

---

## 4. Visuales (`visual`)

| `tipo` | Campos | Qué muestra |
|---|---|---|
| `emoji` | `valor`, `cantidad` (1-30), `etiqueta` | Un emoji repetido (agrupado de 5 en 5 o de 10 en 10). |
| `emojis` | `items` (lista), `etiquetas` (opcional) | Una fila de emojis distintos. |
| `ilustracion` | `id`, `resaltar` (opcional), `etiquetas` (bool, opcional) | Dibujo de la biblioteca (tabla 4.1). Muestra los nombres de las partes, salvo cuando hay `resaltar` (para poder preguntar «¿qué parte es?»); `etiquetas` fuerza mostrarlos u ocultarlos. |
| `bloques` | `centenas`, `decenas`, `unidades` | Bloques base 10. |
| `recta` | `min`, `max`, `paso`, `marcar` (lista), `saltos` (lista de `[desde, hasta]`), `ocultar` (lista) | Recta numérica. |
| `fraccion` | `forma` (`circulo`/`rectangulo`/`barra`), `partes`, `coloreadas`, `iguales` (bool, por defecto true) | Figura dividida en partes. |
| `dinero` | `items`: códigos de monedas y billetes | Dinero boliviano (tabla 4.2). |
| `reloj` | `hora` (1-12), `minutos` (0-59) | Reloj de agujas. |
| `grupos` | `grupos`, `porGrupo`, `emoji` | Grupos iguales (multiplicación/división). |
| `arreglo` | `filas`, `columnas`, `emoji` | Arreglo rectangular. |
| `pictograma` | `titulo`, `icono`, `escala` (cada ícono vale), `datos`: `[{ "etiqueta", "valor", "emoji" }]` | Pictograma. |
| `tabla` | `columnas` (lista), `filas` (lista de listas) | Tabla simple. |
| `calendario` | `mes` (1-12), `anio`, `marcar` (lista de días), `titulo` | Hoja de calendario. |
| `simetria` | `filas`, `columnas`, `celdas` (lista de `[fila, columna]`), `completa` (bool) | Cuadrícula con eje de simetría vertical. |
| `regla` | `longitud` (cm, 1-20), `objeto` (emoji) | Objeto medido con una regla en cm. |
| `balanza` | `izquierda` (emojis), `derecha` (emojis), `inclinada` (`izquierda`/`derecha`/`no`) | Balanza de platillos. |
| `operacion` | `numeros` (lista de 2 o 3 números), `op` (`+`,`-`,`×`,`÷`), `vertical` (bool) | Operación escrita (en columnas si `vertical`). |
| `bandera` | `franjas` (colores de arriba abajo), `orientacion` (`horizontal`/`vertical`), `etiqueta` | Bandera de franjas simples. |
| `secuencia` | `items` (emojis o textos), `oculto` (índice que se muestra como «?») | Patrón o secuencia. |
| `fechas` | `filtro` (`civica`/`conmemorativa`/`departamental`/`todas`), `mes` (opcional) | Lista de fechas publicadas en `fechas-civicas.json` (se actualiza cuando el adulto edita las fechas). |

### 4.1 Ilustraciones disponibles (`"tipo": "ilustracion"`)

`resaltar` marca una parte (cuando la ilustración tiene partes con nombre).

| id | Partes para `resaltar` |
|---|---|
| `planta-partes` | `raiz`, `tallo`, `hoja`, `flor`, `fruto` |
| `ciclo-planta` | — |
| `estados-agua` | `solido`, `liquido`, `gaseoso` |
| `ciclo-agua` | `evaporacion`, `condensacion`, `precipitacion` |
| `tierra-rotacion` | `dia`, `noche` |
| `tierra-traslacion` | — |
| `sistema-solar` | — |
| `fases-luna` | — |
| `esqueleto` | `craneo`, `columna`, `costillas`, `brazo`, `pelvis`, `pierna` |
| `aparato-digestivo` | `boca`, `esofago`, `estomago`, `intestino-delgado`, `intestino-grueso` |
| `sentidos` | `vista`, `oido`, `olfato`, `gusto`, `tacto` |
| `paisaje-altiplano`, `paisaje-valle`, `paisaje-llanos`, `paisaje-chaco` | — |
| `estaciones` | `verano`, `otono`, `invierno`, `primavera` |
| `ciclo-rana`, `ciclo-mariposa`, `ciclo-gallina` | — |
| `palanca`, `polea`, `rueda-eje`, `plano-inclinado` | — |
| `deforestacion` | — |
| `cubo`, `esfera`, `cilindro`, `cono`, `piramide`, `prisma` | — |
| `bandera-bolivia` | — |
| `wiphala` | — |
| `escarapela` | — |
| `kantuta`, `patuju` | — |

### 4.2 Dinero boliviano (códigos)

| Código | Valor | | Código | Valor |
|---|---|---|---|---|
| `c10` | 10 centavos | | `b10` | billete de 10 Bs |
| `c20` | 20 centavos | | `b20` | billete de 20 Bs |
| `c50` | 50 centavos | | `b50` | billete de 50 Bs |
| `m1` | moneda de 1 Bs | | `b100` | billete de 100 Bs |
| `m2` | moneda de 2 Bs | | `b200` | billete de 200 Bs |
| `m5` | moneda de 5 Bs | | | |

Los dibujos son simplificados (no son réplicas de los billetes).

---

## 5. Manipulables (`"tipo": "manipular"` y `ejemplo.explorar`)

| `manipulable.tipo` | Configuración | Se considera correcto cuando... |
|---|---|---|
| `bloques` | `objetivo` (0-999), `canonico` (bool: máx. 9 por columna), `inicial` `{centenas,decenas,unidades}` | el valor armado es `objetivo`. |
| `recta` | `min`, `max`, `paso`, `objetivo` | el marcador está en `objetivo`. |
| `fraccion` | `forma`, `partes`, `objetivo` (partes a pintar) | hay `objetivo` partes pintadas. |
| `dinero` | `objetivo` (en **centavos**), `disponibles` (códigos), `mostrarTotal` (bool) | el total en la bandeja es `objetivo`. |
| `reloj` | `objetivo` `{hora, minutos}`, `paso` (5, 15 o 30 minutos), `inicial` `{hora, minutos}` | el reloj marca esa hora. |
| `grupos` | `grupos`, `porGrupo`, `emoji` | cada grupo tiene `porGrupo` objetos. |
| `repartir` | `total`, `grupos`, `emoji` | se repartió todo en partes iguales. |
| `simetria` | `filas`, `columnas` (par), `celdas` (lado izquierdo) , `color` | el lado derecho es el reflejo exacto. |
| `calendario` | `mes`, `anio`, `objetivo` (día) | se tocó ese día. |
| `pictograma` | `icono`, `escala`, `categorias`: `[{ "etiqueta", "objetivo" }]` | cada fila tiene la cantidad pedida. |
| `patron` | `secuencia` (lista), `opciones` (lista), `completar` (cuántos agregar), `solucion` (lista) | los agregados coinciden con `solucion`. |

En `ejemplo.explorar` se omite `objetivo`: el niño juega libremente y la app muestra
lo que va armando (el número, el total de dinero, la hora, etc.).

---

## 6. Generadores (`"tipo": "generador"`)

Etiquetas de error que usa cada generador (deben declararse en `adulto.errores`
del tema que lo use):

| `generador` | `params` | Etiquetas de error |
|---|---|---|
| `suma` | `digitos` (1-3), `llevar` (true/false), `sumandos` (2-3) | `suma-olvida-llevar`, `suma-calculo` |
| `resta` | `digitos` (1-3), `prestar` (true/false) | `resta-invierte`, `resta-calculo` |
| `comparar` | `max` | `comparar-signo` |
| `anterior-siguiente` | `max`, `salto` (1, 10 o 100) | `anterior-siguiente` |
| `valor-posicional` | `max` | `valor-posicional` |
| `descomponer` | `max` | `descomponer` |
| `leer-numero` | `max`, `modo` (`a-palabras`/`a-cifras`) | `lectura-numeros` |
| `par-impar` | `max` | `par-impar` |
| `ordenar-numeros` | `max`, `cantidad` (3-5), `orden` (`asc`/`desc`) | `orden-numeros` |
| `romano` | `max` (≤ 50), `modo` (`a-romano`/`a-cifras`) | `romanos` |
| `ordinal` | `max` (≤ 20) | `ordinales` |
| `patron-numerico` | `paso`, `max`, `operacion` (`suma`/`resta`) | `patron-numerico` |
| `tabla` | `tablas` (lista, 2-10), `visual` (bool) | `tabla-multiplicar` |
| `multiplicar-grupos` | `maxGrupos`, `maxPorGrupo` | `multiplicacion-grupos` |
| `por-10-100-1000` | `factores` (lista de 10/100/1000), `max` | `multiplicar-10-100` |
| `division` | `divisores` (lista), `maxCociente`, `contexto` (`repartir`/`agrupar`) | `division` |
| `division-relacion` | `tablas` (lista) | `division-multiplicacion` |
| `fraccion` | `partes` (lista: 2, 4) | `fraccion-reconocer` |
| `dinero-contar` | `maxBs`, `centavos` (bool) | `dinero-contar` |
| `dinero-total` | `productos` (2-3), `maxPrecio` | `dinero-total` |
| `dinero-cambio` | `maxPrecio`, `pagos` (lista de billetes en Bs) | `dinero-cambio` |
| `reloj` | `precision` (`hora`/`media`/`cuarto`/`cinco`) | `reloj-lectura` |
| `regla` | `max` (cm) | `medir-longitud` |
| `suma-propiedad` | `propiedad` (`conmutativa`/`asociativa`/`neutro`) | `propiedades-suma` |
| `calendario` | `pregunta` (`dia-siguiente`/`dia-anterior`/`mes-siguiente`/`mes-anterior`/`dias-semana`) | `calendario` |
| `fechas-civicas` | `tipo` (`civica`/`conmemorativa`/`departamental`/`todas`), `modo` (`que-se-celebra`/`cuando`) | `fechas-civicas` |

---

## 7. Reglas pedagógicas (el validador revisa las marcadas con ✔)

- ✔ `explicacion`: 2 a 5 tarjetas; al menos una con `visual`.
- ✔ `ejemplo`: con `pasos` (2 a 5) o `explorar`.
- ✔ `guiada.pasos`: 2 a 4 ejercicios, cada uno con `apoyo`.
- ✔ `practica`: al menos 9 ejercicios, con al menos 2 de cada nivel (1, 2 y 3).
- ✔ `comprobacion`: al menos 6 ejercicios, de al menos 2 niveles y 3 tipos distintos.
- ✔ En todo el tema: al menos 4 formas de interacción distintas; `opcion` no puede
  ser más del 40 % de los ejercicios escritos a mano.
- ✔ Ningún ejercicio de la comprobación repite uno de la práctica.
- ✔ Cada etiqueta de `error` usada existe en `adulto.errores`.
- ✔ `adulto.sugerencias`: al menos 2 actividades concretas.
- Frases cortas, vocabulario de 7-8 años, tuteo. Nada de mensajes que avergüencen.
- Ejemplos de Bolivia (feria, Bs y centavos, alimentos, animales, comunidades,
  paisajes), con respeto a todas las culturas y sin estereotipos.
- Todos los textos son originales.

---

## 8. Cómo usa la app este contenido

- **Una tarea por pantalla.** El recorrido de cada tema es: Aprendo (explicación) →
  Observo (ejemplo) → Hacemos juntos (guiada) → Practico → Demuestro (comprobación).
- **Errores.** Primer error: se muestra la `pista` (o la pista específica de la opción
  o del error común) y el niño vuelve a intentar. Segundo error: se muestra la
  `explicacion` con la respuesta correcta y el ejercicio vuelve más tarde (o uno parecido).
- **Práctica adaptativa.** Empieza en el nivel que eligió el adulto (1, 2 o 3). Dos
  aciertos seguidos al primer intento → sube de nivel. Un ejercicio fallado o dos
  aciertos al segundo intento → baja de nivel y se muestra el `repaso`. La práctica
  termina cuando hay suficientes aciertos recientes en nivel 2 o 3 (mínimo 5 ejercicios);
  no se avanza solo por tocar botones.
- **Comprobación final.** Se eligen 5 ejercicios (idealmente 1 de nivel 1, 3 de nivel 2
  y 1 de nivel 3). Acierto al primer intento = 1 punto, al segundo = ½. Con 4 de 5 o más
  el tema queda **logrado** ⭐; si no, se vuelve a practicar lo que costó.
- **Repaso espaciado.** Un tema logrado vuelve como repaso a los 3, 7, 14 y 30 días.
- **Mezcla.** Se mezclan opciones, elementos de `ordenar`, la columna derecha de
  `relacionar`, las fichas del banco de `completar` y las cartas de `memoria`.
- **Audio.** Usa la voz en español del dispositivo (síntesis de voz). Si no hay voz,
  los botones de audio lo indican y los ejercicios con `escuchar` muestran una alternativa.
- **Errores frecuentes.** Cada etiqueta de `error` se cuenta; el panel del adulto muestra
  las más frecuentes con su `descripcion` y `sugerencia`.
