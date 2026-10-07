export interface CamionPatio {
  viaje_id: number;
  patente: string;
  grupo: string;
  peso_kg: number;
  hora_llegada: string | null;
  estado: string;
}

export interface BloqueGantt {
  id: number;
  viaje_id: number;
  patente: string;
  grupo: string;
  peso_kg: number;
  hora_inicio: string;
  hora_fin: string;
  espera_hrs: number;
  es_tentativo: boolean;
  estado: string;
  override_manual?: boolean;
}

export interface Pozo {
  id: number;
  nombre: string;
  operativa: boolean;
  asignaciones: BloqueGantt[];
}

export interface Kpis {
  procesados: number;
  en_patio: number;
  descargando: number;
  en_ruta: number;
  atrasados: number;
  espera_max_hrs: number;
  total_dia: number;
}

export interface GanttDataResponse {
  reloj_virtual: string | null;
  pozos: Pozo[];
  cola_patio: CamionPatio[];
  kpis?: Kpis;
}
