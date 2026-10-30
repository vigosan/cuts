export const LANGS = ["en", "es"] as const;
export type Lang = (typeof LANGS)[number];

export const SITE_URL = "https://cuts.vicent.io";
export const CONTACT = "hello@vicent.io";
export const REPO = "https://github.com/vigosan/cuts";
export const UPDATED = "2026-10-31";
export const VERSION = "1.6";
export const SCREENSHOTS = ["timeline", "framing", "dark"] as const;
export const DARK_SCREENSHOTS = { timeline: "timeline-dark", framing: "framing-dark", dark: "light" } as const;
export const DROPS_VIDEO = {
  video: "drops.mp4",
  poster: "drops-poster.jpg",
  darkVideo: "drops-dark.mp4",
  darkPoster: "drops-dark-poster.jpg",
} as const;

const RELEASES = "https://github.com/vigosan/cuts-releases/releases/latest/download";
export const DOWNLOADS = {
  mac: `${RELEASES}/Cuts-mac.dmg`,
  windows: `${RELEASES}/Cuts-windows.exe`,
  linux: `${RELEASES}/Cuts-linux.AppImage`,
} as const;
export const BREW = "brew install --cask vigosan/cuts/cuts";

export const FFMPEG_FILES = {
  source: "/ffmpeg/ffmpeg-9.0.2.tar.xz",
  build: "/ffmpeg/BUILD-FFmpeg.txt",
  buildWindows: "/ffmpeg/BUILD-FFmpeg-windows.txt",
  buildLinux: "/ffmpeg/BUILD-FFmpeg-linux.txt",
  license: "/ffmpeg/LICENSE-FFmpeg.txt",
  openh264: "/ffmpeg/LICENSE-OpenH264.txt",
} as const;

