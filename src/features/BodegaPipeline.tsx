'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { InventarioBodegaResponse, CubaInventario, PrensaInventario } from '@/types';
import { fetchInventarioBodega } from '@/api/ganttService';
import { getGroupColor } from '@/utils/colors';
import { formatearNombreEquipo } from '@/utils/formatters';
import { ModalDetalleMaquinaria } from './ModalDetalleMaquinaria';

interface BodegaPipelineProps {
  virtualTime?: number | null;
  onSelectCuba?: (cubaNombre: string) => void;
  onSelectViaje?: (viajeId: number) => void;
}

export const BodegaPipeline: React.FC<BodegaPipelineProps> = ({ virtualTime, onSelectCuba, onSelectViaje }) => {
  const [data, setData] = useState<InventarioBodegaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [selectedEquipoModal, setSelectedEquipoModal] = useState<string | null>(null);

  const cargarInventario = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchInventarioBodega();
      setData(res);
    } catch (err) {
      console.error(err);
      setError('Error al consultar el estado de inventario en bodega.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarInventario();
  }, [virtualTime]);

  // Lista estática completa de 12 Prensas Neumáticas (80.000 kg c/u según modelo físico)
  const todasPrensas = useMemo(() => {
    const list: { nombre: string; capacidad: number }[] = [];
    for (let i = 1; i <= 12; i++) {
      const pad = i < 10 ? `0${i}` : `${i}`;
      list.push({ nombre: `PR_${pad}`, capacidad: 80000 });
    }
    return list;
  }, []);

  const mapaPrensas = useMemo(() => {
    const map = new Map<string, PrensaInventario>();
    if (data?.prensas) {
      data.prensas.forEach((p) => map.set(p.equipo, p));
    }
    return map;
  }, [data]);

  // Cubas de Pre-flotación (Buffer de mosto turbio): Solo se visualizan las activas con volumen real o proyectado
  const cubasPFActivas = useMemo(() => {
    if (!data?.cubas_preflotacion) return [];
    let list = data.cubas_preflotacion.filter(
      (c) => (c.volumen_real ?? 0) > 0.1 || (c.volumen_proyectado ?? 0) > 0.1
    );
    if (filtroTexto.trim()) {
      const q = filtroTexto.toLowerCase();
      list = list.filter((c) => c.cuba.toLowerCase().includes(q) || c.grupo_mezcla.toLowerCase().includes(q));
    }
    return list;
  }, [data, filtroTexto]);

  // Cubas de Fermentación Final con mosto clarificado
  const cubasFFiltradas = useMemo(() => {
    if (!data?.cubas_fermentacion) return [];
    let list = data.cubas_fermentacion;
    if (filtroTexto.trim()) {
      const q = filtroTexto.toLowerCase();
      list = list.filter((c) => c.cuba.toLowerCase().includes(q) || c.grupo_mezcla.toLowerCase().includes(q));
    }
    return list;
  }, [data, filtroTexto]);

  return (
    <div className="h-full bg-slate-100 flex flex-col overflow-y-auto p-4 gap-4">
      {/* KPI BAR SUPERIOR DE BODEGA CON ALTO CONTRASTE */}
      <div className="bg-white rounded-xl border border-slate-300 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col">
            <span className="text-xs uppercase font-extrabold text-blue-900 tracking-wider">Prensas en Operación</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-blue-950">
                {data?.resumen.prensas_activas_real ?? 0}
              </span>
              <span className="text-xs font-bold text-slate-500">/ 12</span>
              {(data?.resumen.prensas_reservadas_proy ?? 0) > 0 && (
                <span className="text-xs font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                  +{data?.resumen.prensas_reservadas_proy} Reservadas
                </span>
              )}
            </div>
          </div>

          <div className="h-9 border-l border-slate-300 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-xs uppercase font-extrabold text-amber-900 tracking-wider">Cubas PreF con Buffer</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-amber-950">
                {cubasPFActivas.length}
              </span>
              <span className="text-xs font-bold text-slate-500">/ 24</span>
              {(data?.resumen.cubas_pf_reservadas_proy ?? 0) > 0 && (
                <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  +{data?.resumen.cubas_pf_reservadas_proy} Reservadas
                </span>
              )}
            </div>
          </div>

          <div className="h-9 border-l border-slate-300 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-xs uppercase font-extrabold text-amber-900 tracking-wider">Mosto Turbio en Amortiguamiento</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-amber-950">
                {(data?.resumen.volumen_real_turbio_litros ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })} L
              </span>
              {(data?.resumen.volumen_proy_turbio_litros ?? 0) > 0 && (
                <span className="text-xs font-mono font-bold text-amber-950 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  +{(data?.resumen.volumen_proy_turbio_litros ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })} L Proy.
                </span>
              )}
            </div>
          </div>

          <div className="h-9 border-l border-slate-300 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-xs uppercase font-extrabold text-emerald-900 tracking-wider">Mosto Clarificado en Fermentación</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-emerald-950">
                {(data?.resumen.volumen_real_clarificado_litros ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })} L
              </span>
              {(data?.resumen.volumen_proy_clarificado_litros ?? 0) > 0 && (
                <span className="text-xs font-mono font-bold text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  +{(data?.resumen.volumen_proy_clarificado_litros ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })} L Proy.
                </span>
              )}
            </div>
          </div>

          <div className="h-9 border-l border-slate-300 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-xs uppercase font-extrabold text-blue-900 tracking-wider">Rendimiento Físico Global</span>
            <span className="text-2xl font-black text-blue-950 mt-0.5">
              {data?.resumen.rendimiento_global_teorico ?? 0.614384} L/kg
            </span>
          </div>
        </div>

        <button
          onClick={cargarInventario}
          disabled={loading}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm text-xs transition-colors flex items-center gap-2 cursor-pointer"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar Bodega
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-300 rounded-lg text-red-800 text-xs font-bold">
          {error}
        </div>
      )}

      {/* SECCIÓN 0: 12 PRENSAS NEUMÁTICAS (CICLOS BATCH 80 TON) */}
      <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-sm flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-950 uppercase tracking-wide">
              Batería de Prensado Neumático (12 Prensas Industriales)
            </h2>
            <p className="text-xs text-slate-700 font-medium">
              Extracción neumática con capacidad batch de 80 Ton por ciclo. Rotación dinámica balanceada en 12 máquinas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-blue-100 text-blue-900 px-3 py-1 rounded-md border border-blue-300">
              {data?.resumen.prensas_activas_real ?? 0} Prensas en Operación
            </span>
            {(data?.resumen.prensas_reservadas_proy ?? 0) > 0 && (
              <span className="text-xs font-mono font-bold bg-blue-50 text-blue-800 px-3 py-1 rounded-md border border-dashed border-blue-300">
                +{data?.resumen.prensas_reservadas_proy} Reservadas (MPC)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
          {todasPrensas.map((pr) => {
            const ocupada = mapaPrensas.get(pr.nombre);
            const volReal = ocupada?.batch_actual_kg ?? (ocupada?.volumen_real ?? 0);
            const volProy = ocupada?.volumen_proyectado ?? 0;
            const pctReal = ocupada?.batch_actual_pct ?? (ocupada?.porcentaje_real ?? 0);
            const pctProy = ocupada?.porcentaje_proyectado ?? 0;
            const totalDia = ocupada?.total_procesado_kg ?? volReal;
            const bCount = ocupada?.numero_batch ?? 1;
            const bComp = ocupada?.batches_completados ?? 0;
            const grupo = ocupada ? ocupada.grupo_mezcla : null;
            const colorClases = grupo ? getGroupColor(grupo) : 'bg-slate-200 text-slate-800';
            const esOperando = volReal > 0.1;
            const esReservada = !esOperando && volProy > 0.1;
            const nombreVisible = ocupada?.nombre_humano || formatearNombreEquipo(pr.nombre);

            return (
              <div
                key={pr.nombre}
                onClick={() => {
                  if (onSelectCuba) onSelectCuba(pr.nombre);
                  setSelectedEquipoModal(pr.nombre);
                }}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer bg-white shadow-xs ${
                  esOperando
                    ? 'border-blue-500 hover:border-blue-600 hover:shadow-md ring-1 ring-blue-300'
                    : esReservada
                    ? 'border-dashed border-blue-400 hover:border-blue-500 bg-blue-50/20'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-black text-slate-950">{nombreVisible}</span>
                  <span className="text-xs font-mono text-slate-700 font-bold">
                    80 Ton/batch
                  </span>
                </div>

                {esOperando ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${colorClases}`}>
                        {grupo}
                      </span>
                      <span className="text-xs font-black text-blue-950 font-mono">
                        Batch #{bCount}: {pctReal.toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden flex border border-slate-300">
                      <div
                        className="bg-blue-600 h-2.5 transition-all duration-500"
                        style={{ width: `${Math.min(100, pctReal)}%` }}
                      />
                      {pctProy > 0 && (
                        <div
                          className="bg-blue-400 h-2.5 transition-all duration-500 opacity-80"
                          style={{ width: `${Math.min(100 - pctReal, pctProy)}%` }}
                        />
                      )}
                    </div>

                    <div className="flex flex-col text-right font-mono">
                      <span className="text-xs font-extrabold text-blue-950">
                        {volReal.toLocaleString('es-CL')} kg {volProy > 0 ? `(+${volProy.toLocaleString('es-CL')} proy)` : ''}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 mt-0.5">
                        Total día: {(totalDia / 1000).toFixed(1)} Ton ({bComp} batches)
                      </span>
                    </div>
                  </div>
                ) : esReservada ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-dashed ${colorClases}`}>
                        {grupo}
                      </span>
                      <span className="text-[10px] font-bold text-blue-900 font-mono uppercase bg-blue-100 px-1.5 py-0.5 rounded">
                        Reservada (MPC)
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden border border-slate-300">
                      <div
                        className="bg-blue-400 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, pctProy)}%` }}
                      />
                    </div>

                    <div className="flex flex-col text-right font-mono">
                      <span className="text-xs font-bold text-blue-950">
                        +{volProy.toLocaleString('es-CL')} kg proy. ({pctProy.toFixed(1)}%)
                      </span>
                      {totalDia > 0 && (
                        <span className="text-[11px] font-bold text-slate-700 mt-0.5">
                          Total día: {(totalDia / 1000).toFixed(1)} Ton
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-2 flex flex-col justify-between">
                    <span className="text-xs uppercase font-extrabold text-slate-600 tracking-wide text-center">
                      {totalDia > 0 ? 'Disponible (Ciclo Finalizado)' : 'Disponible (En espera)'}
                    </span>
                    {totalDia > 0 && (
                      <span className="text-[11px] font-mono font-bold text-slate-700 text-right mt-1">
                        Total día: {(totalDia / 1000).toFixed(1)} Ton ({bComp} batches)
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 1: CUBAS DE PRE-FLOTACIÓN ACTIVAS (SOLO CON VOLUMEN RETENIDO/PROYECTADO) */}
      <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-sm flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-950 uppercase tracking-wide">
              Batería de Pre-flotación (Cubas Pulmón Activas)
            </h2>
            <p className="text-xs text-slate-700 font-medium">
              Almacenamiento transitorio de mosto turbio. Drenaje continuo a régimen de 50.000 L/h hacia clarificadores.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-md border border-amber-300">
              {cubasPFActivas.length} Cubas con Buffer Activo
            </span>
          </div>
        </div>

        {cubasPFActivas.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-xl border border-dashed border-amber-300 bg-amber-50/70 flex flex-col items-center justify-center gap-1.5">
            <span className="text-sm font-bold text-amber-950 font-mono">Batería de Pre-flotación Drenada (0 L en Amortiguamiento)</span>
            <p className="text-xs text-amber-900 font-medium max-w-lg">
              Los módulos de flotación continua han clarificado el 100% del mosto turbio generado por las prensas, transfiriéndolo hacia las cubas de fermentación final.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 pt-1">
            {cubasPFActivas.map((pf) => {
              const volReal = pf.volumen_real ?? 0;
              const volProy = pf.volumen_proyectado ?? 0;
              const pctReal = pf.porcentaje_real ?? 0;
              const pctProy = pf.porcentaje_proyectado ?? 0;
              const grupo = pf.grupo_mezcla;
              const colorClases = grupo ? getGroupColor(grupo) : 'bg-slate-300 text-slate-800';
              const esOperando = volReal > 0.1;
              const nombreVisible = pf.nombre_humano || formatearNombreEquipo(pf.cuba);

              return (
                <div
                  key={pf.cuba}
                  onClick={() => {
                    if (onSelectCuba) onSelectCuba(pf.cuba);
                    setSelectedEquipoModal(pf.cuba);
                  }}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer bg-white shadow-xs ${
                    esOperando
                      ? 'border-amber-500 hover:border-amber-600 hover:shadow-md ring-1 ring-amber-300'
                      : 'border-dashed border-amber-400 hover:border-amber-500 bg-amber-50/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-black text-slate-950">{nombreVisible}</span>
                    <span className="text-xs font-mono text-slate-700 font-bold">
                      {(pf.capacidad_litros / 1000).toFixed(0)}k L
                    </span>
                  </div>

                  {esOperando ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${colorClases}`}>
                          {grupo}
                        </span>
                        <span className="text-xs font-black text-amber-950 font-mono">
                          {pctReal.toFixed(1)}% {pctProy > 0 ? `(+${pctProy.toFixed(1)}%p)` : ''}
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden flex border border-slate-300">
                        <div
                          className="bg-amber-600 h-2.5 transition-all duration-500"
                          style={{ width: `${Math.min(100, pctReal)}%` }}
                        />
                        {pctProy > 0 && (
                          <div
                            className="bg-amber-400 h-2.5 transition-all duration-500 opacity-80"
                            style={{ width: `${Math.min(100 - pctReal, pctProy)}%` }}
                          />
                        )}
                      </div>

                      <div className="text-xs font-mono block text-right text-slate-700">
                        <span className="font-extrabold text-amber-950">{volReal.toLocaleString('es-CL')} L</span>
                        {volProy > 0 && <span className="text-amber-800 font-medium"> (+{volProy.toLocaleString('es-CL')} proy)</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-dashed ${colorClases}`}>
                          {grupo}
                        </span>
                        <span className="text-[10px] font-bold text-amber-900 font-mono uppercase bg-amber-100 px-1.5 py-0.5 rounded">
                          Reservada
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden border border-slate-300">
                        <div
                          className="bg-amber-400 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, pctProy)}%` }}
                        />
                      </div>

                      <span className="text-xs font-mono font-bold text-amber-950 block text-right">
                        +{volProy.toLocaleString('es-CL')} L proy. ({pctProy.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: 4 CLARIFICADORES CONTINUOS FLOTADORES */}
      <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-950 uppercase tracking-wide">
              Flotadores Continuos (4 Clarificadores Industriales)
            </h2>
            <p className="text-xs text-slate-700 font-medium">
              Inyección de microburbujas a régimen continuo de 50.000 L/h. Separación de borras (&rho; = 0,9400 L/L).
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-cyan-100 text-cyan-900 px-3 py-1 rounded-md border border-cyan-300">
            Capacidad: 200.000 L/h total
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          {['FLT_01', 'FLT_02', 'FLT_03', 'FLT_04'].map((fltNombre, idx) => (
            <div
              key={fltNombre}
              onClick={() => {
                if (onSelectCuba) onSelectCuba(fltNombre);
                setSelectedEquipoModal(fltNombre);
              }}
              className="p-4 rounded-xl border border-cyan-300 bg-gradient-to-br from-cyan-50/80 to-white shadow-xs flex flex-col justify-between cursor-pointer hover:border-cyan-500 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-600 animate-pulse" />
                  <span className="font-mono text-sm font-black text-slate-950">{formatearNombreEquipo(fltNombre)}</span>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-cyan-100 text-cyan-900 border border-cyan-300">
                  En Línea
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-800 font-mono my-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Caudal Nominal:</span>
                  <span className="font-extrabold text-slate-950">50.000 L/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Rendimiento:</span>
                  <span className="font-extrabold text-cyan-900">94,00 % clarificado</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Purga Borras:</span>
                  <span className="font-extrabold text-amber-900">6,00 % sólidos</span>
                </div>
              </div>

              <div className="pt-2 border-t border-cyan-200 flex items-center justify-between text-xs text-slate-700">
                <span className="font-medium">Régimen: Continuo</span>
                <span className="font-bold text-cyan-950">Módulo #{idx + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 3: CUBAS DE FERMENTACIÓN ACTIVAS */}
      <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-sm flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-950 uppercase tracking-wide">
              Cubas de Fermentación Final (Batería 230 x 65.000 L)
            </h2>
            <p className="text-xs text-slate-700 font-medium">
              Almacenamiento de mosto clarificado para fermentación alcohólica con control de temperatura.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Buscar cuba o grupo..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono w-48 shadow-2xs"
            />
            <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-900 px-3 py-1 rounded-md border border-emerald-300">
              {cubasFFiltradas.length} Cubas con Mosto Clarificado
            </span>
          </div>
        </div>

        {cubasFFiltradas.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm italic font-medium">
            No se registran cubas de fermentación con volumen para los filtros seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 pt-1">
            {cubasFFiltradas.map((cf) => {
              const colorClases = getGroupColor(cf.grupo_mezcla);
              const volReal = cf.volumen_real ?? 0;
              const volProy = cf.volumen_proyectado ?? 0;
              const pctReal = cf.porcentaje_real ?? 0;
              const pctProy = cf.porcentaje_proyectado ?? 0;
              const esOperando = volReal > 0.1;
              const esReservada = !esOperando && volProy > 0.1;
              const nombreVisible = cf.nombre_humano || formatearNombreEquipo(cf.cuba);

              return (
                <div
                  key={cf.cuba}
                  onClick={() => {
                    if (onSelectCuba) onSelectCuba(cf.cuba);
                    setSelectedEquipoModal(cf.cuba);
                  }}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer bg-white shadow-xs ${
                    esOperando
                      ? 'border-emerald-500 hover:border-emerald-600 hover:shadow-md ring-1 ring-emerald-300'
                      : esReservada
                      ? 'border-dashed border-emerald-400 hover:border-emerald-500 bg-emerald-50/20'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-black text-slate-950">{nombreVisible}</span>
                    <span className="text-xs font-mono text-slate-700 font-bold">65k L</span>
                  </div>

                  {esOperando ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${colorClases}`}>
                          {cf.grupo_mezcla}
                        </span>
                        <span className="text-xs font-black text-emerald-950 font-mono">
                          {pctReal.toFixed(1)}% {pctProy > 0 ? `(+${pctProy.toFixed(1)}%p)` : ''}
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden flex border border-slate-300">
                        <div
                          className="bg-emerald-600 h-2.5 transition-all duration-500"
                          style={{ width: `${Math.min(100, pctReal)}%` }}
                        />
                        {pctProy > 0 && (
                          <div
                            className="bg-emerald-400 h-2.5 transition-all duration-500 opacity-80"
                            style={{ width: `${Math.min(100 - pctReal, pctProy)}%` }}
                          />
                        )}
                      </div>

                      <div className="text-xs font-mono block text-right text-slate-700">
                        <span className="font-extrabold text-emerald-950">{volReal.toLocaleString('es-CL')} L</span>
                        {volProy > 0 && <span className="text-emerald-800 font-medium"> (+{volProy.toLocaleString('es-CL')} proy)</span>}
                      </div>
                    </div>
                  ) : esReservada ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-dashed ${colorClases}`}>
                          {cf.grupo_mezcla}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-900 font-mono uppercase bg-emerald-100 px-1.5 py-0.5 rounded">
                          Reservada
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden border border-slate-300">
                        <div
                          className="bg-emerald-400 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, pctProy)}%` }}
                        />
                      </div>

                      <span className="text-xs font-mono font-bold text-emerald-950 block text-right">
                        +{volProy.toLocaleString('es-CL')} L proy. ({pctProy.toFixed(1)}%)
                      </span>
                    </div>
                  ) : (
                    <div className="py-2 text-center">
                      <span className="text-xs uppercase font-extrabold text-slate-500 tracking-wide">Disponible</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalle de Maquinaria y Lotes Asociados */}
      <ModalDetalleMaquinaria
        nombreEquipo={selectedEquipoModal}
        isOpen={!!selectedEquipoModal}
        onClose={() => setSelectedEquipoModal(null)}
        onSelectViaje={onSelectViaje}
      />
    </div>
  );
};
