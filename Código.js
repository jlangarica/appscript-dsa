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
  GEMINI_MODEL: getProp("GEMINI_MODEL") || "gemini-2.5-flash-lite"
};

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

    // Paso único: Extracción Multimodal con Gemini
    const jsonEstructurado = llamarGeminiMultimodal(base64Data);

    return {
      success: true,
      data: jsonEstructurado
    };
  } catch (error) {
    console.error("Error en procesarDocumento:", error);
    return { success: false, message: "Fallo en IA: " + error.toString() };
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

    // 1. Almacenamiento en Google Drive
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID_OFICIOS);
    const decodedData = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decodedData, MimeType.PDF, fileName);
    const file = folder.createFile(blob);
    const fileUrl = file.getUrl();

    // 2. Indexación en Google Sheets (Libro de Gobierno)
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID_GOBIERNO).getActiveSheet();
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

    return { 
      success: true, 
      message: "Oficio registrado correctamente en el Libro de Gobierno.",
      folio: "FOL-" + Date.now().toString().slice(-4)
    };
  } catch (error) {
    console.error("Error en registro final:", error);
    return { success: false, message: "Error al registrar: " + error.toString() };
  } finally {
    // Siempre liberar el candado
    lock.releaseLock();
  }
}
