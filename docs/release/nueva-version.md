# Cómo publicar una nueva versión de Cuts

Guía para la 1.1 y las siguientes. Parte de lo que funcionó con la 1.0.0 (`mac-app-store.md`).

## Antes de empezar

- La versión anterior tiene que estar aprobada o retirada de revisión: App Store Connect no deja enviar otra mientras una está "Waiting for Review" o "In Review".
- Los certificados Apple Distribution y 3rd Party Mac Developer Installer siguen en el llavero (`security find-identity -v -p codesigning` muestra el primero).
- El perfil `build/embedded.provisionprofile` no ha caducado (duran un año). Para verlo: `security cms -D -i build/embedded.provisionprofile | grep -A1 ExpirationDate`. Si caducó, descarga uno nuevo en developer.apple.com › Profiles con el mismo nombre de archivo.

## 1. Preparar el código

1. Sin cambios pendientes: `git status` limpio y en `master`.
2. Tests y tipos: `make test` y `make typecheck`.
3. Subir el número de versión en `package.json` (`"version": "1.1.0"`) y hacer commit (`Set version 1.1.0`).

El número de compilación (`CFBundleVersion`) sale de esa misma versión. Si hay que volver a subir la misma versión (por ejemplo, tras un rechazo), Apple exige un número de compilación mayor: `npx electron-builder --mac mas --universal -c.buildVersion=1.1.0.1` después de `make mas`, o cambia la versión a `1.1.1`.

## 2. Construir y subir

1. `APPLE_TEAM_ID=TKAZA7ZPZ2 make mas`
2. Resultado: `dist/mas-universal/Cuts-1.1.0-universal.pkg`.
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
- Web: la portada ya describe el encuadre por clip, que llega con la 1.1. Añade lo nuevo si quieres (`web/content.ts`) y sube los cambios; Vercel despliega solo. Comprueba con `vercel ls cuts --scope vigosans-projects`, sin recargar el dominio en bucle.
- Etiqueta en git: `git tag v1.1.0 && git push origin v1.1.0`.

## Novedades de la 1.1

### Español

Cuts recuerda tu trabajo: al volver a abrir un vídeo, sus clips y ajustes siguen donde los dejaste.

- Deshacer y rehacer con ⌘Z y ⇧⌘Z.
- Ajuste fino con el teclado: coma y punto avanzan un fotograma (con Mayúsculas, un segundo), J retrocede 5 segundos, K para y L avanza rápido.
- Escucha el carrusel entero: pulsa ▶ en un clip y se reproducen todos en orden, en bucle.
- Encuadre por clip en 4:5, 1:1 y 9:16: arrastra el recuadro para elegir qué queda en el plano, o encaja el vídeo entero sobre un fondo desenfocado.
- Comparte los clips exportados con Fotos, AirDrop o Mensajes en un clic.
- El progreso de la exportación se ve en el propio botón.

### English

Cuts remembers your work: open a video again and its clips and settings are right where you left them.

- Undo and redo with ⌘Z and ⇧⌘Z.
- Fine-tune with the keyboard: comma and period step one frame (one second with Shift), J jumps back 5 seconds, K stops and L fast-forwards.
- Hear the whole carousel: press ▶ on a clip and every clip plays in order, on a loop.
- Framing per clip in 4:5, 1:1 and 9:16: drag the frame to choose what stays in shot, or fit the whole video over a blurred background.
- Share exported clips to Photos, AirDrop or Messages in one click.
- Export progress now shows right in the button.
