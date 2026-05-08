/**
 * DIVISIÓN DE SERVICIOS ADMINISTRATIVOS - BACKEND CORE
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
  SHEET_ID_GOBIERNO: getProp("SHEET_ID_GOBIERNO") || "1h9Fa1Q513OYObI-JwcpVpZ-OFUIAvreya5ITRp6WXcM",
  
  // Configuración de Gemini (Google AI Studio - Zero Cost)
  GEMINI_API_KEY: getProp("GEMINI_API_KEY"),
  GEMINI_MODEL: getProp("GEMINI_MODEL") || "gemini-2.5-flash-lite",
  
  // IDs de Generación Documental (Regla #5: PropertiesService)
  TEMPLATE_DOC_ID: getProp("TEMPLATE_DOC_ID") || "1iu5gIOnQJku_5JkwZlaWfMtjtkq3YlfOBrqUzc4vrec",
  FOLDER_GENERADOS_ID: getProp("FOLDER_GENERADOS_ID") || "1g4E4LR9xIYsKtL-O68jTWFVQDfMAIRTc"
};

// ===================================================================
// 1.1 SISTEMA DE CACHÉ (Regla #3: Rendimiento Avanzado)
// ===================================================================
const CACHE_KEYS = {
  BIBLIOTECA: "dsa_biblioteca_data",
  ESTADISTICAS: "dsa_stats_data"
};

// ===================================================================
// 1.2 CATÁLOGO DE DISPOSICIÓN DOCUMENTAL (CADIDO)
// Define los años de retención en Archivo de Trámite por Serie.
// ===================================================================
const CADIDO_VIGENCIAS = {
  "1C.1 - Licitaciones Públicas": 5, 
  "1C.2 - Contratos y Convenios": 5, 
  "2C.1 - Expedientes de Personal": 2, 
  "3C.1 - Correspondencia Oficial": 1, 
  "4C.1 - Solicitudes de Transparencia": 2,
  "99.9 - Otro / Sin Clasificar": 1
};

// ===================================================================
// 1.3 CONSTANTES Y REGLAS DE NEGOCIO (Enterprise Pattern)
// ===================================================================
const APP_CONSTANTS = {
  RANGOS: {
    RECIBIDOS: 'Recibidos!A2:M',
    RECIBIDOS_HEADERS: 'Recibidos!1:1',
    HOJA_RECIBIDOS: "Recibidos",
    COL_ESTATUS_RECIBIDOS: 'Recibidos!K'
  },
  LIMITES: {
    LOCK_TIMEOUT_MS: 10000,
    CACHE_EXPIRATION_SEC: 1800,
    CHUNK_SIZE_BYTES: 90000,
    RATE_LIMIT_SEC: 5,
    PAGINACION_DEFAULT: 50
  },
  ESTATUS: {
    ACTIVO: "Activo en Trámite",
    PENDIENTE: "Pendiente",
    VENCIDO: "Vencido - Transferir",
    RECIBIDO: "Recibido"
  },
  COLORES: {
    HEADER_BG: "#1a365d",
    HEADER_TEXT: "#ffffff"
  }
};
Object.freeze(APP_CONSTANTS);

/**
 * Limpia el caché del script para forzar la recarga de datos en la siguiente consulta.
 * Útil tras operaciones de escritura masiva.
 * @return {void}
 */
function invalidarCaches() {
  const cache = CacheService.getScriptCache();
  cache.removeAll([CACHE_KEYS.BIBLIOTECA, CACHE_KEYS.ESTADISTICAS]);
  console.log("Cachés invalidados.");
}

