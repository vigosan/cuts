import type { AudioFade, VideoFade } from './fades'
import type { OutputFormat } from './formats'

export type Locale = 'en' | 'es'

export const SUPPORTED_LOCALES: Locale[] = ['en', 'es']
export const FALLBACK_LOCALE: Locale = 'en'

export function resolveLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const language = tag.toLowerCase().split(/[-_]/)[0]
    const match = SUPPORTED_LOCALES.find((locale) => locale === language)
    if (match) return match
  }
  return FALLBACK_LOCALE
}

const isOne = (locale: Locale, n: number) => new Intl.PluralRules(locale).select(n) === 'one'
const decimal = (locale: Locale, n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n)

function english(locale: Locale) {
  return {
    replaceVideoConfirm: 'Open another video? Your marked clips will be lost.',
    dropTitle: 'Drop a video here',
    dropSubtitle: 'Mark the best moments and export them as clips.',
    chooseVideo: 'Choose video…',
    videoUnplayable: 'This video can’t be played.',
    play: 'Play (Space)',
    pause: 'Pause (Space)',
    markStart: 'Start',
    markStartHint: 'Mark start',
    markEnd: 'End',
    markEndHint: 'Mark end',
    pendingSince: (time: string) => `Clip in progress since ${time}`,
    zoomGroup: 'Timeline zoom',
    zoomAll: 'All',
    timelineHelp: 'Click to jump · drag a clip or its edges to adjust it · ← → skip 5 s',
    carousel: 'Carousel',
    noClips: 'Mark a start and an end to add clips',
    reorderHint: 'Drag to reorder',
    cover: 'Carousel cover',
    moveStartTo: (time: string) => `Move the start to ${time}`,
    moveEndTo: (time: string) => `Move the end to ${time}`,
    overLimit: (seconds: number) => `Longer than ${seconds} s: too long for a carousel`,
    playClip: 'Play clip',
    deleteClip: 'Delete clip',
    fadeToBlack: 'Fade to black',
    fadeToWhite: 'Fade to white',
    imageFade: 'Image fade',
    audioFade: 'Audio fade',
    fadeLength: 'Fade length',
    fadeSeconds: (seconds: number) => `${decimal(locale, seconds)} s`,
    videoFades: { black: 'Black', white: 'White', none: 'None' } satisfies Record<VideoFade, string>,
    audioFades: { natural: 'Natural', linear: 'Linear', none: 'None' } satisfies Record<AudioFade, string>,
    formats: {
      original: 'Original',
      '4:5': '4:5 portrait · 1080×1350',
      '1:1': '1:1 square · 1080×1080',
      '9:16': '9:16 reels · 1080×1920'
    } satisfies Record<OutputFormat, string>,
    name: 'Name',
    fileNamePlaceholder: 'File name',
    folder: 'Folder',
    chooseFolder: 'Choose destination folder',
    choose: 'Choose…',
    format: 'Format',
    exportClips: (n: number) => (isOne(locale, n) ? `Export ${n} clip` : `Export ${n} clips`),
    exporting: 'Exporting…',
    exportedClips: (n: number) => (isOne(locale, n) ? `${n} clip exported` : `${n} clips exported`),
    showInFinder: 'Show in Finder',
    videoFilter: 'Video',
    overwriteMessage: 'These files already exist in the folder:',
    overwrite: 'Replace',
    cancel: 'Cancel',
    ffmpegMissing: 'FFmpeg is missing from the app. Reinstall Cuts to fix it.',
    exportCancelled: 'Export cancelled.',
    clipFailed: (n: number, reason: string) => `Clip ${n} failed: ${reason}`,
    folderFailed: (reason: string) => `Couldn’t create the destination folder: ${reason}`,
    menuAbout: (app: string) => `About ${app}`,
    menuServices: 'Services',
    menuHide: (app: string) => `Hide ${app}`,
    menuHideOthers: 'Hide Others',
    menuShowAll: 'Show All',
    menuQuit: (app: string) => `Quit ${app}`,
    menuFile: 'File',
    menuOpenVideo: 'Open Video…',
    menuEdit: 'Edit',
    menuUndo: 'Undo',
    menuRedo: 'Redo',
    menuCut: 'Cut',
    menuCopy: 'Copy',
    menuPaste: 'Paste',
    menuSelectAll: 'Select All',
    menuWindow: 'Window',
    menuMinimize: 'Minimize',
    menuZoom: 'Zoom',
    menuClose: 'Close Window',
    menuHelp: 'Help',
    menuPrivacy: 'Privacy Policy',
    menuSupport: 'Cuts Support',
    privacyUrl: 'https://cuts.vicent.io/privacy',
    supportUrl: 'https://cuts.vicent.io/support',
    aboutCredits:
      'Uses FFmpeg (ffmpeg.org), licensed under the GNU LGPL v2.1. The license and build details are included in the app bundle.'
  }
}

