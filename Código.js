/**
 * OFICIALÍA DE PARTES DIGITAL - BACKEND CORE (Propuesta 4: Monolito Gemini)
 * Arquitectura: Multimodal Gemini (OCR + Razonamiento en un solo paso)
 * @author Antigravity AI
 */

// ===================================================================
// 1. CONFIGURACIÓN DEL SISTEMA (Seguridad: Regla #5)
// ===================================================================
const getProp = (key) => PropertiesService.getScriptProperties().getProperty(key);

const CONFIG = {
  // IDs de Google Workspace (Configurado vía Script Properties)
  FOLDER_ID_OFICIOS: getProp("FOLDER_ID_OFICIOS"),
  SHEET_ID_GOBIERNO: getProp("SHEET_ID_GOBIERNO"),
  
  // Configuración de Gemini (Google AI Studio - Zero Cost)
  GEMINI_API_KEY: getProp("GEMINI_API_KEY"),
  GEMINI_MODEL: getProp("GEMINI_MODEL") || "gemini-2.0-flash-exp" // Modelo actualizado
};

/**
 * Función de diagnóstico para el desarrollador.
 * Ejecutar manualmente desde el editor de GAS para verificar IDs.
 */
function diagnosticarSistema() {
  const reporte = [];
  
  // 1. Verificar Folder
  try {
    if (!CONFIG.FOLDER_ID_OFICIOS) throw new Error("ID de Carpeta no configurado.");
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID_OFICIOS);
    reporte.push(`✅ Carpeta Drive: OK (${folder.getName()})`);
  } catch (e) {
    reporte.push(`❌ Error Carpeta Drive: ${e.toString()}`);
  }

  // 2. Verificar Sheet
  try {
    if (!CONFIG.SHEET_ID_GOBIERNO) throw new Error("ID de Hoja no configurado.");
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID_GOBIERNO);
    reporte.push(`✅ Hoja de Cálculo: OK (${ss.getName()})`);
  } catch (e) {
    reporte.push(`❌ Error Hoja de Cálculo: ${e.toString()}`);
  }

  // 3. Verificar API Key
  if (CONFIG.GEMINI_API_KEY) {
    reporte.push("✅ API Key Gemini: Configurada.");
  } else {
    reporte.push("❌ API Key Gemini: NO ENCONTRADA.");
  }

  console.log("DIAGNÓSTICO DEL SISTEMA:\n" + reporte.join("\n"));
  return reporte;
}


// ===================================================================
// 2. CONTROLADOR WEB (Vistas SPA)
// ===================================================================

/**
 * Renderiza la interfaz principal del sistema.
 * @return {HtmlService.HtmlOutput}
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Oficialía Digital')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Inyecta componentes HTML/CSS/JS en la plantilla principal.
 * @param {string} filename Nombre del archivo .html
 * @return {string} Contenido HTML procesado.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ===================================================================
// 3. PROCESAMIENTO INTELIGENTE (Gemini Multimodal)
// ===================================================================

/**
 * Procesa el PDF nativo: OCR y Extracción de metadatos en un solo paso.
 * @param {string} base64Data PDF codificado en base64.
 * @param {string} fileName Nombre original del archivo.
 * @return {Object} Datos estructurados o mensaje de error.
 */
function procesarDocumento(base64Data, fileName) {
  try {
    // Validación de entrada
    if (!base64Data) throw new Error("No se recibió contenido del archivo.");

    // Paso único: Extracción Multimodal con Gemini (con reintentos exponenciales)
    const jsonEstructurado = _conReintentos(() => llamarGeminiMultimodal(base64Data), "Gemini-OCR");

    return {
      success: true,
      data: jsonEstructurado
    };
  } catch (error) {
    _log("ERROR", "procesarDocumento", "Fallo definitivo tras reintentos", { error: error.toString() });
    return { success: false, message: "Fallo en IA (Tras reintentos): " + error.toString() };
  }
}

/**
 * Realiza la llamada a la API de Gemini enviando el PDF como inline_data.
 * @param {string} base64Data PDF en base64.
 * @return {Object} Objeto JSON extraído del documento.
 * @private
 */