/**
 * Ejecuta una serie de pruebas de conectividad y configuración para validar el estado del sistema.
 * @return {string[]} Reporte detallado de hallazgos.
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
 * Punto de entrada para la Web App. Renderiza la interfaz principal.
 * @param {GoogleAppsScript.Events.DoGet} e Evento de activación.
 * @return {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('División de Servicios Administrativos')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Incluye el contenido de un archivo HTML dentro de otro.
 * @param {string} filename Nombre del archivo a incluir (sin extensión).
 * @return {string} Contenido HTML.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ===================================================================
// 3. PROCESAMIENTO INTELIGENTE (Gemini Multimodal)
// ===================================================================

/**
 * Coordina el flujo de procesamiento de un documento PDF (OCR + Extracción).
 * @param {string} base64Data PDF codificado en base64.
 * @param {string} fileName Nombre del archivo.
 * @return {Object} Resultado del procesamiento.
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
    return { success: false, message: "Fallo en el procesamiento (Tras reintentos): " + error.toString() };
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
    Actúa como un experto analista documental y archivista gubernamental.
    Analiza con precisión el archivo PDF adjunto y extrae un objeto JSON estricto.
    
    INSTRUCCIONES DE CLASIFICACIÓN (CGCA):
    Clasifica el campo "tipo_doc" ÚNICAMENTE en una de las siguientes Series Documentales:
    - "1C.1 - Licitaciones Públicas"
    - "1C.2 - Contratos y Convenios"
    - "2C.1 - Expedientes de Personal"
    - "3C.1 - Correspondencia Oficial"
    - "4C.1 - Solicitudes de Transparencia"
    - "99.9 - Otro / Sin Clasificar"

    Extrae:
    - "titular": Nombre completo del funcionario que firma.
    - "area": Sección o departamento productor (recursos humanos, jurídica, etc).
    - "oficio": Número de oficio o folio.
    - "asunto": Resumen ejecutivo (máximo 15 palabras).
    - "tipo_doc": La Serie Documental exacta.
    - "urgencia": "Baja", "Normal", "Alta" o "Crítica".
    - "requiere_respuesta": Booleano.
  `;

  const payload = {
    contents: [{
      parts: [
        { text: systemPrompt },
        { inline_data: { mime_type: "application/pdf", data: base64Data } }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          titular: { type: "STRING" },
          area: { type: "STRING" },
          oficio: { type: "STRING" },
          asunto: { type: "STRING" },
          tipo_doc: { 
            type: "STRING", 
            enum: [
              "1C.1 - Licitaciones Públicas", 
              "1C.2 - Contratos y Convenios", 
              "2C.1 - Expedientes de Personal", 
              "3C.1 - Correspondencia Oficial", 
              "4C.1 - Solicitudes de Transparencia", 
              "99.9 - Otro / Sin Clasificar"
            ] 
          },
          urgencia: { type: "STRING", enum: ["Baja", "Normal", "Alta", "Crítica"] },
          requiere_respuesta: { type: "BOOLEAN" }
        },
        required: ["titular", "area", "oficio", "asunto", "tipo_doc", "urgencia", "requiere_respuesta"]
      }
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

  let jsonString = result.candidates[0].content.parts[0].text;
  
  // Sanitización estricta (Regla #4: Robustez)
  jsonString = jsonString.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    _log("ERROR", "llamarGeminiMultimodal", "Fallo al parsear JSON sanitizado", { raw: jsonString });
    throw new Error("Respuesta del motor de IA no tiene formato JSON válido.");
  }
}

// ===================================================================
// 4. PERSISTENCIA Y REGISTRO (Google Drive & Sheets - Oficialía)
// ===================================================================


/**
 * Guarda el archivo en Drive y registra los datos en la Hoja de Cálculo con validación estricta.
 * @param {Object} datosFinales Metadatos validados por el usuario.
 * @param {string} base64Data PDF original en base64.
 * @param {string} fileName Nombre para el archivo en Drive.
 * @return {Object} Status de la operación y folio generado.
 */
