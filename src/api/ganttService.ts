import { GanttDataResponse } from '@/types';

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

// Función helper para el Polling de Celery
const waitForCeleryTask = (taskId: string): Promise<{status: string}> => {
  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/task-status/${taskId}/`);
        const statusData = await res.json();
        
        if (statusData.status === 'SUCCESS') {
          resolve({ status: 'Optimización completada' });
        } else if (statusData.status === 'FAILURE') {
          reject(new Error('La optimización falló en el worker'));
        } else {
          // Aún procesando
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
    throw new Error('Error al inicializar la simulación');
  }
  
  return response.json();
};

export const fijarAsignacion = async (asignacionId: number, pozoId: number, horaInicio: string, fijado: boolean): Promise<{status: string}> => {
  const response = await fetch(`${API_BASE_URL}/asignacion/fijar/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      asignacion_id: asignacionId,
      pozo_id: pozoId,
      hora_inicio: horaInicio,
      fijado: fijado
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al fijar la asignación');
  }
  
  const data = await response.json();
  if (data.task_id) {
    return waitForCeleryTask(data.task_id);
  }
  return data;
};
