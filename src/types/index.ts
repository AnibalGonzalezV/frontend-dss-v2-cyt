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

export interface EslabonTrazabilidad {
  id: number;
  etapa: number; // 1: Recepcion/Prensa, 2: Prensa/CubaPF, 3: CubaPF/FLT, 4: FLT/CubaF
  origen: string;
  destino: string;
  volumen: number;
  unidad: 'kg_solidos' | 'litros_turbio' | 'litros_clarificado' | 'unidades' | string;
  tipo_flujo: string;
  descripcion: string;
  hora_flujo: string;
}

export interface TrazabilidadViajeResponse {
  viaje_id: number;
  patente: string;
  grupo_mezcla: string;
  peso_inicial_kg: number;
  estado_actual: string;
  total_eslabones: number;
  cadena_enologica: EslabonTrazabilidad[];
}

export interface PrensaInventario {
  equipo: string;
  grupo_mezcla: string;
  estado_operativo?: 'OPERANDO' | 'RESERVADA' | 'DISPONIBLE';
  volumen: number;
  volumen_real?: number;
  volumen_proyectado?: number;
  volumen_total?: number;
  capacidad: number;
  porcentaje_ocupacion: number;
  porcentaje_real?: number;
  porcentaje_proyectado?: number;
  porcentaje_total?: number;
  fecha_actualizacion: string;
}

export interface CubaInventario {
  cuba: string;
  grupo_mezcla: string;
  estado_operativo?: 'OPERANDO' | 'RESERVADA' | 'DISPONIBLE';
  volumen_litros: number;
  volumen_real?: number;
  volumen_proyectado?: number;
  volumen_total?: number;
  capacidad_litros: number;
  porcentaje_ocupacion: number;
  porcentaje_real?: number;
  porcentaje_proyectado?: number;
  porcentaje_total?: number;
  fecha_actualizacion: string;
}

export interface ResumenBodega {
  total_equipos_ocupados?: number;
  total_prensas_ocupadas?: number;
  prensas_activas_real?: number;
  prensas_reservadas_proy?: number;
  total_cubas_ocupadas?: number;
  total_cubas_pf_ocupadas: number;
  cubas_pf_activas_real?: number;
  cubas_pf_reservadas_proy?: number;
  total_cubas_f_ocupadas: number;
  cubas_f_activas_real?: number;
  cubas_f_reservadas_proy?: number;
  volumen_real_uva_prensas_kg?: number;
  volumen_proy_uva_prensas_kg?: number;
  volumen_total_uva_prensas_kg?: number;
  volumen_real_turbio_litros?: number;
  volumen_proy_turbio_litros?: number;
  volumen_total_turbio_litros: number;
  volumen_real_clarificado_litros?: number;
  volumen_proy_clarificado_litros?: number;
  volumen_total_clarificado_litros: number;
  rendimiento_global_teorico: number;
}

export interface InventarioBodegaResponse {
  resumen: ResumenBodega;
  prensas?: PrensaInventario[];
  cubas_preflotacion: CubaInventario[];
  cubas_fermentacion: CubaInventario[];
}
