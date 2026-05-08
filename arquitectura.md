%%{init: {
  "theme": "dark",
  "themeVariables": {
    "actorBkg": "#2a2a4a",
    "actorTextColor": "#ffffff",
    "actorLineColor": "#9a9ac0",
    "signalColor": "#e0e0f0",
    "signalTextColor": "#ffffff",
    "labelBoxBkgColor": "#1e2e4a",
    "activationBkgColor": "#2a5a80",
    "activationBorderColor": "#ff7b8a",
    "noteBkgColor": "#252540",
    "noteTextColor": "#f0f0f0",
    "noteBorderColor": "#7a7aaa"
  },
  "sequence": {
    "mirrorActors": false,
    "messageAlign": "center",
    "useMaxWidth": true,
    "rightAngles": false,
    "actorFontSize": 15,
    "noteFontSize": 13,
    "messageFontSize": 14,
    "maxMessageWidth": 340
  }
}}%%
sequenceDiagram
    autonumber
    title Arquitectura Técnica del Sistema de Gestión Documental (Zero-Cost)

    participant C as "Cliente"
    participant UI as "Web App"
    participant GAS as "Apps Script"
    participant GD as "Drive"
    participant DAI as "Doc AI"
    participant G as "Gemini"
    participant SH as "Sheets"
    participant GM as "Gmail"

    %% ═══════════════════════════════════════════════════
    %% FASE A — INGESTA Y DIGITALIZACIÓN
    %% ═══════════════════════════════════════════════════
    rect rgba(120, 170, 240, 0.4)
        Note over C, UI: ▸ INGESTA: Digitalización de Alta Fidelidad
        C->>UI: Escanea PDF/A a 300 DPI
        activate UI
        UI->>UI: Codifica a Blob binario (base64)
        deactivate UI
    end

    %% ═══════════════════════════════════════════════════
    %% FASE B — TRANSFERENCIA AL BACKEND
    %% ═══════════════════════════════════════════════════
    rect rgba(120, 170, 240, 0.4)
        Note over UI, GAS: ▸ TRANSFERENCIA: Envío Asincrónico al Backend
        UI->>GAS: POST archivo Blob (async)
    end

    %% ═══════════════════════════════════════════════════
    %% FASE C — PROCESAMIENTO POR LOTE
    %% ═══════════════════════════════════════════════════
    loop Por cada oficio (1..N)
        Note over GAS, G: ▸ PROCESAMIENTO — Iteración N
        activate GAS

        %% ── Persistencia en Cloud Storage ──
        Note over GAS, GD: ▸ 1. Persistencia con UUID
        GAS->>GD: createFile() con UUID único
        activate GD
        GD->>GD: Organiza en estructura Año/Mes/Día
        GD-->>GAS: fileId + webViewLink
        deactivate GD

        %% ── Extracción Forense (Document AI) ──
        Note over GAS, DAI: ▸ 2. Extracción Forense\nDocument AI (ocr_dsa)
        critical Éxito (200 OK)
            GAS->>DAI: POST processDocument (PDF nativo)
            activate DAI
            DAI->>DAI: Análisis multicapa (texto, sellos, firmas)
            DAI-->>GAS: JSON estructurado (texto x bloque + coordenadas)
            deactivate DAI
        option Rate Limit (429) o Timeout
            GAS->>GAS: Espera exponencial (backoff: 2s, 4s, 8s)
            GAS->>DAI: Reintento (max 2 veces)
            activate DAI
            DAI-->>GAS: JSON estructurado
            deactivate DAI
        option Fallo persistente
            GAS->>SH: Log error + estado "Error OCR" + docId
            Note over GAS: Flag: hayErrores = true
        end

        %% ── Inferencia Semántica (Gemini) ──
        Note over GAS, G: ▸ 3. Inferencia Semántica\nPLN (Gemini Flash)
        critical Éxito (200 OK)
            GAS->>G: POST generateContent (texto + JSON Schema)
            activate G
            G->>G: Extrae: Entidades, Semántica, Prioridad
            G-->>GAS: JSON clasificado estructurado
            deactivate G
        option Rate Limit (429) o Timeout
            GAS->>GAS: Espera exponencial (backoff: 2s, 4s, 8s)
            GAS->>G: Reintento (max 2 veces)
            activate G
            G-->>GAS: JSON clasificado
            deactivate G
        option Fallo persistente
            GAS->>SH: Log error + estado "Error IA" + docId
            Note over GAS: Flag: hayErrores = true
        end

        %% ── Indexación en Libro de Gobierno ──
        Note over GAS, SH: ▸ 4. Indexación en Libro de Gobierno
        GAS->>SH: appendRow() con metadata completa
        activate SH
        SH-->>GAS: Confirmación de indexación
        deactivate SH

        %% ── Orquestación de Flujos de Trabajo ──
        Note over GAS, GM: ▸ 5. Orquestación de Flujos
        GAS->>GAS: Evalúa función f(x) de ruteo
        alt Automático (determinado)
            GAS->>GM: sendEmail() con enlace expediente
            activate GM
            GM-->>GAS: Confirmación envío
            deactivate GM
            GAS->>SH: Estado "Pendiente" + fecha seguimiento
        else Manual (indeterminado)
            GAS->>SH: Estado "Requiere Revisión Manual"
        else Informativo (sin seguimiento)
            GAS->>SH: Estado "Completado" directo
        end

        deactivate GAS
    end

    %% ═══════════════════════════════════════════════════
    %% FASE D — CIERRE DE CICLO
    %% ═══════════════════════════════════════════════════
    rect rgba(180, 150, 230, 0.45)
        Note over GAS, UI: ▸ CIERRE: Síntesis de Respuesta y Cierre
        activate GAS

        opt hayErrores == true
            GAS->>UI: Notificación resumen: "N oficios fallaron"
        end

        GAS->>GAS: Genera Draft de respuesta contextual
        GAS->>UI: Renderiza UI: confirmación + draft editable
        activate UI
        UI->>UI: Oficial revisa/edita y cierra ciclo
        UI->>GAS: PUT actualización link respuesta en Sheets
        deactivate GAS
        deactivate UI
        Note right of UI: Sesión del oficio cerrada
        destroy UI
    end
