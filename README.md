# DSS Frontend - Gantt Interactivo

Este repositorio contiene la Interfaz de Usuario (UI) del Sistema de Soporte de Decisiones (DSS) para la Bodega Lontué. Está desarrollado con Next.js y proporciona una visualización en tiempo real mediante una Carta Gantt dinámica, junto con controles para la planificación operativa de la recepción de uva.

## Arquitectura y Tecnologías
*   **Framework:** Next.js 15 (React 19).
*   **Lenguaje:** TypeScript.
*   **Estilos:** Tailwind CSS.
*   **Integración:** API Fetch para el consumo de servicios REST desde el backend.

## Estructura del Proyecto
*   `src/api/`: Capa de integración con el backend. Implementa Long Polling para el monitoreo de tareas asíncronas sin interrumpir la visualización.
*   `src/features/`: Componentes principales de la aplicación.
    *   `Dashboard.tsx`: Manejo del estado global, métricas clave (KPIs) y control del avance temporal (Auto-Play).
    *   `TableroGantt.tsx`: Visualización de la planificación y manejo de eventos de usuario (ej. fijación manual de asignaciones).
    *   `ColaPatio.tsx`: Panel informativo con la lista de espera de camiones.
*   `src/types/`: Definición de interfaces TypeScript.
*   `src/utils/`: Funciones utilitarias y configuración visual.

## Funcionalidades Principales
1.  **Avance Temporal Automático (Auto-Play):** Permite simular el progreso temporal y visualizar cómo el optimizador ajusta la planificación de manera automática a lo largo de un turno.
2.  **Asignaciones Manuales (Overrides):** Permite a los usuarios seleccionar un camión y fijar su asignación (pozo y horario). Esta acción notifica al backend para recalcular el resto de la planificación alrededor de esta restricción, sin superposiciones.
3.  **Manejo de Zonas Horarias:** Normalización de fechas y horas desde la interfaz para asegurar compatibilidad estricta con el procesador en backend, sin desvíos locales.

## Guía de Instalación y Despliegue Local

### Requisitos Previos
*   Node.js 18+ y npm.
*   El backend (`dss_v2_backend`) debe estar en ejecución, configurado en `http://localhost:8080`.

### Levantar el Entorno de Desarrollo
1. Instalar las dependencias del proyecto:
```bash
npm install
```
2. Iniciar el servidor de desarrollo:
```bash
npm run dev
```
3. Acceder a la aplicación a través de un navegador web:
```text
http://localhost:3000
```

### Notas para Despliegue en Producción
Para entornos productivos, se debe compilar el proyecto mediante el comando `npm run build` y posteriormente levantarlo utilizando `npm run start`, un gestor de procesos como PM2, o incluyéndolo en un contenedor de Docker.
