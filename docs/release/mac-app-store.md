# Cuts en la Mac App Store

Estado a 2026-10-24. Cuts (antes "Carousel Cutter") es una app Electron 45 + React 19, empaquetada con electron-builder.

## Cómo se construye

| Comando | Qué produce | Para qué |
|---|---|---|
| `make ffmpeg` | `resources/ffmpeg/ffmpeg` (LGPL, universal arm64 + x86_64) a partir del código oficial de FFmpeg 9.0.2, con SHA-256 fijado en `scripts/build-ffmpeg.sh` | Se incluye en la app como herramienta auxiliar |
| `make app` | `dist/mac-universal/Cuts.app` sin firmar, copiada a `/Applications` | Uso personal y pruebas |
| `./scripts/sandbox-local.sh` | `dist-sandbox/mas-universal/Cuts.app` con la build MAS de Electron, firmada ad hoc con sandbox y Team ID ficticio `LOCALTEST` | **Solo pruebas locales del sandbox**. No sirve para subir |
| `APPLE_TEAM_ID=XXXXXXXXXX make mas` | `dist/mas-universal/*.pkg` firmado para la Mac App Store | Envío. Necesita certificados y perfil (ver tareas) |

El paquete es autocontenido: no depende de Homebrew ni de instaladores externos. FFmpeg va en `Contents/MacOS/ffmpeg`, su licencia y detalles de compilación en `Contents/Resources/LICENSE-FFmpeg.txt` y `BUILD-FFmpeg.txt`.

## Sandbox y permisos

Entitlements de la app (`build/entitlements.mas.template.plist`):

| Entitlement | Por qué | ¿Evitable? |
|---|---|---|
| `com.apple.security.app-sandbox` | Obligatorio en la Mac App Store (2.4.5(i)) | No |
| `com.apple.security.application-groups` = `TEAMID.com.vigosan.cuts` | Electron lo exige para registrar sus servicios Mach dentro del sandbox | No |
| `com.apple.security.files.user-selected.read-write` | Leer el vídeo elegido o arrastrado y escribir en la carpeta elegida con el diálogo | No |
| `com.apple.security.assets.movies.read-write` | Carpeta por defecto `~/Movies/Cuts/<vídeo>` y leer vídeos guardados en Películas sin pedir nada | Sí, pero entonces habría que elegir carpeta en cada sesión |

Procesos auxiliares (`build/entitlements.mas.inherit.plist`: `app-sandbox` + `inherit`): los helpers de Electron y `ffmpeg` heredan el sandbox de la app. Así lo indica la guía oficial "Embedding a helper tool in a sandboxed app".

No se pide ningún permiso con diálogo del sistema: no hay cámara, micrófono, red, contactos ni fotos. El acceso a archivos lo concede macOS implícitamente cuando el usuario elige o arrastra un archivo.

No hace falta acceso persistente (marcadores de seguridad): la app no guarda proyectos ni recuerda carpetas entre sesiones. La carpeta por defecto está en Películas, cubierta por su entitlement.

### Resultado de las pruebas en sandbox (build MAS universal de Electron, firma ad hoc, 2026-10-24)

| Prueba | Resultado |
|---|---|
| Arranque dentro del sandbox | ✅ con `application-groups` + `ElectronTeamID`. Sin ellos Electron aborta (`MachPortRendezvousServer: Permission denied`) |
| Build Electron normal (no MAS) dentro del sandbox | ❌ el helper GPU aborta (`sandbox initialization failed`). Por eso el envío debe usar la build MAS (`make mas`) |
| Leer `~/Movies/2026-10-22 22-33-13.mov` (2,5 GB) | ✅ |
| Leer un archivo fuera de Películas no elegido por el usuario | ❌ bloqueado (esperado) |
| ffmpeg incluido exportando a `~/Movies/Cuts/…` | ✅ |
| Escribir fuera de Películas sin elegir la carpeta | ❌ bloqueado; la app muestra "No se pudo crear la carpeta de destino: EPERM…" (esperado) |
| Carpeta por defecto | ✅ `/Users/<usuario>/Movies/Cuts` (se resuelve el enlace del contenedor) |
| Flujo completo por la interfaz: soltar vídeo, marcar, exportar | ✅ "1 clip exported" |
| Salir durante una exportación | ✅ no queda ni la app ni ffmpeg en ejecución (2.4.5(iii)), y el clip a medias se borra |
| Build universal ejecutada como x86_64 (Rosetta) dentro del sandbox | ✅ exporta desde la interfaz |

**No probado (requiere interacción real o certificados):**
- Elegir vídeo y carpeta con el diálogo nativo dentro del sandbox. El diálogo se abrió y se comprobó fuera del sandbox.
- Arrastrar desde Finder un vídeo que esté **fuera** de Películas. La prueba automática solo puede simular el arrastre, no conceder la extensión de sandbox que da Finder.
- La build firmada con Apple Distribution, el `.pkg` y su validación en Transporter.

