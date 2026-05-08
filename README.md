# 🚀 División de Servicios Administrativos (DSA)
### **Sistema de Gestión Documental Inteligente | Powered by Google AI**

---

## 📌 Descripción General
Este proyecto es un sistema avanzado de gestión y procesamiento de documentos (DSA) construido íntegramente sobre el ecosistema de **Google Workspace** y **Google Cloud**. Utiliza **Google Apps Script** como motor de orquestación, integrando capacidades forenses de **Document AI** y análisis semántico con **Gemini Flash** para transformar documentos físicos en datos estructurados y flujos de trabajo automatizados sin costos de servidor.

---

## 🛠️ Stack Tecnológico
| Capa | Tecnologías |
| :--- | :--- |
| **Runtime** | Google Apps Script (V8 Engine) |
| **Lenguaje** | TypeScript / JavaScript (ES2019+) |
| **Frontend** | HTML5, CSS3 (Vanilla/Tailwind), JS Moderno |
| **Persistencia** | Google Sheets (Libro de Gobierno) & Google Drive |
| **Inteligencia Artificial** | Document AI (OCR Forense) & Gemini 1.5 Flash (NLP) |
| **Comunicación** | Gmail API, `google.script.run` (Async RPC) |
| **Herramientas** | Clasp (Command Line Apps Script Projects) |

---

## 🏗️ Arquitectura Técnica
El sistema sigue un flujo asincrónico y resiliente para el procesamiento de documentos por lotes, garantizando la integridad de los datos mediante reintentos exponenciales y manejo de errores.

### **Diagrama de Secuencia de Procesamiento**

```mermaid
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
    title Arquitectura Técnica del Sistema (Zero-Cost)

    participant C as "Cliente"
    participant UI as "Web App"
    participant GAS as "Apps Script"
    participant GD as "Drive"
    participant DAI as "Doc AI"
    participant G as "Gemini"
    participant SH as "Sheets"
    participant GM as "Gmail"

    rect rgba(120, 170, 240, 0.4)
        Note over C, UI: ▸ INGESTA: Digitalización de Alta Fidelidad
        C->>UI: Escanea PDF/A a 300 DPI
        activate UI
        UI->>UI: Codifica a Blob binario (base64)
        deactivate UI
    end

    rect rgba(120, 170, 240, 0.4)
        Note over UI, GAS: ▸ TRANSFERENCIA: Envío Asincrónico al Backend
        UI->>GAS: POST archivo Blob (async)
    end

    loop Por cada oficio (1..N)
        Note over GAS, G: ▸ PROCESAMIENTO — Iteración N
        activate GAS

        Note over GAS, GD: ▸ 1. Persistencia con UUID
        GAS->>GD: createFile() con UUID único
        activate GD
        GD->>GD: Organiza en estructura Año/Mes/Día
        GD-->>GAS: fileId + webViewLink
        deactivate GD

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

        Note over GAS, SH: ▸ 4. Indexación en Libro de Gobierno
        GAS->>SH: appendRow() con metadata completa
        activate SH
        SH-->>GAS: Confirmación de indexación
        deactivate SH

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
```

---

## 🎨 Arquitectura del Frontend (SPA)
La interfaz está diseñada como una **Single Page Application (SPA)** de alto rendimiento, optimizada para la interacción fluida y la gestión de estado local.

### **Estructura de la Interfaz y Flujo de Datos**