function registrarOficioFinalizado(datosFinales, base64Data, fileName) {
  // 0.0 Validación de Entradas (Seguridad: Regla #4)
  if (!datosFinales || typeof datosFinales !== "object") throw new Error("Datos de entrada inválidos.");
  if (!base64Data || typeof base64Data !== "string") throw new Error("Archivo PDF no válido.");

  const camposRequeridos = ["titular", "area", "oficio", "asunto", "tipo_doc", "urgencia"];
  for (const campo of camposRequeridos) {
    if (!datosFinales[campo]) throw new Error(`El campo "${campo}" es obligatorio.`);
  }
  const cache = CacheService.getScriptCache();
  
  // 0.1 Rate Limiting (Seguridad: Tarea #2)
  try {
    _verificarRateLimit("registro", 5); // 1 cada 5s por usuario
  } catch (e) {
    return { success: false, message: e.message };
  }

  // 0.2 Idempotencia
  if (datosFinales.uploadId) {
    const cachedStatus = cache.get(`status_${datosFinales.uploadId}`);
    if (cachedStatus) return JSON.parse(cachedStatus);
  }

  let fileCreated = null; // Para rollback (Tarea #1)
  try {
    // 1. ALMACENAMIENTO DRIVE
    const dayFolder = obtenerCarpetaDelDia();
    const decodedData = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decodedData, MimeType.PDF, fileName);
    fileCreated = dayFolder.createFile(blob);
    const fileUrl = fileCreated.getUrl();

    // 2. INDEXACIÓN EN SHEETS (CON LOCK)
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(APP_CONSTANTS.LIMITES.LOCK_TIMEOUT_MS); 

      if (!CONFIG.SHEET_ID_GOBIERNO) throw new Error("SHEET_ID_GOBIERNO no configurado.");
      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID_GOBIERNO);
      let sheet = ss.getSheetByName(APP_CONSTANTS.RANGOS.HOJA_RECIBIDOS);
      
      if (!sheet) {
        sheet = ss.insertSheet(APP_CONSTANTS.RANGOS.HOJA_RECIBIDOS);
        const headers = ["FECHA", "TITULAR", "SECCIÓN (ÁREA)", "OFICIO", "ASUNTO", "SERIE DOCUMENTAL (CGCA)", "AÑOS RETENCIÓN", "FECHA TRANSFERENCIA", "PRIORIDAD", "RESPUESTA", "ESTATUS", "URL", "AUDITORÍA"];
        sheet.appendRow(headers);
        sheet.getRange(APP_CONSTANTS.RANGOS.RECIBIDOS_HEADERS).setBackground(APP_CONSTANTS.COLORES.HEADER_BG).setFontColor(APP_CONSTANTS.COLORES.HEADER_TEXT).setFontWeight("bold");
      }

      // Cálculo de CADIDO (Tarea #2 Archivística)
      const vigenciaAños = CADIDO_VIGENCIAS[datosFinales.tipo_doc] || 1;
      const fechaTransferencia = new Date();
      fechaTransferencia.setFullYear(fechaTransferencia.getFullYear() + vigenciaAños);
      
      const nuevaFila = [
        new Date(),
        datosFinales.titular,
        datosFinales.area,
        datosFinales.oficio,
        datosFinales.asunto,
        datosFinales.tipo_doc,
        vigenciaAños,
        fechaTransferencia,
        datosFinales.urgencia,
        datosFinales.requiere_respuesta ? "SÍ" : "NO",
        APP_CONSTANTS.ESTATUS.ACTIVO, 
        fileUrl,
        Session.getActiveUser().getEmail()
      ];
      
      sheet.appendRow(nuevaFila);
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    invalidarCaches();
    const folioGenerado = "FOL-" + Date.now().toString().slice(-4);

    const response = { 
      success: true, 
      message: "Oficio registrado correctamente.",
      folio: folioGenerado,
      dispararNotificacion: (datosFinales.urgencia === "Alta" || datosFinales.urgencia === "Crítica")
    };

    if (datosFinales.uploadId) {
      cache.put(`status_${datosFinales.uploadId}`, JSON.stringify(response), 300);
    }

    return response;
  } catch (error) {
    // ROLLBACK ATÓMICO (Tarea #1)
    if (fileCreated) {
      try { fileCreated.setTrashed(true); } catch(e) { _log("WARN", "registrarOficioFinalizado", "Error en Rollback", { error: e.toString() }); }
    }
    _log("ERROR", "registrarOficioFinalizado", "Error transaccional al registrar", { error: error.toString() });
    return { success: false, message: "Error al registrar: " + error.toString() };
  }
}

/**
 * Recupera y filtra los registros de la Oficialía desde Sheets.
 * @param {number} offset Desplazamiento inicial para paginación.
 * @param {number} limit Cantidad máxima de registros a retornar.
 * @param {Object|null} filtros Criterios de búsqueda opcionales.
 * @return {Object} Objeto con datos y estado de paginación.
 */
