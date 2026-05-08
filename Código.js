/**
 * Oficialía de Partes Digital - Backend Core
 * @author Antigravity AI
 */

/**
 * Serves the main HTML interface.
 * @return {HtmlService.HtmlOutput}
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Oficialía de Partes Digital')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Includes HTML content from another file into the current template.
 * @param {string} filename The name of the file to include.
 * @return {string} The HTML content.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Processes the uploaded PDF for OCR extraction.
 * @param {Object} fileData Object containing name, type, and base64 content.
 * @return {Object} Extracted data mock.
 */
function processOCR(fileData) {
  console.log('Processing file:', fileData.name);
  
  // Implementation note: Here we would use DriveApp to save temp file 
  // and then call Gemini API via UrlFetchApp for OCR/Extraction.
  // For now, returning mock data as requested.
  
  Utilities.sleep(2000); // Simulate processing
  
  return {
    success: true,
    data: {
      remitente: "Secretaría de Gobernación (Mock)",
      oficio: "SEGOB-" + Math.floor(Math.random() * 1000) + "/2026",
      asunto: "Requerimiento de actualización de normativas internas y protocolos de seguridad.",
      urgencia: "Alta",
      fecha_extraccion: new Date().toISOString()
    }
  };
}

/**
 * Registers the final entry into the Government Book (Spreadsheet).
 * @param {Object} data Validated data from the frontend.
 * @return {Object} Status of the operation.
 */
function registrarOficio(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    
    // Implementation: SpreadsheetApp operations...
    console.log('Registering entry:', data);
    
    Utilities.sleep(1500); // Simulate DB write
    
    return {
      success: true,
      message: "Registro guardado correctamente en el Libro de Gobierno.",
      folio: "FOL-" + Date.now().toString().slice(-6)
    };
  } catch (e) {
    console.error('Error in registrarOficio:', e);
    return { success: false, message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}
