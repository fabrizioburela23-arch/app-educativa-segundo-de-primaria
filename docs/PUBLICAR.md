# Publicar la app para abrirla en el celular

Al terminar tendrás una dirección web que se abre en Chrome del celular, se instala como una app
y funciona sin internet. Con GitHub Pages la dirección será:

**https://fabrizioburela23-arch.github.io/app-educativa-segundo-de-primaria/**

No hace falta instalar nada en la computadora: todo se hace desde la web de GitHub.

## Antes de empezar: repositorio público o privado

- Con el plan gratis de GitHub, **GitHub Pages solo publica repositorios públicos**. Para publicar
  desde un repositorio privado hace falta GitHub Pro (de pago), o usar la opción B de abajo.
- En cualquier opción, **el sitio publicado lo puede abrir cualquiera que tenga la dirección**. Es
  lo normal: la app no contiene datos del niño. Su progreso, su apodo y lo que escribe se guardan
  solo en su teléfono.
- Si haces público el repositorio, cualquiera podrá ver el código y el historial, incluido el correo
  del autor de cada commit. El primer commit («Initial commit») tiene tu correo personal.

## Opción A: GitHub Pages (recomendada; hay que hacer público el repositorio)

Conviene seguir este orden. Así, el paso 4 publica solo.

1. **(Opcional) Ocultar tu correo en los commits nuevos:** en tu cuenta, Settings → Emails → marca
   «Keep my email addresses private». Esto no cambia el primer commit, que ya existe.
2. **Hacer público el repositorio:** en el repositorio, pestaña **Settings** (se abre en General) →
   baja hasta **Danger Zone** → junto a «Change repository visibility», toca **Change visibility** →
   elige público → **I have read and understand these effects** → **Make this repository public**.
3. **Activar Pages:** Settings → en la barra lateral, **Pages** → en «Build and deployment», bajo
   **Source**, elige **GitHub Actions**. No hay que guardar nada más. Si GitHub sugiere plantillas,
   ignóralas: la app ya trae la suya (`.github/workflows/publicar.yml`).
4. **Pasar el trabajo a la rama principal (main):** pestaña **Pull requests** → **New pull request**
   → base: `main`, compare: `claude/educational-app-bolivia-tkii85` → **Create pull request** →
   **Merge pull request** → **Confirm merge**. Si aparece un selector de correo, elige el que termina
   en `@users.noreply.github.com`.
5. **Esperar la publicación:** en la pestaña **Actions**, «Publicar en GitHub Pages» se pone con ✓
   verde en uno o dos minutos. La dirección puede tardar hasta 10 minutos en responder. También
   aparece en Settings → Pages («Visit site»).

**Si en Actions aparece ✗ rojo** porque Pages todavía no estaba activado: haz el paso 3 y luego ve a
Actions → «Publicar en GitHub Pages» → **Run workflow** → rama `main` → **Run workflow**.

Cada cambio que llegue a `main` se vuelve a publicar solo. El flujo valida todo el contenido antes de
publicar: si hay un error en algún tema, no publica nada, y el detalle queda en Actions.

## Opción B: mantener el repositorio privado (Cloudflare Pages, gratis)

Primero haz el paso 4 de la opción A (pasar el trabajo a `main`). Después:

1. Crea una cuenta en Cloudflare y entra en **Workers & Pages** → **Create application** →
   **Pages** → **Connect to Git**.
2. Conecta GitHub. Conviene elegir **Only select repositories** y marcar solo este repositorio.
3. Elige el repositorio → **Begin setup** y configura:
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: `node tools/generar-precache.mjs && node tools/preparar-sitio.mjs _sitio`
   - Build output directory: `_sitio`
4. **Save and Deploy**. La dirección terminará en `.pages.dev`.

Netlify funciona de forma parecida (Add new project → Import an existing project → GitHub), con el
mismo comando de compilación y `_sitio` como «Publish directory». Estas dos opciones no se probaron
desde aquí. Lo que sí se probó es que la carpeta `_sitio` funciona publicada (ver «Pruebas» abajo).

**Elige un solo lugar y quédate con él.** El progreso queda atado a la dirección web: si después
cambias de dirección, la app empieza desde cero (salvo que restaures una copia de seguridad).

## En el celular (Android)

1. Abre la dirección en **Chrome**. Si te llega por WhatsApp o Facebook, usa «Abrir en Chrome»:
   dentro de esas apps no aparece la opción de instalar.
2. La primera vez, déjala abierta **con wifi alrededor de un minuto**: descarga todas las lecciones
   (unos 4 MB) para poder usarlas sin internet.
3. **Instalar:** menú **⋮** → busca la opción que diga **Instalar** («Instalar aplicación»,
   «Instalar y crear acceso directo» o «Agregar a la pantalla principal», según la versión de
   Chrome) → **Instalar**. No elijas «Crear acceso directo», que no la instala como app.
4. **Comprobar que funciona sin internet:** abre «Para adultos» → pestaña **Datos** → en «Uso sin
   conexión» debe decir «✅ La app funciona sin conexión». Después pon el modo avión y ábrela desde
   su ícono.
5. En «Para adultos» → **Datos**, toca también **«Proteger los datos en este teléfono»**. Así el
   navegador tiene menos motivos para borrar el progreso si el teléfono se queda sin espacio.

En iPhone: Safari → botón Compartir → «Agregar a inicio».

## Cuidar el progreso

El progreso se guarda **solo en ese teléfono y en ese navegador**. Se pierde si se borran los datos
de navegación de Chrome, si se desinstala Chrome o si se cambia de teléfono. De vez en cuando usa
«Para adultos» → **Datos** → **Descargar copia** y guarda el archivo en un lugar privado.
Para pasarlo a otro teléfono, usa **Restaurar copia**.

## Pruebas

`npm run test:publicado` arma la carpeta del sitio con los mismos pasos que el flujo de GitHub, la
sirve en la misma subruta (`/app-educativa-segundo-de-primaria/`) y comprueba en un celular
simulado: que no falte ningún archivo, que Chrome la considere instalable, que guarde todo para usar
sin conexión y que, sin conexión, abra lecciones que nunca se abrieron.