function obtenerRegistros(offset = 0, limit = 50, filtros = null) {
  const cacheKey = `${CACHE_KEYS.BIBLIOTECA}_${offset}_${limit}_${filtros ? Utilities.base64Encode(JSON.stringify(filtros)) : 'none'}`;
  const cached = _getCacheChunked(cacheKey);
  
  if (cached) {
    console.log(`Sirviendo página ${offset} desde caché fragmentado.`);
    return JSON.parse(cached);
  }

  console.log(`Cargando registros desde Sheets API v4...`);
  try {
    if (!CONFIG.SHEET_ID_GOBIERNO) throw new Error("ID de Hoja no configurado.");
    
    // Uso de Sheets API Avanzada (Tarea #4) - Mucho más rápido que SpreadsheetApp
    const range = APP_CONSTANTS.RANGOS.RECIBIDOS; 
    const response = Sheets.Spreadsheets.Values.get(CONFIG.SHEET_ID_GOBIERNO, range);
    const allData = response.values;
    
    if (!allData || allData.length === 0) return { success: true, data: [], hasMore: false };
    
    let filteredData = allData.reverse(); 

    // OPTIMIZACIÓN O(N) (Tarea #1 de Ingeniería de Élite)
    if (filtros) {
      const { texto, area, tipo, prioridad, respuesta } = filtros;
      const term = texto ? texto.toLowerCase() : null;

      filteredData = filteredData.filter(row => {
        // 1. Filtros exactos (Short-Circuit)
        if (area && String(row[2]) !== area) return false;
        if (tipo && String(row[5]) !== tipo) return false;
        if (prioridad && String(row[8]) !== prioridad) return false;
        if (respuesta && String(row[9]) !== respuesta) return false;

        // 2. Filtro de búsqueda textual
        if (term) {
          const searchPool = `${row[1]} ${row[2]} ${row[3]} ${row[4]}`.toLowerCase();
          if (!searchPool.includes(term)) return false;
        }
        return true;
      });
    }

    const totalFiltered = filteredData.length;
    const registrosSegmento = filteredData.slice(offset, offset + limit);
    
    const registros = registrosSegmento.map((row) => {
      let fechaStr = "N/A";
      try {
        // En Sheets API los valores vienen como strings o números
        const valFecha = row[0];
        fechaStr = valFecha ? (typeof valFecha === 'string' ? valFecha.split('T')[0] : String(valFecha)) : "N/A";
      } catch(e) {}

      return {
        fecha: fechaStr,
        titular: String(row[1] || "N/A"),
        area: String(row[2] || "N/A"),
        oficio: String(row[3] || "N/A"),
        asunto: String(row[4] || "Sin asunto"),
        tipo_doc: String(row[5] || "N/A"),
        vigencia: String(row[6] || "1"),
        transferencia: String(row[7] || "N/A"),
        urgencia: String(row[8] || "Normal"),
        respuesta: String(row[9] || "NO"),
        estatus: String(row[10] || "Activo"),
        url: String(row[11] || ""),
        registrador: String(row[12] || "")
      };
    });
    
    const hasMore = (offset + limit) < totalFiltered;

    const result = { success: true, data: registros, hasMore: hasMore };

    // Cache fragmentado para evitar límite de 100KB (Tarea #2)
    _putCacheChunked(cacheKey, JSON.stringify(result), 1800);

    return result;
  } catch (error) {
    _log("ERROR", "obtenerRegistros", "Error al recuperar registros", { error: error.toString() });
    return { success: false, message: error.toString() };
  }
}

/**
 * Crea un documento de respuesta institucional basado en una plantilla.
 * @param {Object} datos Metadatos del oficio y contenido de la respuesta.
 * @return {Object} URL del documento generado o error.
 */
