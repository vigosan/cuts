# Cuts para iPhone en TestFlight

Cuts para iPhone usa la misma ficha de la App Store que la versión de Mac (`com.vigosan.cuts`, compra universal). El identificador ya está registrado como `UNIVERSAL`.

## Antes de la primera subida

1. Comprueba que existe la clave de la API en `~/.appstoreconnect/private_keys/AuthKey_PN375CPCF7.p8`. Si no está, recupérala de 1Password:

   ```sh
   op read --out-file ~/.appstoreconnect/private_keys/AuthKey_PN375CPCF7.p8 "op://Software/App Store Connect API (Cuts CLI)/p8"
   ```

## Subir un build

```sh
make mobile-testflight
```

El script hace estos pasos:

1. Genera el proyecto nativo.
2. Archiva en Release con firma automática (equipo TKAZA7ZPZ2) y un número de build con la fecha.
3. Exporta el `.ipa` para App Store Connect.
4. Lo sube con `altool`.

La exportación firma a mano con el certificado "Apple Distribution" (debe estar en el llavero) y el perfil "Cuts iOS App Store". Ese perfil se creó con la API el 2026-11-03. La clave tiene rol App Manager y no puede usar la firma en la nube de Apple, por eso la firma es manual. Si el perfil caduca o se borra, créalo otra vez en developer.apple.com (tipo App Store, App ID `com.vigosan.cuts`, certificado Apple Distribution) con ese mismo nombre.

`altool` necesita `--apple-id 6826686848`. La ficha todavía no tiene la plataforma iOS añadida y aun así acepta builds de iPhone para TestFlight.

Cuando Apple termine de procesar el build (unos 10–30 minutos), aparece en **TestFlight → Pruebas internas**. Añádete como probador interno e instálalo desde la app TestFlight del iPhone.

## Fuera de esta fase

- La ficha de la App Store para iPhone: capturas, descripción y revisión.
- La política de privacidad. Hoy dice que los vídeos no salen del ordenador; en el iPhone, Cuts lee y guarda en Fotos.
- Los cambios en la web.
