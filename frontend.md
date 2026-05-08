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

    %% ═══════════════════════════════════════════════════
    %% CAPA DE ESTADO — Memoria del Navegador
    %% ═══════════════════════════════════════════════════
    subgraph SG["Capa de Estado — Memoria del Navegador"]
        direction LR
        State_PDF["PDF Blob"]:::state
        State_JSON["Datos JSON Extraídos"]:::state
        State_Status["Estatus del Trámite"]:::state
    end

    %% ═══════════════════════════════════════════════════
    %% CONTROLADOR — JavaScript
    %% ═══════════════════════════════════════════════════
    subgraph CG["Controlador Principal — JavaScript"]
        direction TB
        Router["Enrutador de Vistas"]:::logic
        DocManager["Gestor de Documentos"]:::logic
        APICall["Comunicación Backend"]:::logic
    end

    %% ═══════════════════════════════════════════════════
    %% INTERFAZ DE USUARIO — Vistas HTML
    %% ═══════════════════════════════════════════════════
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

    %% ═══════════════════════════════════════════════════
    %% ENTORNO EXTERNO
    %% ═══════════════════════════════════════════════════
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
