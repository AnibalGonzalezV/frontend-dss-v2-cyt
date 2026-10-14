'use client';

import React, { useEffect, useState } from 'react';
import { DetalleMaquinariaResponse } from '@/types';
import { fetchDetalleMaquinaria } from '@/api/ganttService';
import { getGroupColor } from '@/utils/colors';

interface ModalDetalleMaquinariaProps {
  nombreEquipo: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectViaje?: (viajeId: number) => void;
}

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
  const camiones = data?.camiones || [];
  const colorClases = equipo?.grupo_mezcla ? getGroupColor(equipo.grupo_mezcla) : 'bg-slate-700 text-white';

  const formatTipo = (tipo?: string) => {
    switch (tipo) {
      case 'PRENSA':
        return 'Prensa Neumática Industrial (80 Ton)';
      case 'CUBA_PREFLOTACION':
        return 'Cuba Pulmón de Pre-Flotación';
      case 'FLOTADOR':
        return 'Clarificador Continuo de Flotación (50k L/h)';
      case 'CUBA_FLOTACION':
        return 'Cuba de Fermentación Alcohólica Final';
      case 'POZO':
        return 'Pozo de Recepción y Descarga de Uva';
      default:
        return 'Maquinaria de Vendimia';
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                {formatTipo(equipo?.tipo)}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-xl font-black tracking-tight text-white">{equipo?.nombre || nombreEquipo}</h2>
                {equipo && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      equipo.estado_operativo === 'OPERANDO'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : equipo.estado_operativo === 'RESERVADA'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-slate-700/50 text-slate-300 border-slate-600'
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-mono font-medium">Consultando auditoría de maquinaria en bodega...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {!loading && !error && equipo && (
            <>
              {/* Tarjetas de Métricas de Ocupación */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Grupo de Mezcla</span>
                  <div className="mt-1">
                    {equipo.grupo_mezcla ? (
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded border ${colorClases}`}>
                        {equipo.grupo_mezcla}
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-slate-400 font-medium">Sin grupo asignado</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Capacidad Nominal</span>
                  <span className="text-base font-black font-mono text-slate-800 mt-1">
                    {equipo.capacidad.toLocaleString('es-CL')} {equipo.unidad}
                  </span>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Volumen Real Físico</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-base font-black font-mono text-emerald-900">
                      {equipo.volumen_real.toLocaleString('es-CL')} {equipo.unidad}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-emerald-600">
                      ({equipo.porcentaje_real.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Volumen Proyectado MPC</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-base font-black font-mono text-blue-900">
                      +{equipo.volumen_proyectado.toLocaleString('es-CL')} {equipo.unidad}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-blue-600">
                      ({equipo.porcentaje_proyectado.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra Visual de Llenado Segregado */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-slate-700">Estado de Llenado Total:</span>
                  <span className="font-black text-slate-900">
                    {(equipo.porcentaje_real + equipo.porcentaje_proyectado).toFixed(1)}% de capacidad
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex border border-slate-200">
                  <div
                    className="bg-emerald-600 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, equipo.porcentaje_real)}%` }}
                    title={`Físico Real: ${equipo.volumen_real.toLocaleString('es-CL')} ${equipo.unidad}`}
                  />
                  <div
                    className="bg-blue-400 h-full transition-all duration-500 opacity-80"
                    style={{ width: `${Math.min(100 - equipo.porcentaje_real, equipo.porcentaje_proyectado)}%` }}
                    title={`Proyectado MPC: ${equipo.volumen_proyectado.toLocaleString('es-CL')} ${equipo.unidad}`}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                      Físico Real ({equipo.volumen_real.toLocaleString('es-CL')} {equipo.unidad})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
                      Proyectado MPC (+{equipo.volumen_proyectado.toLocaleString('es-CL')} {equipo.unidad})
                    </span>
                  </div>
                  <span>
                    Disponible: {Math.max(0, equipo.capacidad - equipo.volumen_real - equipo.volumen_proyectado).toLocaleString('es-CL')} {equipo.unidad}
                  </span>
                </div>
              </div>

              {/* Tabla de Camiones y Lotes Asociados */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-wide">
                    Camiones y Lotes de Vendimia Asociados ({camiones.length})
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Trazabilidad por balance de masa y secuenciación MILP
                  </span>
                </div>

                {camiones.length === 0 ? (
                  <div className="py-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-slate-400 text-xs font-mono">
                    No se registran camiones ni descargas asociadas a este equipo en la ventana actual.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-mono text-[10px] uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5">Patente</th>
                          <th className="px-3 py-2.5">Variedad / Mezcla</th>
                          <th className="px-3 py-2.5">Origen &rarr; Destino</th>
                          <th className="px-3 py-2.5 text-right">Volumen</th>
                          <th className="px-3 py-2.5">Hora Flujo</th>
                          <th className="px-3 py-2.5">Certidumbre</th>
                          <th className="px-3 py-2.5 text-center">Auditoría</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {camiones.map((c, idx) => {
                          const grpClass = getGroupColor(c.grupo_mezcla);
                          return (
                            <tr key={`${c.viaje_id}-${c.hora_flujo}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-3 py-2 font-bold text-slate-900">{c.patente}</td>
                              <td className="px-3 py-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${grpClass}`}>
                                  {c.grupo_mezcla}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                <span className="font-semibold text-slate-800">{c.origen}</span> &rarr; {c.destino}
                              </td>
                              <td className="px-3 py-2 text-right font-black text-slate-900">
                                {c.volumen_etapa.toLocaleString('es-CL')} {c.unidad}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {new Date(c.hora_flujo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-3 py-2">
                                {c.es_real ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    FÍSICO REAL
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                                    PROYECTADO MPC
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onSelectViaje) {
                                      onSelectViaje(c.viaje_id);
                                    }
                                  }}
                                  className="text-[11px] font-sans font-bold bg-slate-900 hover:bg-blue-600 text-white px-2.5 py-1 rounded-md transition-colors shadow-2xs"
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
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            Plataforma DSS Vendimia 2026 - Módulo Bodega y Flotación
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
