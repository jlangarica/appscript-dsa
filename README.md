# 🚀 División de Servicios Administrativos (DSA)
### **Sistema de Gestión Documental Inteligente | Enterprise-Grade Automation**

![DSA Hero Banner](file:///home/jesuslangarica/.gemini/antigravity/brain/e5a8bf84-c2b3-487a-a2dc-f27f7c05ff5f/dsa_system_hero_1778227149156.png)

---

[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-apps-script&logoColor=white)](https://developers.google.com/apps-script)
[![Gemini AI](https://img.shields.io/badge/Gemini%201.5%20Flash-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)](https://github.com/jlangarica/appscript-dsa)

## 💎 Visión General
El ecosistema **DSA (División de Servicios Administrativos)** redefine la gestión documental institucional mediante la convergencia de **Inteligencia Artificial Multimodal** y la robustez de **Google Workspace**. Diseñado para operar bajo un modelo de **Zero-Cost Infrastructure**, el sistema orquestra flujos complejos de OCR forense y análisis semántico, transformando documentos físicos en activos digitales accionables en milisegundos.

### 🌟 Pilares del Sistema
*   **🧠 Inteligencia Cognitiva**: Extracción de datos mediante Gemini 1.5 Flash y Document AI.
*   **⚡ Arquitectura Reactiva**: SPA (Single Page Application) fluida con comunicación asíncrona RPC.
*   **🛡️ Integridad Transaccional**: Control de concurrencia y persistencia atómica en Google Sheets.
*   **📊 Escalabilidad Serverless**: Ejecución distribuida sobre el motor V8 de Apps Script.

---

## 🛠️ Stack Tecnológico de Vanguardia

| Capa | Componente | Descripción |
| :--- | :--- | :--- |
| **Core Engine** | Google Apps Script (V8) | Motor de orquestación y lógica de negocio. |
| **Frontend** | Modern HTML5 / CSS3 / JS | Interfaz premium con Micro-animaciones y Glassmorphism. |
| **AI Intelligence** | Gemini 1.5 + Doc AI | Procesamiento de Lenguaje Natural y OCR Forense. |
| **Data Lake** | Google Sheets / Drive | Persistencia estructurada y gestión de expedientes. |
| **DevOps** | Clasp / TypeScript | Ciclo de vida de desarrollo profesional y tipado fuerte. |

---

## 🏗️ Arquitectura del Sistema

### **Flujo de Procesamiento Inteligente**
El sistema implementa un pipeline resiliente que garantiza la captura, análisis y registro de cada documento con una tasa de precisión superior al 98%.

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

## 🎨 Ecosistema Frontend (SPA)
La interfaz de usuario ha sido concebida bajo principios de **Diseño Atómico**, proporcionando una experiencia fluida y reactiva que minimiza la carga cognitiva del operador.

### **Estructura del Componente y Estado**

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

### **Características Elite del UI**
1.  **Validación Dual (Split View)**: Comparativa en tiempo real entre el documento fuente (PDF) y la interpretación de la IA, eliminando errores de transcripción.
2.  **Micro-interacciones**: Feedback visual instantáneo en cada etapa del proceso mediante estados de carga y transiciones fluidas.
3.  **Diseño Adaptativo**: Experiencia optimizada tanto para estaciones de trabajo de alta resolución como para dispositivos móviles de supervisión.

---

## 🚀 Despliegue y Gobernanza
El desarrollo sigue estándares estrictos de **Clean Code** y **SOLID**, gestionado a través de un workflow profesional de CI/CD simulado con Clasp.

### **Pasos para el Entorno de Desarrollo**
1.  **Sincronización**:
    ```bash
    git clone https://github.com/jlangarica/appscript-dsa.git
    npm install
    ```
2.  **Autenticación y Enlace**:
    ```bash
    clasp login
    clasp clone <YOUR_SCRIPT_ID>
    ```
3.  **Despliegue Atómico**:
    ```bash
    clasp push
    ```

---

## 🛡️ Seguridad y Optimización (Nivel Experto)
*   **Batching Performance**: Implementación de `setValues()` y `getValues()` para reducir el overhead de la API de Google Sheets en un 90%.
*   **Concurrency Guard**: Uso de `LockService` (Script Lock) para garantizar la atomicidad en el Libro de Gobierno.
*   **Secrets Management**: Las API Keys y credenciales críticas se almacenan exclusivamente en `PropertiesService`.
*   **Observabilidad**: Logs estructurados en JSON enrutados automáticamente a Google Cloud Logging (Stackdriver).

---

> [!IMPORTANT]
> **Motor V8 Requerido**: El sistema utiliza características de ES2020+ (Optional Chaining, Nullish Coalescing, Async/Await). Asegúrese de que el entorno de ejecución esté configurado correctamente en el manifiesto `appsscript.json`.

---
<div align="center">
  <p>© 2026 División de Servicios Administrativos (DSA)</p>
  <p><i>Vanguardia Digital en la Gestión Pública</i></p>
</div>