function generarRespuestaOficio(datos) {
  console.log("Iniciando generación de respuesta...");
  try {
    let contenidoFinal = datos.notasUsuario;

    // Si es redacción asistida, usamos Gemini para profesionalizar el texto
    if (datos.asistido) {
      console.log("Mejorando redacción con motor de lenguaje...");
      const prompt = `
        Actúa como un redactor jurídico-administrativo experto. 
        Profesionaliza el siguiente texto de respuesta para un oficio oficial.
        DATOS DEL OFICIO ORIGINAL:
        - Dirigido a: ${datos.titular} (${datos.area})
        - Asunto: ${datos.asunto}
        - Oficio de referencia: ${datos.oficio}
        
        NOTAS DEL USUARIO PARA LA RESPUESTA:
        "${datos.notasUsuario}"
        
        INSTRUCCIONES:
        - Usa un lenguaje formal, institucional y claro.
        - Mantén la estructura de un oficio de respuesta.
        - No inventes datos que no estén aquí.
        - Devuelve ÚNICAMENTE el cuerpo del texto de la respuesta.
      `;
      contenidoFinal = llamarGeminiTexto(prompt);
    }

    // 1. Clonar plantilla
    const plantilla = DriveApp.getFileById(CONFIG.TEMPLATE_DOC_ID);
    const nombreArchivo = `RESPUESTA - ${datos.oficio} - ${datos.titular}`;
    const copiaDoc = plantilla.makeCopy(nombreArchivo, DriveApp.getFolderById(CONFIG.FOLDER_GENERADOS_ID));
    
    // 2. Reemplazar placeholders en el documento
    const doc = DocumentApp.openById(copiaDoc.getId());
    const body = doc.getBody();
    
    const hoy = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Usamos expresiones regulares más flexibles (manejan espacios opcionales: {{ CAMPO }})
    body.replaceText("\\{\\{\\s*FECHA\\s*\\}\\}", hoy);
    body.replaceText("\\{\\{\\s*TITULAR\\s*\\}\\}", datos.titular);
    body.replaceText("\\{\\{\\s*AREA\\s*\\}\\}", datos.area);
    body.replaceText("\\{\\{\\s*ASUNTO\\s*\\}\\}", datos.asunto);
    body.replaceText("\\{\\{\\s*REFERENCIA\\s*\\}\\}", datos.oficio);
    body.replaceText("\\{\\{\\s*RESPUESTA\\s*\\}\\}", contenidoFinal);
    
    doc.saveAndClose();

    // 3. Registrar en pestaña "Generados" (Antes de devolver éxito)
    console.log("Registrando en Spreadsheet...");
    registrarEnGenerados(datos, copiaDoc.getUrl());

    console.log("Generación completada con éxito.");
    return { success: true, url: copiaDoc.getUrl(), message: "Documento generado y registrado." };
  } catch (error) {
    _log("ERROR", "generarRespuestaOficio", "Error CRÍTICO al generar respuesta", { error: error.toString() });
    return { success: false, message: "Error en servidor: " + error.toString() };
  }
}

/**
 * Indexa un documento generado en la bitácora de respuestas.
 * @param {Object} datos Metadatos del documento.
 * @param {string} docUrl Enlace de Drive al documento.
 * @return {void}
 */
function registrarEnGenerados(datos, docUrl) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID_GOBIERNO);
    let sheet = ss.getSheetByName("Generados");
    
    if (!sheet) {
      console.log("Creando pestaña Generados...");
      sheet = ss.insertSheet("Generados");
      sheet.appendRow(["FECHA", "REFERENCIA (OFICIO)", "DESTINATARIO", "ÁREA", "ASUNTO", "REDACTOR", "URL DOCUMENTO"]);
      sheet.getRange("A1:G1").setBackground("#f3f3f3").setFontWeight("bold");
    }

    const email = Session.getActiveUser().getEmail() || "Usuario";
    sheet.appendRow([
      new Date(),
      datos.oficio || "N/A",
      datos.titular || "N/A",
      datos.area || "N/A",
      datos.asunto || "N/A",
      email,
      docUrl
    ]);
    SpreadsheetApp.flush(); // Forzar escritura inmediata
    invalidarCaches(); // Reflejar en estadísticas e inicio
    console.log("Fila añadida a Generados.");
  } catch (e) {
    _log("ERROR", "registrarEnGenerados", "Error al registrar en bitácora", { error: e.toString() });
    throw new Error("No se pudo registrar en el Sheet: " + e.message);
  }
}

/**
 * Realiza una consulta de texto a la API de Gemini.
 * @param {string} prompt Instrucción para el modelo.
 * @return {string} Respuesta generada.
 */
function llamarGeminiTexto(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  
  if (json.candidates && json.candidates[0].content) {
    return json.candidates[0].content.parts[0].text.trim();
  }
  throw new Error("No se pudo obtener respuesta del motor de lenguaje.");
}

// ===================================================================
// 5. UTILIDADES Y SISTEMA DE ROBUSTEZ
// ===================================================================

/**
 * Wrapper de ejecución con lógica de reintento exponencial.
 * @param {Function} fn Función a ejecutar.
 * @param {string} label Etiqueta para logging.
 * @return {*} Resultado de la ejecución exitosa.
 */
