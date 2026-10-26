# Cuts

App para Mac que convierte una grabación larga en clips cortos, listos para un carrusel de Instagram. Arrastras un vídeo, marcas dónde empieza y acaba cada clip (o dejas que Cuts sugiera los mejores momentos) y los exporta todos de una vez, numerados en el orden del carrusel.

Web: [cuts.vicent.io](https://cuts.vicent.io)

## Qué hace

- Marca clips mientras escuchas: <kbd>I</kbd> y <kbd>O</kbd> para inicio y fin, <kbd>Espacio</kbd> para reproducir.
- Línea de tiempo con fotogramas y forma de onda, zoom y arrastre; clips con bordes ajustables.
- Ajuste fino con el teclado: <kbd>,</kbd> <kbd>.</kbd> un fotograma (con <kbd>⇧</kbd>, un segundo) y <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd>.
- ✦ Sugerir momentos: detecta los drops de una sesión (bajón y vuelta de la mezcla) y propone hasta 10 clips repartidos por la sesión.
- Fundidos de imagen y audio por clip, y encuadre por clip en 4:5, 1:1 y 9:16.
- Escucha el carrusel entero en bucle y comparte los clips exportados con Fotos o AirDrop.
- Recuerda el trabajo de cada vídeo, con deshacer y rehacer.
- En inglés y español. Todo ocurre en el Mac: sin cuentas, sin subidas, sin analítica.

## Tecnología

Electron + electron-vite, React 19, TypeScript y Tailwind CSS v4. Pruebas con Vitest y Testing Library. Empaquetado con electron-builder (app universal arm64 + x86_64). Los clips se exportan con un FFmpeg incluido en la app, compilado desde el código oficial sin componentes GPL (licencia LGPL v2.1).

## Empezar

Requisitos: macOS con Xcode Command Line Tools y Node.js con npm.

```bash
make install   # dependencias
make ffmpeg    # compila el FFmpeg LGPL universal en apps/desktop/resources/ffmpeg (tarda un rato, solo la primera vez)
make dev       # app en modo desarrollo
```

## Comandos

| Comando | Qué hace |
|---|---|
| `make dev` / `npm run dev:desktop` | App de escritorio en local |
| `make test` | Todas las pruebas |
| `make lint` | Linter (oxlint) |
| `make typecheck` | Comprobación de tipos |
| `cd apps/desktop && npm run app` | Construye `apps/desktop/dist/mac-universal/Cuts.app` sin firmar |
| `make app` | Lo mismo y además la copia a `/Applications` (sustituye la que haya instalada) |
| `APPLE_TEAM_ID=… make mas` | `.pkg` firmado para la Mac App Store |
| `make icon` | Regenera el icono |
| `make web` / `make web-dev` (`npm run dev:web`) | Pruebas y build de la web / web en local |

## Estructura

```
apps/desktop/           app de escritorio (Electron)
  src/main/             proceso principal: ventana, menú, FFmpeg, exportación, sesiones
  src/preload/          puente seguro entre el proceso principal y la interfaz
  src/renderer/         interfaz en React
  src/shared/           tipos de la comunicación entre procesos y URLs del vídeo
  scripts/              compilar FFmpeg, icono, capturas, prueba local del sandbox
  build/                icono, entitlements y perfil de la Mac App Store
apps/web/               web cuts.vicent.io (Next.js, desplegada en Vercel)
packages/core/          lógica sin interfaz: clips, fundidos, formatos, encuadre, sugerencias, deshacer, textos (i18n)
docs/                   publicación en la Mac App Store, privacidad, idiomas
```

## Documentación

- [Publicar en la Mac App Store](docs/release/mac-app-store.md)
- [Cómo sacar una nueva versión](docs/release/nueva-version.md)
- [Ficha de la App Store](docs/release/app-store-listing.md)
- [Privacidad](docs/release/privacy.md)
- [Idiomas](docs/i18n.md)