function llamarGeminiMultimodal(base64Data) {
  if (!CONFIG.GEMINI_API_KEY) throw new Error("Falta GEMINI_API_KEY en Script Properties.");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
  
  const systemPrompt = `
    Actúa como un experto analista documental gubernamental.
    Analiza con precisión el archivo PDF adjunto y extrae un objeto JSON estricto con:
    - "remitente": Nombre completo de la dependencia o persona que envía el oficio.
    - "oficio": Número de oficio, folio o identificador oficial.
    - "asunto": Resumen ejecutivo del propósito (máximo 15 palabras).
    - "urgencia": Selecciona entre "Alta" (si hay términos legales o plazos cortos) o "Normal".
    Responde ÚNICAMENTE con el objeto JSON, sin texto adicional.
  `;

  const payload = {
    "contents": [{
      "parts": [
        { "text": systemPrompt },
        { 
          "inline_data": { 
            "mime_type": "application/pdf", 
            "data": base64Data 
          } 
        }
      ]
    }],
    "generationConfig": {
      "responseMimeType": "application/json",
      "temperature": 0.1
    }
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  const response = UrlFetchApp.fetch(endpoint, options);
  const responseText = response.getContentText();
  const result = JSON.parse(responseText);

  if (result.error) throw new Error(`Gemini: ${result.error.message}`);
  
  if (!result.candidates || !result.candidates[0].content) {
    throw new Error("El modelo no generó una respuesta. Verifica cuotas y formato del PDF.");
  }

  const jsonString = result.candidates[0].content.parts[0].text;
  return JSON.parse(jsonString);
}

// ===================================================================
// 4. PERSISTENCIA Y REGISTRO (Google Drive & Sheets)
// ===================================================================

/**
 * Guarda el archivo en Drive y registra los datos en la Hoja de Cálculo.
 * @param {Object} datosFinales Metadatos validados por el usuario.
 * @param {string} base64Data PDF original.
 * @param {string} fileName Nombre para el archivo en Drive.
 * @return {Object} Status de la operación y folio generado.
 */
function registrarOficioFinalizado(datosFinales, base64Data, fileName) {
  const lock = LockService.getScriptLock();
  try {
    // Bloqueo atómico por 10 segundos para evitar colisiones
    lock.waitLock(10000);

    // 1. Almacenamiento en Google Drive (Organización Dinámica: Año/Mes/Día)
    if (!CONFIG.FOLDER_ID_OFICIOS) throw new Error("FOLDER_ID_OFICIOS no está configurado en las Propiedades del Script.");
    
    const rootFolder = DriveApp.getFolderById(CONFIG.FOLDER_ID_OFICIOS);
    const now = new Date();
    
    const yearFolder = _getOrCreateFolder(rootFolder, String(now.getFullYear()));
    const monthFolder = _getOrCreateFolder(yearFolder, String(now.getMonth() + 1).padStart(2, '0'));
    const dayFolder = _getOrCreateFolder(monthFolder, String(now.getDate()).padStart(2, '0'));

    const decodedData = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decodedData, MimeType.PDF, fileName);
    const file = dayFolder.createFile(blob);
    const fileUrl = file.getUrl();

    // 2. Indexación en Google Sheets (Libro de Gobierno)
    if (!CONFIG.SHEET_ID_GOBIERNO) throw new Error("SHEET_ID_GOBIERNO no está configurado en las Propiedades del Script.");
    
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID_GOBIERNO);
    const sheet = ss.getSheets()[0]; // Usar la primera hoja si no sabemos el nombre

    const nuevaFila = [
      new Date(), // Fecha de recepción
      datosFinales.remitente,
      datosFinales.oficio,
      datosFinales.asunto,
      datosFinales.urgencia,
      "Recibido", // Estatus por defecto
      fileUrl,
      Session.getActiveUser().getEmail() // Auditoría: quién registró
    ];
    
    sheet.appendRow(nuevaFila);

    // 3. Flujo de Trabajo Automático: Notificación de Urgencia
    const folioGenerado = "FOL-" + Date.now().toString().slice(-4);
    if (datosFinales.urgencia === "Alta") {
      _notificarUrgencia(folioGenerado, datosFinales);
    }

    return { 
      success: true, 
      message: "Oficio registrado correctamente en el Libro de Gobierno.",
      folio: folioGenerado
    };
  } catch (error) {
    _log("ERROR", "registrarOficioFinalizado", "Error al persistir datos", { error: error.toString() });
    return { success: false, message: "Error al registrar: " + error.toString() };
  } finally {
    // Siempre liberar el candado
    lock.releaseLock();
  }
}

// ===================================================================
// 5. UTILIDADES Y SISTEMA DE ROBUSTEZ
// ===================================================================

/**
 * Ejecuta una función con reintentos exponenciales.
 * Evita que el sistema falle si la IA de Google está temporalmente saturada.
 * @param {Function} fn Función a ejecutar.
 * @param {string} label Etiqueta para identificar el log.
 * @return {*} Resultado de la función.
 */
function _conReintentos(fn, label) {
  const MAX_RETRIES = 2;
  const BASE_DELAY_MS = 2000;
  let lastError = null;

  for (let intento = 0; intento <= MAX_RETRIES; intento++) {
    try {
      return fn(); // Intenta ejecutar la llamada
    } catch (error) {
      lastError = error;
      // Solo reintentamos si no es el último intento
      if (intento < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, intento); // 2s, 4s...
        _log("WARN", label, `Intento ${intento + 1} falló. Reintentando en ${delay}ms...`, { error: error.message });
        Utilities.sleep(delay);
      }
    }
  }
  throw lastError; // Agotados los reintentos, lanzamos el error
}

