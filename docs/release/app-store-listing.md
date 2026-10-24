# Ficha de App Store Connect: BORRADOR

> Borrador basado en lo que la app hace hoy. Todo debe revisarlo el propietario antes de usarlo. Nada de esto está publicado.

## Datos de la ficha

| Campo | Propuesta | Estado |
|---|---|---|
| Nombre (en) | Cuts – Video Clips | "Cuts" a secas ya está ocupado en la App Store (comprobado al crear la app, 2026-10-24). La app sigue llamándose Cuts en el Mac |
| Nombre (es) | Cuts – Clips de vídeo | Localización del nombre en la ficha en español |
| Subtítulo (en) | Cut your best moments into clips | Borrador |
| Subtítulo (es) | Corta tus mejores momentos en clips | Borrador |
| Categoría principal | Photo & Video | Decide el propietario |
| Clasificación por edad | Cuestionario de App Store Connect; la app no tiene contenido propio | Lo responde el propietario |
| Copyright | — | Lo aporta el propietario |
| URL de soporte | — | Lo aporta el propietario |
| URL de política de privacidad | — | Lo aporta el propietario (ver `privacy.md`) |
| Precio | — | Decide el propietario |

Sobre la marca: mencionar "Instagram" en la descripción para explicar el uso es habitual, pero el nombre, el subtítulo y el icono no deben usar la marca ni su logotipo (norma 5.2). Por eso el nombre y el subtítulo no la incluyen.

## Descripción (en)

Cuts turns a long recording into short clips, ready to post.

Drop in a video, listen, and mark where each clip starts and ends. Drag clips on the timeline to fine-tune them, zoom in for second-accurate edits, and reorder them into the order you will post them.

• Mark clips while you listen, with keyboard shortcuts (I / O, Space)
• See the video frames and the audio waveform along the timeline
• Clips of up to 59 seconds are flagged as carousel-ready; longer ones are allowed for regular posts
• Fades to black or white and smooth audio fades, per clip
• Original size, or 4:5, 1:1 and 9:16 crops at 1080 px
• The first clip starts on a real frame, so your carousel cover is never black
• Exports every clip at once, numbered in order, to Movies › Cuts
• Everything happens on your Mac. No account, no uploads, no tracking.

## Descripción (es)

Cuts convierte una grabación larga en clips cortos, listos para publicar.

Arrastra un vídeo, escúchalo y marca dónde empieza y acaba cada clip. Arrastra los clips en la línea de tiempo para afinarlos, haz zoom para ajustar al segundo y ordénalos tal y como los vas a publicar.

• Marca clips mientras escuchas, con atajos de teclado (I / O, espacio)
• Ve los fotogramas del vídeo y la forma de onda del audio en la línea de tiempo
• Los clips de hasta 59 segundos se marcan como aptos para carrusel; los más largos se permiten para publicaciones normales
• Fundidos a negro o a blanco y fundidos de audio suaves, en cada clip
• Tamaño original, o recortes 4:5, 1:1 y 9:16 a 1080 px
• El primer clip empieza con imagen, así la portada del carrusel nunca sale negra
• Exporta todos los clips de una vez, numerados en orden, en Películas › Cuts
• Todo ocurre en tu Mac. Sin cuentas, sin subidas, sin rastreo.

## Palabras clave (borrador, máximo 100 caracteres)

- en: `video,clips,carousel,cut,trim,split,fade,export,highlights,timeline,editor`
- es: `vídeo,clips,carrusel,cortar,recortar,dividir,fundido,exportar,momentos,editor`

Las palabras clave no incluyen nombres de otras apps ni marcas (por ejemplo Instagram o Reels), porque la norma 2.3.7 no lo permite.

## Capturas de pantalla

Hechas: `docs/release/screenshots/` contiene 3 escenas por idioma a 2880×1800 (16:10, PNG sin alfa, uno de los tamaños que admite Apple): vista general, edición con zoom y modo oscuro. Usan el vídeo del propietario.

## Notas para el equipo de revisión (en): BORRADOR

> Cuts cuts a long video into short clips and exports them to a folder. No account, network access or special hardware is needed. Any video file on the Mac works, for example a screen recording made with Screenshot (Shift-Command-5).
>
> 1. Open a video: drag a video file onto the window, click "Choose video…", or use File › Open Video… (Command-O).
> 2. Play it with the play button or the Space bar.
> 3. Mark a clip: click "Start" (or press I) at the beginning and "End" (or press O) at the end. The clip appears in the Carousel list on the right. Repeat for more clips.
> 4. Optional: drag a clip or its edges on the timeline, change the zoom, reorder clips by dragging rows, or select a clip to change its fades.
> 5. Export: clips are saved by default to Movies › Cuts › <video name>. Click "Folder" to choose another folder. Then click "Export".
>
> Permissions: the app only reads the video the user opens and writes to the Movies folder or the folder the user chooses. No permission dialogs appear.
>
> The app bundles FFmpeg (LGPL v2.1) as a helper tool at Contents/MacOS/ffmpeg. It inherits the app sandbox and only runs during an export; it is stopped when the app quits. The login helper included by the Electron Mac App Store build is not used.
