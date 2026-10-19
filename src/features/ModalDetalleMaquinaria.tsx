'use client';

import React, { useEffect, useState } from 'react';
import { DetalleMaquinariaResponse, CamionMaquinaria, BatchMaquinaria } from '@/types';
import { fetchDetalleMaquinaria } from '@/api/ganttService';
import { getGroupColor } from '@/utils/colors';
import { formatearNombreEquipo, formatearTipoEquipo } from '@/utils/formatters';

interface ModalDetalleMaquinariaProps {
  nombreEquipo: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectViaje?: (viajeId: number) => void;
}

const formatHora = (isoStr?: string) => {
  if (!isoStr) return '--:--';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoStr;
  }
};

export const ModalDetalleMaquinaria: React.FC<ModalDetalleMaquinariaProps> = ({
  nombreEquipo,
  isOpen,
  onClose,
  onSelectViaje,
}) => {
  const [data, setData] = useState<DetalleMaquinariaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && nombreEquipo) {
      setLoading(true);
      setError(null);
      fetchDetalleMaquinaria(nombreEquipo)
        .then((res) => {
          setData(res);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError(`No fue posible recuperar el detalle del equipo ${nombreEquipo}.`);
          setLoading(false);
        });
    } else {
      setData(null);
    }
  }, [isOpen, nombreEquipo]);

  if (!isOpen) return null;

  const equipo = data?.equipo;
  const batches = data?.batches || [];
  const fases = data?.fases;
  const camiones = data?.camiones || [];

  const colorClases = equipo?.grupo_mezcla ? getGroupColor(equipo.grupo_mezcla) : 'bg-slate-700 text-white';
  const nombreVisible = equipo?.nombre_humano || formatearNombreEquipo(equipo?.nombre || nombreEquipo);
  const esPrensa = (equipo?.nombre || nombreEquipo || '').startsWith('PR_');
  const esPozo = (equipo?.nombre || nombreEquipo || '').startsWith('P_');
  const esCuba = (equipo?.nombre || nombreEquipo || '').startsWith('Cuba');

  // Tabla reutilizable de camiones
  const renderTablaCamiones = (lista: CamionMaquinaria[], subtitulo?: string) => {
    if (lista.length === 0) {
      return (
        <div className="py-4 px-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center text-slate-500 text-xs font-mono">
          No hay camiones registrados en esta categoría.
        </div>
      );
    }

    return (
      <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
        {subtitulo && (
          <div className="bg-slate-50 px-3.5 py-1.5 border-b border-slate-200 text-[11px] font-bold text-slate-700 font-mono">
            {subtitulo} ({lista.length} camiones)
          </div>
        )}
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-800 font-mono text-xs uppercase border-b border-slate-300">
            <tr>
              <th className="px-3.5 py-2 font-extrabold">Patente</th>
              <th className="px-3.5 py-2 font-extrabold">Variedad / Mezcla</th>
              <th className="px-3.5 py-2 font-extrabold">Origen &rarr; Destino</th>
              <th className="px-3.5 py-2 text-right font-extrabold">Volumen</th>
              <th className="px-3.5 py-2 font-extrabold">Hora Ingreso</th>
              <th className="px-3.5 py-2 font-extrabold">Estado / Certidumbre</th>
              <th className="px-3.5 py-2 text-center font-extrabold">Auditoría</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {lista.map((c, idx) => {
              const grpClass = getGroupColor(c.grupo_mezcla);
              const origNom = c.origen_humano || formatearNombreEquipo(c.origen);
              const destNom = c.destino_humano || formatearNombreEquipo(c.destino);

              return (
                <tr key={`${c.viaje_id}-${c.hora_flujo}-${idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3.5 py-2 font-black text-slate-950">{c.patente}</td>
                  <td className="px-3.5 py-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${grpClass}`}>
                      {c.grupo_mezcla}
                    </span>
                  </td>
                  <td className="px-3.5 py-2 text-slate-700">
                    <span className="font-bold text-slate-900">{origNom}</span> &rarr; {destNom}
                  </td>
                  <td className="px-3.5 py-2 text-right font-black text-slate-950">
                    {c.volumen_etapa.toLocaleString('es-CL')} {c.unidad}
                  </td>
                  <td className="px-3.5 py-2 text-slate-700 font-medium">
                    {formatHora(c.hora_flujo)} hrs
                  </td>
                  <td className="px-3.5 py-2">
                    {c.estado_viaje === 'DESCARGANDO' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                        EN DESCARGA REAL
                      </span>
                    ) : c.es_real ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                        FINALIZADO REAL
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
                        PROGRAMADO (MPC)
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectViaje) {
                          onSelectViaje(c.viaje_id);
                        }
                      }}
                      className="text-xs font-sans font-bold bg-slate-900 hover:bg-blue-600 text-white px-3 py-1 rounded-md transition-colors shadow-2xs cursor-pointer"
                    >
                      Auditar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
                {formatearTipoEquipo(equipo?.tipo)}
              </span>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h2 className="text-xl font-black tracking-tight text-white">{nombreVisible}</h2>
                {equipo && (
                  <span
                    className={`text-xs font-mono font-extrabold px-2.5 py-0.5 rounded border ${
                      equipo.estado_operativo === 'OPERANDO'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : equipo.estado_operativo === 'RESERVADA'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {equipo.estado_operativo === 'OPERANDO'
                      ? 'OPERACIÓN FÍSICA REAL'
                      : equipo.estado_operativo === 'RESERVADA'
                      ? 'RESERVADA (PREDICCIÓN MPC)'
                      : 'DISPONIBLE'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-600">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-mono font-bold">Consultando auditoría de maquinaria en bodega...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-xl text-red-800 text-sm font-bold">
              {error}
            </div>
          )}

          {!loading && !error && equipo && (
            <>
              {/* Tarjetas de Métricas de Ocupación con Alto Contraste */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-300 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Grupo Varietal</span>
                  <div className="mt-1">
                    {equipo.grupo_mezcla ? (
                      <span className={`inline-block text-xs font-extrabold px-2.5 py-0.5 rounded border ${colorClases}`}>
                        {equipo.grupo_mezcla}
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-slate-500 font-bold">Limpia / Sin uva</span>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-300 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    {esPrensa ? 'Capacidad Batch' : 'Capacidad Nominal'}
                  </span>
                  <span className="text-base font-black font-mono text-slate-950 mt-1">
                    {equipo.capacidad.toLocaleString('es-CL')} {equipo.unidad}
                  </span>
                </div>

                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                  <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                    {esPrensa ? 'Batch Actual en Curso' : 'Volumen Real Físico'}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-base font-black font-mono text-emerald-950">
                      {(equipo.batch_actual_kg ?? equipo.volumen_real).toLocaleString('es-CL')} {equipo.unidad}
                    </span>
                    <span className="text-xs font-extrabold font-mono text-emerald-800">
                      ({(equipo.batch_actual_pct ?? equipo.porcentaje_real).toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-300 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                  <span className="text-xs font-extrabold text-blue-950 uppercase tracking-wider">
                    {esPrensa ? 'Total Diario Procesado' : 'Volumen Proyectado MPC'}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    {esPrensa ? (
                      <span className="text-base font-black font-mono text-blue-950">
                        {((equipo.total_procesado_kg ?? equipo.volumen_real) / 1000).toFixed(1)} Ton
                        <span className="text-xs font-bold text-slate-600 font-sans ml-1">
                          ({equipo.batches_completados ?? 0} batches)
                        </span>
                      </span>
                    ) : (
                      <>
                        <span className="text-base font-black font-mono text-blue-950">
                          +{equipo.volumen_proyectado.toLocaleString('es-CL')} {equipo.unidad}
                        </span>
                        <span className="text-xs font-extrabold font-mono text-blue-800">
                          ({equipo.porcentaje_proyectado.toFixed(1)}%)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Barra Visual de Llenado Segregado */}
              <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-extrabold text-slate-900">
                    {esPrensa
                      ? `Llenado Batch #${equipo.numero_batch ?? 1} (Lote en Curso):`
                      : 'Estado de Llenado Total:'}
                  </span>
                  <span className="font-black text-slate-950">
                    {esPrensa
                      ? `${(equipo.batch_actual_pct ?? equipo.porcentaje_real).toFixed(1)}% de capacidad batch (80 Ton)`
                      : `${Math.min(100, equipo.porcentaje_real + equipo.porcentaje_proyectado).toFixed(1)}% de capacidad nominal`}
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden flex border border-slate-300">
                  <div
                    className="bg-emerald-600 h-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        esPrensa ? (equipo.batch_actual_pct ?? equipo.porcentaje_real) : equipo.porcentaje_real
                      )}%`,
                    }}
                    title={`Físico Real: ${(esPrensa ? (equipo.batch_actual_kg ?? equipo.volumen_real) : equipo.volumen_real).toLocaleString('es-CL')} ${equipo.unidad}`}
                  />
                  {!esPrensa && equipo.porcentaje_proyectado > 0 && (
                    <div
                      className="bg-blue-500 h-full transition-all duration-500 opacity-80"
                      style={{ width: `${Math.min(100 - equipo.porcentaje_real, equipo.porcentaje_proyectado)}%` }}
                      title={`Proyectado MPC: ${equipo.volumen_proyectado.toLocaleString('es-CL')} ${equipo.unidad}`}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-slate-700 font-mono pt-1 gap-2">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                      {esPrensa
                        ? `Físico en Batch Actual (${(equipo.batch_actual_kg ?? equipo.volumen_real).toLocaleString('es-CL')} ${equipo.unidad} de ${equipo.grupo_mezcla || 'uva'})`
                        : `Físico Real (${equipo.volumen_real.toLocaleString('es-CL')} ${equipo.unidad})`}
                    </span>
                    {!esPrensa && equipo.volumen_proyectado > 0 && (
                      <span className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                        Proyectado MPC (+{equipo.volumen_proyectado.toLocaleString('es-CL')} {equipo.unidad})
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-800">
                    {esPrensa
                      ? `Disponible en este ciclo: ${Math.max(0, 80000 - (equipo.batch_actual_kg ?? equipo.volumen_real)).toLocaleString('es-CL')} kg`
                      : `Disponible: ${Math.max(0, equipo.capacidad - equipo.volumen_real - equipo.volumen_proyectado).toLocaleString('es-CL')} ${equipo.unidad}`}
                  </span>
                </div>
                {esPrensa && (
                  <p className="text-[11px] text-slate-500 font-sans italic border-t border-slate-100 pt-1.5">
                    Nota Enológica: La capacidad batch está acotada estrictamente a la variedad en curso ({equipo.grupo_mezcla || 'asignada'}). Los camiones programados de otras variedades se procesarán en ciclos batch independientes una vez concluido el prensado actual.
                  </p>
                )}
              </div>

              {/* SECCIÓN DETALLADA: CICLOS BATCH PARA PRENSAS */}
              {esPrensa && batches.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div>
                      <h3 className="text-sm font-black font-mono text-slate-950 uppercase tracking-wide">
                        Ciclos Batch de Prensado ({batches.length} Lotes Registrados en el Día)
                      </h3>
                      <p className="text-xs text-slate-600 font-medium">
                        Cada batch opera de forma independiente y cerrada, con estricta pureza varietal y vaciado de orujo.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {batches.map((b) => {
                      const colorGrp = getGroupColor(b.grupo_mezcla);
                      const esActivo = b.estado_batch === 'EN_CURSO';
                      const esFin = b.estado_batch === 'FINALIZADO';

                      return (
                        <div
                          key={`batch-${b.numero_batch}`}
                          className={`rounded-xl border p-4 transition-all shadow-2xs ${
                            esActivo
                              ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-300'
                              : esFin
                              ? 'border-slate-300 bg-white'
                              : 'border-dashed border-blue-400 bg-blue-50/20'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 mb-3">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm font-black text-slate-950">
                                Batch #{b.numero_batch}
                              </span>
                              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded border ${colorGrp}`}>
                                {b.grupo_mezcla}
                              </span>
                              <span
                                className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded border ${
                                  esActivo
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 animate-pulse'
                                    : esFin
                                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                                    : 'bg-blue-100 text-blue-900 border-blue-300'
                                }`}
                              >
                                {esActivo
                                  ? 'EN OPERACIÓN ACTIVA'
                                  : esFin
                                  ? 'CICLO COMPLETADO Y DESCARGADO'
                                  : 'PRÓXIMO CICLO PROGRAMADO'}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-mono">
                              <span className="font-extrabold text-slate-900">
                                {b.volumen_kg.toLocaleString('es-CL')} kg / 80.000 kg ({b.porcentaje_ocupacion}%)
                              </span>
                              <span className="text-slate-600 font-medium">
                                Horario: {formatHora(b.hora_inicio)} a {formatHora(b.hora_fin_estimada)} hrs
                              </span>
                            </div>
                          </div>

                          <div className="mb-2 text-xs text-slate-600 font-sans">
                            {esFin && (
                              <p className="bg-slate-100/70 text-slate-700 p-2 rounded-lg border border-slate-200">
                                Este lote de uva {b.grupo_mezcla} completó su ciclo de prensado neumático. La membrana fue desinflada, el orujo evacuado y la prensa quedó disponible y lavada.
                              </p>
                            )}
                            {esActivo && (
                              <p className="bg-emerald-100/60 text-emerald-900 p-2 rounded-lg border border-emerald-200 font-medium">
                                Lote físico actualmente en prensa. La uva recibida corresponde estrictamente a la variedad {b.grupo_mezcla}.
                              </p>
                            )}
                            {!esFin && !esActivo && (
                              <p className="bg-blue-100/60 text-blue-900 p-2 rounded-lg border border-blue-200">
                                Programación optimizada (MPC). Este lote iniciará una vez que el batch en curso haya sido completamente descargado y la prensa lavada.
                              </p>
                            )}
                          </div>

                          {renderTablaCamiones(b.camiones)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECCIÓN DETALLADA: FASES OPERATIVAS PARA POZOS */}
              {esPozo && fases && (
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-black font-mono text-slate-950 uppercase tracking-wide">
                      Flujo Operativo de Recepción en Pozo
                    </h3>
                  </div>

                  {fases.en_descarga && fases.en_descarga.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold font-mono text-amber-950 uppercase">
                        Descarga Activa en Tolva
                      </span>
                      {renderTablaCamiones(fases.en_descarga)}
                    </div>
                  )}

                  {fases.finalizados && fases.finalizados.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold font-mono text-emerald-950 uppercase">
                        Historial de Camiones Descargados en la Jornada ({fases.finalizados.length})
                      </span>
                      {renderTablaCamiones(fases.finalizados)}
                    </div>
                  )}

                  {fases.programados && fases.programados.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold font-mono text-blue-950 uppercase">
                        Próximos Camiones Programados ({fases.programados.length})
                      </span>
                      {renderTablaCamiones(fases.programados)}
                    </div>
                  )}
                </div>
              )}

              {/* SECCIÓN DETALLADA: CUBAS DE BODEGA (PREF Y FERMENTACIÓN) */}
              {esCuba && fases && (
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-black font-mono text-slate-950 uppercase tracking-wide">
                      Trazabilidad de Lotes Ingresados y Proyectados
                    </h3>
                  </div>

                  {fases.recibidos && fases.recibidos.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold font-mono text-emerald-950 uppercase">
                        Lotes Físicos Almacenados ({fases.recibidos.length})
                      </span>
                      {renderTablaCamiones(fases.recibidos)}
                    </div>
                  )}

                  {fases.proyectados && fases.proyectados.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold font-mono text-blue-950 uppercase">
                        Lotes Proyectados en Tránsito ({fases.proyectados.length})
                      </span>
                      {renderTablaCamiones(fases.proyectados)}
                    </div>
                  )}
                </div>
              )}

              {/* FALLBACK: TABLA PLANA SI NO HAY BATCHES NI FASES */}
              {!esPrensa && !esPozo && !esCuba && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black font-mono text-slate-950 uppercase tracking-wide">
                      Camiones y Lotes de Vendimia Asociados ({camiones.length})
                    </h3>
                    <span className="text-xs text-slate-600 font-mono font-bold">
                      Trazabilidad determinista por balance de masa
                    </span>
                  </div>
                  {renderTablaCamiones(camiones)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-300 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-600 font-mono font-bold">
            Plataforma DSS Vendimia 2026 - Módulo Bodega y Flotación
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