```mermaid
%%{init: {
"theme": "dark",
"themeVariables": {
"primaryColor": "#1a1a2e",
"primaryTextColor": "#e0e0e0",
"primaryBorderColor": "#4a4a6a",
"lineColor": "#9a9ac0",
"secondaryColor": "#16213e",
"tertiaryColor": "#252540",
"edgeLabelBackground": "#1a1a2e",
"clusterBkg": "#16213e",
"clusterBorder": "#4a4a6a",
"titleColor": "#e0e0e0"
}
}}%%
graph TD
classDef ui fill:#2ecc71,stroke:#27ae60,color:#fff
classDef logic fill:#3498db,stroke:#2980b9,color:#fff
classDef state fill:#e74c3c,stroke:#c0392b,color:#fff
classDef external fill:#95a5a6,stroke:#7f8c8d,color:#fff

    subgraph SG["Capa de Estado — Memoria del Navegador"]
        direction LR
        State_PDF["PDF Blob"]:::state
        State_JSON["Datos JSON Extraídos"]:::state
        State_Status["Estatus del Trámite"]:::state
    end

    subgraph CG["Controlador Principal — JavaScript"]
        direction TB
        Router["Enrutador de Vistas"]:::logic
        DocManager["Gestor de Documentos"]:::logic
        APICall["Comunicación Backend"]:::logic
    end

    subgraph UIG["Interfaz de Usuario — Vistas HTML"]
        direction TB
        Nav["Barra de Navegación Lateral"]:::ui
        Vistaactiva{"Vista Actual"}:::logic

        V_Dashboard["Tablero Principal<br>Métricas y Últimos Registros"]:::ui

        subgraph ModRegistro["Módulo: Nuevo Registro — Asistente"]
            direction TB
            Paso1["1 · Zona de Carga<br>Drag and Drop"]:::ui

            subgraph Paso2["2 · Validación Dual — Split View"]
                direction LR
                VisorPDF["Visor de PDF"]:::ui
                Formulario["Formulario Editable"]:::ui
            end

            Paso3["3 · Resumen y Confirmación"]:::ui
        end

        V_Archivo["Biblioteca de Expedientes<br>Tabla de Búsqueda"]:::ui
    end

    Backend(("Apps Script<br>Code.gs")):::external

    %% ── Flujo de Navegación ──
    Nav -->|Selecciona| Router
    Router -->|Cambia Vista| Vistaactiva
    Vistaactiva -.->|Tablero| V_Dashboard
    Vistaactiva -.->|Registro| Paso1
    Vistaactiva -.->|Archivo| V_Archivo

    %% ── Flujo del Registro (Asistente) ──
    Paso1 -->|Sube PDF| DocManager
    DocManager -->|Guarda| State_PDF
    DocManager -->|Procesa| APICall
    APICall <-->|JSON / Base64| Backend
    APICall -->|Respuesta| State_JSON
    State_JSON -->|Puebla| Formulario
    State_PDF -->|Renderiza| VisorPDF
    Formulario -->|Corrige| State_JSON
    Paso3 -->|Confirma| APICall
```

### **Componentes Clave del Frontend**
1.  **Capa de Estado**: Gestiona de forma reactiva los datos extraídos por la IA y los blobs de PDF para previsualización inmediata.
2.  **Validación Dual (Split View)**: Permite al usuario comparar el documento original (visado en PDF) contra los datos extraídos por Gemini, asegurando precisión forense.
3.  **Comunicación Asíncrona**: Utiliza el patrón `google.script.run` con manejadores de éxito/error para una experiencia sin recargas de página.

---

## ⚡ Estándares y Optimización
Para garantizar un rendimiento de nivel empresarial, el sistema implementa:

-   **Batching (Operaciones por Lotes)**: Minimización de llamadas a `SpreadsheetApp`. Las lecturas y escrituras se realizan en bloques (`getValues()` / `setValues()`) para evitar cuotas excesivas.
-   **Concurrency Control**: Uso de `LockService` para prevenir colisiones de datos durante escrituras simultáneas en el Libro de Gobierno.
-   **Seguridad**:
    -   Secrets gestionados vía `PropertiesService`.
    -   Estructura de archivos en Drive organizada dinámicamente por fecha (Año/Mes/Día).
    -   UUIDs únicos para cada expediente.
-   **Monitoreo**: Logs estructurados en JSON enviados directamente a Google Cloud Logging.

---

## 🚀 Instalación y Desarrollo
Este proyecto utiliza **Clasp** para el desarrollo local con TypeScript.

1.  **Clonar el repositorio** y entrar al directorio.
2.  **Instalar dependencias**: `npm install`.
3.  **Login en Google**: `clasp login`.
4.  **Enlazar proyecto**: `clasp create` o `clasp clone <SCRIPT_ID>`.
5.  **Desplegar**: `clasp push` para subir los cambios al entorno de Apps Script.

---

> [!IMPORTANT]
> El entorno de ejecución requiere que el motor V8 esté habilitado en `appsscript.json` para soportar la sintaxis moderna de JavaScript utilizada en el controlador y el backend.

---
© 2026 División de Servicios Administrativos (DSA) - Implementación de Vanguardia.
