import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Pozo, BloqueGantt } from '@/types';
import { getGroupColor } from '@/utils/colors';
import { fijarAsignacion } from '@/api/ganttService';

interface TableroGanttProps {
  pozos: Pozo[];
  virtualTime: number | null;
  onUpdate?: () => void;
}

export const TableroGantt: React.FC<TableroGanttProps> = ({ pozos, virtualTime, onUpdate }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Estado para el Modal de Fijación Manual
  const [selectedAsig, setSelectedAsig] = useState<{asig: BloqueGantt, pozo: Pozo} | null>(null);
  const [loadingPin, setLoadingPin] = useState(false);

  const shiftDay = useMemo(() => {
    if (!virtualTime) return null;
    const d = new Date(virtualTime);
    if (d.getHours() < 8) d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }, [virtualTime]);

  const { startTime, hoursToShow } = useMemo(() => {
    const start = virtualTime ? new Date(virtualTime) : new Date();
    // Si la hora virtual cruzó la medianoche (< 8 AM), el inicio del Gantt debe anclarse a las 08:00 AM del día ANTERIOR.
    if (start.getHours() < 8) {
      start.setDate(start.getDate() - 1);
    }
    start.setHours(8, 0, 0, 0);
    
    return {
      startTime: start,
      hoursToShow: 24 
    };
  }, [shiftDay]); // Solo recalcula si el "Día de Turno" cambia

  // Auto-scroll logic (ahora ejecutado de forma segura después de inicializar startTime)
  useEffect(() => {
    if (virtualTime && scrollContainerRef.current) {
      const base = startTime.getTime();
      const totalMinutes = hoursToShow * 60;
      const leftPercent = ((virtualTime - base) / (totalMinutes * 60 * 1000));
      const totalWidthPx = hoursToShow * 240;
      const targetScroll = leftPercent * totalWidthPx;
      
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, targetScroll - 400),
        behavior: 'smooth'
      });
    }
  }, [virtualTime, startTime, hoursToShow]);

  const totalMinutes = hoursToShow * 60;
  const hourWidth = 240; 
  const totalWidth = hoursToShow * hourWidth;

  const hourLabels = Array.from({ length: hoursToShow + 1 }).map((_, i) => {
    const d = new Date(startTime.getTime() + i * 60 * 60 * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  });

  const getBlockStyle = (inicioISO: string, finISO: string) => {
    const start = new Date(inicioISO).getTime();
    const end = new Date(finISO).getTime();
    const base = startTime.getTime();
    
    let leftPercent = ((start - base) / (totalMinutes * 60 * 1000)) * 100;
    let widthPercent = ((end - start) / (totalMinutes * 60 * 1000)) * 100;

    if (leftPercent < 0) {
      widthPercent += leftPercent;
      leftPercent = 0;
    }
    if (leftPercent + widthPercent > 100) {
      widthPercent = 100 - leftPercent;
    }

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  let redLineLeft = -1;
  if (virtualTime) {
    redLineLeft = ((virtualTime - startTime.getTime()) / (totalMinutes * 60 * 1000)) * 100;
  }

  return (
    <div className="h-full bg-white flex flex-col font-sans overflow-hidden">
      
      <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white z-[70]">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Asignación Operativa</h2>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Horizonte Predictivo MPC</p>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] font-bold text-slate-500 max-w-xl justify-end">
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded"></div> G-1</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-teal-500 rounded"></div> G-2</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-cyan-500 rounded"></div> G-3</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-sky-500 rounded"></div> G-4</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded"></div> G-5</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-indigo-500 rounded"></div> G-6</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-violet-500 rounded"></div> G-7</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-purple-500 rounded"></div> G-8</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-fuchsia-500 rounded"></div> G-9</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-rose-500 rounded"></div> G-10</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-500 rounded"></div> G-11</div>
           <div className="flex items-center gap-1.5 ml-2"><div className="w-3 h-3 bg-slate-500 rounded"></div> GENÉRICO</div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-auto flex relative bg-slate-50 scroll-smooth">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="w-56 flex-shrink-0 bg-white border-r border-gray-300 sticky left-0 z-[60] flex flex-col shadow-[4px_0_15px_-3px_rgba(0,0,0,0.1)]">
          <div className="h-12 border-b border-gray-300 flex items-center px-4 font-bold text-slate-500 bg-slate-100 text-sm z-[70] relative">
            MAQUINARIA
          </div>
          {pozos.map(pozo => (
            <div key={pozo.id} className="h-32 border-b border-gray-200 flex flex-col justify-center px-5 relative bg-white group transition-colors hover:bg-slate-50 hover:z-50">
               <div className="font-extrabold text-lg text-slate-800">{pozo.nombre.replace('_', ' ')}</div>
               <div className="text-xs text-slate-400 font-medium">Capacidad: 50 ton/h</div>
            </div>
          ))}
        </div>

        {/* ÁREA SCROLLEABLE */}
        <div className="flex flex-col relative" style={{ minWidth: `${totalWidth}px` }}>
          
          <div className="h-12 border-b border-gray-200 flex bg-white sticky top-0 z-[55]">
            {hourLabels.map((label, i) => (
              <div key={i} className="border-l border-gray-200 px-3 py-3 text-sm font-bold text-slate-500" style={{ width: `${hourWidth}px` }}>
                {label}
              </div>
            ))}
          </div>

          <div className="relative flex-1 flex flex-col">
            <div className="absolute inset-0 flex pointer-events-none z-0">
              {hourLabels.map((_, i) => (
                <div key={`grid-${i}`} className="border-l border-gray-200/60" style={{ width: `${hourWidth}px` }}></div>
              ))}
            </div>

            {redLineLeft >= 0 && redLineLeft <= 100 && (
              <div 
                className="absolute top-0 bottom-0 border-l-2 border-red-500 border-dashed z-[58] transition-all duration-500 ease-in-out pointer-events-none" 
                style={{ left: `${redLineLeft}%` }}
              >
                <div className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-b-md rounded-tr-md absolute left-0.5 top-0 font-bold shadow-md">
                  {new Date(virtualTime!).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </div>
              </div>
            )}

            {pozos.map((pozo, rowIndex) => (
              <div key={pozo.id} className="h-32 border-b border-gray-100 relative group/row hover:bg-slate-200/30 transition-colors z-10 hover:z-50">
                {pozo.asignaciones.map(asig => {
                   const style = getBlockStyle(asig.hora_inicio, asig.hora_fin);
                   const colorClass = getGroupColor(asig.grupo);
                   
                   if (parseFloat(style.left) > 100 || parseFloat(style.left) + parseFloat(style.width) < 0) return null;

                   const endT = new Date(asig.hora_fin).getTime();
                   const isPast = virtualTime && endT <= virtualTime;
                   let visualStateClass = isPast ? 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100' : 'opacity-100 hover:-translate-y-1 hover:shadow-xl';

                   if (asig.estado === 'TRANSITO') {
                       visualStateClass += ' border-2 border-dashed border-white/60 opacity-80 backdrop-blur-sm';
                   }

                   const tooltipPos = rowIndex <= 1 ? 'top-full mt-2' : 'bottom-full mb-2';
                   const tooltipTriangle = rowIndex <= 1 ? 'bottom-full border-b-slate-900' : 'top-full border-t-slate-900';

                   return (
                     <div 
                       key={asig.id}
                       style={style}
                       onClick={() => {
                         if (asig.estado === 'PATIO' || asig.estado === 'ROMANA') {
                           setSelectedAsig({asig, pozo});
                         } else {
                           alert('Solo puedes fijar manualmente camiones que estén físicamente en el Patio o Romana.');
                         }
                       }}
                       className={`absolute top-4 bottom-4 rounded-lg ${colorClass} ${visualStateClass} group flex flex-col justify-center cursor-pointer transition-all z-10 hover:z-[65] ${asig.estado !== 'TRANSITO' ? 'border border-white/20' : ''}`}
                     >
                       {/* Icono de Fijado (Candado) */}
                       {asig.override_manual && (
                         <div className="absolute top-1 right-1 text-[10px] bg-slate-900/40 text-white rounded-full w-4 h-4 flex items-center justify-center">
                           🔒
                         </div>
                       )}

                       {/* Contenedor de texto */}
                       <div className="flex flex-col px-2 overflow-hidden w-full items-center text-center">
                         <div className="font-extrabold text-sm tracking-wide whitespace-nowrap text-ellipsis overflow-hidden w-full">{asig.patente}</div>
                         <div className="text-[10px] font-medium opacity-90 whitespace-nowrap text-ellipsis overflow-hidden w-full">{asig.grupo}</div>
                       </div>

                       <div className={`absolute left-1/2 -translate-x-1/2 ${tooltipPos} hidden group-hover:block w-56 bg-slate-900 text-white text-xs rounded-xl p-4 shadow-2xl z-[75] pointer-events-none`}>
                          <div className="font-bold text-base mb-2 border-b border-slate-700 pb-2 text-center text-blue-100">{asig.patente} <span className="text-[10px] ml-2 text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{asig.estado}</span></div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between"><span className="text-slate-400">Grupo:</span> <span className="font-bold">{asig.grupo}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Peso:</span> <span className="font-bold">{(asig.peso_kg / 1000).toFixed(1)} Ton</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Espera:</span> <span className={`font-bold ${asig.espera_hrs > 1.5 ? 'text-red-400' : 'text-emerald-400'}`}>{asig.espera_hrs.toFixed(1)} hrs</span></div>
                          </div>
                          
                          <div className="mt-3 pt-2 border-t border-slate-700 flex justify-between text-slate-300 font-mono text-center">
                            <span className="bg-slate-800 px-2 py-1 rounded">{new Date(asig.hora_inicio).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            <span className="self-center text-slate-500">▶</span>
                            <span className="bg-slate-800 px-2 py-1 rounded">{new Date(asig.hora_fin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                          </div>
                          
                          <div className={`absolute ${tooltipTriangle} left-1/2 -translate-x-1/2 border-8 border-transparent`}></div>
                       </div>
                     </div>
                   )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Fijación Manual */}
      {selectedAsig && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[400px] border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-1">
              Fijar Camión {selectedAsig.asig.patente}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Grupo: <span className="font-bold text-slate-700">{selectedAsig.asig.grupo}</span> | 
              Estado: <span className="font-bold text-slate-700">{selectedAsig.asig.estado}</span>
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pozo Asignado</label>
                <select 
                  className="w-full bg-slate-50 text-slate-900 border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  value={selectedAsig.pozo.id}
                  onChange={(e) => setSelectedAsig({...selectedAsig, pozo: pozos.find(p => p.id === parseInt(e.target.value)) || selectedAsig.pozo})}
                >
                  {pozos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora de Inicio</label>
                <input 
                  type="datetime-local" 
                  className="w-full bg-slate-50 text-slate-900 border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  value={selectedAsig.asig.hora_inicio.slice(0, 16)}
                  onChange={(e) => {
                    // Como el backend usa USE_TZ=False (horas naive), enviamos la hora tal cual se digita en local
                    setSelectedAsig({...selectedAsig, asig: {...selectedAsig.asig, hora_inicio: e.target.value}});
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors"
                onClick={() => setSelectedAsig(null)}
              >
                Cancelar
              </button>
              {selectedAsig.asig.override_manual && (
                <button 
                  className="flex-1 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold py-2.5 rounded-xl transition-colors"
                  disabled={loadingPin}
                  onClick={async () => {
                    try {
                      setLoadingPin(true);
                      await fijarAsignacion(selectedAsig.asig.id, selectedAsig.pozo.id, selectedAsig.asig.hora_inicio, false);
                      setSelectedAsig(null);
                      if (onUpdate) onUpdate();
                    } catch (e: any) { alert(e.message); } finally { setLoadingPin(false); }
                  }}
                >
                  {loadingPin ? '...' : 'Desfijar (Auto)'}
                </button>
              )}
              <button 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-md shadow-blue-500/30"
                disabled={loadingPin}
                onClick={async () => {
                  try {
                    setLoadingPin(true);
                    await fijarAsignacion(selectedAsig.asig.id, selectedAsig.pozo.id, selectedAsig.asig.hora_inicio, true);
                    setSelectedAsig(null);
                    if (onUpdate) onUpdate();
                  } catch (e: any) { alert(e.message); } finally { setLoadingPin(false); }
                }}
              >
                {loadingPin ? 'Guardando...' : '🔒 Fijar Aquí'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
