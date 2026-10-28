# Cómo publicar una nueva versión de Cuts

Guía para la 1.1 y las siguientes. Parte de lo que funcionó con la 1.0.0 (`mac-app-store.md`).

## Antes de empezar

- La versión anterior tiene que estar aprobada o retirada de revisión: App Store Connect no deja enviar otra mientras una está "Waiting for Review" o "In Review".
- Los certificados Apple Distribution y 3rd Party Mac Developer Installer siguen en el llavero (`security find-identity -v -p codesigning` muestra el primero).
- El perfil `apps/desktop/build/embedded.provisionprofile` no ha caducado (duran un año). Para verlo: `security cms -D -i apps/desktop/build/embedded.provisionprofile | grep -A1 ExpirationDate`. Si caducó, descarga uno nuevo en developer.apple.com › Profiles con el mismo nombre de archivo.

## 1. Preparar el código

1. Sin cambios pendientes: `git status` limpio y en `master`.
2. Tests y tipos: `make test` y `make typecheck`.
3. Subir el número de versión en `apps/desktop/package.json` (`"version": "1.1.0"`) y hacer commit (`Set version 1.1.0`).

El número de compilación (`CFBundleVersion`) sale de esa misma versión. Si hay que volver a subir la misma versión (por ejemplo, tras un rechazo), Apple exige un número de compilación mayor: `npx electron-builder --mac mas --universal -c.buildVersion=1.1.0.1` después de `make mas`, o cambia la versión a `1.1.1`.

## 2. Construir y subir

1. `APPLE_TEAM_ID=TKAZA7ZPZ2 make mas`
2. Resultado: `apps/desktop/dist/mas-universal/Cuts-mac.pkg`.
3. Abrir Transporter, arrastrar el `.pkg` y pulsar "Entregar".
4. Esperar el correo de Apple de que la compilación se ha procesado (de 10 a 30 minutos).

## 3. Probar en TestFlight

1. App Store Connect › Cuts › TestFlight: la compilación 1.1.0 aparece cuando termina de procesarse.
2. Instalarla desde la app TestFlight del Mac (reemplaza la de `/Applications`).
3. Comprobar a mano, con un vídeo real:
   - abrir un vídeo, marcar clips, cerrar la app y volver a abrir el mismo vídeo: los clips siguen ahí;
   - deshacer y rehacer con ⌘Z y ⇧⌘Z;
   - avanzar fotograma a fotograma con `,` y `.` (con ⇧, un segundo), y J, K, L;
   - ▶ en un clip: suena el carrusel desde ahí, clip tras clip, en bucle;
   - formato 4:5: mover el recuadro, y probar "Completo" con fondo desenfocado;
   - exportar: el progreso va dentro del botón, al terminar el botón es "Compartir…" y envía a Fotos o AirDrop; "Mostrar en Finder" abre la carpeta.

## 4. Crear la versión en App Store Connect

1. Cuts › App Store › en la barra lateral, "+" junto a "macOS App" › versión `1.1.0`.
2. **Novedades de esta versión** (en cada idioma): copiar el texto de abajo.
3. **Compilación:** elegir la 1.1.0 que has probado.
4. Capturas, descripción y palabras clave se heredan de la versión anterior. Cámbialas solo si quieres enseñar lo nuevo (ver `app-store-listing.md`).
5. **Notas para la revisión:** las mismas que en la 1.0. Si preguntan por el guardado, la app guarda los clips de cada vídeo en su contenedor (ver `privacy.md`); la declaración de privacidad sigue siendo "Data Not Collected".
6. **Publicación de la versión:** "Manualmente" si quieres decidir el día, o "Automáticamente" al aprobarse.
7. "Añadir para revisión" › "Enviar a revisión de la app".

## 5. Después de la aprobación

