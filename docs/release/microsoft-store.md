# Microsoft Store

Cuts se publica en la Microsoft Store como paquete MSIX, gratis, igual que en la web. La Store vuelve a firmar el paquete, así que quien instala desde ahí no ve el aviso de SmartScreen que sí sale con `Cuts-windows.exe`.

## Datos de la cuenta (Partner Center)

La misma cuenta de particular que Surco.

| Campo | Valor |
|---|---|
| Nombre reservado | Pendiente (ver «Alta») |
| `Package/Identity/Name` | Pendiente |
| `Package/Identity/Publisher` | `CN=D13B979E-AC81-4811-B7E0-309749169C20` |
| `PublisherDisplayName` | `Vicent Gozalbes` |
| Store ID | Pendiente |

## El paquete

- Lo genera el job de Windows del release (`.github/workflows/release.yml`) con `electron-builder --win appx` y lo sube como artefacto `store-appx` del run. No se publica en `cuts-releases`.
- Va sin firmar: electron-builder lo deja así al llevar la identidad de la Store, y Microsoft lo firma.
- Manifiesto por defecto de electron-builder. MSIX redirige a una carpeta privada del paquete las escrituras en carpetas nuevas de `%APPDATA%`, que es donde Cuts guarda las sesiones de clips. Windows borra esa carpeta al desinstalar, que es lo que ya dice la política de privacidad. Los clips exportados van a Vídeos, fuera de `AppData`, y no se redirigen.
- Iconos del paquete en `build/appx/`, generados con `make icon` desde `build/icon.svg`.

## Alta

1. En [Partner Center](https://partner.microsoft.com/dashboard/apps-and-games/overview): **Apps and games › New product › MSIX or PWA app**.
2. Reserva el nombre. «Cuts» a secas seguramente esté ocupado, como en la App Store; en ese caso, **Cuts – Video Clips**, el mismo que en la Mac App Store. El nombre no puede llevar «Instagram».
3. **Product management › Product identity**: copia `Package/Identity/Name` y el Store ID a la tabla de arriba y a `appx.identityName` en `electron-builder.yml`. `displayName` tiene que ser exactamente el nombre reservado.
4. Lanza un release y descarga el artefacto `store-appx` del run.
5. **Start submission** y rellena cada sección:
   - **Pricing and availability**: Free, todos los mercados, visibilidad pública.
   - **Properties**: categoría *Photo & video*. Privacy policy: `https://cuts.vicent.io/privacy`. Website: `https://cuts.vicent.io`. Support contact: `https://cuts.vicent.io/support`.
   - **Age ratings**: cuestionario IARC. Cuts no tiene contenido propio, ni chat, ni compras, ni comparte datos ni ubicación.
   - **Packages**: sube el `.appx`.
   - **Store listings**: añade *English (United States)* y *Spanish (Spain)*, los dos idiomas del paquete, con los textos y capturas de abajo.
   - **Submission options › Notes for certification**: el texto de abajo. Si pide justificar `runFullTrust`, usa también el de abajo.
6. **Submit to the Store**. La certificación suele tardar unas horas y como mucho tres días laborables.

## Ficha

Nombre en la ficha: el reservado. Categoría: Photo & video.

### Descripción (en)

Cuts turns a long recording into short clips, ready to post.

Drop in a video, listen, and mark where each clip starts and ends. Drag clips on the timeline to fine-tune them, zoom in for second-accurate edits, and reorder them into the order you will post them.

• Mark clips while you listen, with keyboard shortcuts (I / O, Space)
• See the video frames and the audio waveform along the timeline
• Clips of up to 59 seconds are flagged as carousel-ready; longer ones are allowed for regular posts
• Fades to black or white and smooth audio fades, per clip
• Original size, or 4:5, 1:1 and 9:16 at 1080 px: choose what stays in shot, or fit the whole frame over a blurred background
• The first clip starts on a real frame, so your carousel cover is never black
• Exports every clip at once, numbered in order, to Videos › Cuts
• Everything happens on your computer. No account, no uploads, no tracking.

### Descripción (es)

Cuts convierte una grabación larga en clips cortos, listos para publicar.

Arrastra un vídeo, escúchalo y marca dónde empieza y acaba cada clip. Arrastra los clips en la línea de tiempo para afinarlos, haz zoom para ajustar al segundo y ordénalos tal y como los vas a publicar.

• Marca clips mientras escuchas, con atajos de teclado (I / O, espacio)
• Ve los fotogramas del vídeo y la forma de onda del audio en la línea de tiempo
• Los clips de hasta 59 segundos se marcan como aptos para carrusel; los más largos se permiten para publicaciones normales
• Fundidos a negro o a blanco y fundidos de audio suaves, en cada clip
• Tamaño original, o 4:5, 1:1 y 9:16 a 1080 px: elige qué queda en el plano, o encaja el vídeo entero sobre un fondo desenfocado
• El primer clip empieza con imagen, así la portada del carrusel nunca sale negra
• Exporta todos los clips de una vez, numerados en orden, en Vídeos › Cuts
• Todo ocurre en tu ordenador. Sin cuentas, sin subidas, sin rastreo.

### Descripción breve

- en: Cut your best moments into clips
- es: Corta tus mejores momentos en clips

### Palabras clave (máximo 7)

- en: video, clips, carousel, cut, trim, fade, highlights
- es: vídeo, clips, carrusel, cortar, recortar, fundido, momentos

### Capturas

Las de `docs/release/screenshots/` (2880×1800, PNG) sirven: no enseñan elementos de macOS, salvo la carpeta «Movies/Cuts», que en Windows se llama «Videos/Cuts». Conviene sustituirlas por capturas hechas en Windows cuando las haya.

## Notas para certificación (en)

> Cuts cuts a long video into short clips and exports them to a folder. No account, network access or special hardware is needed. Any video file works, for example a recording made with the Snipping Tool or Xbox Game Bar.
>
> 1. Open a video: drag a video file onto the window, click "Choose video…", or use File › Open Video… (Ctrl+O).
> 2. Play it with the play button or the Space bar.
> 3. Mark a clip: click "Start" (or press I) at the beginning and "End" (or press O) at the end. The clip appears in the Carousel list on the right. Repeat for more clips.
> 4. Export: clips are saved by default to Videos › Cuts › <video name>. Click "Folder" to choose another folder. Then click "Export".
>
> The app bundles FFmpeg (LGPL v2.1) as ffmpeg.exe next to Cuts.exe. It only runs while generating previews or exporting, and it is stopped when the app quits.

## Justificación de `runFullTrust` (en)

> Cuts is a desktop app built with Electron. It needs full trust to read the video files the user opens from any folder, to write the exported clips to the folder the user chooses, and to run its bundled FFmpeg (ffmpeg.exe) to decode and encode video.
