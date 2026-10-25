# Privacidad de Cuts

Inventario hecho a partir del código (`src/`), las dependencias (`package.json`) y las pruebas del 2026-10-24.

## Hechos comprobados

- **Datos recopilados:** ninguno. La app no tiene cuentas, formularios, analítica, telemetría, publicidad ni informes de errores. El `crashReporter` de Electron está desactivado en la build MAS y el código no lo usa.
- **Red:** el código no hace ninguna petición. La política de contenido de la ventana (`src/renderer/index.html`) solo permite recursos propios (`'self'`, `data:` para imágenes y `media:` para el vídeo local). Las únicas dependencias de ejecución son `react` y `react-dom`, que no hacen peticiones.
- **Procesamiento local:** el vídeo se reproduce leyéndolo del disco y los clips se generan con el FFmpeg incluido en la app. Nada sale del Mac.
- **Archivos a los que accede:**
  - el vídeo que el usuario elige o arrastra, solo para leerlo;
  - la carpeta de destino: por defecto `~/Movies/Cuts/<nombre del vídeo>/`, o la que el usuario elija;
  - vídeos dentro de `~/Movies`, solo si el usuario los abre.
- **Lo que guarda la app:** los clips exportados, en la carpeta indicada, y (desde la versión 1.1) el trabajo de cada vídeo para poder retomarlo: tiempos, orden y ajustes de sus clips, en un JSON por vídeo dentro del contenedor de la app (`~/Library/Containers/com.vigosan.cuts/Data/Library/Application Support/Cuts/sessions`). El archivo se borra al eliminar todos los clips de ese vídeo, y macOS borra el contenedor al desinstalar. Electron también crea ahí su caché.
- **Cómo borrarlo:** borrando los clips exportados y desinstalando la app.

## Pendiente de decidir o completar por el propietario

- **Declaración en App Store Connect.** Con lo anterior, la respuesta coherente es "Data Not Collected" (no se recopilan datos). Confírmala tú: es una declaración legal.
- **Política de privacidad.** La exigen las normas para todas las apps (5.1.1(i)), con enlace en App Store Connect y dentro de la app. Contenido que debería cubrir, basado en los hechos de arriba:
  - que no se recopilan, transmiten ni comparten datos personales;
  - que los vídeos se procesan solo en el Mac del usuario;
  - qué archivos lee y escribe la app y dónde;
  - que no hay terceros (analítica, publicidad ni SDK);
  - cómo borrar los datos (clips y desinstalación);
  - el contacto del responsable (lo aporta el propietario).
- **URL de soporte:** la aporta el propietario.

No hay textos legales redactados en este repositorio: deben escribirlos o revisarlos el propietario o su asesor.