export type Messages = ReturnType<typeof english>

function spanish(locale: Locale): Messages {
  return {
    replaceVideoConfirm: '¿Abrir otro vídeo? Se perderán los clips marcados.',
    dropTitle: 'Arrastra aquí un vídeo',
    dropSubtitle: 'Marca los mejores momentos y expórtalos como clips.',
    chooseVideo: 'Elegir vídeo…',
    videoUnplayable: 'No se puede reproducir este vídeo.',
    play: 'Reproducir (espacio)',
    pause: 'Pausar (espacio)',
    markStart: 'Inicio',
    markStartHint: 'Marcar inicio',
    markEnd: 'Fin',
    markEndHint: 'Marcar fin',
    pendingSince: (time) => `Clip en curso desde ${time}`,
    zoomGroup: 'Zoom de la línea de tiempo',
    zoomAll: 'Todo',
    timelineHelp: 'Clic para ir a un punto · arrastra un clip o sus bordes para ajustarlo · ← → saltan 5 s',
    carousel: 'Carrusel',
    noClips: 'Marca inicio y fin para añadir clips',
    reorderHint: 'Arrastra para cambiar el orden',
    cover: 'Portada del carrusel',
    moveStartTo: (time) => `Mover el inicio a ${time}`,
    moveEndTo: (time) => `Mover el final a ${time}`,
    overLimit: (seconds) => `Más de ${seconds} s: no vale para carrusel`,
    playClip: 'Escuchar',
    deleteClip: 'Borrar',
    fadeToBlack: 'Fundido a negro',
    fadeToWhite: 'Fundido a blanco',
    imageFade: 'Fundido de imagen',
    audioFade: 'Fundido de audio',
    fadeLength: 'Duración del fundido',
    fadeSeconds: (seconds) => `${decimal(locale, seconds)} s`,
    videoFades: { black: 'Negro', white: 'Blanco', none: 'Ninguno' },
    audioFades: { natural: 'Natural', linear: 'Lineal', none: 'Ninguno' },
    formats: {
      original: 'Original',
      '4:5': '4:5 vertical · 1080×1350',
      '1:1': '1:1 cuadrado · 1080×1080',
      '9:16': '9:16 reels · 1080×1920'
    },
    name: 'Nombre',
    fileNamePlaceholder: 'Nombre de los archivos',
    folder: 'Carpeta',
    chooseFolder: 'Elegir carpeta de destino',
    choose: 'Elegir…',
    format: 'Formato',
    exportClips: (n) => (isOne(locale, n) ? `Exportar ${n} clip` : `Exportar ${n} clips`),
    exporting: 'Exportando…',
    exportedClips: (n) => (isOne(locale, n) ? `${n} clip exportado` : `${n} clips exportados`),
    showInFinder: 'Mostrar en Finder',
    videoFilter: 'Vídeo',
    overwriteMessage: 'Ya existen estos archivos en la carpeta:',
    overwrite: 'Sobrescribir',
    cancel: 'Cancelar',
    ffmpegMissing: 'Falta FFmpeg dentro de la app. Reinstala Cuts para solucionarlo.',
    exportCancelled: 'Exportación cancelada.',
    clipFailed: (n, reason) => `Falló el clip ${n}: ${reason}`,
    folderFailed: (reason) => `No se pudo crear la carpeta de destino: ${reason}`,
    menuAbout: (app) => `Acerca de ${app}`,
    menuServices: 'Servicios',
    menuHide: (app) => `Ocultar ${app}`,
    menuHideOthers: 'Ocultar otros',
    menuShowAll: 'Mostrar todo',
    menuQuit: (app) => `Salir de ${app}`,
    menuFile: 'Archivo',
    menuOpenVideo: 'Abrir vídeo…',
    menuEdit: 'Edición',
    menuUndo: 'Deshacer',
    menuRedo: 'Rehacer',
    menuCut: 'Cortar',
    menuCopy: 'Copiar',
    menuPaste: 'Pegar',
    menuSelectAll: 'Seleccionar todo',
    menuWindow: 'Ventana',
    menuMinimize: 'Minimizar',
    menuZoom: 'Zoom',
    menuClose: 'Cerrar ventana',
    menuHelp: 'Ayuda',
    menuPrivacy: 'Política de privacidad',
    menuSupport: 'Soporte de Cuts',
    privacyUrl: 'https://cuts.vicent.io/es/privacidad',
    supportUrl: 'https://cuts.vicent.io/es/soporte',
    aboutCredits:
      'Usa FFmpeg (ffmpeg.org), con licencia GNU LGPL v2.1. La licencia y los detalles de compilación se incluyen en el paquete de la app.'
  }
}

const builders: Record<Locale, (locale: Locale) => Messages> = { en: english, es: spanish }

export function messagesFor(locale: Locale): Messages {
  return builders[locale](locale)
}