- Publicar (si elegiste "Manualmente").
- Web: la portada ya describe el encuadre por clip, que llega con la 1.1. Añade lo nuevo si quieres (`apps/web/content.ts`) y sube los cambios; Vercel despliega solo. Comprueba con `vercel ls cuts --scope vigosans-projects`, sin recargar el dominio en bucle.
- Etiqueta en git: `git tag v1.1.0 && git push origin v1.1.0`. El tag lanza el workflow de release: publica las descargas de Mac, Windows y Linux en `cuts-releases` (la web enlaza siempre a la última) y deja el paquete de la Microsoft Store como artefacto `store-appx` (ver `microsoft-store.md`).

## Novedades de la 1.5

### Español

- Exporta solo los clips que quieras: selecciónalos con ⇧-clic (un rango) o ⌘-clic (sueltos) en la lista o en la línea de tiempo, y el botón exporta solo esos, cada uno con su número del carrusel. Sin selección se exportan todos.
- Con varios clips seleccionados, los fundidos y el encuadre cambian en todos a la vez.
- Cuts recuerda tus fundidos, formato y carpeta para el siguiente vídeo, así no tienes que elegirlos cada vez.
- Mientras marcas un clip, sus segundos se cuentan en la línea de tiempo y cambian de color al pasar de 59.
- Los desplegables de fundido llevan su nombre: Imagen, Audio y Duración.
- En Mac, al terminar de exportar tienes un botón "Mostrar en Finder" junto a "Compartir…".

### English

- Export only the clips you want: select them with ⇧-click (a range) or ⌘-click (one by one) in the list or on the timeline, and the button exports just those, each with its number in the carousel. With nothing selected, it exports them all.
- With several clips selected, the fades and framing change on all of them at once.
- Cuts remembers your fades, format and folder for the next video, so you don't pick them every time.
- While you mark a clip, its seconds count up on the timeline and change colour past 59.
- The fade menus are labelled: Image, Audio and Length.
- On Mac, when the export finishes there is a Show in Finder button beside Share.

## Novedades de la 1.4

### Español

- Ves el fundido de audio en la línea de tiempo: una línea de volumen sobre la forma de onda baja en cada extremo del clip, con la misma curva que se exporta. En el clip seleccionado, arrastra sus tiradores para alargar o acortar el fundido.
- Fundidos más largos: además de 0,5, 1 y 2 segundos, ahora puedes elegir 3 y 5.

### English

- See the audio fade on the timeline: a volume line over the waveform dips at each end of the clip, with the same curve that gets exported. On the selected clip, drag its handles to lengthen or shorten the fade.
- Longer fades: besides 0.5, 1 and 2 seconds, you can now choose 3 and 5.

## Novedades de la 1.3

### Español

- Las marcas caen en el beat: al marcar con I y O o al arrastrar un borde, Cuts lo lleva al golpe más cercano. Con ⌥ marcas o arrastras justo donde estás.
- S parte en dos el clip que está bajo el cursor, con sus fundidos y su encuadre.
- ⇧⌘E guarda el fotograma actual como imagen, con el mismo formato y encuadre que los clips, para abrir el carrusel con una foto.
- Pulsa ? (o Ayuda › Atajos de teclado) para ver todos los atajos.
- Cuts te avisa de los clips que pasan del 20, que ya no caben en el mismo carrusel.
- En Mac, abre vídeos desde el Finder con "Abrir con", arrastrándolos al icono del Dock o desde Archivo › Abrir recientes.

### English

- Marks land on the beat: when you mark with I and O or drag an edge, Cuts moves it to the nearest kick. Hold ⌥ to mark or drag exactly where you are.
- S splits the clip under the playhead in two, keeping its fades and framing.
- ⇧⌘E saves the current frame as an image, with the same format and framing as the clips, so the carousel can open with a photo.
- Press ? (or Help › Keyboard Shortcuts) to see every shortcut.
- Cuts warns about clips past the 20th, which no longer fit in the same carousel.
- On Mac, open videos from the Finder with Open With, by dragging them onto the Dock icon or from File › Open Recent.

