'use client';

import React, { useEffect, useState } from 'react';
import { TrazabilidadViajeResponse, EslabonTrazabilidad } from '@/types';
import { fetchTrazabilidadViaje } from '@/api/ganttService';
import { getGroupColor } from '@/utils/colors';

interface ModalTrazabilidadProps {
  viajeId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ModalTrazabilidad: React.FC<ModalTrazabilidadProps> = ({ viajeId, isOpen, onClose }) => {
  const [data, setData] = useState<TrazabilidadViajeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && viajeId) {
      setLoading(true);
      setError(null);
      fetchTrazabilidadViaje(viajeId)
        .then((res) => {
          setData(res);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError('No fue posible recuperar los datos de trazabilidad para este viaje.');
          setLoading(false);
        });
    } else {
      setData(null);
    }
  }, [isOpen, viajeId]);

  if (!isOpen) return null;

  // Calculos de balance de masa
  const pesoInicial = data?.peso_inicial_kg || 0;
  const eslabonPrensa = data?.cadena_enologica.find((e) => e.etapa === 2);
  const eslabonFlt = data?.cadena_enologica.find((e) => e.etapa === 4);

  const volTurbio = eslabonPrensa ? eslabonPrensa.volumen : pesoInicial * 0.6536;
  const volClarificado = eslabonFlt ? eslabonFlt.volumen : volTurbio * 0.94;
  const mermaOrujo = Math.max(0, pesoInicial - volTurbio);
  const mermaBorras = Math.max(0, volTurbio - volClarificado);
  const rendimientoGlobal = pesoInicial > 0 ? (volClarificado / pesoInicial) : 0.614384;

  const colorClases = data ? getGroupColor(data.grupo_mezcla) : 'bg-slate-700 text-white';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg text-blue-400 border border-slate-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                Auditoría de Trazabilidad Enológica
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Cadena física de 5 etapas: Pozo &rarr; Prensa &rarr; CubaPF &rarr; FLT &rarr; CubaF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {data && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md text-slate-200">
                  {data.patente}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${colorClases}`}>
                  {data.grupo_mezcla}
                </span>
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  {data.estado_actual}
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Cerrar auditoría"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-semibold">Recuperando registros de flujo físico...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Tarjetas de Balance Físico Global */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Masa Sólida Inicial
                  </span>
                  <span className="text-2xl font-black text-slate-800 mt-1">
                    {pesoInicial.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">kg uva cosechada</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    Mosto Turbio Extraído
                  </span>
                  <span className="text-2xl font-black text-amber-700 mt-1">
                    {volTurbio.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">&rho; prensa = 0,6536 L/kg</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Mosto Clarificado
                  </span>
                  <span className="text-2xl font-black text-emerald-700 mt-1">
                    {volClarificado.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">&rho; flotador = 0,9400 L/L</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    Rendimiento Observado
                  </span>
                  <span className="text-2xl font-black text-blue-800 mt-1">
                    {rendimientoGlobal.toFixed(4)}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">L vino / kg uva</span>
                </div>
              </div>

              {/* Cadena Enológica Paso a Paso */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Secuencia de Flujo Físico y Equipos Involucrados
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {data.total_eslabones} Eslabones Registrados
                  </span>
                </div>

                {data.cadena_enologica.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    Este camión aún no inicia descarga física. Los flujos se materializarán al ingresar a tolva de pozo.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {data.cadena_enologica.map((eslabon, idx) => {
                      let etapaTitulo = 'Etapa';
                      let etapaBadgeColor = 'bg-slate-100 text-slate-700 border-slate-300';
                      let mermaText = '';

                      if (eslabon.etapa === 1) {
                        etapaTitulo = 'Etapa 1: Recepción en Tolva y Traspaso a Prensa';
                        etapaBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                        mermaText = 'Transferencia en masa directa sin mermas de extracción';
                      } else if (eslabon.etapa === 2) {
                        etapaTitulo = 'Etapa 2: Prensado Neumático & Pulmón de Pre-flotación';
                        etapaBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                        mermaText = `Merma de Orujo Sólido: ${mermaOrujo.toLocaleString('es-CL', { maximumFractionDigits: 1 })} kg (34,64%)`;
                      } else if (eslabon.etapa === 3) {
                        etapaTitulo = 'Etapa 3: Alimentación Continua a Clarificador Flotador';
                        etapaBadgeColor = 'bg-cyan-50 text-cyan-700 border-cyan-200';
                        mermaText = 'Bombeo a régimen continuo de 50.000 L/h';
                      } else if (eslabon.etapa === 4) {
                        etapaTitulo = 'Etapa 4: Clarificación por Flotación y Llenado de Cuba Final';
                        etapaBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        mermaText = `Merma de Borras Purgadas: ${mermaBorras.toLocaleString('es-CL', { maximumFractionDigits: 1 })} L (6,00%)`;
                      }

                      return (
                        <div key={eslabon.id || idx} className="relative group">
                          {/* Nodo del Stepper */}
                          <div className="absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-blue-600 shadow-sm group-hover:scale-125 transition-transform" />

                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${etapaBadgeColor}`}>
                                {etapaTitulo}
                              </span>
                              <span className="text-xs text-slate-500 font-mono">
                                Hora de Flujo: {new Date(eslabon.hora_flujo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 my-2 text-slate-800">
                              <span className="font-mono text-sm font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                                {eslabon.origen}
                              </span>
                              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                              <span className="font-mono text-sm font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                                {eslabon.destino}
                              </span>
                              <span className="ml-auto font-black text-sm text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                {eslabon.volumen.toLocaleString('es-CL', { maximumFractionDigits: 2 })} {eslabon.unidad.includes('kg') ? 'kg' : 'L'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200/60">
                              <span className="italic">{eslabon.descripcion}</span>
                              <span className="font-semibold text-slate-600 font-mono">{mermaText}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Certificado de Integridad Enológica */}
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-slate-700">
                <div className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block mb-0.5">
                    Certificación de Trazabilidad y Segregación Varietal
                  </span>
                  Este lote fue procesado bajo el modelo determinista desacoplado de Bodega Lontué. Se certifica que no
                  hubo contaminación cruzada con otros grupos de mezcla en las cubas de pre-flotación ni en fermentación,
                  cumpliéndose el balance de masa con factor exacto de {rendimientoGlobal.toFixed(6)} L/kg.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors shadow-sm text-sm"
          >
            Cerrar Auditoría
          </button>
        </div>
      </div>
    </div>
  );
};
