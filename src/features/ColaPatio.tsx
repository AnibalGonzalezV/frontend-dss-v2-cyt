import React, { useState } from 'react';
import { CamionPatio } from '@/types';
import { getGroupColor } from '@/utils/colors';

interface ColaPatioProps {
  camiones: CamionPatio[];
  onSelectViaje?: (viajeId: number) => void;
}

export const ColaPatio: React.FC<ColaPatioProps> = ({ camiones, onSelectViaje }) => {
  const [filterMode, setFilterMode] = useState<'TODOS' | 'PATIO' | 'RUTA'>('TODOS');

  const enPatio = camiones.filter(c => c.estado === 'ROMANA' || c.estado === 'PATIO');
  const enRuta = camiones.filter(c => c.estado === 'TRANSITO' || c.estado === 'ALERTA_ATRASO');
  const atrasados = camiones.filter(c => c.estado === 'ALERTA_ATRASO').length;

  return (
    <div className="h-full bg-stone-50 flex flex-col select-none">
      {/* Encabezado Principal */}
      <div className="p-3.5 bg-white border-b border-stone-200 shadow-2xs">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider">Flujo de Camiones</h2>
          <span className="font-mono text-xs font-black bg-stone-100 text-stone-800 px-2 py-0.5 rounded-md border border-stone-200">
            {camiones.length} total
          </span>
        </div>

        {/* Selector de Vista Rápida */}
        <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-lg text-[11px] font-bold">
          <button
            onClick={() => setFilterMode('TODOS')}
            className={`py-1 rounded-md transition-all text-center cursor-pointer ${
              filterMode === 'TODOS'
                ? 'bg-[#000000] text-white shadow-xs font-extrabold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Todos ({camiones.length})
          </button>
          <button
            onClick={() => setFilterMode('PATIO')}
            className={`py-1 rounded-md transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
              filterMode === 'PATIO'
                ? 'bg-[#FE6D2C] text-white shadow-xs font-extrabold'
                : 'text-[#FE6D2C] hover:bg-orange-100/50'
            }`}
          >
            Patio ({enPatio.length})
          </button>
          <button
            onClick={() => setFilterMode('RUTA')}
            className={`py-1 rounded-md transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
              filterMode === 'RUTA'
                ? 'bg-[#CF5128] text-white shadow-xs font-extrabold'
                : 'text-[#CF5128] hover:bg-stone-200'
            }`}
          >
            Ruta ({enRuta.length})
          </button>
        </div>
      </div>

      {/* Lista Scrolleable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {/* SECCIÓN 1: PATIO FÍSICO */}
        {(filterMode === 'TODOS' || filterMode === 'PATIO') && (
          <div>
            {/* Banner de Sección Patio Físico */}
            <div className="bg-orange-50/80 border border-orange-200/90 rounded-xl p-2.5 mb-2.5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FE6D2C] shadow-2xs"></span>
                <span className="text-sm font-black text-stone-950 uppercase tracking-wide">
                  Patio Físico
                </span>
              </div>
              <span className="bg-[#FE6D2C] text-white text-xs font-mono font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                {enPatio.length}
              </span>
            </div>

            {/* Tarjetas de Patio Físico */}
            <div className="space-y-2">
              {enPatio.map((camion) => {
                const colorClasses = getGroupColor(camion.grupo);
                return (
                  <div
                    key={camion.viaje_id}
                    onClick={() => onSelectViaje && onSelectViaje(camion.viaje_id)}
                    className={`p-3 rounded-xl border-2 shadow-sm ${colorClasses} flex flex-col gap-1 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer relative`}
                    title="Click para ver Auditoría de Trazabilidad Enológica (5 Etapas)"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-base font-black tracking-tight font-mono">{camion.patente}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/25 text-white uppercase tracking-wider">
                        {camion.estado === 'ROMANA' ? 'En Romana' : 'En Patio'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold mt-0.5">
                      <span>{camion.grupo}</span>
                      <span className="text-[10px] font-mono opacity-90">
                        {(camion.peso_kg / 1000).toFixed(1)} Ton
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] mt-1 pt-1 border-t border-white/20 font-mono opacity-95">
                      <span className="text-[10px] uppercase font-sans font-semibold">Llegada Real:</span>
                      <span className="font-bold">
                        {camion.hora_llegada
                          ? new Date(camion.hora_llegada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '--:--'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {enPatio.length === 0 && (
                <div className="text-center py-5 px-3 bg-white border border-dashed border-orange-200 rounded-xl text-stone-500 text-xs font-medium">
                  No hay camiones esperando en patio físico
                </div>
              )}
            </div>
          </div>
        )}

        {/* LÍNEA DE DEMARCACIÓN FÍSICA / CARRETERA (Solo visible en vista TODOS) */}
        {filterMode === 'TODOS' && (
          <div className="my-4 relative flex items-center justify-center">
            <div className="w-full border-t-2 border-dashed border-stone-300"></div>
            <div className="absolute bg-white px-3 py-1 rounded-full border border-stone-300 shadow-2xs flex items-center gap-1.5 text-[11px] font-black text-stone-700 tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[#CF5128]"></span>
              <span>Control Romana · Báscula</span>
            </div>
          </div>
        )}

        {/* SECCIÓN 2: EN RUTA (GPS) */}
        {(filterMode === 'TODOS' || filterMode === 'RUTA') && (
          <div>
            {/* Banner de Sección En Ruta */}
            <div className="bg-stone-100 border border-stone-300/80 rounded-xl p-2.5 mb-2.5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-600 shadow-2xs"></span>
                <span className="text-sm font-black text-stone-950 uppercase tracking-wide">
                  En Ruta (GPS)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {atrasados > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-2xs">
                    {atrasados} atrasados
                  </span>
                )}
                <span className="bg-stone-800 text-white text-xs font-mono font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                  {enRuta.length}
                </span>
              </div>
            </div>

            {/* Tarjetas de En Ruta */}
            <div className="space-y-2">
              {enRuta.map((camion) => {
                const colorClasses = getGroupColor(camion.grupo);
                const isAtrasado = camion.estado === 'ALERTA_ATRASO';

                return (
                  <div
                    key={camion.viaje_id}
                    onClick={() => onSelectViaje && onSelectViaje(camion.viaje_id)}
                    className={`p-3 rounded-xl border-2 border-dashed border-white/70 shadow-sm ${colorClasses} opacity-90 flex flex-col gap-1 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer relative bg-[linear-gradient(45deg,rgba(255,255,255,0.08)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.08)_50%,rgba(255,255,255,0.08)_75%,transparent_75%,transparent)] bg-[length:8px_8px]`}
                    title="Click para ver Auditoría de Trazabilidad Enológica (5 Etapas)"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-base font-black tracking-tight font-mono">{camion.patente}</span>
                      {isAtrasado ? (
                        <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse shadow-xs">
                          Alerta Atraso
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/25 text-white uppercase tracking-wider">
                          En Tránsito
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold mt-0.5">
                      <span>{camion.grupo}</span>
                      <span className="text-[10px] font-mono opacity-90">
                        {(camion.peso_kg / 1000).toFixed(1)} Ton
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] mt-1 pt-1 border-t border-white/20 font-mono opacity-95">
                      <span className="text-[10px] uppercase font-sans font-semibold">ETA Proyectado:</span>
                      <span className="font-bold">
                        {camion.hora_llegada
                          ? new Date(camion.hora_llegada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '--:--'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {enRuta.length === 0 && (
                <div className="text-center py-5 px-3 bg-white border border-dashed border-stone-300 rounded-xl text-stone-500 text-xs font-medium">
                  No hay camiones programados en ruta
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
