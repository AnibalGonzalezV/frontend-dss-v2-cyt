import { GanttDataResponse, TrazabilidadViajeResponse, InventarioBodegaResponse, DetalleMaquinariaResponse } from '@/types';

const API_BASE_URL = 'http://localhost:8080/api/v1';

export const fetchGanttData = async (): Promise<GanttDataResponse> => {
  const response = await fetch(`${API_BASE_URL}/gantt/`, {
    cache: 'no-store', // Ensures we always get fresh data
  });
  
  if (!response.ok) {
    throw new Error('Error al obtener datos del Gantt');
  }
  
  return response.json();
};

export const fetchTrazabilidadViaje = async (viajeId: number): Promise<TrazabilidadViajeResponse> => {
  const response = await fetch(`${API_BASE_URL}/trazabilidad/${viajeId}/`, {
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error(`Error al obtener trazabilidad del viaje ${viajeId}`);
  }
  
  return response.json();
};

export const fetchInventarioBodega = async (): Promise<InventarioBodegaResponse> => {
  const response = await fetch(`${API_BASE_URL}/bodega/inventario/`, {
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error('Error al obtener inventario de bodega');
  }
  
  return response.json();
};

export const fetchDetalleMaquinaria = async (nombreEquipo: string): Promise<DetalleMaquinariaResponse> => {
  const response = await fetch(`${API_BASE_URL}/bodega/maquinaria/${nombreEquipo}/`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Error al obtener detalle de maquinaria ${nombreEquipo}`);
  }

  return response.json();
};

// Funcin helper para el Polling de Celery
const waitForCeleryTask = (taskId: string): Promise<{status: string}> => {
  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/task-status/${taskId}/`);
        const statusData = await res.json();
        
        if (statusData.status === 'SUCCESS') {
          resolve({ status: 'Optimizacin completada' });
        } else if (statusData.status === 'FAILURE') {
          reject(new Error('La optimizacin fall en el worker'));
        } else {
          // Aǧn procesando
          setTimeout(checkStatus, 500);
        }
      } catch (e) {
        reject(e);
      }
    };
    checkStatus();
  });
};

export const simularSiguientePaso = async (): Promise<{status: string}> => {
  const response = await fetch(`${API_BASE_URL}/simular-paso/`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error('Error al enviar la tarea al optimizador');
  }
  
  const data = await response.json();
  return waitForCeleryTask(data.task_id);
};

export const initSimulacion = async (): Promise<{status: string}> => {
  const response = await fetch(`${API_BASE_URL}/init-simulacion/`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error('Error al inicializar la simulacin');
  }
  
  return response.json();
};

export const fijarAsignacion = async (asignacionId: number, pozoId: number, horaInicio: string, fijado: boolean, forzarDesviacion: boolean = false): Promise<{status: string}> => {
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
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al fijar la asignacin');
  }
  
  const data = await response.json();
  if (data.task_id) {
    return waitForCeleryTask(data.task_id);
  }
  return data;
};
