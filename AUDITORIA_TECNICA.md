# Auditoría técnica DSA Web App (Google Apps Script V8)

## Errores críticos y vulnerabilidades corregidas

- **XSS en renderizado dinámico del frontend**: se detectaron interpolaciones de datos de usuario, datos provenientes de Sheets y nombres de archivo dentro de `innerHTML`/`insertAdjacentHTML`. Se agregó escape sistemático (`_escaparHTML`), validación de URLs (`_sanitizarUrl`) y escape específico de expresiones regulares (`_escaparRegExp`).
- **Exposición de funciones usadas por la UI**: el botón dinámico para remover el archivo invocaba `DSA_App.resetForm()`, pero `resetForm` no estaba expuesto en la API pública del módulo, provocando error en tiempo de ejecución.
- **Interacción antes de carga completa**: los manejadores inline podían ejecutarse antes de que `Scripts.html` definiera `window.DSA_App`, generando `ReferenceError`. Se agregó un bootstrap mínimo que encola acciones tempranas y las reproduce después de `init()`.
- **Selector de botón incorrecto**: el frontend buscaba `button[onclick="registrarOficioFinal()"]`, pero el HTML invoca `DSA_App.registrarOficioFinal()`, por lo que el estado visual de carga podía no aplicarse/removerse correctamente.
- **Clickjacking / embedding permisivo**: `doGet` permitía `ALLOWALL` para iframes. Se cambió a `DEFAULT` para reducir superficie de ataque salvo que exista un caso de negocio explícito para embeber la Web App.
- **Parseo JSON frágil**: las respuestas de Gemini se parseaban con `JSON.parse` directo, lo que podía ocultar errores reales si el proveedor devolvía HTML/texto o un error no JSON. Se agregó `_parseJsonSeguro`.
- **HTML injection en correos**: los correos generados por backend interpolaban datos de usuario sin escapar. Se agregó `_escaparHtml` antes de construir cuerpos HTML.
- **Scope faltante para Gmail**: el manifiesto usaba `GmailApp.sendEmail` sin declarar un scope de envío; se migró a `MailApp.sendEmail` con `https://www.googleapis.com/auth/script.send_mail` para menor privilegio.

## Mejoras de arquitectura y rendimiento implementadas

- **Capa de validación backend**: se centralizó la normalización de metadatos de oficios y datos de respuesta en `_normalizarDocumentoMetadata` y `_normalizarDatosRespuesta`; además se validan tamaño y firma `%PDF` del archivo en `_validarPdfBase64`.
- **Defensa en profundidad**: se sanitizan nombres de archivo antes de crear archivos en Drive y se limitan longitudes de campos persistidos.
- **Operaciones Sheets más eficientes**: se reemplazaron usos de `appendRow` para encabezados y bitácora de generados por escrituras con `setValues`, que son más predecibles y eficientes.
- **Robustez transaccional**: se mantiene rollback de archivo de Drive ante errores de registro y se protege la liberación del lock para no enmascarar el error principal.
- **Cache y paginación existentes conservados**: se mantuvo el patrón de lectura con Sheets API, cache fragmentado y paginación, que reduce riesgo de exceder cuotas y tiempos.

## Arquitectura sugerida a futuro

- Dividir `Código.js` en módulos lógicos de Apps Script: `Config.gs`, `WebController.gs`, `DocumentService.gs`, `SheetRepository.gs`, `GeminiClient.gs`, `Security.gs` y `Logging.gs`.
- Reemplazar manejadores inline `onclick` por event delegation con `data-action` para separar presentación de comportamiento y reducir superficie XSS.
- Añadir pruebas unitarias locales para helpers puros mediante mocks de GAS y una validación CI con `clasp`/ESLint.
- Endurecer la validación de PDF con antivirus/DLP externo si el proceso institucional lo requiere.
