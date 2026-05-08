# 🚀 División de Servicios Administrativos (DSA)
### **Sistema de Gestión Documental Inteligente | Enterprise-Grade Automation**

![DSA Hero Banner](file:///home/jesuslangarica/.gemini/antigravity/brain/e5a8bf84-c2b3-487a-a2dc-f27f7c05ff5f/dsa_system_hero_1778227149156.png)

---

[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-apps-script&logoColor=white)](https://developers.google.com/apps-script)
[![Gemini AI](https://img.shields.io/badge/Gemini%202.5%20Flash--Lite-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Architecture](https://img.shields.io/badge/Architecture-Multimodal%20Single--Pass-blueviolet?style=for-the-badge)](https://github.com/jlangarica/appscript-dsa)

## 💎 Visión General
El ecosistema **DSA (División de Servicios Administrativos)** redefine la gestión documental institucional mediante una arquitectura de **IA Multimodal de vanguardia**. A diferencia de los sistemas tradicionales de OCR secuencial, el DSA utiliza el motor **Gemini 2.5 Flash-Lite** para realizar la extracción de texto y el razonamiento semántico en un **único paso atómico**, garantizando una latencia mínima y una precisión forense sin costos de infraestructura de servidor (Zero-Cost Infrastructure).

### 🌟 Pilares de Alta Ingeniería
*   **🧠 Extracción Multimodal**: Procesamiento nativo de archivos PDF mediante `inline_data`, eliminando la necesidad de capas intermedias de OCR.
*   **⚡ Reactividad con Estado (Proxy-based)**: Frontend SPA construido con un patrón de **Reactive Proxy** para la gestión de estado local sincronizada.
*   **🛡️ Robustez Transaccional**: Implementación de reintentos exponenciales y `LockService` para garantizar la integridad en entornos multiusuario de alta concurrencia.
*   **📝 Redacción Asistida**: Generación de respuestas oficiales profesionalizadas mediante modelos de lenguaje integrados en el flujo de trabajo.

---

## 🛠️ Stack Tecnológico de Elite

| Capa | Componente | Implementación Técnica |
| :--- | :--- | :--- |
| **Core Engine** | Apps Script (V8) | Orquestación serverless de alta disponibilidad. |
| **Inteligencia** | Gemini 2.5 Flash-Lite | Extracción de metadatos (titular, área, asunto, prioridad). |
| **Frontend UI** | HTML5 / CSS3 / JS | Estética **Apple/MacOS Native** con Glassmorphism y Dark Mode. |
| **Data Layer** | Google Sheets & Drive | Persistencia atómica y organización jerárquica Year/Month/Day. |
| **Optimización** | CacheService | Capa de caché para métricas de Dashboard y consultas a Biblioteca. |
| **Seguridad** | PropertiesService | Gestión segura de API Keys y parámetros de entorno. |

---

## 🏗️ Arquitectura Técnica

### **Evolución: Flujo Multimodal Atómico (Actual)**
La implementación actual optimiza el pipeline eliminando la dependencia de Document AI, consolidando toda la inteligencia en una única llamada multimodal a Gemini.

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#1a1a2e",
    "primaryTextColor": "#ffffff",
    "lineColor": "#7a7aaa"
  }
}}%%
graph LR
    subgraph Client ["Capa de Usuario (Frontend)"]
        UI["SPA Index.html"]
        Store["State Proxy (JS)"]
    end

    subgraph Intelligence ["Motor de Inteligencia"]
        G["Gemini 2.5 Flash-Lite"]
    end

    subgraph Backend ["Capa de Orquestación (GAS)"]
        RPC["google.script.run"]
        Logic["Código.js (Backend)"]
        Lock["LockService"]
    end

    subgraph Persistence ["Persistencia & Almacenamiento"]
        Drive["Google Drive (Hierarchical)"]
        Sheets["Libro de Gobierno (Recibidos/Generados)"]
        Cache["CacheService (Performance)"]
    end

    UI -- "PDF (Base64)" --> RPC
    RPC --> Logic
    Logic -- "Single-Pass Extraction" --> G
    G -- "JSON Estructurado" --> Logic
    Logic --> Lock
    Lock -- "Atomic Write" --> Sheets
    Logic -- "UUID Persist" --> Drive
    Logic -- "Invalidate" --> Cache
    Sheets -.-> Store
    Store -.-> UI
```

### **Diagrama de Secuencia de Referencia (Legacy/Híbrido)**
*Este diagrama representa la arquitectura base del flujo de trabajo institucional.*

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

## 🎨 Ecosistema Frontend (MacOS Native SPA)
La interfaz de usuario ha sido concebida bajo principios de **Diseño Atómico** y estética MacOS, proporcionando una experiencia fluida que minimiza la carga cognitiva.

### **Gestión de Estado Reactiva**
El sistema implementa un objeto `AppState` basado en **JavaScript Proxies**, permitiendo que la UI se actualice automáticamente ante cambios en los datos extraídos o el estado del procesamiento.

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

---

## ⚡ Características de Alta Ingeniería
1.  **Redacción Profesional Asistida**: Módulo integrado que utiliza Gemini para transformar notas rápidas del usuario en oficios de respuesta formales y jurídicamente estructurados.
2.  **Validación Dual Atómica**: Interfaz de "Split View" que garantiza que los datos indexados coincidan exactamente con la fuente forense (PDF original).
3.  **Caché de Alto Rendimiento**: Implementación de `CacheService` con expiración inteligente para servir métricas de Dashboard en <200ms.
4.  **Resiliencia Exponencial**: Algoritmos de backoff en llamadas a APIs externas para mitigar errores de `Rate Limit` (HTTP 429).

---

## 🛡️ Seguridad y Gobierno de Datos
*   **Aislamiento de Secretos**: Todas las credenciales se gestionan vía `PropertiesService`, evitando fugas de información en el código fuente.
*   **Control de Concurrencia**: Uso de `LockService.getScriptLock()` para prevenir colisiones en el Libro de Gobierno durante accesos simultáneos.
*   **Audit Trail**: Registro automático del usuario activo en cada transacción para cumplimiento normativo.
*   **Organización Orgánica**: Estructura de Drive auto-generada por fecha para facilitar auditorías físicas y digitales.

---

> [!IMPORTANT]
> **Compatibilidad V8**: El sistema requiere que el motor V8 esté habilitado en `appsscript.json`. Utiliza sintaxis moderna como `optional chaining`, `nullish coalescing` y `async/await`.

---
<div align="center">
  <p>© 2026 División de Servicios Administrativos (DSA)</p>
  <p><i>Vanguardia Digital en la Gestión Pública</i></p>
</div>