function _conReintentos(fn, label) {
  const MAX_RETRIES = 2;
  const BASE_DELAY_MS = 2000;
  let lastError = null;

  for (let intento = 0; intento <= MAX_RETRIES; intento++) {
    try {
      return fn(); 
    } catch (error) {
      lastError = error;
      const msg = error.toString().toLowerCase();
      
      // ERROR NO RECUPERABLE: Si es error de cliente (400), no reintentar
      if (msg.includes("400") || msg.includes("bad request") || msg.includes("invalid argument") || msg.includes("limit exceeded")) {
        console.error(`[${label}] Error no recuperable: ${msg}`);
        throw error;
      }

      if (intento < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, intento);
        console.warn(`[${label}] Intento ${intento + 1} falló. Reintentando en ${delay}ms...`);
        Utilities.sleep(delay);
      }
    }
  }
  throw lastError;
}

/**
 * Calcula métricas agregadas para el Tablero de Control.
 * @return {Object} Estadísticas consolidadas.
 */
function obtenerEstadisticas() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(CACHE_KEYS.ESTADISTICAS);
  
  if (cached) {
    return { success: true, data: JSON.parse(cached) };
  }

  try {
    if (!CONFIG.SHEET_ID_GOBIERNO) return { success: false, message: "ID no configurado." };
    
    // Sheets API para velocidad (Tarea #4)
    const response = Sheets.Spreadsheets.Values.get(CONFIG.SHEET_ID_GOBIERNO, APP_CONSTANTS.RANGOS.RECIBIDOS);
    const rows = response.values;

    if (!rows || rows.length === 0) {
      return { 
        success: true, 
        data: { total: 0, pendientes: 0, urgentes: 0, registradosHoy: 0, recientes: [], ultimaFila: 0 } 
      };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let [total, pendientes, urgentes, registradosHoy] = [rows.length, 0, 0, 0];

    rows.forEach(row => {
      const urgencia = row[8]; // Columna I
      const estatus = row[10]; // Columna K
      const fecha = new Date(row[0]); 

      if (estatus === APP_CONSTANTS.ESTATUS.PENDIENTE || estatus === APP_CONSTANTS.ESTATUS.ACTIVO) pendientes++;
      if (urgencia === "Alta" || urgencia === "Crítica") urgentes++;
      if (fecha >= hoy) registradosHoy++;
    });

    // Actividad reciente
    const recientes = rows.slice(-5).reverse().map(row => {
      return {
        folio: "FOL-" + (row[0] ? String(row[0]).slice(-4) : "0000"),
        titular: String(row[1] || "N/A"),
        asunto: String(row[4] || "Sin asunto"),
        fecha: String(row[0] || "N/A"),
        estatus: String(row[10] || APP_CONSTANTS.ESTATUS.ACTIVO)
      };
    });

    const resultData = { 
      total, 
      pendientes, 
      urgentes, 
      registradosHoy,
      recientes,
      ultimaFila: rows.length + 1 // Para el Heartbeat (Tarea #3)
    };

    cache.put(CACHE_KEYS.ESTADISTICAS, JSON.stringify(resultData), 600);

    return { success: true, data: resultData };
  } catch (error) {
    _log("ERROR", "obtenerEstadisticas", "Error al calcular métricas", { error: error.toString() });
    return { success: false, message: "Error al calcular métricas: " + error.toString() };
  }
}

/**
 * Verifica cambios rápidos en el número de registros (Heartbeat).
 * @return {number} Cantidad actual de filas en la hoja.
 */
function checarActualizaciones() {
  try {
    const response = Sheets.Spreadsheets.get(CONFIG.SHEET_ID_GOBIERNO, { ranges: ['Recibidos!A:A'], includeGridData: false });
    const sheet = response.sheets.find(s => s.properties.title === 'Recibidos');
    return sheet.properties.gridProperties.rowCount;
  } catch (e) {
    return 0;
  }
}

/**
 * Implementa una barrera de tiempo entre acciones por usuario.
 * @param {string} accion Identificador del proceso.
 * @param {number} limiteSegundos Tiempo de espera requerido.
 * @throws {Error} Si se excede la frecuencia permitida.
 */