export const content = {
  en: {
    lang: "en",
    other: "es",
    switchLabel: "Español",
    theme: { system: "Theme: system", light: "Theme: light", dark: "Theme: dark" },
    consent: {
      text: "May this website use Google Analytics cookies to count visits? The app never tracks you.",
      accept: "Accept",
      decline: "Decline",
    },
    routes: { home: "/", privacy: "/privacy", support: "/support", ffmpeg: "/ffmpeg" },
    meta: {
      title: "Cuts: cut your best moments into clips",
      image: "/og-en.png",
      description:
        "An app for Mac, Windows and Linux to mark the best moments of a long video and export them as short clips, ready for an Instagram carousel.",
    },
    home: {
      tagline: "Cut your best moments into clips",
      intro:
        "Cuts listens to your session, finds the drops and turns them into clips ready for your Instagram carousel.",
      free: "Free",
      requirements: { mac: "macOS 13 or later", windows: "Windows 10 or later", linux: "AppImage x86_64" },
      download: { mac: "Download for Mac", windows: "Download for Windows", linux: "Download for Linux", also: "Also for" },
      brew: "Or with Homebrew:",
      platforms: { mac: "Mac", windows: "Windows", linux: "Linux" },
      version: `Version ${VERSION}`,
      downloads: { one: "download", other: "downloads" },
      dropsTitle: "Let Cuts find the drops",
      dropsText:
        "Press Suggest moments and Cuts listens to the whole session. It spots every breakdown and the moment the track comes back in full, the drop, and picks the strongest ones, spread across the set. Each becomes a clip with the build-up before and the mix after, ready to fine-tune or remove like any other.",
      dropsAlt: "Pressing Suggest moments: Cuts adds ten clips spread across the whole session",
      featuresTitle: "What it does",
      features: [
        {
          title: "Mark",
          items: [
            "Mark clips while you listen with [I] and [O]. Play or pause with [Space].",
            "Every mark and dragged edge lands on the nearest kick. Hold [⌥] (Alt on Windows and Linux) to cut exactly where you are.",
            "Split the clip under the playhead in two with [S].",
            "Clips up to 59 seconds are carousel-ready. Longer ones are allowed for regular posts.",
          ],
        },
        {
          title: "Timeline",
          items: [
            "Video frames and the audio waveform, like in a video editor.",
            "Drag clips and their edges, and zoom in to fine-tune to the second.",
            "While you mark, the clip's seconds count up and change colour past 59.",
          ],
        },
        {
          title: "Fades and format",
          items: [
            "Fades to black or white, and smooth audio fades, per clip.",
            "The audio fade is a volume line on the waveform: drag its handles from half a second to five.",
            "Original, or 4:5, 1:1 and 9:16 at 1080 px: drag the frame to choose the shot, or fit the whole video over a blurred background.",
          ],
        },
        {
          title: "Export",
          items: [
            "Reorder clips by dragging. The order in the list is the order you post.",
            "Export just the clips you pick with [⌘]-click (Ctrl on Windows and Linux), each with its carousel number.",
            "The first clip starts on a real frame, so the cover is never black.",
            "Save the current frame as a photo from the File menu, framed like the clips, to open the carousel.",
            "Cuts remembers your fades, format and folder for the next video.",
            "Reopen your last videos from the start screen, with the clips you marked.",
          ],
        },
      ],
      shortcuts: "Press [?] to see every keyboard shortcut.",
      closingTitle: "Try it on your next session",
      privacyTitle: "Private by design",
      privacy: "Everything happens on your computer. No account, no uploads, no tracking.",
      timelineTitle: "A timeline like a video editor",
      timelineText:
        "Frames and the waveform show where every moment is. The clip you select stays clear, with edges you can drag and its fades drawn at each end.",
      timelineAlt: "Close-up of the timeline: video frames, audio waveform and a selected clip with its edges",
      framingTitle: "Framed for Instagram",
      framingText: "In 4:5, 1:1 or 9:16, drag the frame over the video to choose what stays in shot, clip by clip.",
      framingAlt: "Cuts in 4:5 format with the crop frame over the video",
      darkTitle: "Light or dark",
      darkText: "Cuts follows your system's light or dark appearance.",
      darkAlt: "Cuts in dark mode",
    },
    privacy: {
      title: "Privacy policy",
      updated: `Last updated ${UPDATED}`,
      sections: [
        {
          heading: "The app",
          body: [
            "Cuts does not collect, store or share any personal data. It has no accounts, analytics, advertising or third-party SDKs.",
            "Cuts only connects to the internet to check for new versions: when it opens and every two hours, it asks GitHub, where its releases are published, whether there is a newer one, and downloads it if there is. GitHub receives technical request data, such as your IP address, to answer. The Mac App Store and Microsoft Store versions never do this, as their store updates them.",
            "Your videos never leave your computer. Cuts reads the video you open and writes the exported clips to the folder you choose, by default Cuts inside your Movies or Videos folder.",
            "So you can pick up where you left off, Cuts saves on your computer the clips you mark in each video: their times, order and settings. This stays on your computer, is never sent anywhere, and is deleted when you remove all the clips of a video or uninstall the app.",
            "To remove everything Cuts creates, delete the exported clips and uninstall the app.",
          ],
        },
        {
          heading: "This website",
          body: [
            "This website is hosted on Vercel, which processes technical request data, such as your IP address, to deliver the pages.",
            "If you accept, the website uses Google Analytics, a service of Google Ireland Limited, to count visits and see which pages are read. It sets cookies (_ga and _ga_ followed by an ID) that last up to two years and sends Google data such as the pages you visit, your browser, device and approximate location. Google may process this data outside the European Union under its standard contractual clauses. If you decline, or until you answer, Google Analytics is never loaded.",
            "The website also stores your language, your answer about analytics for six months, and, in your browser only, your light or dark theme.",
            "You can change your answer at any time with Cookies at the bottom of every page, which also deletes the Google Analytics cookies.",
          ],
        },
        {
          heading: "Contact",
          body: [`Questions about privacy: ${CONTACT}.`],
        },
      ],
    },
    support: {
      title: "Support",
      body: [
        `For help, bug reports or feature ideas, write to ${CONTACT}. Please include your system and its version (macOS, Windows or Linux) and, if you can, the file type of the video you were using.`,
        "Clips are saved by default to Cuts › the name of your video, inside your Movies folder on Mac or your Videos folder on Windows and Linux. You can choose another folder from the Folder field before exporting.",
      ],
    },
    ffmpeg: {
      title: "FFmpeg",
      body: [
        "Cuts includes FFmpeg, built from the official source code without any GPL or non-free components, and licensed under the GNU Lesser General Public License version 2.1.",
        "On Linux, Cuts encodes H.264 with OpenH264, built from Cisco's official source code and licensed under the BSD 2-Clause license.",
        "The exact source code and build details used for the app are available here:",
      ],
      links: {
        source: "FFmpeg 9.0.2 source code",
        build: "Build details for Mac",
        buildWindows: "Build details for Windows",
        buildLinux: "Build details for Linux",
        license: "License (LGPL v2.1)",
        openh264: "OpenH264 license (BSD 2-Clause)",
      },
    },
    footer: { privacy: "Privacy", support: "Support", ffmpeg: "FFmpeg", cookies: "Cookies", github: "GitHub", by: "Made by" },
  },
  es: {
    lang: "es",
    other: "en",
    switchLabel: "English",
    theme: { system: "Tema: sistema", light: "Tema: claro", dark: "Tema: oscuro" },
    consent: {
      text: "¿Puede esta web usar cookies de Google Analytics para contar las visitas? La app nunca te rastrea.",
      accept: "Aceptar",
      decline: "Rechazar",
    },
    routes: { home: "/es", privacy: "/es/privacidad", support: "/es/soporte", ffmpeg: "/es/ffmpeg" },
    meta: {
      title: "Cuts: corta tus mejores momentos en clips",
      image: "/og-es.png",
      description:
        "Una app para Mac, Windows y Linux que marca los mejores momentos de un vídeo largo y los exporta como clips cortos, listos para un carrusel de Instagram.",
    },
    home: {
      tagline: "Corta tus mejores momentos en clips",
      intro:
        "Cuts escucha tu sesión, encuentra los subidones y los convierte en clips listos para tu carrusel de Instagram.",
      free: "Gratis",
      requirements: { mac: "macOS 13 o posterior", windows: "Windows 10 o posterior", linux: "AppImage x86_64" },
      download: { mac: "Descargar para Mac", windows: "Descargar para Windows", linux: "Descargar para Linux", also: "También para" },
      brew: "O con Homebrew:",
      platforms: { mac: "Mac", windows: "Windows", linux: "Linux" },
      version: `Versión ${VERSION}`,
      downloads: { one: "descarga", other: "descargas" },
      dropsTitle: "Cuts encuentra los subidones por ti",
      dropsText:
        "Pulsa Sugerir momentos y Cuts escucha la sesión entera. Detecta cada bajón y el momento en que la pista vuelve con toda su fuerza, el drop, y se queda con los más intensos, repartidos por todo el set. Cada uno se convierte en un clip con la subida antes y la mezcla después, listo para retocarlo o quitarlo como cualquier otro.",
      dropsAlt: "Al pulsar Sugerir momentos, Cuts añade diez clips repartidos por toda la sesión",
      featuresTitle: "Qué hace",
      features: [
        {
          title: "Marcar",
          items: [
            "Marca clips mientras escuchas con [I] y [O]. Reproduce o pausa con [Espacio].",
            "Cada marca y cada borde que arrastras cae en el golpe más cercano. Mantén [⌥] (Alt en Windows y Linux) para cortar justo donde estás.",
            "Parte en dos el clip bajo el cursor con [S].",
            "Los clips de hasta 59 segundos valen para carrusel. Los más largos, para publicaciones normales.",
          ],
        },
        {
          title: "Línea de tiempo",
          items: [
            "Fotogramas del vídeo y forma de onda del audio, como en un editor de vídeo.",
            "Arrastra los clips y sus bordes, y haz zoom para afinar al segundo.",
            "Mientras marcas, los segundos del clip se cuentan y cambian de color al pasar de 59.",
          ],
        },
        {
          title: "Fundidos y formato",
          items: [
            "Fundidos a negro o a blanco, y fundidos de audio suaves, en cada clip.",
            "El fundido de audio es una línea de volumen sobre la onda: arrastra sus tiradores de medio segundo a cinco.",
            "Original, o 4:5, 1:1 y 9:16 a 1080 px: arrastra el recuadro para elegir el plano, o encaja el vídeo entero sobre un fondo desenfocado.",
          ],
        },
        {
          title: "Exportar",
          items: [
            "Ordena los clips arrastrándolos. El orden de la lista es el orden en que publicas.",
            "Exporta solo los clips que elijas con [⌘]-clic (Ctrl en Windows y Linux), cada uno con su número del carrusel.",
            "El primer clip empieza con imagen, así la portada nunca sale negra.",
            "Guarda el fotograma actual como foto desde el menú Archivo, con el mismo encuadre, para abrir el carrusel.",
            "Cuts recuerda tus fundidos, formato y carpeta para el siguiente vídeo.",
            "Vuelve a abrir tus últimos vídeos desde la pantalla de inicio, con los clips que marcaste.",
          ],
        },
      ],
      shortcuts: "Pulsa [?] para ver todos los atajos de teclado.",
      closingTitle: "Pruébala con tu próxima sesión",
      privacyTitle: "Privada por diseño",
      privacy: "Todo ocurre en tu ordenador. Sin cuentas, sin subidas, sin rastreo.",
      timelineTitle: "Una línea de tiempo como la de un editor de vídeo",
      timelineText:
        "Los fotogramas y la forma de onda te enseñan dónde está cada momento. El clip que seleccionas se ve limpio, con bordes que puedes arrastrar y sus fundidos dibujados en cada extremo.",
      timelineAlt: "Detalle de la línea de tiempo: fotogramas, forma de onda y un clip seleccionado con sus bordes",
      framingTitle: "Encuadrado para Instagram",
      framingText: "En 4:5, 1:1 o 9:16, arrastra el recuadro sobre el vídeo para elegir qué queda en el plano, clip a clip.",
      framingAlt: "Cuts en formato 4:5 con el recuadro de recorte sobre el vídeo",
      darkTitle: "Claro u oscuro",
      darkText: "Cuts sigue la apariencia clara u oscura de tu sistema.",
      darkAlt: "Cuts en modo oscuro",
    },
    privacy: {
      title: "Política de privacidad",
      updated: `Última actualización: ${UPDATED}`,
      sections: [
        {
          heading: "La app",
          body: [
            "Cuts no recopila, guarda ni comparte ningún dato personal. No tiene cuentas, analítica, publicidad ni SDK de terceros.",
            "Cuts solo se conecta a internet para buscar nuevas versiones: al abrirse y cada dos horas pregunta a GitHub, donde se publican sus versiones, si hay una más reciente y, si la hay, la descarga. GitHub recibe datos técnicos de la petición, como tu dirección IP, para responder. Las versiones de la Mac App Store y de Microsoft Store nunca lo hacen, porque las actualiza su tienda.",
            "Tus vídeos nunca salen de tu ordenador. Cuts lee el vídeo que abres y guarda los clips en la carpeta que elijas, por defecto Cuts dentro de tu carpeta Películas o Vídeos.",
            "Para que puedas seguir donde lo dejaste, Cuts guarda en tu ordenador los clips que marcas en cada vídeo: sus tiempos, su orden y sus ajustes. Esto se queda en tu ordenador, nunca se envía a ningún sitio y se borra cuando eliminas todos los clips de un vídeo o desinstalas la app.",
            "Para borrar todo lo que crea Cuts, elimina los clips exportados y desinstala la app.",
          ],
        },
        {
          heading: "Esta web",
          body: [
            "Esta web está alojada en Vercel, que procesa datos técnicos de las peticiones, como tu dirección IP, para servir las páginas.",
            "Si aceptas, la web usa Google Analytics, un servicio de Google Ireland Limited, para contar las visitas y ver qué páginas se leen. Guarda cookies (_ga y _ga_ seguida de un identificador) que duran hasta dos años y envía a Google datos como las páginas que visitas, tu navegador, tu dispositivo y tu ubicación aproximada. Google puede tratar estos datos fuera de la Unión Europea con sus cláusulas contractuales tipo. Si rechazas, o mientras no respondas, Google Analytics nunca se carga.",
            "La web también guarda tu idioma, tu respuesta sobre la analítica durante seis meses y, solo en tu navegador, el tema claro u oscuro.",
            "Puedes cambiar tu respuesta cuando quieras con Cookies, al pie de cada página, que además borra las cookies de Google Analytics.",
          ],
        },
        {
          heading: "Contacto",
          body: [`Dudas sobre privacidad: ${CONTACT}.`],
        },
      ],
    },
    support: {
      title: "Soporte",
      body: [
        `Para ayuda, errores o ideas, escribe a ${CONTACT}. Indica tu sistema y su versión (macOS, Windows o Linux) y, si puedes, el tipo de archivo del vídeo que usabas.`,
        "Los clips se guardan por defecto en Cuts › el nombre de tu vídeo, dentro de tu carpeta Películas en Mac o Vídeos en Windows y Linux. Puedes elegir otra carpeta en el campo Carpeta antes de exportar.",
      ],
    },
    ffmpeg: {
      title: "FFmpeg",
      body: [
        "Cuts incluye FFmpeg, compilado desde el código oficial sin componentes GPL ni non-free, con licencia GNU Lesser General Public License versión 2.1.",
        "En Linux, Cuts codifica H.264 con OpenH264, compilado desde el código oficial de Cisco, con licencia BSD 2-Clause.",
        "El código fuente exacto y los detalles de compilación que usa la app están aquí:",
      ],
      links: {
        source: "Código fuente de FFmpeg 9.0.2",
        build: "Detalles de compilación para Mac",
        buildWindows: "Detalles de compilación para Windows",
        buildLinux: "Detalles de compilación para Linux",
        license: "Licencia (LGPL v2.1)",
        openh264: "Licencia de OpenH264 (BSD 2-Clause)",
      },
    },
    footer: { privacy: "Privacidad", support: "Soporte", ffmpeg: "FFmpeg", cookies: "Cookies", github: "GitHub", by: "Hecho por" },
  },
} as const;

export type Content = (typeof content)[Lang];
