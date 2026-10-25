export const LANGS = ["en", "es"] as const;
export type Lang = (typeof LANGS)[number];

export const SITE_URL = "https://cuts.vicent.io";
export const CONTACT = "hello@vicent.io";
export const UPDATED = "2026-10-25";
export const VERSION = "1.0";
export const SCREENSHOTS = ["overview", "drops", "timeline", "framing", "dark"] as const;
export const DARK_SCREENSHOTS = { overview: "overview-dark", drops: "drops-dark", dark: "light" } as const;

const RELEASES = "https://github.com/vigosan/cuts-releases/releases/latest/download";
export const DOWNLOADS = {
  mac: `${RELEASES}/Cuts-mac.dmg`,
  windows: `${RELEASES}/Cuts-windows.exe`,
  linux: `${RELEASES}/Cuts-linux.AppImage`,
} as const;

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
    routes: { home: "/", privacy: "/privacy", support: "/support", ffmpeg: "/ffmpeg" },
    meta: {
      title: "Cuts — cut your best moments into clips",
      description:
        "An app for Mac, Windows and Linux to mark the best moments of a long video and export them as short clips, ready for an Instagram carousel.",
    },
    home: {
      tagline: "Cut your best moments into clips",
      intro:
        "Cuts listens to your session, finds the drops and turns them into clips ready for your carousel. Fine-tune them, frame them for Instagram and export them all at once, numbered in order.",
      free: "Free",
      requirements: { mac: "macOS 13 or later", windows: "Windows 10 or later", linux: "AppImage x86_64" },
      download: { mac: "Download for Mac", windows: "Download for Windows", linux: "Download for Linux", also: "Also for" },
      platforms: { mac: "Mac", windows: "Windows", linux: "Linux" },
      version: `Version ${VERSION}`,
      dropsTitle: "Let Cuts find the drops",
      dropsText:
        "Press Suggest moments and Cuts listens to the whole session. It spots every breakdown and the moment the track comes back in full, the drop, and picks the strongest ones, spread across the set. Each becomes a clip with the build-up before and the mix after, ready to fine-tune or remove like any other.",
      dropsAlt: "The timeline of a full session with the ten moments Cuts suggested, spread across the set",
      featuresTitle: "What it does",
      features: [
        "Mark clips while you listen, with [I] and [O], and play or pause with [Space].",
        "See the video frames and the audio waveform along the timeline, like in a video editor.",
        "Drag clips and their edges on the timeline, and zoom in to fine-tune to the second.",
        "Clips up to 59 seconds are carousel-ready. Longer ones are allowed for regular posts.",
        "Fades to black or white, and smooth audio fades, set per clip.",
        "Original size, or 4:5, 1:1 and 9:16 at 1080 px: drag the frame to choose what stays in shot, or fit the whole video over a blurred background.",
        "The first clip starts on a real frame, so the carousel cover is never black.",
        "Reorder clips by dragging. The order in the list is the order you post.",
      ],
      privacyTitle: "Private by design",
      privacy: "Everything happens on your computer. No account, no uploads, no tracking.",
      screenshotAlt: "Cuts with a long video, six clips marked and one selected",
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
            "Cuts does not collect, store or share any personal data. It has no accounts, analytics, advertising or third-party SDKs, and it does not connect to the internet.",
            "Your videos never leave your computer. Cuts reads the video you open and writes the exported clips to the folder you choose, by default Cuts inside your Movies or Videos folder.",
            "So you can pick up where you left off, Cuts saves on your computer the clips you mark in each video: their times, order and settings. This stays on your computer, is never sent anywhere, and is deleted when you remove all the clips of a video or uninstall the app.",
            "To remove everything Cuts creates, delete the exported clips and uninstall the app.",
          ],
        },
        {
          heading: "This website",
          body: [
            "This website uses no cookies and no analytics. It is hosted on Vercel, which processes technical request data, such as your IP address, to deliver the pages.",
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
    footer: { privacy: "Privacy", support: "Support", ffmpeg: "FFmpeg", by: "Made by" },
  },
  es: {
    lang: "es",
    other: "en",
    switchLabel: "English",
    routes: { home: "/es", privacy: "/es/privacidad", support: "/es/soporte", ffmpeg: "/es/ffmpeg" },
    meta: {
      title: "Cuts — corta tus mejores momentos en clips",
      description:
        "Una app para Mac, Windows y Linux que marca los mejores momentos de un vídeo largo y los exporta como clips cortos, listos para un carrusel de Instagram.",
    },
    home: {
      tagline: "Corta tus mejores momentos en clips",
      intro:
        "Cuts escucha tu sesión, encuentra los subidones y los convierte en clips listos para el carrusel. Retócalos, encuádralos para Instagram y expórtalos todos de una vez, numerados en orden.",
      free: "Gratis",
      requirements: { mac: "macOS 13 o posterior", windows: "Windows 10 o posterior", linux: "AppImage x86_64" },
      download: { mac: "Descargar para Mac", windows: "Descargar para Windows", linux: "Descargar para Linux", also: "También para" },
      platforms: { mac: "Mac", windows: "Windows", linux: "Linux" },
      version: `Versión ${VERSION}`,
      dropsTitle: "Cuts encuentra los subidones por ti",
      dropsText:
        "Pulsa Sugerir momentos y Cuts escucha la sesión entera. Detecta cada bajón y el momento en que la pista vuelve con toda su fuerza, el drop, y se queda con los más intensos, repartidos por todo el set. Cada uno se convierte en un clip con la subida antes y la mezcla después, listo para retocarlo o quitarlo como cualquier otro.",
      dropsAlt: "La línea de tiempo de una sesión entera con los diez momentos que sugirió Cuts, repartidos por todo el set",
      featuresTitle: "Qué hace",
      features: [
        "Marca clips mientras escuchas, con [I] y [O], y reproduce o pausa con [Espacio].",
        "Ve los fotogramas del vídeo y la forma de onda del audio en la línea de tiempo, como en un editor de vídeo.",
        "Arrastra los clips y sus bordes en la línea de tiempo, y haz zoom para afinar al segundo.",
        "Los clips de hasta 59 segundos valen para carrusel. Los más largos se permiten para publicaciones normales.",
        "Fundidos a negro o a blanco, y fundidos de audio suaves, en cada clip.",
        "Tamaño original, o 4:5, 1:1 y 9:16 a 1080 px: arrastra el recuadro para elegir qué queda en el plano, o encaja el vídeo entero sobre un fondo desenfocado.",
        "El primer clip empieza con imagen, así la portada del carrusel nunca sale negra.",
        "Ordena los clips arrastrándolos. El orden de la lista es el orden en que publicas.",
      ],
      privacyTitle: "Privada por diseño",
      privacy: "Todo ocurre en tu ordenador. Sin cuentas, sin subidas, sin rastreo.",
      screenshotAlt: "Cuts con un vídeo largo, seis clips marcados y uno seleccionado",
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
            "Cuts no recopila, guarda ni comparte ningún dato personal. No tiene cuentas, analítica, publicidad ni SDK de terceros, y no se conecta a internet.",
            "Tus vídeos nunca salen de tu ordenador. Cuts lee el vídeo que abres y guarda los clips en la carpeta que elijas, por defecto Cuts dentro de tu carpeta Películas o Vídeos.",
            "Para que puedas seguir donde lo dejaste, Cuts guarda en tu ordenador los clips que marcas en cada vídeo: sus tiempos, su orden y sus ajustes. Esto se queda en tu ordenador, nunca se envía a ningún sitio y se borra cuando eliminas todos los clips de un vídeo o desinstalas la app.",
            "Para borrar todo lo que crea Cuts, elimina los clips exportados y desinstala la app.",
          ],
        },
        {
          heading: "Esta web",
          body: [
            "Esta web no usa cookies ni analítica. Está alojada en Vercel, que procesa datos técnicos de las peticiones, como tu dirección IP, para servir las páginas.",
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
    footer: { privacy: "Privacidad", support: "Soporte", ffmpeg: "FFmpeg", by: "Hecho por" },
  },
} as const;

export type Content = (typeof content)[Lang];
