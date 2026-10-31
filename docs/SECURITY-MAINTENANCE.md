# Mantenimiento de dependencias

## CVE-2026-118764 — 2026-10-31

El aviso de Hostinger identifica `minimatch` 3.1.5 y 10.2.6. La auditoría npm inicial registra 16 alertas moderadas al incluir los paquetes que dependen de esas dos instalaciones. No son 16 CVE distintos. El árbol afectado corresponde a ESLint y sus plugins de desarrollo; no se importa minimatch desde el código de producto. La auditoría de producción y la auditoría completa deben comprobarse por separado.

El proveedor publica 11.0.1 como versión corregida. Un override directo desde v3 no es compatible: v9 retiró el export por defecto y v11 retiró `makeRe()`. Por eso se fija `overrides.minimatch=11.0.1` junto con una adaptación explícita de sus consumidores de lint.

`scripts/patch-minimatch-consumers.mjs`, ejecutado por postinstall y prelint:

- Cambia imports/requires antiguos al export nombrado del matcher corregido. Conserva las reglas de imports, React, accesibilidad y los overrides de configuración.
- Sustituye el uso de makeRe/test en una regla de imports por Minimatch/match. No vuelve a generar una expresión regular ni modifica el algoritmo de minimatch.
- Verifica versiones exactas de cinco consumidores y la versión 11.0.1 del matcher. Valida todos los archivos antes de escribir; aborta ante una versión o un código inesperado para exigir revisión.
- Es idempotente y omite paquetes de desarrollo ausentes, de modo que una instalación de producción sin ellos no necesita la adaptación.

La adaptación es temporal. Al actualizar ESLint o sus plugins, revisar los targets y retirarla cuando los consumidores soporten la API moderna. No reemplazarla por una exclusión del CVE ni por una bajada mayor automática de ESLint/Next. ESLint 9.39.5 muestra además un aviso de fin de soporte en npm; su migración a una línea soportada debe revisar la compatibilidad de todos los plugins.

## Comprobaciones

`npm ci` aplica la adaptación desde una instalación limpia. `npm audit` comprueba todas las dependencias y forma parte obligatoria del CI; `npm audit --omit=dev` comprueba producción. Las pruebas de compatibilidad ejecutan las reglas sobre código con infracciones y excepciones reales, además de cargar los exports ESM y overrides de ESLint. Lint, tipos, build y E2E completan la comprobación.

El lockfile conserva los binarios opcionales de Windows y Linux. npm puede omitirlos al regenerar el lock sobre node_modules existentes; si ocurre, revisar contra el lock aprobado y una resolución aislada, conservar las entradas originales de plataforma y repetir instalación limpia y CI Linux. No agregar un binding de Windows como dependencia obligatoria.

Después del push, Hostinger debe desplegar el nuevo main y ejecutar su próximo escaneo. El CI y npm audit no sustituyen la lectura de ese resultado privado. Un correo de un workflow anterior no prueba que el main actual falle: comparar siempre el SHA del run con el último commit.

Fuentes: [aviso revisado GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), [release 11.0.1](https://github.com/isaacs/minimatch/releases/tag/v11.0.1), [cambios de API](https://github.com/isaacs/minimatch/blob/main/changelog.md).
