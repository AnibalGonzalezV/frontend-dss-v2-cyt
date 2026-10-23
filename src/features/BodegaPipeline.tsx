'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { InventarioBodegaResponse, CubaInventario } from '@/types';
import { fetchInventarioBodega } from '@/api/ganttService';
import { getGroupColor } from '@/utils/colors';
import { formatearNombreEquipo } from '@/utils/formatters';
import { ModalDetalleMaquinaria } from './ModalDetalleMaquinaria';
import { ModalAuditoriaCuba } from './ModalAuditoriaCuba';

type FiltroEstadoCuba = 'REAL' | 'RESERVADA' | 'DISPONIBLE' | 'TODAS';

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
  const [filtroEstadoCuba, setFiltroEstadoCuba] = useState<FiltroEstadoCuba>('REAL');
  const [selectedEquipoModal, setSelectedEquipoModal] = useState<string | null>(null);
  const [selectedCubaAuditoria, setSelectedCubaAuditoria] = useState<string | null>(null);


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

  // Lista completa de 230 Cubas de Fermentación Final
  const todasCubasF = useMemo(() => {
    const map = new Map<string, CubaInventario>();
    if (data?.cubas_fermentacion) {
      data.cubas_fermentacion.forEach((c) => map.set(c.cuba, c));
    }
    const list: CubaInventario[] = [];
    for (let i = 1; i <= 230; i++) {
      const pad = i < 10 ? `0${i}` : `${i}`;
      const nombre = `CubaF_${pad}`;
      if (map.has(nombre)) {
        list.push(map.get(nombre)!);
      } else {
        list.push({
          cuba: nombre,
          nombre_humano: `Cuba Fermentación ${pad}`,
          grupo_mezcla: 'DISPONIBLE',
          volumen_litros: 0,
          volumen_real: 0,
          volumen_proyectado: 0,
          volumen_total: 0,
          capacidad_litros: 65000,
          porcentaje_ocupacion: 0,
          porcentaje_real: 0,
          porcentaje_proyectado: 0,
          porcentaje_total: 0,
          fecha_actualizacion: new Date().toISOString(),
        });
      }
    }
    return list;
  }, [data]);

  // Conteos de estado para los 4 filtros de cubas
  const conteoCubas = useMemo(() => {
    let conReal = 0;
    let reservadas = 0;
    let disponibles = 0;
    todasCubasF.forEach((c) => {
      const r = (c.volumen_real ?? 0) > 0.1;
      const p = (c.volumen_proyectado ?? 0) > 0.1;
      if (r) conReal++;
      else if (p) reservadas++;
      else disponibles++;
    });
    return { conReal, reservadas, disponibles, total: todasCubasF.length };
  }, [todasCubasF]);

  // Cubas de Fermentación Final filtradas según estado y texto predictivo
  const cubasFFiltradas = useMemo(() => {
    let list = todasCubasF;
    if (filtroEstadoCuba === 'REAL') {
      list = list.filter((c) => (c.volumen_real ?? 0) > 0.1);
    } else if (filtroEstadoCuba === 'RESERVADA') {
      list = list.filter((c) => (c.volumen_real ?? 0) <= 0.1 && (c.volumen_proyectado ?? 0) > 0.1);
    } else if (filtroEstadoCuba === 'DISPONIBLE') {
      list = list.filter((c) => (c.volumen_real ?? 0) <= 0.1 && (c.volumen_proyectado ?? 0) <= 0.1);
    }

    if (filtroTexto.trim()) {
      const q = filtroTexto.toLowerCase().trim();
      list = list.filter((c) => {
        const nom = c.cuba.toLowerCase();
        const hum = (c.nombre_humano || '').toLowerCase();
        const grp = (c.grupo_mezcla || '').toLowerCase();
        return nom.includes(q) || hum.includes(q) || grp.includes(q) || nom.replace('cubaf_', '').includes(q);
      });
    }
    return list;
  }, [todasCubasF, filtroEstadoCuba, filtroTexto]);


  return (
    <div className="h-full bg-slate-100 flex flex-col overflow-y-auto p-4 gap-4">
      {/* KPI BAR SUPERIOR DE BODEGA CON IDENTIDAD CONCHA Y TORO */}
      <div className="bg-white rounded-xl border border-stone-200/90 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col">
            <span className="text-xs uppercase font-extrabold text-stone-700 tracking-wider">Flotación Continua</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-stone-900">
                4
              </span>
              <span className="text-xs font-bold text-stone-500">/ 4 Módulos (200k L/h)</span>
            </div>
          </div>

          <div className="h-9 border-l border-stone-200 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-xs uppercase font-extrabold text-stone-700 tracking-wider">Cubas PreF con Buffer</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-[#CF5128]">
                {cubasPFActivas.length}
              </span>
              <span className="text-xs font-bold text-stone-500">/ 24</span>
              {(data?.resumen.cubas_pf_reservadas_proy ?? 0) > 0 && (
                <span className="text-xs font-mono font-bold text-[#CF5128] bg-orange-100/70 px-2 py-0.5 rounded border border-orange-200">
                  +{data?.resumen.cubas_pf_reservadas_proy} Reservadas
                </span>
              )}
            </div>
          </div>

          <div className="h-9 border-l border-stone-200 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-xs uppercase font-extrabold text-stone-700 tracking-wider">Mosto Turbio en Amortiguamiento</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-[#CF5128]">
                {(data?.resumen.volumen_real_turbio_litros ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })} L
              </span>
              {(data?.resumen.volumen_proy_turbio_litros ?? 0) > 0 && (
                <span className="text-xs font-mono font-bold text-[#CF5128] bg-orange-100/70 px-2 py-0.5 rounded border border-orange-200">
                  +{(data?.resumen.volumen_proy_turbio_litros ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })} L Proy.
                </span>
              )}
            </div>
          </div>

          <div className="h-9 border-l border-stone-200 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-xs uppercase font-extrabold text-stone-700 tracking-wider">Mosto Clarificado en Fermentación</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-[#FE6D2C]">
                {(data?.resumen.volumen_real_clarificado_litros ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })} L
              </span>
              {(data?.resumen.volumen_proy_clarificado_litros ?? 0) > 0 && (
                <span className="text-xs font-mono font-bold text-[#FE6D2C] bg-orange-100/70 px-2 py-0.5 rounded border border-orange-200">
                  +{(data?.resumen.volumen_proy_clarificado_litros ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })} L Proy.
                </span>
              )}
            </div>
          </div>

          <div className="h-9 border-l border-stone-200 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-xs uppercase font-extrabold text-stone-700 tracking-wider">Rendimiento Físico Global</span>
            <span className="text-2xl font-black text-stone-900 mt-0.5">
              {data?.resumen.rendimiento_global_teorico ?? 0.614384} L/kg
            </span>
          </div>
        </div>

        <button
          onClick={cargarInventario}
          disabled={loading}
          className="px-4 py-2 bg-[#000000] hover:bg-stone-800 text-white font-bold rounded-lg shadow-sm text-xs transition-colors flex items-center gap-2 cursor-pointer border border-stone-700"
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

      {/* SECCIÓN 1: CUBAS DE PRE-FLOTACIÓN ACTIVAS (SOLO CON VOLUMEN RETENIDO/PROYECTADO) */}
      <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-sm flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-2">
          <div>
            <h2 className="text-base font-black text-stone-950 uppercase tracking-wide">
              Batería de Pre-flotación (Cubas Pulmón)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-orange-100 text-[#CF5128] px-3 py-1 rounded-md border border-orange-200">
              {cubasPFActivas.length} Cubas con Buffer Activo
            </span>
          </div>
        </div>

        {cubasPFActivas.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-xl border border-dashed border-amber-300 bg-amber-50/70 flex flex-col items-center justify-center gap-1.5">
            <span className="text-sm font-bold text-amber-950 font-mono">Batería de Pre-flotación Drenada (0 L en Amortiguamiento)</span>
            <p className="text-xs text-stone-600 font-medium">100% del mosto turbio transferido y clarificado.</p>
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
                    setSelectedCubaAuditoria(pf.cuba);
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
            <h2 className="text-base font-black text-stone-950 uppercase tracking-wide">
              Flotadores Continuos (4 Clarificadores Industriales)
            </h2>
          </div>
          <span className="text-xs font-mono font-bold bg-stone-100 text-stone-800 px-3 py-1 rounded-md border border-stone-300">
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

      {/* SECCIÓN 3: CUBAS DE FERMENTACIÓN FINAL */}
      <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-sm flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-black text-stone-950 uppercase tracking-wide">
              Cubas de Fermentación Final (230 x 65.000 L)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 4 Filtros de Estado con Colores Concha y Toro */}
            <div className="flex items-center bg-stone-200/80 p-1 rounded-xl border border-stone-300">
              <button
                type="button"
                onClick={() => setFiltroEstadoCuba('REAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  filtroEstadoCuba === 'REAL'
                    ? 'bg-[#FE6D2C] text-white shadow-xs font-extrabold'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
              >
                Con Mosto Real ({conteoCubas.conReal})
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstadoCuba('RESERVADA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  filtroEstadoCuba === 'RESERVADA'
                    ? 'bg-[#CF5128] text-white shadow-xs font-extrabold'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
              >
                Reservadas MPC ({conteoCubas.reservadas})
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstadoCuba('DISPONIBLE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  filtroEstadoCuba === 'DISPONIBLE'
                    ? 'bg-stone-700 text-white shadow-xs font-extrabold'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
              >
                Disponibles ({conteoCubas.disponibles})
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstadoCuba('TODAS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  filtroEstadoCuba === 'TODAS'
                    ? 'bg-[#000000] text-white shadow-xs font-extrabold'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
              >
                Todas ({conteoCubas.total})
              </button>
            </div>

            {/* Buscador Predictivo */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar cuba (ej. 12)..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-600 font-mono w-44 shadow-2xs"
              />
              {filtroTexto && (
                <button
                  type="button"
                  onClick={() => setFiltroTexto('')}
                  className="absolute right-2 top-1 text-sm text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  &times;
                </button>
              )}
            </div>

            <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-md border border-emerald-300">
              {cubasFFiltradas.length} Visualizadas
            </span>
          </div>
        </div>

        {cubasFFiltradas.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm italic font-medium">
            No se registran cubas de fermentación para los filtros seleccionados.
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
                    setSelectedCubaAuditoria(cf.cuba);
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

      {/* Modal de Detalle de Maquinaria (Prensas y Flotadores) */}
      <ModalDetalleMaquinaria
        nombreEquipo={selectedEquipoModal}
        isOpen={!!selectedEquipoModal}
        onClose={() => setSelectedEquipoModal(null)}
        onSelectViaje={onSelectViaje}
      />

      {/* Modal de Auditoría Inversa y Genealogía Enológica de Cuba */}
      <ModalAuditoriaCuba
        nombreCuba={selectedCubaAuditoria}
        isOpen={!!selectedCubaAuditoria}
        onClose={() => setSelectedCubaAuditoria(null)}
        onSelectViaje={onSelectViaje}
      />

    </div>
  );
};
