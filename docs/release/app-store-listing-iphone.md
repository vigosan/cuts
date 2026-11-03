# Ficha de App Store Connect para iPhone: BORRADOR

> Basado en lo que hace Cuts para iPhone hoy (rama `mobile`).
>
> **Estado en App Store Connect (2026-11-03):** creada la versión de iOS 1.7 (`fe17aad0-ebd7-4059-9000-32a25cd98ea6`, "Preparar para envío"). Ya tiene los textos en inglés y español, las URL de soporte y marketing, las notas de revisión y las 8 capturas. Falta elegir el build y enviarla a revisión, después de probarla en un iPhone real. Los textos se subieron con los scripts de la sesión; si cambias este documento, hay que volver a subirlos.

## Qué se comparte con la ficha del Mac

Cuts es una compra universal (`com.vigosan.cuts`). En App Store Connect, estos campos son de la app y valen para Mac y iPhone a la vez:

| Campo | Valor actual | Cambio |
|---|---|---|
| Nombre (en) | Cuts – Video Clips | Ninguno |
| Nombre (es) | Cuts – Clips de vídeo | Ninguno |
| Subtítulo (en) | Cut your best moments | Ninguno: sirve para los dos |
| Subtítulo (es) | Corta tus mejores momentos | Ninguno |
| Categoría | Photo & Video | Ninguno |
| Precio | El de la app del Mac | Ninguno: compra universal |
| URL de política de privacidad | La de la web | Ninguno en la URL; sí en el texto, ver `privacy.md` |

La descripción, el texto promocional, las palabras clave, las capturas y las notas de revisión son propios de la versión de iOS. Son los de abajo.

## Texto promocional

Se puede cambiar sin enviar una versión nueva. Máximo 170 caracteres.

- en (135): `Record your set on your phone, cut the best moments into a carousel and post it. No computer needed, nothing uploaded, nothing tracked.`
- es (129): `Graba tu sesión con el móvil, corta los mejores momentos en un carrusel y publícalo. Sin ordenador, sin subir nada y sin rastreo.`

## Descripción (en)

Cuts turns a long recording into short clips, ready to post, right on your iPhone.

Open a video from Photos or iCloud Drive, play it, and mark where each clip starts and ends. Fine-tune clips on the timeline, put them in the order you will post them, and export the whole carousel to Photos in one go.

• Mark clips with Start here and End here; cuts snap to the nearest beat, or land exactly where you are
• Suggest finds the drops in your set and adds clips around them
• See the video frames and the audio waveform on the timeline; pinch or double-tap to zoom
• Drag clip edges to trim, hold a clip to move it, split it at the playhead
• Clips of up to 59 seconds fit a carousel; longer ones are allowed for regular posts
• Fades to black or white and smooth audio fades, per clip or for all clips
• Original size, or 4:5, 1:1 and 9:16 at 1080 px: drag the frame to choose what stays in shot, or fit the whole video over a blurred background
• The first clip starts on a real frame, so your carousel cover is never black
• Exports every clip to a Cuts album in Photos, in carousel order, then opens Instagram if you have it
• Remembers your clips for each video, so you can come back later
• Also on Mac: buy once, use it on both

Everything happens on your iPhone. No account, no uploads, no tracking.

## Descripción (es)

Cuts convierte una grabación larga en clips cortos, listos para publicar, directamente en tu iPhone.

Abre un vídeo desde Fotos o iCloud Drive, reprodúcelo y marca dónde empieza y acaba cada clip. Afina los clips en la línea de tiempo, ordénalos tal y como los vas a publicar y exporta el carrusel entero a Fotos de una vez.

• Marca clips con Inicio aquí y Fin aquí; los cortes caen en el golpe más cercano o justo donde estás
• Sugerir encuentra los subidones de tu sesión y añade clips a su alrededor
• Ve los fotogramas del vídeo y la forma de onda del audio en la línea de tiempo; pellizca o toca dos veces para hacer zoom
• Arrastra los bordes para recortar, mantén pulsado un clip para moverlo y pártelo donde está el cursor
• Los clips de hasta 59 segundos caben en un carrusel; los más largos se permiten para publicaciones normales
• Fundidos a negro o a blanco y fundidos de audio suaves, en cada clip o en todos
• Tamaño original, o 4:5, 1:1 y 9:16 a 1080 px: arrastra el recuadro para elegir qué queda en el plano, o encaja el vídeo entero sobre un fondo desenfocado
• El primer clip empieza con imagen, así la portada del carrusel nunca sale negra
• Exporta todos los clips a un álbum Cuts en Fotos, en el orden del carrusel, y abre Instagram si lo tienes
• Recuerda tus clips de cada vídeo, para que puedas seguir otro día
• También en Mac: la compras una vez y la usas en los dos

Todo ocurre en tu iPhone. Sin cuentas, sin subidas, sin rastreo.

## Palabras clave (máximo 100 caracteres)

- en (97): `video,clips,carousel,cut,trim,split,fade,export,highlights,timeline,editor,dj,set,beat,reels,crop`
- es (98): `vídeo,clips,carrusel,cortar,recortar,dividir,fundido,exportar,momentos,editor,dj,sesión,golpe,crop`

Ninguna incluye nombres de otras apps (norma 2.3.7). "reels" es una palabra genérica del formato y aparece en el selector de formato de la app, pero si el revisor la considera marca, se quita.

## Novedades

Una primera versión de iOS no lleva "Novedades". Se rellenan a partir de la segunda.

## Notas para el equipo de revisión (en)

> Cuts cuts a long video into short clips and saves them to Photos. No account, sign-in or network access is needed.
>
> To test, any video in the Photos library works, ideally one with music that is a few minutes long.
>
> 1. Tap "Choose video from Photos" and pick a video. (Or "Choose from Files" for a video in iCloud Drive or On My iPhone.)
> 2. Tap "Suggest moments" to add clips automatically, or play the video and tap "Start here", then "End here", to mark a clip.
> 3. Optional: tap "Fades · framing" to pick a format (for example 9:16) and fades; drag the frame on the video to choose what stays in shot.
> 4. Tap "Export N clips", then "Export". The clips are saved to a "Cuts" album in Photos. If Instagram is installed, an "Open Instagram" button appears; Cuts never posts anything itself.
>
> Permissions: Cuts asks for full Photos access to open the original video without copying it and to save the exported clips to the Cuts album. If access is limited or denied, the app explains how to allow it in Settings. Files picked from the Files app are opened in place; Cuts keeps a bookmark so the video appears again under Recent.
>
> All processing (audio analysis, thumbnails and video export) happens on the device with AVFoundation. Nothing is uploaded.

## Capturas de pantalla

Hechas y subidas: `docs/release/screenshots/iphone/`, 4 escenas por idioma a 1320 × 2868 (6,9"), del simulador del iPhone 18 Pro Max con la sesión del 2026-10-22 del propietario y la barra de estado limpia (9:41). Las escenas son: pantalla de corte con los 10 momentos de Sugerir, hoja de encuadre en 9:16, carrusel ampliado e inicio con Recientes.
