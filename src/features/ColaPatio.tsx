import React from 'react';
import { CamionPatio } from '@/types';
import { getGroupColor } from '@/utils/colors';

interface ColaPatioProps {
  camiones: CamionPatio[];
}

export const ColaPatio: React.FC<ColaPatioProps> = ({ camiones }) => {
  const enPatio = camiones.filter(c => c.estado === 'ROMANA' || c.estado === 'PATIO');
  const enRuta = camiones.filter(c => c.estado === 'TRANSITO' || c.estado === 'ALERTA_ATRASO');

  const renderList = (lista: CamionPatio[], titulo: string, emptyMsg: string) => (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-2 flex justify-between">
        {titulo}
        <span className="bg-slate-200 text-slate-600 px-2 rounded-full">{lista.length}</span>
      </h3>
      <div className="space-y-2">
        {lista.map((camion) => {
          const colorClasses = getGroupColor(camion.grupo);
          const isAtrasado = camion.estado === 'ALERTA_ATRASO';
          
          return (
            <div 
              key={camion.viaje_id} 
              className={`p-3 rounded-lg border-2 shadow-sm ${colorClasses} flex flex-col gap-1 transition-transform hover:scale-105 cursor-pointer relative ${camion.estado === 'TRANSITO' ? 'opacity-80 border-dashed' : ''}`}
            >
              <div className="flex justify-between items-center font-bold">
                <span className="text-base tracking-tight">{camion.patente}</span>
                {isAtrasado && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 rounded uppercase absolute top-[-8px] right-2 font-bold animate-pulse">
                    Atrasado
                  </span>
                )}
              </div>
              <div className="text-sm font-medium">{camion.grupo}</div>
              <div className="flex justify-between text-xs mt-2 opacity-80 font-mono">
                <span>{camion.estado === 'TRANSITO' ? 'ETA:' : 'Llegada:'} {camion.hora_llegada ? new Date(camion.hora_llegada).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
              </div>
            </div>
          );
        })}
        {lista.length === 0 && (
          <div className="text-center text-slate-400 py-4 text-sm italic">{emptyMsg}</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 bg-slate-50 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-800">Camiones</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        {renderList(enPatio, "Patio Físico", "Patio vacío")}
        {renderList(enRuta, "En Ruta (GPS)", "No hay GPS programados")}
      </div>
    </div>
  );
};
