export const LANGS = ["en", "es"] as const;
export type Lang = (typeof LANGS)[number];

export const SITE_URL = "https://cuts.vicent.io";
export const CONTACT = "hello@vicent.io";
export const UPDATED = "2026-10-24";
export const SCREENSHOTS = ["overview", "timeline"] as const;

export const content = {
  en: {
    lang: "en",
    other: "es",
    switchLabel: "Español",
    routes: { home: "/", privacy: "/privacy", support: "/support", ffmpeg: "/ffmpeg" },
    meta: {
      title: "Cuts — cut your best moments into clips",
      description:
        "A Mac app to mark the best moments of a long video and export them as short clips, ready for an Instagram carousel.",
    },
    home: {
      tagline: "Cut your best moments into clips",
      intro:
        "Cuts turns a long recording into short clips, ready to post. Drop in a video, listen, and mark where each clip starts and ends. Cuts exports them all at once, numbered in carousel order.",
      availability: "Coming soon to the Mac App Store.",
      featuresTitle: "What it does",
      features: [
        "Mark clips while you listen, with I and O, and play or pause with Space.",
        "See the video frames and the audio waveform along the timeline, like in a video editor.",
        "Drag clips and their edges on the timeline, and zoom in to fine-tune to the second.",
        "Clips up to 59 seconds are carousel-ready. Longer ones are allowed for regular posts.",
        "Fades to black or white, and smooth audio fades, set per clip.",
        "Original size, or 4:5, 1:1 and 9:16 at 1080 px: drag the frame to choose what stays in shot, or fit the whole video over a blurred background.",
        "The first clip starts on a real frame, so the carousel cover is never black.",
        "Reorder clips by dragging. The order in the list is the order you post.",
      ],
      privacyTitle: "Private by design",
      privacy: "Everything happens on your Mac. No account, no uploads, no tracking.",
      screenshotAlt: "Cuts with a long video, six clips marked and one selected",
      timelineTitle: "A timeline like a video editor",
      timelineText:
        "Frames and the waveform show where every moment is. The clip you select stays clear, with edges you can drag and its fades drawn at each end.",
      timelineAlt: "Close-up of the timeline: video frames, audio waveform and a selected clip with its edges",
    },
    privacy: {
      title: "Privacy policy",
      updated: `Last updated ${UPDATED}`,
      sections: [
        {
          heading: "The app",
          body: [
            "Cuts does not collect, store or share any personal data. It has no accounts, analytics, advertising or third-party SDKs, and it does not connect to the internet.",
            "Your videos never leave your Mac. Cuts reads the video you open and writes the exported clips to the folder you choose, by default Movies › Cuts. It keeps no history of what you open or export.",
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
        `For help, bug reports or feature ideas, write to ${CONTACT}. Please include your macOS version and, if you can, the file type of the video you were using.`,
        "Clips are saved by default to Movies › Cuts › the name of your video. You can choose another folder from the Folder field before exporting.",
      ],
    },
    ffmpeg: {
      title: "FFmpeg",
      body: [
        "Cuts includes FFmpeg, built from the official source code without any GPL or non-free components, and licensed under the GNU Lesser General Public License version 2.1.",
        "The exact source code and build details used for the app are available here:",
      ],
      links: { source: "FFmpeg 9.0.2 source code", build: "Build details", license: "License (LGPL v2.1)" },
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
        "Una app para Mac que marca los mejores momentos de un vídeo largo y los exporta como clips cortos, listos para un carrusel de Instagram.",
    },
    home: {
      tagline: "Corta tus mejores momentos en clips",
      intro:
        "Cuts convierte una grabación larga en clips cortos, listos para publicar. Arrastra un vídeo, escúchalo y marca dónde empieza y acaba cada clip. Cuts los exporta todos de una vez, numerados en el orden del carrusel.",
      availability: "Muy pronto en la Mac App Store.",
      featuresTitle: "Qué hace",
      features: [
        "Marca clips mientras escuchas, con I y O, y reproduce o pausa con la barra espaciadora.",
        "Ve los fotogramas del vídeo y la forma de onda del audio en la línea de tiempo, como en un editor de vídeo.",
        "Arrastra los clips y sus bordes en la línea de tiempo, y haz zoom para afinar al segundo.",
        "Los clips de hasta 59 segundos valen para carrusel. Los más largos se permiten para publicaciones normales.",
        "Fundidos a negro o a blanco, y fundidos de audio suaves, en cada clip.",
        "Tamaño original, o 4:5, 1:1 y 9:16 a 1080 px: arrastra el recuadro para elegir qué queda en el plano, o encaja el vídeo entero sobre un fondo desenfocado.",
        "El primer clip empieza con imagen, así la portada del carrusel nunca sale negra.",
        "Ordena los clips arrastrándolos. El orden de la lista es el orden en que publicas.",
      ],
      privacyTitle: "Privada por diseño",
      privacy: "Todo ocurre en tu Mac. Sin cuentas, sin subidas, sin rastreo.",
      screenshotAlt: "Cuts con un vídeo largo, seis clips marcados y uno seleccionado",
      timelineTitle: "Una línea de tiempo como la de un editor de vídeo",
      timelineText:
        "Los fotogramas y la forma de onda te enseñan dónde está cada momento. El clip que seleccionas se ve limpio, con bordes que puedes arrastrar y sus fundidos dibujados en cada extremo.",
      timelineAlt: "Detalle de la línea de tiempo: fotogramas, forma de onda y un clip seleccionado con sus bordes",
    },
    privacy: {
      title: "Política de privacidad",
      updated: `Última actualización: ${UPDATED}`,
      sections: [
        {
          heading: "La app",
          body: [
            "Cuts no recopila, guarda ni comparte ningún dato personal. No tiene cuentas, analítica, publicidad ni SDK de terceros, y no se conecta a internet.",
            "Tus vídeos nunca salen de tu Mac. Cuts lee el vídeo que abres y guarda los clips en la carpeta que elijas, por defecto Películas › Cuts. No guarda historial de lo que abres ni de lo que exportas.",
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
        `Para ayuda, errores o ideas, escribe a ${CONTACT}. Indica tu versión de macOS y, si puedes, el tipo de archivo del vídeo que usabas.`,
        "Los clips se guardan por defecto en Películas › Cuts › el nombre de tu vídeo. Puedes elegir otra carpeta en el campo Carpeta antes de exportar.",
      ],
    },
    ffmpeg: {
      title: "FFmpeg",
      body: [
        "Cuts incluye FFmpeg, compilado desde el código oficial sin componentes GPL ni non-free, con licencia GNU Lesser General Public License versión 2.1.",
        "El código fuente exacto y los detalles de compilación que usa la app están aquí:",
      ],
      links: { source: "Código fuente de FFmpeg 9.0.2", build: "Detalles de compilación", license: "Licencia (LGPL v2.1)" },
    },
    footer: { privacy: "Privacidad", support: "Soporte", ffmpeg: "FFmpeg", by: "Hecho por" },
  },
} as const;

export type Content = (typeof content)[Lang];