function _verificarRateLimit(accion, limiteSegundos) {
  const cache = CacheService.getScriptCache();
  const user = Session.getActiveUser().getEmail();
  const key = `rate_${accion}_${user}`;

  if (cache.get(key)) {
    throw new Error(`Por favor espera ${limiteSegundos} segundos antes de realizar esta acción nuevamente.`);
  }
  cache.put(key, "locked", limiteSegundos);
}

/**
 * CRON JOB: Automatiza la auditoría de vigencia documental según CADIDO.
 * @return {void}
 */
function auditarPlazosDeConservacion() {
  try {
    if (!CONFIG.SHEET_ID_GOBIERNO) return;
    
    const response = Sheets.Spreadsheets.Values.get(CONFIG.SHEET_ID_GOBIERNO, APP_CONSTANTS.RANGOS.RECIBIDOS);
    const rows = response.values;
    if (!rows || rows.length === 0) return;

    const hoy = new Date();
    const expirados = [];

    rows.forEach((row, index) => {
      const fechaTransferencia = new Date(row[7]); // Columna H
      const estatus = row[10]; // Columna K

      if (estatus === APP_CONSTANTS.ESTATUS.ACTIVO && hoy >= fechaTransferencia) {
        expirados.push({
          oficio: row[3],
          serie: row[5],
          fecha: row[0],
          fila: index + 2
        });
      }
    });

    if (expirados.length > 0) {
      // Actualizar estatus en batch para eficiencia
      const data = expirados.map(e => ({
        range: `Recibidos!K${e.fila}`,
        values: [[APP_CONSTANTS.ESTATUS.VENCIDO]]
      }));

      Sheets.Spreadsheets.Values.batchUpdate({
        valueInputOption: "RAW",
        data: data
      }, CONFIG.SHEET_ID_GOBIERNO);

      // Notificar por Gmail
      const listaHtml = expirados.map(o => `<li><b>${o.oficio}</b> (${o.serie})</li>`).join('');
      const cuerpo = `<h3>Alerta de CADIDO</h3><p>Los siguientes documentos han vencido su plazo en Trámite:</p><ul>${listaHtml}</ul>`;
      
      GmailApp.sendEmail(Session.getActiveUser().getEmail(), "[DSA] Alerta de Transferencia Documental", "", {
        htmlBody: cuerpo,
        name: "Sistema de Archivos DSA"
      });
      
      console.log(`Auditoría completada: ${expirados.length} documentos marcados.`);
    }
  } catch (e) {
    _log("ERROR", "auditarPlazosDeConservacion", "Error en auditoría archivística", { error: e.toString() });
  }
}

/**
 * Centraliza el registro de logs estructurados para Google Cloud Logging.
 * @param {string} level INFO | WARN | ERROR.
 * @param {string} context Módulo de origen.
 * @param {string} message Descripción del evento.
 * @param {Object} [extra] Metadatos adicionales.
 * @return {void}
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
 * Gestiona la estructura jerárquica de carpetas en Drive (Año/Mes/Día).
 * @return {GoogleAppsScript.Drive.Folder} Carpeta del día actual.
 */
function obtenerCarpetaDelDia() {
  const hoyStr = new Date().toISOString().split('T')[0];
  const props = PropertiesService.getScriptProperties();
  const idCarpetaDia = props.getProperty('FOLDER_DIA_' + hoyStr);

  if (idCarpetaDia) {
    try {
      return DriveApp.getFolderById(idCarpetaDia);
    } catch (e) {
      console.warn("Folder ID en caché inválido, buscando nuevamente...");
    }
  }

  // Si no está en caché o falló, buscar/crear
  if (!CONFIG.FOLDER_ID_OFICIOS) throw new Error("FOLDER_ID_OFICIOS no configurado.");
  const rootFolder = DriveApp.getFolderById(CONFIG.FOLDER_ID_OFICIOS);
  const now = new Date();
  
  const yearFolder = _getOrCreateFolder(rootFolder, String(now.getFullYear()));
  const monthFolder = _getOrCreateFolder(yearFolder, String(now.getMonth() + 1).padStart(2, '0'));
  const dayFolder = _getOrCreateFolder(monthFolder, String(now.getDate()).padStart(2, '0'));

  // Cachear para el resto de peticiones del día
  props.setProperty('FOLDER_DIA_' + hoyStr, dayFolder.getId());
  return dayFolder;
}

