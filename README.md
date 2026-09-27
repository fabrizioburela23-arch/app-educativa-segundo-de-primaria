# Aprendo en 2.º — app educativa para segundo de primaria (Bolivia)

App web instalable (PWA) para un estudiante de segundo de primaria en Bolivia. Enseña,
permite practicar y comprueba la comprensión en las cuatro materias, con ejemplos
cercanos: la feria, bolivianos y centavos, alimentos, animales, comunidades y paisajes.

- **Funciona en celulares Android** (Chrome) y en computadoras. Se puede instalar
  («Agregar a la pantalla principal») y usar **sin conexión** después de abrirla una vez.
- **Sin cuentas ni servidores:** el progreso se guarda solo en el dispositivo.
- **Contenido editable:** cada tema es un archivo JSON en `content/temas/`.

## Qué hace

**Recorrido de cada tema (una tarea por pantalla, botones grandes):**

1. **Aprendo** — explicación breve en lenguaje infantil, con dibujos.
2. **Observo** — ejemplo paso a paso y, cuando corresponde, un manipulable para explorar
   (bloques base 10, recta numérica, dinero, reloj, fracciones, grupos…).
3. **Hacemos juntos** — actividad guiada con ayudas visibles.
4. **Practico** — banco de ejercicios adaptativo (niveles 1, 2 y 3).
5. **Demuestro lo que sé** — comprobación final de 5 ejercicios.

**Tipos de actividad:** elegir, elegir varias, tocar palabras, completar arrastrando
fichas, escribir, dictado y «escucha y responde», teclado numérico, ordenar, relacionar
parejas, clasificar arrastrando, juego de memoria, escritura libre con revisión de
mayúscula/punto/palabras, problemas en varios pasos y manipulables (bloques, recta,
fracciones, dinero boliviano, reloj, grupos, repartir, simetría, calendario,
pictogramas, patrones). Los ejercicios de matemática pueden generarse al azar para
tener práctica ilimitada.

**Errores sin avergonzar:** primer error → una pista y otra oportunidad; segundo error →
«Veamos juntos» con la explicación y la respuesta; ese ejercicio vuelve más tarde.

**Dificultad adaptativa:** dos aciertos seguidos suben el nivel; un error baja el nivel y
muestra un repaso. La práctica termina solo con aciertos recientes en nivel 2 o 3 (no
avanza por tocar botones). El tema se **logra** con 80 % en la comprobación; luego vuelve
como repaso a los 3, 7, 14 y 30 días, y ofrece «Nuevo desafío».

**Audio:** botón 🔊 en instrucciones, explicaciones, lecturas y respuestas, con la voz en
español del teléfono (síntesis de voz). Si el teléfono no tiene voz, la app lo avisa;
no hay grabaciones.

**Panel para adultos** (PIN de 4 números):

- Progreso por tema, «qué conviene practicar», errores frecuentes con sugerencias
  concretas para casa, actividad reciente y textos que escribió el niño. Sin etiquetas
  ni calificaciones del niño.
- Nivel inicial por materia, asignar un tema (aparece primero en «Continuar
  aprendiendo»), apodo y personaje, voz y velocidad del audio.
- **Revisar contenido:** ver cada tema con sus respuestas y probar cada ejercicio sin
  que cuente en el progreso.
- **Editar fechas cívicas y lecciones** como borrador, probarlas y publicarlas;
  volver al original cuando se quiera.
- Copia de seguridad (descargar/restaurar), borrar datos, estado del modo sin conexión.

## Usarla

Es una web estática sin dependencias. Cualquier servidor sirve:

```bash
npm run servir          # o: npx http-server . -p 8080 -c-1
# abrir http://localhost:8080
```

Para publicarla (por ejemplo en GitHub Pages) basta con subir los archivos del
repositorio. El modo sin conexión requiere HTTPS (o `localhost`).

Después de cambiar código o contenido, regenera la lista de archivos para uso sin
conexión (actualiza también la versión del service worker):

```bash
npm run precache
```

## Editar o ampliar el contenido

- `content/indice.json` — materias, unidades y temas (orden, títulos y qué cubre cada tema).
- `content/temas/<id>.json` — un archivo por tema.
- `content/fechas-civicas.json` — fechas cívicas y conmemorativas.
- `content/datos.json` — productos y precios de ejemplo de la feria.

El formato completo está en **[docs/CONTENIDO.md](docs/CONTENIDO.md)**. Antes de publicar
cambios, valida:

```bash
npm run validar                       # todos los temas
node tools/validar-contenido.mjs mat-1-2 --avisos
```

El mismo validador se usa en el panel del adulto («Verificar todo el contenido»).

En **[docs/REVISION-PENDIENTE.md](docs/REVISION-PENDIENTE.md)** está la lista de datos que
conviene que un adulto o docente confirme (por ejemplo, los colores de las banderas
departamentales), porque no se pudieron volver a verificar contra una fuente en línea.

## Pruebas

```bash
npm test                  # lógica adaptativa, textos, generadores y validación de todo el contenido
npm run test:e2e          # recorrido en celular: una lección por materia (respuestas correctas e
                          # incorrectas), guardado, panel del adulto y uso sin conexión
npm run test:robustez     # doble toque, botón Atrás, dos ventanas, sin voz en español, PIN, service worker
npm run test:ejercicios   # responde CADA ejercicio de los 106 temas (mal y bien) desde la interfaz
npm run test:visuales     # dibuja los ~1500 visuales del contenido a 360 px y busca errores o desbordes
```

Las pruebas de navegador usan Playwright con Chromium (`npm i -D playwright` si no está instalado).

## Estructura

```
index.html, manifest.webmanifest, sw.js, precache.json
css/        estilos (app.css) y de visuales/manipulables (visuales.css)
fonts/      Andika (SIL OFL 1.1), tipografía pensada para lectores que empiezan
js/app.js   arranque y rutas (#/inicio, #/materia/…, #/tema/…, #/leccion/…, #/adulto)
js/estado.js            progreso y ajustes (localStorage)
js/motor/               adaptativo.js (lógica pura), ejecutar.js (un ejercicio), leccion.js (recorrido)
js/ejercicios/          un archivo por tipo de ejercicio
js/manipulables/        bloques, recta, fracciones, dinero, reloj, grupos, repartir, simetría…
js/visuales/            visual.js (visuales) e ilustraciones.js (dibujos SVG)
js/contenido/           catálogo, validador, generadores, textos y carga del contenido
js/ui/                  pantallas del niño y panel de adultos
content/                contenido editable (JSON)
tools/                  validador y generador de la lista para uso sin conexión
tests/                  pruebas unitarias y de recorrido
dev/                    galerías de visuales e ilustraciones para revisar dibujos
```

## Privacidad

No hay cuentas, sincronización, publicidad ni analítica. La app no envía datos. El
apodo es opcional y no hace falta el nombre real. Los textos que escribe el niño se
guardan solo en el dispositivo y el adulto puede borrarlos.

## Limitaciones conocidas

- El audio depende de la voz en español instalada en el teléfono.
- Los escudos departamentales se describen con palabras (no hay imágenes).
- Los dibujos de monedas y billetes son simplificados.
- La escritura libre se revisa en su forma (mayúscula, punto, cantidad de palabras y
  palabras pedidas), no en su significado.
- Un solo perfil de niño por dispositivo.
