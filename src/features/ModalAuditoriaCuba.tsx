'use client';

import React, { useEffect, useState } from 'react';
import { GenealogiaCubaResponse } from '@/types';
import { fetchGenealogiaCuba } from '@/api/ganttService';
import { getGroupColor } from '@/utils/colors';

interface ModalAuditoriaCubaProps {
  nombreCuba: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectViaje?: (viajeId: number) => void;
}

export const ModalAuditoriaCuba: React.FC<ModalAuditoriaCubaProps> = ({
  nombreCuba,
  isOpen,
  onClose,
  onSelectViaje,
}) => {
  const [data, setData] = useState<GenealogiaCubaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && nombreCuba) {
      setLoading(true);
      setError(null);
      fetchGenealogiaCuba(nombreCuba)
        .then((res) => {
          setData(res);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError(`No se pudo recuperar la genealogía enológica para ${nombreCuba}`);
          setLoading(false);
        });
    } else {
      setData(null);
    }
  }, [isOpen, nombreCuba]);

  if (!isOpen) return null;

  const cuba = data?.cuba;
  const balance = data?.balance_masa;
  const ruta = data?.ruta_fisica;
  const fundos = data?.fundos_procedencia || [];
  const camiones = data?.camiones_contribuyentes || [];

  const colorGrupo = cuba ? getGroupColor(cuba.grupo_mezcla_principal) : 'bg-slate-700 text-white';
  const esAlertaCapacidad = (cuba?.porcentaje_total ?? 0) >= 95.0;
  const bufferRestante = cuba ? Math.max(0, cuba.capacidad_litros - cuba.volumen_total_litros) : 0;

  const formatHora = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950/80 rounded-xl text-emerald-400 border border-emerald-700/60 shadow-xs">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Ficha Enológica y Genealogía de Estanque
                </h2>
                {cuba && (
                  <span
                    className={`text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded border ${
                      cuba.estado_operativo === 'OPERANDO'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : cuba.estado_operativo === 'RESERVADA'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {cuba.estado_operativo === 'OPERANDO'
                      ? 'CON MOSTO FÍSICO REAL'
                      : cuba.estado_operativo === 'RESERVADA'
                      ? 'RESERVADA (PREDICCIÓN MPC)'
                      : 'DISPONIBLE'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-mono">
                {cuba?.nombre_humano || nombreCuba} | Capacidad Nominal: {cuba?.capacidad_litros.toLocaleString('es-CL')} L
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {cuba && (
              <span className={`text-xs font-black px-3 py-1 rounded-md border ${colorGrupo}`}>
                {cuba.grupo_mezcla_principal}: {cuba.variedad_principal}
              </span>
            )}
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cerrar auditoría"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cuerpo del Modal con Scroll */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-600">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-mono font-bold">Reconstruyendo genealogía enológica y balance de masa...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-xl text-red-800 text-sm font-bold">
              {error}
            </div>
          )}

          {!loading && !error && cuba && (
            <>
              {/* Tarjetas Superiores de Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Capacidad Máxima
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black font-mono text-slate-950">
                      {cuba.capacidad_litros.toLocaleString('es-CL')}
                    </span>
                    <span className="text-xs font-bold text-slate-600 font-mono">Litros</span>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                  <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                    Mosto Físico Real
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black font-mono text-emerald-950">
                      {cuba.volumen_real_litros.toLocaleString('es-CL')}
                    </span>
                    <span className="text-xs font-bold text-emerald-800 font-mono">
                      L ({cuba.porcentaje_real.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-300 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                  <span className="text-xs font-extrabold text-blue-950 uppercase tracking-wider">
                    Proyección Tentativa MPC
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black font-mono text-blue-950">
                      +{cuba.volumen_proyectado_litros.toLocaleString('es-CL')}
                    </span>
                    <span className="text-xs font-bold text-blue-800 font-mono">
                      L ({cuba.porcentaje_proyectado.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                  <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                    Certificación de Pureza
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-base font-black font-mono text-amber-950">
                      {cuba.pureza_varietal.porcentaje_pureza}%
                    </span>
                    <span className="text-xs font-bold font-sans text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded border border-amber-300">
                      {cuba.pureza_varietal.es_puro ? '100% Monovarietal' : 'Mezcla'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra Visual de Llenado Segregado */}
              <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-extrabold text-slate-900">
                    Nivel de Llenado del Estanque ({cuba.porcentaje_total.toFixed(1)}% Ocupado):
                  </span>
                  <span className="font-bold text-slate-700">
                    Buffer Remanente: {bufferRestante.toLocaleString('es-CL')} Litros
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden flex border border-slate-300">
                  <div
                    className="bg-emerald-600 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, cuba.porcentaje_real)}%` }}
                    title={`Físico Real: ${cuba.volumen_real_litros.toLocaleString('es-CL')} L`}
                  />
                  {cuba.porcentaje_proyectado > 0 && (
                    <div
                      className="bg-blue-500 h-full transition-all duration-500 opacity-80"
                      style={{ width: `${Math.min(100 - cuba.porcentaje_real, cuba.porcentaje_proyectado)}%` }}
                      title={`Proyectado: ${cuba.volumen_proyectado_litros.toLocaleString('es-CL')} L`}
                    />
                  )}
                </div>

                {esAlertaCapacidad && (
                  <div className="p-2 bg-amber-100/80 border border-amber-300 rounded-lg text-amber-950 text-xs font-medium flex items-center gap-2">
                    <span className="font-black text-amber-900 font-mono">[AVISO DE CAPACIDAD]:</span>
                    <span>El volumen asignado supera el 95% de la cota física. Próximos camiones deben rotar a una nueva cuba.</span>
                  </div>
                )}
              </div>

              {/* Matriz de Procedencia Agrícola (Fundos y Productores) */}
              <div className="space-y-3">
                <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black font-mono text-slate-950 uppercase tracking-wide">
                      Procedencia Agrícola del Mosto ({fundos.length} Fundos Contribuyentes)
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      Distribución de masa cosechada y participación porcentual en este estanque.
                    </p>
                  </div>
                </div>

                {fundos.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs italic">
                    No se registran fundos de origen para esta cuba (estanque disponible).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {fundos.map((f, idx) => (
                      <div
                        key={`fundo-${idx}`}
                        className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/50 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-black text-slate-950">{f.fundo}</span>
                          <span className="text-xs font-mono font-black text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                            {f.porcentaje_aporte}% del estanque
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-700 font-sans">
                          <span className="font-medium text-slate-900">Productor: {f.productor}</span>
                          <span className="font-mono font-bold text-slate-900">
                            {f.volumen_litros.toLocaleString('es-CL')} L mosto
                          </span>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden border border-slate-300">
                          <div
                            className="bg-emerald-600 h-2 rounded-full"
                            style={{ width: `${Math.min(100, f.porcentaje_aporte)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono pt-0.5">
                          <span>Uva sólida cosechada: {f.kilos_uva_origen.toLocaleString('es-CL')} kg</span>
                          <span className="font-bold text-slate-900">{f.camiones_count} camiones ({f.patentes.join(', ')})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ruta Física en Nave de Molienda */}
              {ruta && (
                <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm space-y-3">
                  <div className="border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-mono font-black text-slate-300 uppercase tracking-wider">
                      Ruta Física del Mosto en Bodega (Trazabilidad de Maquinaria)
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                    <div className="bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
                      <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase">Pozos Tolva</span>
                      <span className="font-bold text-emerald-400">{ruta.pozos.length > 0 ? ruta.pozos.join(', ') : 'Directo'}</span>
                    </div>

                    <span className="text-slate-500 font-bold">&rarr;</span>

                    <div className="bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
                      <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase">Prensas Neumáticas</span>
                      <span className="font-bold text-blue-400">{ruta.prensas.length > 0 ? ruta.prensas.join(', ') : 'En espera'}</span>
                    </div>

                    <span className="text-slate-500 font-bold">&rarr;</span>

                    <div className="bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
                      <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase">Cubas Pre-Flotación</span>
                      <span className="font-bold text-amber-400">{ruta.cubas_preflotacion.length > 0 ? ruta.cubas_preflotacion.join(', ') : 'Directo'}</span>
                    </div>

                    <span className="text-slate-500 font-bold">&rarr;</span>

                    <div className="bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
                      <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase">Clarificadores Continuos</span>
                      <span className="font-bold text-purple-400">{ruta.flotadores.length > 0 ? ruta.flotadores.join(', ') : 'Continuo'}</span>
                    </div>

                    <span className="text-slate-500 font-bold">&rarr;</span>

                    <div className="bg-emerald-950/80 px-3 py-2 rounded-lg border border-emerald-600">
                      <span className="text-emerald-300 block text-[10px] font-sans font-bold uppercase">Estanque Actual</span>
                      <span className="font-black text-emerald-300">{cuba.nombre_humano}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Balance de Masa Consolidado */}
              {balance && (
                <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-xs font-mono font-black text-slate-950 uppercase tracking-wider">
                      Balance de Masa Consolidado y Rendimiento Enológico
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-300">
                      <span className="text-slate-600 block text-[10px]">Uva Cosechada:</span>
                      <span className="font-black text-slate-950">{balance.uva_solida_cosechada_kg.toLocaleString('es-CL')} kg</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-300">
                      <span className="text-slate-600 block text-[10px]">Merma Orujo:</span>
                      <span className="font-bold text-slate-700">{balance.merma_orujo_kg.toLocaleString('es-CL')} kg</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-300">
                      <span className="text-slate-600 block text-[10px]">Mosto Turbio:</span>
                      <span className="font-black text-amber-950">{balance.mosto_turbio_extraido_litros.toLocaleString('es-CL')} L</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-300">
                      <span className="text-slate-600 block text-[10px]">Merma Borras:</span>
                      <span className="font-bold text-slate-700">{balance.merma_borras_litros.toLocaleString('es-CL')} L</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-300">
                      <span className="text-slate-600 block text-[10px]">Mosto Clarificado:</span>
                      <span className="font-black text-emerald-950">{balance.mosto_clarificado_obtenido_litros.toLocaleString('es-CL')} L</span>
                    </div>
                    <div className="bg-emerald-100 p-2.5 rounded-lg border border-emerald-300">
                      <span className="text-emerald-900 block text-[10px] font-bold">Rendimiento Real:</span>
                      <span className="font-black text-emerald-950">{(balance.rendimiento_global_observado * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabla de Camiones Contribuyentes */}
              <div className="space-y-3">
                <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                  <h3 className="text-xs font-mono font-black text-slate-950 uppercase tracking-wider">
                    Camiones de Vendimia que Alimentaron esta Cuba ({camiones.length})
                  </h3>
                  <span className="text-xs text-slate-600 font-mono font-bold">
                    Trazabilidad lote a lote por romana
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-2xs">
                  <table className="w-full text-xs font-mono text-left">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
                      <tr>
                        <th className="px-3.5 py-2.5">Patente</th>
                        <th className="px-3.5 py-2.5">Fundo</th>
                        <th className="px-3.5 py-2.5">Variedad</th>
                        <th className="px-3.5 py-2.5 text-right">Uva en Romana</th>
                        <th className="px-3.5 py-2.5 text-right">Mosto Aportado</th>
                        <th className="px-3.5 py-2.5">Horario Flujo</th>
                        <th className="px-3.5 py-2.5">Estado</th>
                        <th className="px-3.5 py-2.5 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {camiones.map((c, idx) => (
                        <tr key={`c-cuba-${c.viaje_id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3.5 py-2 font-black text-slate-950">{c.patente}</td>
                          <td className="px-3.5 py-2 text-slate-800">{c.fundo}</td>
                          <td className="px-3.5 py-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getGroupColor(c.grupo_mezcla)}`}>
                              {c.variedad}
                            </span>
                          </td>
                          <td className="px-3.5 py-2 text-right font-bold text-slate-900">
                            {c.kilos_uva_solida.toLocaleString('es-CL')} kg
                          </td>
                          <td className="px-3.5 py-2 text-right font-black text-emerald-950">
                            {c.volumen_aportado_litros.toLocaleString('es-CL')} L
                          </td>
                          <td className="px-3.5 py-2 text-slate-700">{formatHora(c.hora_flujo)} hrs</td>
                          <td className="px-3.5 py-2">
                            {c.es_real ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                REAL (DESCARGADO)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
                                PROYECTADO MPC
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectViaje) onSelectViaje(c.viaje_id);
                              }}
                              className="text-xs font-sans font-bold bg-slate-900 hover:bg-emerald-700 text-white px-2.5 py-1 rounded transition-colors shadow-2xs cursor-pointer"
                            >
                              Trazabilidad
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