/**
 * Busca o crea una subcarpeta por nombre.
 * @param {GoogleAppsScript.Drive.Folder} parent Carpeta padre.
 * @param {string} name Nombre de la carpeta destino.
 * @return {GoogleAppsScript.Drive.Folder}
 */
function _getOrCreateFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

/**
 * Supera el límite de 100KB de CacheService fragmentando los datos.
 * @param {string} key Identificador.
 * @param {string} value Datos serializados.
 * @param {number} [expiration] Tiempo de vida en segundos.
 * @return {void}
 */
function _putCacheChunked(key, value, expiration = APP_CONSTANTS.LIMITES.CACHE_EXPIRATION_SEC) {
  const cache = CacheService.getScriptCache();
  const chunks = [];
  
  for (let i = 0; i < value.length; i += APP_CONSTANTS.LIMITES.CHUNK_SIZE_BYTES) {
    chunks.push(value.substring(i, i + APP_CONSTANTS.LIMITES.CHUNK_SIZE_BYTES));
  }
  
  const chunkMap = {};
  chunks.forEach((chunk, index) => {
    chunkMap[`${key}_chunk_${index}`] = chunk;
  });
  chunkMap[`${key}_total`] = String(chunks.length);
  
  cache.putAll(chunkMap, expiration);
}

/**
 * Recompone datos fragmentados desde el caché.
 * @param {string} key Identificador.
 * @return {string|null} Datos originales o null si expiró.
 */
function _getCacheChunked(key) {
  const cache = CacheService.getScriptCache();
  const totalChunksStr = cache.get(`${key}_total`);
  if (!totalChunksStr) return null;
  
  const totalChunks = parseInt(totalChunksStr);
  const keys = Array.from({length: totalChunks}, (_, i) => `${key}_chunk_${i}`);
  const results = cache.getAll(keys);
  
  let value = "";
  for (let i = 0; i < totalChunks; i++) {
    const chunk = results[`${key}_chunk_${i}`];
    if (!chunk) return null; // Si falta un trozo, el caché está corrupto
    value += chunk;
  }
  
  return value;
}

/**
 * Envía una alerta inmediata vía email para documentos críticos.
 * @param {string} folio ID del registro.
 * @param {Object} datos Metadatos del oficio.
 * @return {void}
 */
function _notificarUrgencia(folio, datos) {
  try {
    const destinatario = Session.getActiveUser().getEmail(); 
    const asunto = `[DSA] ⚠️ Oficio URGENTE — ${folio}`;
    const cuerpo = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #e74c3c; border-bottom: 2px solid #fecaca; padding-bottom: 10px;">⚠️ Oficio con Prioridad Alta</h2>
        <p style="color: #4a5568;">Se ha registrado un nuevo documento que requiere atención inmediata:</p>
        <table style="width:100%; border-collapse: collapse; text-align: left; margin-top: 15px;">
          <tr><td style="padding: 10px; font-weight: bold; background: #f8f9fa; border: 1px solid #edf2f7; width: 30%;">Folio:</td><td style="padding: 10px; border: 1px solid #edf2f7;">${folio}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; background: #f8f9fa; border: 1px solid #edf2f7;">Remitente:</td><td style="padding: 10px; border: 1px solid #edf2f7;">${datos.titular}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; background: #f8f9fa; border: 1px solid #edf2f7;">Oficio:</td><td style="padding: 10px; border: 1px solid #edf2f7;">${datos.oficio}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; background: #f8f9fa; border: 1px solid #edf2f7;">Asunto:</td><td style="padding: 10px; border: 1px solid #edf2f7;">${datos.asunto}</td></tr>
        </table>
        <p style="margin-top: 20px; font-size: 0.875rem; color: #718096;">Este es un mensaje automático generado por la División de Servicios Administrativos.</p>
      </div>
    `;
    
    GmailApp.sendEmail(destinatario, asunto, "", { 
      htmlBody: cuerpo,
      name: "División de Servicios Administrativos"
    });
    
    _log("INFO", "_notificarUrgencia", `Notificación enviada para folio ${folio}`);
  } catch (error) {
    _log("WARN", "_notificarUrgencia", "No se pudo enviar notificación: " + error.message);
  }
}