/**
 * Obtiene métricas procesadas en el backend (reduce peso de red)
 * @return {Object} Estadísticas para el dashboard.
 */
function obtenerEstadisticas() {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID_GOBIERNO).getActiveSheet();
    const data = sheet.getDataRange().getValues(); // Regla #3: Batching. Carga toda la BD de golpe en memoria.

    if (data.length <= 1) {
      return { 
        success: true, 
        data: { total: 0, pendientes: 0, urgentes: 0, tiempoPromedio: "0 min", registradosHoy: 0 } 
      };
    }

    const rows = data.slice(1); // Omitir encabezados
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let [total, pendientes, urgentes, registradosHoy] = [rows.length, 0, 0, 0];

    rows.forEach(row => {
      const urgencia = row[4]; // Columna E (Urgencia)
      const estatus = row[5];  // Columna F (Estatus)
      const fecha = new Date(row[0]); // Columna A (Fecha)

      if (estatus === "Pendiente" || estatus === "Recibido") pendientes++;
      if (urgencia === "Alta") urgentes++;
      if (fecha >= hoy) registradosHoy++;
    });

    return {
      success: true,
      data: { 
        total, 
        pendientes, 
        urgentes, 
        tiempoPromedio: "2.1 min", // Valor simulado o calculado según lógica de negocio
        registradosHoy 
      }
    };
  } catch (error) {
    _log("ERROR", "obtenerEstadisticas", error.toString());
    return { success: false, message: "Error al calcular métricas: " + error.toString() };
  }
}

/**
 * Logging estructurado JSON nativo para Stackdriver (Google Cloud).
 * @param {string} level Nivel del log (INFO, WARN, ERROR).
 * @param {string} context Contexto o etiqueta.
 * @param {string} message Mensaje descriptivo.
 * @param {Object} extra Detalles adicionales (opcional).
 */
function _log(level, context, message, extra) {
  const entry = {
    level: level,
    context: context,
    message: message,
    timestamp: new Date().toISOString()
  };
  if (extra) entry.data = extra;

  if (level === "ERROR") {
    console.error(JSON.stringify(entry));
  } else if (level === "WARN") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

/**
 * Obtiene o crea una subcarpeta en Drive dinámicamente.
 * @param {GoogleAppsScript.Drive.Folder} parent Carpeta contenedora.
 * @param {string} name Nombre de la subcarpeta.
 * @return {GoogleAppsScript.Drive.Folder} La carpeta encontrada o creada.
 */
function _getOrCreateFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

/**
 * Envía notificación por Gmail en formato HTML para oficios urgentes.
 * @param {string} folio Folio del documento.
 * @param {Object} datos Datos extraídos del oficio.
 */
function _notificarUrgencia(folio, datos) {
  try {
    const destinatario = Session.getActiveUser().getEmail(); 
    const asunto = `[OFICIALÍA DIGITAL] ⚠️ Oficio URGENTE — ${folio}`;
    const cuerpo = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #e74c3c; border-bottom: 2px solid #fecaca; padding-bottom: 10px;">⚠️ Oficio con Prioridad Alta</h2>
        <p style="color: #4a5568;">Se ha registrado un nuevo documento que requiere atención inmediata:</p>
        <table style="width:100%; border-collapse: collapse; text-align: left; margin-top: 15px;">
          <tr><td style="padding: 10px; font-weight: bold; background: #f8f9fa; border: 1px solid #edf2f7; width: 30%;">Folio:</td><td style="padding: 10px; border: 1px solid #edf2f7;">${folio}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; background: #f8f9fa; border: 1px solid #edf2f7;">Remitente:</td><td style="padding: 10px; border: 1px solid #edf2f7;">${datos.remitente}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; background: #f8f9fa; border: 1px solid #edf2f7;">Oficio:</td><td style="padding: 10px; border: 1px solid #edf2f7;">${datos.oficio}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; background: #f8f9fa; border: 1px solid #edf2f7;">Asunto:</td><td style="padding: 10px; border: 1px solid #edf2f7;">${datos.asunto}</td></tr>
        </table>
        <p style="margin-top: 20px; font-size: 0.875rem; color: #718096;">Este es un mensaje automático generado por el Sistema de Oficialía Digital.</p>
      </div>
    `;
    
    GmailApp.sendEmail(destinatario, asunto, "", { 
      htmlBody: cuerpo,
      name: "Sistema Oficialía Digital"
    });
    
    _log("INFO", "_notificarUrgencia", `Notificación enviada para folio ${folio}`);
  } catch (error) {
    _log("WARN", "_notificarUrgencia", "No se pudo enviar notificación: " + error.message);
  }
}
