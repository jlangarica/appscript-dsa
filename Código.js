/**
 * OFICIALÍA DE PARTES DIGITAL - BACKEND CORE
 * Arquitectura: Apps Script + Document AI + Gemini (Zero-Cost)
 * @author Antigravity AI
 */

// ===================================================================
// 1. CONFIGURACIÓN DEL SISTEMA (Seguridad: Regla #5)
// ===================================================================
const getProp = (key) => PropertiesService.getScriptProperties().getProperty(key);

const CONFIG = {
  // Document AI
  GCP_PROJECT_ID: getProp("GCP_PROJECT_ID") || "644299184353",
  DOC_AI_LOCATION: "us",
  DOC_AI_PROCESSOR_ID: getProp("DOC_AI_PROCESSOR_ID"),
  
  // IDs de Google Workspace
  FOLDER_ID_OFICIOS: getProp("FOLDER_ID_OFICIOS"),
  SHEET_ID_GOBIERNO: getProp("SHEET_ID_GOBIERNO"),
  
  // API Key de Gemini
  GEMINI_API_KEY: getProp("GEMINI_API_KEY"),
  GEMINI_MODEL: getProp("GEMINI_MODEL") || "gemini-2.5-flash-lite"
};

// ===================================================================
// 2. CONTROLADOR WEB (Vistas)
// ===================================================================

/**
 * Renderiza la interfaz principal.
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
 * Inyecta archivos HTML/CSS/JS en la plantilla.
 * @param {string} filename Nombre del archivo.
 * @return {string} Contenido HTML.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ===================================================================
// 3. FLUJO DE PROCESAMIENTO (OCR + IA)
// ===================================================================

/**
 * Procesa el PDF: OCR -> Gemini -> JSON Estructurado.
 * @param {string} base64Data PDF en base64.
 * @param {string} fileName Nombre del archivo.
 * @return {Object} Respuesta con datos o error.
 */
function procesarDocumento(base64Data, fileName) {
  try {
    const decodedData = Utilities.base64Decode(base64Data);
    const pdfBlob = Utilities.newBlob(decodedData, MimeType.PDF, fileName);

    // Paso 1: OCR Forense
    const textoCrudo = llamarDocumentAI(pdfBlob);
    if (!textoCrudo) throw new Error("Document AI no extrajo texto.");

    // Paso 2: Inferencia con Gemini
    const jsonEstructurado = llamarGemini(textoCrudo);

    return {
      success: true,
      data: jsonEstructurado
    };
  } catch (error) {
    console.error("Error en procesarDocumento:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Llama a Google Cloud Document AI.
 * @private
 */
function llamarDocumentAI(pdfBlob) {
  const endpoint = `https://us-documentai.googleapis.com/v1/projects/${CONFIG.GCP_PROJECT_ID}/locations/${CONFIG.DOC_AI_LOCATION}/processors/${CONFIG.DOC_AI_PROCESSOR_ID}:process`;
  
  const payload = {
    "rawDocument": {
      "content": Utilities.base64Encode(pdfBlob.getBytes()),
      "mimeType": "application/pdf"
    }
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "headers": { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  const response = UrlFetchApp.fetch(endpoint, options);
  const json = JSON.parse(response.getContentText());

  if (json.error) throw new Error(`Document AI: ${json.error.message}`);
  return json.document.text;
}

/**
 * Llama a la API de Gemini 1.5 Flash.
 * @private
 */
function llamarGemini(textoExtraido) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
  
  const systemPrompt = `
    Eres un experto analista documental gubernamental.
    Extrae un objeto JSON con:
    - "remitente": Dependencia emisora.
    - "oficio": Número de oficio/folio.
    - "asunto": Resumen breve (máx 15 palabras).
    - "urgencia": "Alta" o "Normal".
  `;

  const payload = {
    "contents": [{
      "role": "user",
      "parts": [
        { "text": systemPrompt },
        { "text": "\n--- TEXTO OCR ---\n" + textoExtraido }
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
  const result = JSON.parse(response.getContentText());

  if (result.error) throw new Error(`Gemini: ${result.error.message}`);
  const jsonString = result.candidates[0].content.parts[0].text;
  return JSON.parse(jsonString);
}

// ===================================================================
// 4. REGISTRO FINAL (Drive + Sheets)
// ===================================================================

/**
 * Persiste el archivo y los datos en el ecosistema Workspace.
 * @param {Object} datosFinales Datos validados.
 * @param {string} base64Data PDF en base64.
 * @param {string} fileName Nombre del archivo.
 * @return {Object} Status del registro.
 */
function registrarOficioFinalizado(datosFinales, base64Data, fileName) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    // 1. Guardar en Drive
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID_OFICIOS);
    const decodedData = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decodedData, MimeType.PDF, fileName);
    const file = folder.createFile(blob);
    const fileUrl = file.getUrl();

    // 2. Registrar en Sheets
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID_GOBIERNO).getActiveSheet();
    const nuevaFila = [
      new Date(),
      datosFinales.remitente,
      datosFinales.oficio,
      datosFinales.asunto,
      datosFinales.urgencia,
      "Recibido",
      fileUrl,
      Session.getActiveUser().getEmail()
    ];
    
    sheet.appendRow(nuevaFila);

    return { 
      success: true, 
      message: "Registro completado con éxito.",
      folio: "FOL-" + Date.now().toString().slice(-4)
    };
  } catch (error) {
    console.error("Error al registrar:", error);
    return { success: false, message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}
