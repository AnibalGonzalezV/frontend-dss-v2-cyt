'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { InventarioBodegaResponse, CubaInventario, PrensaInventario } from '@/types';
import { fetchInventarioBodega } from '@/api/ganttService';
import { getGroupColor } from '@/utils/colors';

interface BodegaPipelineProps {
  virtualTime?: number | null;
  onSelectCuba?: (cubaNombre: string) => void;
}

export const BodegaPipeline: React.FC<BodegaPipelineProps> = ({ virtualTime, onSelectCuba }) => {
  const [data, setData] = useState<InventarioBodegaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTexto, setFiltroTexto] = useState('');

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

  // Lista estática completa de 12 Prensas Neumáticas (80.000 kg c/u según modelo matemático)
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

  // Lista estatica completa de 24 Cubas de Pre-flotacion (50k y 100k)
  const todasCubasPF = useMemo(() => {
    const list: { nombre: string; capacidad: number }[] = [];
    for (let i = 1; i <= 24; i++) {
      const pad = i < 10 ? `0${i}` : `${i}`;
      // En Lontue las primeras 12 son de 100.000 L y las siguientes 12 de 50.000 L
      const cap = i <= 12 ? 100000 : 50000;
      list.push({ nombre: `CubaPF_${pad}`, capacidad: cap });
    }
    return list;
  }, []);

  // Mapear datos reales de CubaPF
  const mapaCubasPF = useMemo(() => {
    const map = new Map<string, CubaInventario>();
    if (data) {
      data.cubas_preflotacion.forEach((c) => map.set(c.cuba, c));
    }
    return map;
  }, [data]);

  // Filtrar Cubas de Fermentacion
  const cubasFFiltradas = useMemo(() => {
    if (!data) return [];
    let list = data.cubas_fermentacion;
    if (filtroTexto.trim()) {
      const q = filtroTexto.toLowerCase();
      list = list.filter((c) => c.cuba.toLowerCase().includes(q) || c.grupo_mezcla.toLowerCase().includes(q));
    }
    return list;
  }, [data, filtroTexto]);

  return (
    <div className="h-full bg-slate-100 flex flex-col overflow-y-auto p-4 gap-4">
      {/* KPI BAR SUPERIOR DE BODEGA CON SEGREGACIÓN FÍSICO REAL VS PROYECTADO MPC */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-blue-600">Prensas en Operación</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-blue-700">
                {data?.resumen.prensas_activas_real ?? 0}
              </span>
              <span className="text-xs font-bold text-slate-400">/ 12</span>
              {(data?.resumen.prensas_reservadas_proy ?? 0) > 0 && (
                <span className="text-[11px] font-mono font-semibold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  +{data?.resumen.prensas_reservadas_proy} Reservadas
                </span>
              )}
            </div>
          </div>

          <div className="h-8 border-l border-slate-200 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-500">Cubas PF Activas</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-800">
                {data?.resumen.cubas_pf_activas_real ?? 0}
              </span>
              <span className="text-xs font-bold text-slate-400">/ 24</span>
              {(data?.resumen.cubas_pf_reservadas_proy ?? 0) > 0 && (
                <span className="text-[11px] font-mono font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  +{data?.resumen.cubas_pf_reservadas_proy} Reservadas
                </span>
              )}
            </div>
          </div>

          <div className="h-8 border-l border-slate-200 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-amber-600">Mosto Turbio (Pre-Flotación)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-amber-700">
                {(data?.resumen.volumen_real_turbio_litros ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })} L
              </span>
              {(data?.resumen.volumen_proy_turbio_litros ?? 0) > 0 && (
                <span className="text-[10px] font-mono font-semibold text-amber-700/80 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  +{(data?.resumen.volumen_proy_turbio_litros ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })} L Proy.
                </span>
              )}
            </div>
          </div>

          <div className="h-8 border-l border-slate-200 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-emerald-600">Mosto Clarificado (Fermentación)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-700">
                {(data?.resumen.volumen_real_clarificado_litros ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })} L
              </span>
              {(data?.resumen.volumen_proy_clarificado_litros ?? 0) > 0 && (
                <span className="text-[10px] font-mono font-semibold text-emerald-700/80 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  +{(data?.resumen.volumen_proy_clarificado_litros ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })} L Proy.
                </span>
              )}
            </div>
          </div>

          <div className="h-8 border-l border-slate-200 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-blue-600">Rendimiento Físico Global</span>
            <span className="text-xl font-black text-blue-800">
              {data?.resumen.rendimiento_global_teorico ?? 0.614384} L/kg
            </span>
          </div>
        </div>

        <button
          onClick={cargarInventario}
          disabled={loading}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-300 text-xs transition-colors flex items-center gap-1.5"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar Bodega
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* SECCIÓN 0: 12 PRENSAS NEUMÁTICAS */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Batería de Prensado Neumático (12 Prensas Industriales PR)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Extracción neumática de mosto turbio (80.000 kg capacidad unitaria). Descarga continua hacia pre-flotación.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md border border-blue-200">
              {data?.resumen.prensas_activas_real ?? 0} En Descarga Real
            </span>
            {(data?.resumen.prensas_reservadas_proy ?? 0) > 0 && (
              <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-dashed border-blue-300">
                +{data?.resumen.prensas_reservadas_proy} Reservadas (MPC)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
          {todasPrensas.map((pr) => {
            const ocupada = mapaPrensas.get(pr.nombre);
            const volReal = ocupada?.volumen_real ?? 0;
            const volProy = ocupada?.volumen_proyectado ?? 0;
            const pctReal = ocupada?.porcentaje_real ?? 0;
            const pctProy = ocupada?.porcentaje_proyectado ?? 0;
            const grupo = ocupada ? ocupada.grupo_mezcla : null;
            const colorClases = grupo ? getGroupColor(grupo) : 'bg-slate-300 text-slate-600';
            const esOperando = volReal > 0.1;
            const esReservada = !esOperando && volProy > 0.1;

            return (
              <div
                key={pr.nombre}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                  esOperando
                    ? 'bg-blue-50/40 border-blue-400 shadow-xs hover:border-blue-500 hover:shadow-md cursor-pointer'
                    : esReservada
                    ? 'bg-blue-50/20 border-dashed border-blue-300 shadow-2xs hover:border-blue-400'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-slate-800">{pr.nombre}</span>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold">
                    {(pr.capacidad / 1000).toFixed(0)} Ton
                  </span>
                </div>

                {esOperando ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${colorClases}`}>
                        {grupo}
                      </span>
                      <span className="text-xs font-black text-blue-900 font-mono">
                        {pctReal.toFixed(1)}% {pctProy > 0 ? `(+${pctProy.toFixed(1)}%p)` : ''}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                      <div
                        className="bg-blue-600 h-1.5 transition-all duration-500"
                        style={{ width: `${Math.min(100, pctReal)}%` }}
                      />
                      {pctProy > 0 && (
                        <div
                          className="bg-blue-300 h-1.5 transition-all duration-500 opacity-80"
                          style={{ width: `${Math.min(100 - pctReal, pctProy)}%` }}
                        />
                      )}
                    </div>

                    <div className="text-[10px] font-mono block text-right text-slate-600">
                      <span className="font-bold text-blue-900">{volReal.toLocaleString('es-CL')} kg</span>
                      {volProy > 0 && <span className="text-blue-600/80 font-normal"> (+{volProy.toLocaleString('es-CL')} proy)</span>}
                    </div>
                  </div>
                ) : esReservada ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-dashed ${colorClases}`}>
                        {grupo}
                      </span>
                      <span className="text-[10px] font-bold text-blue-700 font-mono uppercase bg-blue-100/70 px-1 rounded">
                        Reservada
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-400 h-1.5 rounded-full transition-all duration-500 opacity-70"
                        style={{ width: `${Math.min(100, pctProy)}%` }}
                      />
                    </div>

                    <span className="text-[10px] font-mono font-medium text-blue-700 block text-right">
                      +{volProy.toLocaleString('es-CL')} kg proy. ({pctProy.toFixed(1)}%)
                    </span>
                  </div>
                ) : (
                  <div className="py-2 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Disponible</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 1: 24 CUBAS DE PRE-FLOTACIÓN */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Batería de Pre-flotación (24 Cubas Pulmón)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Almacenamiento de mosto turbio tras prensado (&rho; = 0,6536 L/kg). Segregación estricta por grupo de mezcla.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md border border-amber-200">
              {data?.resumen.cubas_pf_activas_real ?? 0} Activas en Físico
            </span>
            {(data?.resumen.cubas_pf_reservadas_proy ?? 0) > 0 && (
              <span className="text-xs font-mono font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md border border-dashed border-amber-300">
                +{data?.resumen.cubas_pf_reservadas_proy} Reservadas (MPC)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 pt-1">
          {todasCubasPF.map((pf) => {
            const ocupada = mapaCubasPF.get(pf.nombre);
            const volReal = ocupada?.volumen_real ?? 0;
            const volProy = ocupada?.volumen_proyectado ?? 0;
            const pctReal = ocupada?.porcentaje_real ?? 0;
            const pctProy = ocupada?.porcentaje_proyectado ?? 0;
            const grupo = ocupada ? ocupada.grupo_mezcla : null;
            const colorClases = grupo ? getGroupColor(grupo) : 'bg-slate-300 text-slate-600';
            const esOperando = volReal > 0.1;
            const esReservada = !esOperando && volProy > 0.1;

            return (
              <div
                key={pf.nombre}
                onClick={() => onSelectCuba && onSelectCuba(pf.nombre)}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                  esOperando
                    ? 'bg-amber-50/40 border-amber-400 shadow-xs hover:border-amber-500 hover:shadow-md cursor-pointer'
                    : esReservada
                    ? 'bg-amber-50/20 border-dashed border-amber-300 shadow-2xs hover:border-amber-400 cursor-pointer'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-slate-800">{pf.nombre}</span>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold">
                    {(pf.capacidad / 1000).toFixed(0)}k L
                  </span>
                </div>

                {esOperando ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${colorClases}`}>
                        {grupo}
                      </span>
                      <span className="text-xs font-black text-amber-900 font-mono">
                        {pctReal.toFixed(1)}% {pctProy > 0 ? `(+${pctProy.toFixed(1)}%p)` : ''}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                      <div
                        className="bg-amber-600 h-1.5 transition-all duration-500"
                        style={{ width: `${Math.min(100, pctReal)}%` }}
                      />
                      {pctProy > 0 && (
                        <div
                          className="bg-amber-300 h-1.5 transition-all duration-500 opacity-80"
                          style={{ width: `${Math.min(100 - pctReal, pctProy)}%` }}
                        />
                      )}
                    </div>

                    <div className="text-[10px] font-mono block text-right text-slate-600">
                      <span className="font-bold text-amber-900">{volReal.toLocaleString('es-CL')} L</span>
                      {volProy > 0 && <span className="text-amber-700/80 font-normal"> (+{volProy.toLocaleString('es-CL')} proy)</span>}
                    </div>
                  </div>
                ) : esReservada ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-dashed ${colorClases}`}>
                        {grupo}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 font-mono uppercase bg-amber-100/70 px-1 rounded">
                        Reservada
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-400 h-1.5 rounded-full transition-all duration-500 opacity-70"
                        style={{ width: `${Math.min(100, pctProy)}%` }}
                      />
                    </div>

                    <span className="text-[10px] font-mono font-medium text-amber-700 block text-right">
                      +{volProy.toLocaleString('es-CL')} L proy. ({pctProy.toFixed(1)}%)
                    </span>
                  </div>
                ) : (
                  <div className="py-2 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vacía</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 2: 4 CLARIFICADORES CONTINUOS FLOTADORES */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Flotadores Continuos (4 Clarificadores Industriales FLT)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Inyección de microburbujas a régimen continuo de 50.000 L/h. Separación de borras (&rho; = 0,9400 L/L).
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-cyan-50 text-cyan-800 px-2.5 py-1 rounded-md border border-cyan-200">
            Capacidad: 200.000 L/h total
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          {['FLT_01', 'FLT_02', 'FLT_03', 'FLT_04'].map((fltNombre, idx) => (
            <div
              key={fltNombre}
              className="p-4 rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50/50 to-white shadow-2xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="font-mono text-sm font-bold text-slate-900">{fltNombre}</span>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-cyan-100 text-cyan-800">
                  En Línea
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 font-mono my-1">
                <div className="flex justify-between">
                  <span>Caudal Nominal:</span>
                  <span className="font-bold text-slate-800">50.000 L/h</span>
                </div>
                <div className="flex justify-between">
                  <span>Rendimiento:</span>
                  <span className="font-bold text-cyan-700">94,00 % clarificado</span>
                </div>
                <div className="flex justify-between">
                  <span>Purga Borras:</span>
                  <span className="font-bold text-amber-700">6,00 % sólidos</span>
                </div>
              </div>

              <div className="pt-2 border-t border-cyan-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Régimen: Continuo</span>
                <span className="font-bold text-cyan-900">Módulo #{idx + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 3: CUBAS DE FERMENTACIÓN ACTIVAS (230 CUBAS) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Cubas de Fermentación Final (Batería 230 x 65.000 L)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Almacenamiento de mosto clarificado para fermentación alcohólica con control de temperatura.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Buscar cuba o grupo..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono w-48"
            />
            <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200">
              {cubasFFiltradas.length} Cubas con Mosto
            </span>
          </div>
        </div>

        {cubasFFiltradas.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm italic">
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

              return (
                <div
                  key={cf.cuba}
                  onClick={() => onSelectCuba && onSelectCuba(cf.cuba)}
                  className={`p-3 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                    esOperando
                      ? 'border-emerald-400 bg-emerald-50/40 shadow-xs hover:border-emerald-500 hover:shadow-md'
                      : esReservada
                      ? 'border-dashed border-emerald-300 bg-emerald-50/20 shadow-2xs hover:border-emerald-400'
                      : 'border-slate-200 bg-slate-50/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-slate-800">{cf.cuba}</span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">65k L</span>
                  </div>

                  {esOperando ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${colorClases}`}>
                          {cf.grupo_mezcla}
                        </span>
                        <span className="text-xs font-black text-emerald-900 font-mono">
                          {pctReal.toFixed(1)}% {pctProy > 0 ? `(+${pctProy.toFixed(1)}%p)` : ''}
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                        <div
                          className="bg-emerald-600 h-1.5 transition-all duration-500"
                          style={{ width: `${Math.min(100, pctReal)}%` }}
                        />
                        {pctProy > 0 && (
                          <div
                            className="bg-emerald-300 h-1.5 transition-all duration-500 opacity-80"
                            style={{ width: `${Math.min(100 - pctReal, pctProy)}%` }}
                          />
                        )}
                      </div>

                      <div className="text-[10px] font-mono block text-right text-slate-600">
                        <span className="font-bold text-emerald-900">{volReal.toLocaleString('es-CL')} L</span>
                        {volProy > 0 && <span className="text-emerald-700/80 font-normal"> (+{volProy.toLocaleString('es-CL')} proy)</span>}
                      </div>
                    </div>
                  ) : esReservada ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-dashed ${colorClases}`}>
                          {cf.grupo_mezcla}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 font-mono uppercase bg-emerald-100/70 px-1 rounded">
                          Reservada
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500 opacity-70"
                          style={{ width: `${Math.min(100, pctProy)}%` }}
                        />
                      </div>

                      <span className="text-[10px] font-mono font-medium text-emerald-700 block text-right">
                        +{volProy.toLocaleString('es-CL')} L proy. ({pctProy.toFixed(1)}%)
                      </span>
                    </div>
                  ) : (
                    <div className="py-2 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vacía</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