### A verificar con la build firmada por Apple

1. Elegir un vídeo **fuera** de Películas con el diálogo y arrastrarlo desde Finder, y exportar a una carpeta elegida fuera de Películas. ffmpeg solo hereda el sandbox, así que debe recibir el acceso que macOS concede a la app en ese momento.
2. Que App Store Connect acepte el ejecutable `Contents/MacOS/ffmpeg`, firmado con identificador `ffmpeg` y sin Info.plist propio. Lo dirá Transporter al subir.
3. Con el sistema en un idioma no soportado (por ejemplo francés con español como segundo), que el menú y la ventana salgan en el mismo idioma.

## Fuentes oficiales consultadas

- App Review Guidelines, 2.4.5, 2.5.2, 4.2.3 y 5.1.1: https://developer.apple.com/app-store/review/guidelines/
- Embedding a helper tool in a sandboxed app: https://developer.apple.com/documentation/xcode/embedding-a-helper-tool-in-a-sandboxed-app
- Entitlement `com.apple.security.assets.movies.read-write`: https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.assets.movies.read-write
- Entitlement `com.apple.security.files.user-selected.read-write`: https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.files.user-selected.read-write
- Electron, Mac App Store Submission Guide: https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide
- FFmpeg, License and Legal Considerations: https://ffmpeg.org/legal.html

## Riesgos pendientes

- **Licencia de FFmpeg.** El binario incluido es LGPL v2.1 (sin `--enable-gpl` ni `--enable-nonfree`, verificado con `ffmpeg -L`). Es un ejecutable aparte que la app lanza, no una biblioteca enlazada. Aun así, la compatibilidad de la LGPL con las condiciones de la App Store es una cuestión legal, no técnica: **conviene revisión legal**. La checklist de FFmpeg pide publicar el código fuente exacto junto a la descarga; ver tareas.
- **Rendimiento en Intel.** La app es universal. La parte x86_64 de FFmpeg se compila sin las optimizaciones en ensamblador (`--disable-x86asm`) porque no hay `nasm` instalado: en Mac Intel la decodificación es algo más lenta, aunque la codificación sigue en hardware (VideoToolbox). Se comprobó una exportación real ejecutando la app como x86_64 con Rosetta. Para recuperar el rendimiento, instala `nasm` y quita esa opción.
- **Login helper.** La build MAS de Electron incluye `Contents/Library/LoginItems/Cuts Login Helper.app`. La app no lo usa ni se abre al iniciar sesión. Si el equipo de revisión pregunta, esa es la explicación.
- **Tamaño.** La app universal ocupa unos 519 MB instalada, por Electron por duplicado más FFmpeg.
- **Cifrado para exportación.** Electron incluye BoringSSL, aunque la app no hace conexiones de red. La respuesta a "uses non-exempt encryption" debe darla el propietario.

## Tareas del propietario

**Apple Developer**
1. Confirmar el bundle ID `com.vigosan.cuts` (propuesto por coherencia con `com.vigosan.surco`) y registrarlo como App ID.
2. Activar la capacidad App Groups y crear el grupo `TEAMID.com.vigosan.cuts`.
3. Crear y descargar los certificados **Apple Distribution** y **Mac Installer Distribution**. Ahora el llavero no tiene ninguno de Apple.
4. Crear un perfil de aprovisionamiento "Mac App Store" para ese App ID y guardarlo como `build/embedded.provisionprofile`.
5. Ejecutar `APPLE_TEAM_ID=<tu Team ID> make mas` y subir el `.pkg` con Transporter.

**App Store Connect**
1. Crear la ficha con el nombre "Cuts" y comprobar que está disponible.
2. Publicar una política de privacidad y una URL de soporte (ver `docs/release/privacy.md`).
3. Completar la privacidad, la clasificación por edad, la categoría (Video / Foto y vídeo), el precio y el copyright.
4. Responder la pregunta de cifrado.
5. Subir las capturas de `docs/release/screenshots/` (2880×1800, 16:10, sin alfa, en inglés y español; se regeneran con `scripts/store-screenshots.mjs` y la app abierta con `--remote-debugging-port`).
6. Pegar las notas de revisión de `docs/release/app-store-listing.md`.

**FFmpeg (LGPL)**
1. Alojar `vendor/ffmpeg/ffmpeg-9.0.2.tar.xz` y `resources/ffmpeg/BUILD-FFmpeg.txt` en una web propia, y enlazarlos desde la web de soporte.
2. Mencionar FFmpeg y la LGPL v2.1 en el EULA si se usa uno propio. Ya se menciona en "Acerca de Cuts".

**Dentro de la app (cuando haya URLs)**
1. Añadir en el menú un enlace a la política de privacidad. La norma 5.1.1(i) lo exige dentro de la app y todavía no hay URL.
2. Fijar el copyright real en `electron-builder.yml`. Ahora el valor por defecto es "Copyright © 2026 Cuts".
