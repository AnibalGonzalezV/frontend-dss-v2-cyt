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

export interface PrensaGantt {
  id: number;
  nombre: string;
  nombre_humano?: string;
  ala: 'ALA_IZQUIERDA' | 'ALA_DERECHA' | string;
  operativa: boolean;
  capacidad_kg: number;
  batches: BatchMaquinaria[];
}

export interface GanttDataResponse {
  reloj_virtual: string | null;
  pozos: Pozo[];
  prensas?: PrensaGantt[];
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
  nombre_humano?: string;
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
  batch_actual_kg?: number;
  batch_actual_pct?: number;
  total_procesado_kg?: number;
  numero_batch?: number;
  batches_completados?: number;
  fecha_actualizacion: string;
}

export interface CubaInventario {
  cuba: string;
  equipo?: string;
  nombre_humano?: string;
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

export interface CamionMaquinaria {
  viaje_id: number;
  patente: string;
  variedad: string;
  grupo_mezcla: string;
  estado_viaje: string;
  es_real: boolean;
  volumen_etapa: number;
  unidad: string;
  hora_flujo: string;
  origen: string;
  origen_humano?: string;
  destino: string;
  destino_humano?: string;
}

export interface BatchMaquinaria {
  numero_batch: number;
  estado_batch: 'EN_CURSO' | 'FINALIZADO' | 'PROYECTADO';
  grupo_mezcla: string;
  volumen_kg: number;
  capacidad_kg: number;
  porcentaje_ocupacion: number;
  hora_inicio: string;
  hora_fin_estimada: string;
  camiones: CamionMaquinaria[];
}

export interface FasesMaquinaria {
  en_descarga?: CamionMaquinaria[];
  finalizados?: CamionMaquinaria[];
  programados?: CamionMaquinaria[];
  recibidos?: CamionMaquinaria[];
  proyectados?: CamionMaquinaria[];
}

export interface DetalleMaquinariaResponse {
  equipo: {
    nombre: string;
    nombre_humano?: string;
    tipo: string;
    capacidad: number;
    unidad: string;
    volumen_real: number;
    volumen_proyectado: number;
    porcentaje_real: number;
    porcentaje_proyectado: number;
    estado_operativo: 'OPERANDO' | 'RESERVADA' | 'DISPONIBLE';
    grupo_mezcla: string | null;
    batch_actual_kg?: number;
    batch_actual_pct?: number;
    total_procesado_kg?: number;
    numero_batch?: number;
    batches_completados?: number;
  };
  batches?: BatchMaquinaria[];
  fases?: FasesMaquinaria;
  camiones: CamionMaquinaria[];
}

export interface FundoAporte {
  fundo: string;
  productor: string;
  variedad: string;
  grupo_mezcla: string;
  volumen_litros: number;
  kilos_uva_origen: number;
  porcentaje_aporte: number;
  camiones_count: number;
  patentes: string[];
}

export interface CamionContribuyenteCuba {
  viaje_id: number;
  patente: string;
  productor: string;
  fundo: string;
  variedad: string;
  grupo_mezcla: string;
  estado_viaje: string;
  es_real: boolean;
  volumen_aportado_litros: number;
  kilos_uva_solida: number;
  hora_flujo: string;
  pozo_origen?: string | null;
  prensa_origen?: string | null;
  cuba_pf_origen?: string | null;
  flotador_origen?: string | null;
}

export interface GenealogiaCubaResponse {
  cuba: {
    nombre: string;
    nombre_humano: string;
    tipo: 'CUBA_PREFLOTACION' | 'CUBA_FERMENTACION';
    capacidad_litros: number;
    volumen_real_litros: number;
    volumen_proyectado_litros: number;
    volumen_total_litros: number;
    porcentaje_real: number;
    porcentaje_proyectado: number;
    porcentaje_total: number;
    estado_operativo: 'OPERANDO' | 'RESERVADA' | 'DISPONIBLE';
    grupo_mezcla_principal: string;
    variedad_principal: string;
    pureza_varietal: {
      es_puro: boolean;
      porcentaje_pureza: number;
      grupos_detectados: string[];
      variedades_detectadas: string[];
    };
  };
  balance_masa: {
    uva_solida_cosechada_kg: number;
    mosto_turbio_extraido_litros: number;
    mosto_clarificado_obtenido_litros: number;
    merma_orujo_kg: number;
    merma_borras_litros: number;
    rendimiento_global_observado: number;
    rendimiento_teorico_estandar: number;
  };
  ruta_fisica: {
    pozos: string[];
    prensas: string[];
    cubas_preflotacion: string[];
    flotadores: string[];
  };
  fundos_procedencia: FundoAporte[];
  camiones_contribuyentes: CamionContribuyenteCuba[];
}