## Novedades de la 1.2.1

### Español

- Si arrastras a Cuts un archivo que no es un vídeo MOV, MP4, M4V, MKV o WebM, ya no intenta abrirlo ni pone en riesgo tus clips: un aviso te dice qué formatos abre.

### English

- Drag a file into Cuts that isn't a MOV, MP4, M4V, MKV or WebM video and it no longer tries to open it or puts your clips at risk: a notice tells you which formats it opens.

## Novedades de la 1.2

### Español

- Reordena el carrusel con el teclado: ⌥↑ y ⌥↓ suben y bajan el clip seleccionado.
- Antes de exportar ves los nombres exactos de los archivos y la carpeta donde se guardarán.
- Puedes seguir marcando clips mientras Cuts lee la sesión para sugerir momentos.
- Si cambias algo durante la exportación, el botón vuelve a ofrecer "Exportar", para no compartir clips desactualizados.
- Si no se puede leer el audio, puedes volver a pedir las sugerencias.
- ⌘O ya no marca el final de un clip con un vídeo abierto: abre otro vídeo, como debe.

### English

- Reorder the carousel from the keyboard: ⌥↑ and ⌥↓ move the selected clip up and down.
- Before exporting, see the exact file names and the folder they will be saved to.
- Keep marking clips while Cuts reads the session to suggest moments.
- If you change something while exporting, the button offers Export again, so you never share outdated clips.
- If the audio cannot be read, you can ask for the suggestions again.
- ⌘O no longer marks a clip end while a video is open: it opens another video, as it should.

En las descargas de la web (no en la App Store), la 1.2 es además la primera que se actualiza sola.

## Novedades de la 1.1

### Español

Cuts recuerda tu trabajo: al volver a abrir un vídeo, sus clips y ajustes siguen donde los dejaste.

- ✦ Sugerir momentos: Cuts encuentra los drops de la sesión (el bajón y la vuelta de la mezcla) y propone hasta 10 clips repartidos por toda la grabación.
- Deshacer y rehacer con ⌘Z y ⇧⌘Z.
- Ajuste fino con el teclado: coma y punto avanzan un fotograma (con Mayúsculas, un segundo), J retrocede 5 segundos, K para y L avanza rápido.
- Escucha el carrusel entero: pulsa ▶ en un clip y se reproducen todos en orden, en bucle.
- Encuadre por clip en 4:5, 1:1 y 9:16: arrastra el recuadro para elegir qué queda en el plano, o encaja el vídeo entero sobre un fondo desenfocado.
- Comparte los clips exportados con Fotos, AirDrop o Mensajes en un clic.
- El progreso de la exportación se ve en el propio botón.
- Con zoom, arrastra la línea de tiempo para moverte adelante y atrás; al elegir un clip en la lista, el vídeo salta a él.
- Borra todos los clips de una vez (y recupéralos con ⌘Z).

### English

Cuts remembers your work: open a video again and its clips and settings are right where you left them.

- ✦ Suggest moments: Cuts finds the drops in your session (the breakdown and the mix coming back) and suggests up to 10 clips spread across the whole recording.
- Undo and redo with ⌘Z and ⇧⌘Z.
- Fine-tune with the keyboard: comma and period step one frame (one second with Shift), J jumps back 5 seconds, K stops and L fast-forwards.
- Hear the whole carousel: press ▶ on a clip and every clip plays in order, on a loop.
- Framing per clip in 4:5, 1:1 and 9:16: drag the frame to choose what stays in shot, or fit the whole video over a blurred background.
- Share exported clips to Photos, AirDrop or Messages in one click.
- Export progress now shows right in the button.
- When zoomed in, drag the timeline to move back and forth; pick a clip in the list and the video jumps to it.
- Delete all clips at once (and bring them back with ⌘Z).
