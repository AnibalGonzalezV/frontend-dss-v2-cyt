import { GanttDataResponse, TrazabilidadViajeResponse, InventarioBodegaResponse, DetalleMaquinariaResponse, GenealogiaCubaResponse } from '@/types';

// Configuracion dinamica de API con soporte para variables de entorno (Next.js) y retrocompatibilidad local
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

// Parametros de control de polling para tareas asincronas de Celery
export const POLLING_INTERVAL_MS = 1000; // Consulta cada 1 segundo (evita saturacion)
export const MAX_POLLING_ATTEMPTS = 60;  // 60 segundos de timeout maximo estricto

// Helper para normalizar excepciones de red (ej. servidor apagado o conexion rechazada)
const handleNetworkError = (error: unknown, fallbackMessage: string): never => {
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    throw new Error(`No fue posible conectar con el servidor DSS en ${API_BASE_URL}. Verifique que el backend este activo.`);
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new Error(fallbackMessage);
};

export const fetchGanttData = async (): Promise<GanttDataResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gantt/`, {
      cache: 'no-store', // Garantiza datos frescos sin cachear en memoria intermedia
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener datos del Gantt (HTTP ${response.status}: ${response.statusText || 'Error del Servidor'})`);
    }
    
    return await response.json();
  } catch (error) {
    return handleNetworkError(error, 'Error al obtener datos del Gantt');
  }
};

export const fetchTrazabilidadViaje = async (viajeId: number): Promise<TrazabilidadViajeResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/trazabilidad/${viajeId}/`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener trazabilidad del viaje ${viajeId} (HTTP ${response.status})`);
    }
    
    return await response.json();
  } catch (error) {
    return handleNetworkError(error, `Error al obtener trazabilidad del viaje ${viajeId}`);
  }
};

export const fetchInventarioBodega = async (): Promise<InventarioBodegaResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/bodega/inventario/`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener inventario de bodega (HTTP ${response.status})`);
    }
    
    return await response.json();
  } catch (error) {
    return handleNetworkError(error, 'Error al obtener inventario de bodega');
  }
};

export const fetchDetalleMaquinaria = async (nombreEquipo: string): Promise<DetalleMaquinariaResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/bodega/maquinaria/${nombreEquipo}/`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Error al obtener detalle de maquinaria ${nombreEquipo} (HTTP ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    return handleNetworkError(error, `Error al obtener detalle de maquinaria ${nombreEquipo}`);
  }
};

export const fetchGenealogiaCuba = async (nombreCuba: string): Promise<GenealogiaCubaResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/bodega/cuba/${nombreCuba}/genealogia/`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Error al obtener genealogia enologica de la cuba ${nombreCuba} (HTTP ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    return handleNetworkError(error, `Error al obtener genealogia enologica de la cuba ${nombreCuba}`);
  }
};

// Polling asincrono resiliente de Celery con limite de reintentos y control de timeout
const waitForCeleryTask = (taskId: string): Promise<{status: string}> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkStatus = async () => {
      attempts++;
      try {
        const res = await fetch(`${API_BASE_URL}/task-status/${taskId}/`, {
          cache: 'no-store',
        });
        
        if (!res.ok) {
          reject(new Error(`Error en el servidor al consultar estado de la tarea (HTTP ${res.status}: ${res.statusText || 'Error'})`));
          return;
        }

        const statusData = await res.json();
        
        if (statusData.status === 'SUCCESS') {
          resolve({ status: 'Optimizacion completada exitosamente' });
          return;
        }
        
        if (statusData.status === 'FAILURE' || statusData.status === 'REVOKED') {
          const detalle = statusData.error || statusData.result || 'La optimizacion fallo en el motor matematico';
          reject(new Error(typeof detalle === 'string' ? detalle : JSON.stringify(detalle)));
          return;
        }

        // Si se supera el numero maximo de intentos (60s), abortar y liberar recursos
        if (attempts >= MAX_POLLING_ATTEMPTS) {
          reject(new Error(`Tiempo de espera agotado: El optimizador demoro mas de ${MAX_POLLING_ATTEMPTS} segundos en responder. Verifique el worker de Celery.`));
          return;
        }

        // Tarea en proceso (PENDING o STARTED): reintentar tras el intervalo controlado
        setTimeout(checkStatus, POLLING_INTERVAL_MS);
      } catch (e: unknown) {
        if (e instanceof TypeError && e.message.toLowerCase().includes('fetch')) {
          reject(new Error(`Perdida de conexion con el servidor durante el procesamiento de la tarea (${API_BASE_URL}).`));
          return;
        }
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    };

    checkStatus();
  });
};

export const simularSiguientePaso = async (): Promise<{status: string}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/simular-paso/`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Error al enviar la tarea al optimizador (HTTP ${response.status})`);
    }
    
    const data = await response.json();
    return await waitForCeleryTask(data.task_id);
  } catch (error) {
    return handleNetworkError(error, 'Error al enviar la tarea al optimizador');
  }
};

export const initSimulacion = async (): Promise<{status: string}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/init-simulacion/`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Error al inicializar la simulacion (HTTP ${response.status})`);
    }
    
    return await response.json();
  } catch (error) {
    return handleNetworkError(error, 'Error al inicializar la simulacion');
  }
};

export const fijarAsignacion = async (asignacionId: number, pozoId: number, horaInicio: string, fijado: boolean, forzarDesviacion: boolean = false): Promise<{status: string}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/asignacion/fijar/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        asignacion_id: asignacionId,
        pozo_id: pozoId,
        hora_inicio: horaInicio,
        fijado: fijado,
        forzar_desviacion: forzarDesviacion
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error al fijar la asignacion (HTTP ${response.status})`);
    }
    
    const data = await response.json();
    if (data.task_id) {
      return await waitForCeleryTask(data.task_id);
    }
    return data;
  } catch (error) {
    return handleNetworkError(error, 'Error al fijar la asignacion');
  }
};

export const toggleOperatividadPozo = async (pozoId: number): Promise<{
  status: string;
  instalacion_id: number;
  nombre: string;
  operativa: boolean;
  message: string;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/instalacion/${pozoId}/toggle-operatividad/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error al conmutar operatividad de tolva (HTTP ${response.status})`);
    }

    const data = await response.json();
    if (data.task_id) {
      await waitForCeleryTask(data.task_id);
    }
    return data;
  } catch (error) {
    return handleNetworkError(error, 'Error al conmutar operatividad de tolva');
  }
};

