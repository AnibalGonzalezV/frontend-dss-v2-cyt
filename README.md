# DSS Frontend (Gantt Interactivo)

Este repositorio contiene la Interfaz de Usuario (UI) del **Sistema de Soporte de Decisiones (DSS)** para la Bodega Lontué. Está construido con Next.js (React) y proporciona una visualización en tiempo real (Carta Gantt) y controles avanzados para la planificación de camiones de uva.

## 🚀 Arquitectura Tecnológica
*   **Framework Core:** Next.js 15 (React 19).
*   **Lenguaje:** TypeScript estricto.
*   **Estilos:** Tailwind CSS.
*   **Comunicación:** Fetch API nativo consumiendo el backend de Django vía REST.

## 📂 Estructura de Directorios Clave
*   `src/api/`:
    *   `ganttService.ts`: **[Core]** Capa de servicios que se comunica con la API. Implementa el patrón *Long Polling* para monitorear las tareas asíncronas de Celery (IA Matemática) y no congelar la UI durante la optimización.
*   `src/features/`:
    *   `Dashboard.tsx`: Contenedor principal. Mantiene el estado global, maneja el *Game Loop* (Auto-Play) en tiempo real acelerado, y calcula KPIs (Tiempo de espera, Camiones procesados, etc.).
    *   `TableroGantt.tsx`: **[Core UI]** Dibuja la Carta Gantt dinámica. 
        *   **Funcionalidades:** Cálculo de coordenadas basado en tiempo, línea roja de "tiempo actual" progresiva.
        *   **Human-in-the-Loop:** Implementa el control interactivo de clics sobre los camiones para desplegar el modal de *Override Manual* (Fijación de asignaciones 🔒).
    *   `ColaPatio.tsx`: Panel lateral con lista de camiones esperando físicamente en la romana o viajando por GPS (ETA).
*   `src/types/`: Interfaces de TypeScript compartidas (`BloqueGantt`, `Pozo`, `Kpis`).
*   `src/utils/`: Funciones puras (Ej: `colors.ts` que asigna paletas de colores estáticas y consistentes para los 11 Grupos de Mezcla).

## ⚙️ Características Principales
1.  **Auto-Play (Game Loop):** Funcionalidad estilo simulador (Serious Games) que permite avanzar el reloj virtual automáticamente para ver la respuesta del optimizador matemático a lo largo de un día virtual.
2.  **Overrides Manuales (DSS Verdadero):** Permite al Jefe de Patio hacer clic en un camión, elegir un pozo, modificar la hora y **Bloquear/Fijar (Pin)** esa decisión. El front le avisa a Celery para que re-optimice en cascada el resto de los camiones alrededor de esta decisión humana, sin romper la regla matemática (evitando overlaps).
3.  **Seguridad de Zona Horaria (Naive Dates):** Todos los inputs de fecha (como el `datetime-local` del Modal) están filtrados para enviar al backend la fecha/hora absoluta tal como la digita el usuario, evitando desplazamientos accidentales por diferencia horaria del navegador vs el servidor.

## 💻 Guía de Instalación (Local)

### Requisitos Previos
*   Node.js 18+ y npm
*   El backend (`dss_v2_backend`) corriendo en `http://localhost:8080`.

### Levantar el Entorno de Desarrollo
1. Instalar las dependencias de Node:
   ```bash
   npm install
   ```
2. Iniciar el servidor de desarrollo de Next.js:
   ```bash
   npm run dev
   ```
3. Abrir la aplicación en el navegador:
   ```text
   http://localhost:3000
   ```

*Nota para despliegue industrial:* Para producción, utilizar `npm run build` y correrlo con un servidor PM2 o dentro de un contenedor Docker configurado para `next start`.
