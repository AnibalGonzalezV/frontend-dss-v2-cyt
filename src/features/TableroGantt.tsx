import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Pozo, BloqueGantt, PrensaGantt } from '@/types';
import { getGroupColor, getGroupBgColor } from '@/utils/colors';
import { fijarAsignacion, toggleOperatividadPozo } from '@/api/ganttService';
import { formatearNombreEquipo } from '@/utils/formatters';
import { ModalDetalleMaquinaria } from './ModalDetalleMaquinaria';
import toast from 'react-hot-toast';

interface TableroGanttProps {
  pozos: Pozo[];
  prensas?: PrensaGantt[];
  virtualTime: number | null;
  onUpdate?: () => void;
  onSelectViaje?: (viajeId: number) => void;
  onSelectCuba?: (cubaNombre: string) => void;
  onSimulatingChange?: (isSimulating: boolean, msg?: string, successMsg?: string) => void;
  onPauseAutoPlay?: () => void;
}

type ZoomMode = 'DETALLE' | 'FIT_24H';
type GanttViewMode = 'POZOS' | 'PRENSAS';

export const TableroGantt: React.FC<TableroGanttProps> = ({ 
  pozos, 
  prensas, 
  virtualTime, 
  onUpdate, 
  onSelectViaje, 
  onSelectCuba,
  onSimulatingChange,
  onPauseAutoPlay
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Selector de Vista: Pozos de Recepción vs Batería de 12 Prensas Neumáticas
  const [ganttViewMode, setGanttViewMode] = useState<GanttViewMode>('POZOS');
  const [selectedEquipoModal, setSelectedEquipoModal] = useState<string | null>(null);

  // Estado para el Modal de Fijación Manual y Corrección de Desvío en Terreno
  const [selectedAsig, setSelectedAsig] = useState<{asig: BloqueGantt, pozo: Pozo, pozoOriginal: Pozo} | null>(null);
  const [loadingPin, setLoadingPin] = useState(false);
  const [confirmacionFisica, setConfirmacionFisica] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Estado para Modal de Contingencia y Parada de Pozo (Opción A)
  const [modalContingenciaPozo, setModalContingenciaPozo] = useState<Pozo | null>(null);
  const [loadingContingencia, setLoadingContingencia] = useState(false);

  // Estados de Navegación y Auditoría Histórica (Módulo 8)
  const [zoomMode, setZoomMode] = useState<ZoomMode>('DETALLE');
  const [atenuarPasado, setAtenuarPasado] = useState<boolean>(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [containerWidth, setContainerWidth] = useState<number>(1400);

  // Respaldo de 12 Prensas Estáticas en caso de retardo en carga
  const prensasList = useMemo(() => {
    if (prensas && prensas.length > 0) return prensas;
    const list: PrensaGantt[] = [];
    for (let i = 1; i <= 12; i++) {
      const pad = i < 10 ? `0${i}` : `${i}`;
      list.push({
        id: i,
        nombre: `PR_${pad}`,
        nombre_humano: `Prensa ${pad}`,
        ala: i <= 6 ? 'ALA_IZQUIERDA' : 'ALA_DERECHA',
        operativa: true,
        capacidad_kg: 80000,
        batches: []
      });
    }
    return list;
  }, [prensas]);

  // Monitoreo de ancho disponible para modo FIT_24H mediante ResizeObserver de precisión
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const updateWidth = () => {
      if (el) {
        setContainerWidth(el.clientWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
  }, [shiftDay]);

  // Escala horizontal dinámica (210px en Detalle vs ajuste fluido exacto en Día Completo)
  const hourWidth = useMemo(() => {
    if (zoomMode === 'FIT_24H') {
      const availableWidth = Math.max(containerWidth - 224, 720);
      return availableWidth / hoursToShow;
    }
    return 210;
  }, [zoomMode, containerWidth, hoursToShow]);

  const totalMinutes = hoursToShow * 60;
  const totalWidth = hoursToShow * hourWidth;

  const handleSetZoomMode = (mode: ZoomMode) => {
    setZoomMode(mode);
    if (mode === 'FIT_24H') {
      setAutoScrollEnabled(false);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ left: 0, behavior: 'instant' });
      }
    } else {
      setAutoScrollEnabled(true);
      if (virtualTime && scrollContainerRef.current) {
        const base = startTime.getTime();
        const totalMin = hoursToShow * 60;
        const leftPercent = ((virtualTime - base) / (totalMin * 60 * 1000));
        const totalWidthPx = hoursToShow * 210;
        const targetScroll = Math.max(0, leftPercent * totalWidthPx - 380);
        scrollContainerRef.current.scrollTo({ left: targetScroll, behavior: 'instant' });
      }
    }
  };

  // Auto-scroll logic con detección de seguimiento
  useEffect(() => {
    if (virtualTime && scrollContainerRef.current && autoScrollEnabled && zoomMode === 'DETALLE') {
      const base = startTime.getTime();
      const totalMin = hoursToShow * 60;
      const leftPercent = ((virtualTime - base) / (totalMin * 60 * 1000));
      const totalWidthPx = hoursToShow * hourWidth;
      const targetScroll = leftPercent * totalWidthPx;
      
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, targetScroll - 380),
        behavior: 'smooth'
      });
    }
  }, [virtualTime, startTime, hoursToShow, hourWidth, autoScrollEnabled, zoomMode]);

  // Detección de scroll manual del usuario para pausar seguimiento sin interrumpir auditoría
  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!virtualTime || zoomMode === 'FIT_24H') return;
    const base = startTime.getTime();
    const totalMin = hoursToShow * 60;
    const leftPercent = ((virtualTime - base) / (totalMin * 60 * 1000));
    const totalWidthPx = hoursToShow * hourWidth;
    const targetScroll = Math.max(0, leftPercent * totalWidthPx - 380);
    const currentScroll = e.currentTarget.scrollLeft;

    if (Math.abs(currentScroll - targetScroll) > 280 && autoScrollEnabled) {
      setAutoScrollEnabled(false);
    }
  };

  // Navegación rápida
  const scrollToStart = () => {
    setAutoScrollEnabled(false);
    scrollContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  };

  const scrollToNow = () => {
    setAutoScrollEnabled(true);
    if (scrollContainerRef.current && virtualTime) {
      const base = startTime.getTime();
      const totalMin = hoursToShow * 60;
      const leftPercent = ((virtualTime - base) / (totalMin * 60 * 1000));
      const targetScroll = Math.max(0, leftPercent * hoursToShow * hourWidth - 380);
      scrollContainerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  const scrollToEnd = () => {
    setAutoScrollEnabled(false);
    scrollContainerRef.current?.scrollTo({ left: totalWidth, behavior: 'smooth' });
  };

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
    <div className="h-full bg-white flex flex-col font-sans overflow-hidden relative">
      
      {/* Cabecera Superior con Controles de Auditoría Histórica */}
      <div className="flex justify-between items-center px-4 py-2.5 border-b border-stone-200 bg-white z-[70] gap-4 shrink-0 min-h-[52px]">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-black text-stone-900 leading-none">Asignación Operativa</h2>
          </div>

          {/* Selector de Maquinaria: Pozos vs Batería de Prensas */}
          <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-300 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setGanttViewMode('POZOS')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                ganttViewMode === 'POZOS' 
                  ? 'bg-white text-stone-900 shadow-xs font-black ring-1 ring-stone-300' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Pozos de Descarga ({pozos.length})
            </button>
            <button
              type="button"
              onClick={() => setGanttViewMode('PRENSAS')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                ganttViewMode === 'PRENSAS' 
                  ? 'bg-white text-stone-900 shadow-xs font-black ring-1 ring-stone-300' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Batería de Prensas ({prensasList.length})
            </button>
          </div>

          {/* Selector de Modo Zoom y Salto Temporal */}
          <div className="flex items-center gap-2 border-l border-stone-200 pl-3">
            <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleSetZoomMode('DETALLE')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  zoomMode === 'DETALLE' 
                    ? 'bg-white text-[#FE6D2C] shadow-xs font-black' 
                    : 'text-stone-500 hover:text-stone-800 font-medium'
                }`}
              >
                Detalle
              </button>
              <button
                type="button"
                onClick={() => handleSetZoomMode('FIT_24H')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  zoomMode === 'FIT_24H' 
                    ? 'bg-white text-[#FE6D2C] shadow-xs font-black' 
                    : 'text-stone-500 hover:text-stone-800 font-medium'
                }`}
              >
                Día Completo (24h)
              </button>
            </div>

            {/* Navegación temporal rápida (mantiene ancho reservado para eliminar reajuste de layout) */}
            <div className={`flex items-center gap-1 transition-opacity ${zoomMode === 'DETALLE' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <button
                type="button"
                onClick={scrollToStart}
                disabled={zoomMode !== 'DETALLE'}
                title="Ir al inicio de la jornada (08:00)"
                className="px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded border border-stone-200 cursor-pointer"
              >
                |&lt; 08:00
              </button>
              <button
                type="button"
                onClick={scrollToNow}
                disabled={zoomMode !== 'DETALLE'}
                title="Centrar en hora actual y reanudar seguimiento"
                className="px-2 py-1 text-xs font-bold text-[#FE6D2C] hover:bg-orange-50 bg-orange-50/50 rounded border border-orange-200 cursor-pointer"
              >
                Ahora
              </button>
              <button
                type="button"
                onClick={scrollToEnd}
                disabled={zoomMode !== 'DETALLE'}
                title="Ir al cierre de jornada (02:00)"
                className="px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded border border-stone-200 cursor-pointer"
              >
                02:00 &gt;|
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAtenuarPasado(!atenuarPasado)}
              title="Alternar atenuación en escala de grises para camiones finalizados"
              className={`px-2 py-1 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                atenuarPasado
                  ? 'bg-stone-200 text-stone-700 border-stone-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {atenuarPasado ? 'Atenuación: ON' : 'Colores Nítidos'}
            </button>
          </div>
        </div>

        {/* Leyenda Dinámica de Grupos Enológicos */}
        <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 max-w-xl justify-end items-center">
          {Array.from({ length: 11 }, (_, i) => i + 1).map((num) => (
            <div key={`legend-g-${num}`} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-xs ${getGroupBgColor(`GRUPO-${num}`)}`}></div>
              <span>G-{num}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 ml-1">
            <div className={`w-2.5 h-2.5 rounded-xs ${getGroupBgColor('GENERICO')}`}></div>
            <span>GEN</span>
          </div>
        </div>
      </div>

      <div 
        ref={scrollContainerRef} 
        onScroll={handleContainerScroll}
        className={`flex-1 flex relative bg-stone-50 ${zoomMode === 'FIT_24H' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-auto'}`}
      >
        
        {/* COLUMNA IZQUIERDA (STICKY) */}
        <div className="w-56 flex-shrink-0 bg-white border-r border-gray-300 sticky left-0 z-[60] flex flex-col shadow-[4px_0_15px_-3px_rgba(0,0,0,0.1)]">
          <div 
            className="h-12 border-b border-gray-200 flex items-center justify-between px-4 font-bold text-slate-600 bg-slate-100 text-xs sticky top-0 z-[70] tracking-wider shrink-0 box-border"
            style={{ height: '48px', minHeight: '48px', maxHeight: '48px' }}
          >
            <span>{ganttViewMode === 'POZOS' ? 'POZOS DE DESCARGA' : 'BATERÍA DE PRENSAS'}</span>
            <span className="font-mono text-[10px] text-slate-400">
              {ganttViewMode === 'POZOS' ? `${pozos.length} tolvas` : `${prensasList.length} máqs`}
            </span>
          </div>

          {ganttViewMode === 'POZOS' ? (
            pozos.map(pozo => (
              <div 
                key={pozo.id} 
                className="h-32 shrink-0 border-b border-gray-200 flex flex-col justify-center px-4 relative bg-white group transition-colors hover:bg-slate-50 hover:z-50 box-border"
                style={{ height: '128px', minHeight: '128px', maxHeight: '128px' }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-base text-slate-800">{formatearNombreEquipo(pozo.nombre)}</div>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                    pozo.operativa 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                      : 'bg-red-100 text-red-900 border-red-300 animate-pulse'
                  }`}>
                    {pozo.operativa ? 'Operativo' : 'En Falla'}
                  </span>
                </div>
                <div className="text-xs text-stone-500 font-semibold mt-0.5">Capacidad: 50 ton/h</div>

                {/* Botón de Control de Contingencia */}
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPauseAutoPlay?.();
                      setModalContingenciaPozo(pozo);
                    }}
                    className={`w-full py-1 px-2 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all shadow-2xs cursor-pointer border ${
                      pozo.operativa
                        ? 'bg-amber-50 hover:bg-red-50 text-amber-800 hover:text-red-700 border-amber-200 hover:border-red-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                    }`}
                  >
                    {pozo.operativa ? 'Declarar Parada' : 'Reactivar Tolva'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            prensasList.map((pr, idx) => {
              const esAlaIzquierda = pr.ala === 'ALA_IZQUIERDA' || idx < 6;
              return (
                <div 
                  key={pr.id || pr.nombre} 
                  onClick={() => setSelectedEquipoModal(pr.nombre)}
                  className="h-16 shrink-0 border-b border-gray-200 flex flex-col justify-center px-4 relative bg-white group transition-colors hover:bg-blue-50/50 cursor-pointer box-border"
                  style={{ height: '64px', minHeight: '64px', maxHeight: '64px' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                      {pr.nombre_humano || formatearNombreEquipo(pr.nombre)}
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      esAlaIzquierda 
                        ? 'bg-blue-50 text-blue-900 border-blue-200' 
                        : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                    }`}>
                      {esAlaIzquierda ? 'Ala Izq' : 'Ala Der'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-500 font-semibold mt-0.5">
                    <span>80 Ton / 2.5h</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {pr.batches && pr.batches.length > 0 
                        ? `${pr.batches.length} ${pr.batches.length === 1 ? 'batch' : 'batches'}` 
                        : 'Disponible'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ÁREA DE LÍNEA TEMPORAL */}
        <div 
          className={`flex flex-col relative ${zoomMode === 'FIT_24H' ? 'w-[calc(100%-14rem)] flex-1' : ''}`} 
          style={{ minWidth: zoomMode === 'FIT_24H' ? '0px' : `${totalWidth}px` }}
        >
          
          <div 
            className="h-12 border-b border-gray-200 flex bg-white sticky top-0 z-[55] shrink-0 box-border"
            style={{ height: '48px', minHeight: '48px', maxHeight: '48px' }}
          >
            {hourLabels.map((label, i) => (
              <div 
                key={i} 
                className="border-l border-gray-200 px-2 flex items-center justify-center h-full text-xs font-bold text-slate-500 text-center box-border" 
                style={{ width: `${hourWidth}px` }}
              >
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

            {/* Sombreado del pasado opcional */}
            {atenuarPasado && redLineLeft > 0 && (
              <div 
                className="absolute top-0 bottom-0 bg-slate-300/30 backdrop-grayscale-[0.5] z-0 pointer-events-none transition-all duration-500 ease-in-out"
                style={{ left: '0%', width: `${Math.min(redLineLeft, 100)}%` }}
              />
            )}
              
            {/* Línea Roja del Reloj Virtual */}
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

            {/* Bloques de Asignación por Pozo o Batches de Prensa */}
            {ganttViewMode === 'POZOS' ? (
              pozos.map((pozo, rowIndex) => (
                <div 
                  key={pozo.id} 
                  className={`h-32 shrink-0 border-b border-gray-200 relative group/row transition-colors z-10 hover:z-50 box-border ${
                    pozo.operativa ? 'hover:bg-slate-200/30' : 'bg-red-50/20'
                  }`}
                  style={{ height: '128px', minHeight: '128px', maxHeight: '128px' }}
                >
                  {pozo.asignaciones.map(asig => {
                     const style = getBlockStyle(asig.hora_inicio, asig.hora_fin);
                     const colorClass = getGroupColor(asig.grupo);
                     
                     if (parseFloat(style.left) > 100 || parseFloat(style.left) + parseFloat(style.width) < 0) return null;

                     const endT = new Date(asig.hora_fin).getTime();
                     const isPast = virtualTime && endT <= virtualTime;
                     let visualStateClass = 'opacity-100 hover:-translate-y-1 hover:shadow-xl';
                        
                     const isTransito = asig.estado === 'TRANSITO';
                     const isFirmAI = !asig.override_manual && (asig.estado === 'PATIO' || asig.estado === 'ROMANA');
                        
                     if (isTransito) {
                       // Camiones GPS tentativos
                       visualStateClass = 'opacity-85 border-2 border-dashed border-white/60 hover:opacity-100 hover:-translate-y-1 hover:shadow-xl bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:10px_10px]';
                     } else if (isPast && atenuarPasado) {
                       visualStateClass = 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100';
                     } else if (isPast && !atenuarPasado) {
                       // Modo auditoría nítido: colores vivos con distinción de finalizado
                       visualStateClass = 'opacity-95 hover:-translate-y-1 hover:shadow-xl border-l-4 border-l-slate-900/60 shadow-xs';
                     } else if (isFirmAI) {
                       visualStateClass = 'opacity-100 hover:-translate-y-1 hover:shadow-xl border border-white/20';
                     }

                     const tooltipPos = rowIndex <= 1 ? 'top-full mt-2' : 'bottom-full mb-2';
                     const tooltipTriangle = rowIndex <= 1 ? 'bottom-full border-b-slate-900' : 'top-full border-t-slate-900';

                     return (
                       <div 
                         key={asig.id}
                         style={style}
                         onClick={() => {
                           onSelectViaje?.(asig.viaje_id);
                         }}
                         className={`absolute top-4 bottom-4 rounded-lg ${colorClass} ${visualStateClass} group flex flex-col justify-center cursor-pointer transition-all z-10 hover:z-[65] ${asig.estado !== 'TRANSITO' ? 'border border-white/20' : ''}`}
                       >
                         {/* Botón de Ajuste Manual (en FIT_24H visible solo al hover para no tapar texto) */}
                         {(asig.estado === 'PATIO' || asig.estado === 'ROMANA' || asig.estado === 'DESCARGANDO') && (
                           <button
                             type="button"
                             onClick={(e) => {
                               e.stopPropagation();
                               onPauseAutoPlay?.();
                               setSelectedAsig({asig, pozo, pozoOriginal: pozo}); setConfirmacionFisica(false); setShowConfirmModal(false);
                             }}
                             title="Reasignar pozo / Fijar asignación manual"
                             className={`absolute top-1 right-1 text-[9px] font-bold bg-slate-900/80 hover:bg-blue-600 text-white rounded px-1.5 py-0.5 shadow-xs flex items-center justify-center transition-colors z-20 cursor-pointer ${
                               zoomMode === 'FIT_24H' ? 'hidden group-hover:flex' : ''
                             }`}
                           >
                             {asig.override_manual ? 'F' : 'Ajustar'}
                           </button>
                         )}

                         {/* Contenedor de texto con ajuste responsivo a zoom */}
                         <div className="flex flex-col px-1.5 overflow-hidden w-full items-center text-center leading-tight">
                           <div className={`font-extrabold tracking-tight whitespace-nowrap text-ellipsis overflow-hidden w-full ${zoomMode === 'FIT_24H' ? 'text-[11px]' : 'text-sm'}`}>
                             {asig.patente}
                           </div>
                           {zoomMode !== 'FIT_24H' && (
                             <div className="text-[10px] font-medium opacity-90 whitespace-nowrap text-ellipsis overflow-hidden w-full">
                               {asig.grupo}
                             </div>
                           )}
                         </div>

                         {/* Tooltip de Auditoría */}
                         <div className={`absolute left-1/2 -translate-x-1/2 ${tooltipPos} hidden group-hover:block w-56 bg-slate-900 text-white text-xs rounded-xl p-4 shadow-2xl z-[75] pointer-events-none`}>
                            <div className="flex justify-center mb-3">
                              {asig.estado === 'FINALIZADO' ? (
                                  <span className="bg-slate-700/60 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">DESCARGA FINALIZADA</span>
                              ) : asig.estado === 'DESCARGANDO' ? (
                                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">OPERACIÓN ACTIVA</span>
                              ) : asig.estado === 'TRANSITO' ? (
                                  <span className="bg-slate-700/50 text-slate-300 border border-slate-600 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">PLAN TENTATIVO (GPS)</span>
                              ) : asig.override_manual ? (
                                  <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">ASIGNACIÓN FIJA</span>
                              ) : (
                                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">PLAN FIRME (IA)</span>
                              )}
                            </div>
                            
                            <div className="font-bold text-base mb-2 border-b border-slate-700 pb-2 text-center text-blue-100">
                              {asig.patente} <span className="text-[10px] ml-2 text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{asig.estado}</span>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex justify-between"><span className="text-slate-400">Grupo:</span> <span className="font-bold">{asig.grupo}</span></div>
                              <div className="flex justify-between"><span className="text-slate-400">Peso:</span> <span className="font-bold">{(asig.peso_kg / 1000).toFixed(1)} Ton</span></div>
                              <div className="flex justify-between"><span className="text-slate-400">Espera:</span> <span className={`font-bold ${asig.espera_hrs > 1.5 ? 'text-red-400' : 'text-emerald-400'}`}>{asig.espera_hrs.toFixed(1)} hrs</span></div>
                            </div>
                            
                            <div className="mt-3 pt-2 border-t border-slate-700 flex justify-between text-slate-300 font-mono text-center">
                              <span className="bg-slate-800 px-2 py-1 rounded">{new Date(asig.hora_inicio).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                              <span className="self-center text-slate-500">&gt;</span>
                              <span className="bg-slate-800 px-2 py-1 rounded">{new Date(asig.hora_fin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                            
                            <div className="mt-2 text-center text-[10px] text-blue-300 font-medium">
                              Clic para auditar trazabilidad
                            </div>

                            <div className={`absolute ${tooltipTriangle} left-1/2 -translate-x-1/2 border-8 border-transparent`}></div>
                         </div>
                       </div>
                     );
                  })}

                  {/* Overlay de Contingencia / Fuera de Servicio */}
                  {!pozo.operativa && (
                    <div className="absolute inset-0 bg-red-950/10 backdrop-grayscale-[0.4] z-20 pointer-events-none flex items-center justify-center border-y border-red-500/20 bg-[repeating-linear-gradient(45deg,rgba(239,68,68,0.06),rgba(239,68,68,0.06)_12px,transparent_12px,transparent_24px)]">
                      <div className="bg-red-600/90 text-white text-xs font-black px-3.5 py-1.5 rounded-lg shadow-lg uppercase tracking-wider flex items-center gap-2 border border-red-400">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                        <span>Tolva Fuera de Servicio · Tráfico Reenrutado</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              prensasList.map((pr, rowIndex) => (
                <div 
                  key={pr.id || pr.nombre} 
                  className="h-16 shrink-0 border-b border-gray-200 relative group/row hover:bg-blue-50/20 transition-colors z-10 hover:z-50 box-border"
                  style={{ height: '64px', minHeight: '64px', maxHeight: '64px' }}
                >
                  {pr.batches && pr.batches.map((batch) => {
                    const style = getBlockStyle(batch.hora_inicio, batch.hora_fin_estimada);
                    const colorClass = getGroupColor(batch.grupo_mezcla);

                    if (parseFloat(style.left) > 100 || parseFloat(style.left) + parseFloat(style.width) < 0) return null;

                    const endT = new Date(batch.hora_fin_estimada).getTime();
                    const startT = new Date(batch.hora_inicio).getTime();
                    const isPast = virtualTime && endT <= virtualTime;
                    const isCurrent = virtualTime && startT <= virtualTime && virtualTime < endT;

                    let visualClass = 'opacity-100 border border-white/30 hover:-translate-y-0.5 hover:shadow-lg';
                    if (batch.estado_batch === 'EN_CURSO' || isCurrent) {
                      visualClass = 'opacity-100 border-2 border-white ring-2 ring-blue-500 shadow-md animate-pulse';
                    } else if (batch.estado_batch === 'FINALIZADO' || isPast) {
                      visualClass = atenuarPasado ? 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100' : 'opacity-95 border border-white/20 shadow-xs';
                    } else {
                      visualClass = 'opacity-85 border border-dashed border-white/60 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:8px_8px]';
                    }

                    const tooltipPos = rowIndex <= 3 ? 'top-full mt-2' : 'bottom-full mb-2';

                    return (
                      <div
                        key={`${pr.nombre}-batch-${batch.numero_batch}-${batch.hora_inicio}`}
                        style={style}
                        onClick={() => setSelectedEquipoModal(pr.nombre)}
                        className={`absolute top-1.5 bottom-1.5 rounded-lg ${colorClass} ${visualClass} group flex flex-col justify-center cursor-pointer transition-all z-10 hover:z-[65] px-2 shadow-sm`}
                      >
                        {/* Batch label and tonnage */}
                        <div className="flex flex-col overflow-hidden w-full items-center text-center leading-tight">
                          <div className="font-extrabold tracking-tight whitespace-nowrap text-ellipsis overflow-hidden w-full text-xs text-white drop-shadow-xs">
                            Batch #{batch.numero_batch} · {batch.grupo_mezcla}
                          </div>
                          <div className="text-[10px] font-mono font-bold opacity-95 text-white whitespace-nowrap text-ellipsis overflow-hidden w-full">
                            {(batch.volumen_kg / 1000).toFixed(1)} Ton ({batch.porcentaje_ocupacion.toFixed(0)}%)
                          </div>
                          {zoomMode !== 'FIT_24H' && (
                            <div className="text-[9px] font-medium opacity-90 text-white whitespace-nowrap">
                              {batch.camiones.length} {batch.camiones.length === 1 ? 'camión' : 'camiones'}
                            </div>
                          )}
                        </div>

                        {/* Tooltip de Detalle Batch */}
                        <div className={`absolute left-1/2 -translate-x-1/2 ${tooltipPos} hidden group-hover:block w-64 bg-slate-900 text-white text-xs rounded-xl p-4 shadow-2xl z-[75] pointer-events-none`}>
                          <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700">
                            <span className="font-extrabold text-sm text-white">
                              {pr.nombre_humano || formatearNombreEquipo(pr.nombre)}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              batch.estado_batch === 'EN_CURSO'
                                ? 'bg-blue-500/30 text-blue-300 border border-blue-400'
                                : batch.estado_batch === 'FINALIZADO'
                                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400'
                                : 'bg-slate-700 text-slate-300 border border-slate-600'
                            }`}>
                              Batch #{batch.numero_batch} ({batch.estado_batch})
                            </span>
                          </div>

                          <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Variedad/Grupo:</span>
                              <strong className="text-white">{batch.grupo_mezcla}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Carga Total:</span>
                              <strong className="text-white">{batch.volumen_kg.toLocaleString('es-CL')} kg / 80k kg</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Ocupación:</span>
                              <strong className="text-white">{batch.porcentaje_ocupacion.toFixed(1)} %</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Ciclo Prensado:</span>
                              <span className="text-cyan-300">
                                {new Date(batch.hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} - {new Date(batch.hora_fin_estimada).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Aporte Camiones:</span>
                              <span className="text-white">{batch.camiones.length} viajes</span>
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-700 flex flex-wrap gap-1">
                            {batch.camiones.slice(0, 4).map((c, ci) => (
                              <span key={ci} className="text-[9px] font-mono bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded border border-slate-700">
                                {c.patente} ({(c.volumen_etapa / 1000).toFixed(1)}t)
                              </span>
                            ))}
                            {batch.camiones.length > 4 && (
                              <span className="text-[9px] font-mono text-slate-400 self-center">
                                +{batch.camiones.length - 4} más
                              </span>
                            )}
                          </div>

                          <div className="mt-2 text-[10px] text-blue-300 font-semibold text-center">
                            Clic para abrir ficha técnica completa
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pill Flotante de Retorno al Tiempo Real si el usuario navegó al pasado */}
      {!autoScrollEnabled && zoomMode === 'DETALLE' && virtualTime && (
        <div className="absolute bottom-4 right-6 z-[68] flex items-center gap-2 bg-slate-900/95 text-white px-3.5 py-2 rounded-full shadow-xl border border-slate-700 text-xs backdrop-blur-xs transition-all animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="text-slate-300 font-medium">Navegando historial</span>
          <button
            type="button"
            onClick={scrollToNow}
            className="ml-1 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-0.5 rounded-full font-bold text-[11px] transition-colors cursor-pointer shadow-xs"
          >
            Volver a {new Date(virtualTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </button>
        </div>
      )}

      {/* Modal de Fijación Manual / Corrección */}
      {selectedAsig && (() => {
        const isDescargando = selectedAsig.asig.estado === 'DESCARGANDO';
        const isDifferentPozo = selectedAsig.pozo.id !== selectedAsig.pozoOriginal.id;
        
        const adjustTime = (minutes: number) => {
          const dt = new Date(selectedAsig.asig.hora_inicio);
          dt.setMinutes(dt.getMinutes() + minutes);
          const offset = dt.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(dt.getTime() - offset)).toISOString().slice(0, 16);
          setSelectedAsig({...selectedAsig, asig: {...selectedAsig.asig, hora_inicio: localISOTime}});
        };

        const closeModal = () => {
          setSelectedAsig(null);
          setConfirmacionFisica(false);
          setShowConfirmModal(false);
        };

        const ejecutarDesvio = async () => {
          try {
            setLoadingPin(true);
            await fijarAsignacion(selectedAsig.asig.id, selectedAsig.pozo.id, selectedAsig.asig.hora_inicio, true, true);
            closeModal();
            toast.success(`Desvío registrado: ${selectedAsig.asig.patente} corregido a ${formatearNombreEquipo(selectedAsig.pozo.nombre)}`);
            if (onUpdate) onUpdate();
          } catch (e: any) {
            toast.error(e.message || 'Error al registrar desvío');
          } finally {
            setLoadingPin(false);
          }
        };

        return (
          <>
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className={`bg-white rounded-2xl shadow-2xl p-6 w-[480px] border-t-4 transition-all ${
                isDescargando ? 'border-t-amber-500' : 'border-t-blue-600'
              }`}>
                {/* Encabezado */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className={`text-xl font-bold ${isDescargando ? 'text-amber-700' : 'text-slate-800'}`}>
                      {isDescargando ? 'Corrección de Tolva (Descarga en Terreno)' : 'Asignación Manual de Pozo'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Camión <span className="font-bold text-slate-800">{selectedAsig.asig.patente}</span> | 
                      Grupo <span className="font-bold text-slate-700">{selectedAsig.asig.grupo}</span> | 
                      Estado <span className={`font-bold ${isDescargando ? 'text-amber-600' : 'text-blue-600'}`}>{selectedAsig.asig.estado}</span>
                    </p>
                  </div>
                  {isDescargando && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                      En Tolva
                    </span>
                  )}
                </div>

                {onSelectViaje && (
                  <button
                    type="button"
                    onClick={() => {
                      const vId = selectedAsig.asig.viaje_id;
                      closeModal();
                      onSelectViaje(vId);
                    }}
                    className="w-full mb-4 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Auditar Trazabilidad Enológica (5 Etapas)
                  </button>
                )}

                <div className="space-y-4 mb-6">
                  {/* Selector de Pozo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                      {isDescargando ? 'Seleccionar Tolva Física Real en Patio' : 'Seleccionar Pozo de Destino'}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {pozos.map(p => {
                        const isCurrent = selectedAsig.pozo.id === p.id;
                        const isOriginal = selectedAsig.pozoOriginal.id === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedAsig({...selectedAsig, pozo: p});
                              setConfirmacionFisica(false);
                            }}
                            className={`py-2.5 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center relative ${
                              isCurrent
                                ? (isDescargando 
                                    ? (isOriginal ? 'bg-slate-100 border-slate-400 text-slate-800 ring-2 ring-slate-400' : 'bg-amber-100 border-amber-500 text-amber-900 ring-2 ring-amber-500 shadow-sm')
                                    : 'bg-blue-100 border-blue-600 text-blue-800 ring-2 ring-blue-500 shadow-sm')
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div>{formatearNombreEquipo(p.nombre)}</div>
                            {isDescargando && isOriginal && (
                              <span className="text-[9px] font-normal text-slate-500 block">Actual</span>
                            )}
                            {isDescargando && isCurrent && !isOriginal && (
                              <span className="text-[9px] font-bold text-amber-700 block">Nuevo</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Barrera 1: Panel de Impacto Operacional si es descarga activa y cambió de tolva */}
                  {isDescargando && isDifferentPozo && (
                    <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        Desvío de Descarga Activa: Impacto en Bodega
                      </div>
                      <p className="text-slate-700 leading-tight">
                        El jefe de patio certifica que el camión no está en su pozo planificado:
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1 font-medium">
                        <div className="bg-white p-2 rounded-lg border border-emerald-200">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Tolva Origen</span>
                          <span className="font-extrabold text-emerald-800 text-sm">{formatearNombreEquipo(selectedAsig.pozoOriginal.nombre)}</span>
                          <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">Quedará LIBERADA</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-amber-300">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Tolva Destino</span>
                          <span className="font-extrabold text-amber-800 text-sm">{formatearNombreEquipo(selectedAsig.pozo.nombre)}</span>
                          <span className="text-[11px] text-amber-600 font-semibold block mt-0.5">Quedará BLOQUEADA</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-600 pt-1 leading-snug">
                        El optimizador HiGHS reprogramará de forma inmediata la cola de espera para evitar colisiones operacionales.
                      </div>
                    </div>
                  )}

                  {/* Barrera 2: Checkbox Obligatorio de Confirmación en Terreno */}
                  {isDescargando && isDifferentPozo && (
                    <label className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-50 cursor-pointer transition-colors text-xs text-slate-700 select-none">
                      <input 
                        type="checkbox" 
                        checked={confirmacionFisica}
                        onChange={(e) => setConfirmacionFisica(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer shrink-0"
                      />
                      <span className="leading-snug">
                        <strong>Certifico inspección física:</strong> Verifiqué que el camión <strong className="text-slate-900">{selectedAsig.asig.patente}</strong> está descargando en <strong className="text-amber-900">{formatearNombreEquipo(selectedAsig.pozo.nombre)}</strong>.
                      </span>
                    </label>
                  )}

                  {/* Mensaje informativo si es descarga pero seleccionó el mismo pozo */}
                  {isDescargando && !isDifferentPozo && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
                      El camión está actualmente descargando en <strong className="text-slate-800">{formatearNombreEquipo(selectedAsig.pozoOriginal.nombre)}</strong>. Si el conductor ingresó por error a otra tolva, seleccione la tolva correcta arriba para registrar el desvío.
                    </div>
                  )}

                  {/* Hora de Inicio para camiones en PATIO / ROMANA */}
                  {!isDescargando && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hora de Inicio</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => adjustTime(-10)} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg border border-slate-200 cursor-pointer">-10m</button>
                        <input 
                          type="datetime-local" 
                          className="flex-1 bg-slate-50 text-slate-900 border border-slate-300 rounded-lg p-2 text-sm font-bold text-center outline-none focus:ring-2 focus:ring-blue-500"
                          value={selectedAsig.asig.hora_inicio.slice(0, 16)}
                          onChange={(e) => setSelectedAsig({...selectedAsig, asig: {...selectedAsig.asig, hora_inicio: e.target.value}})}
                        />
                        <button type="button" onClick={() => adjustTime(10)} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg border border-slate-200 cursor-pointer">+10m</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botones del Modal Principal */}
                <div className="flex gap-3 mt-6">
                  <button 
                    type="button"
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm"
                    onClick={closeModal}
                  >
                    Cancelar
                  </button>
                  
                  {!isDescargando && selectedAsig.asig.override_manual && (
                    <button 
                      type="button"
                      className="flex-1 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm"
                      disabled={loadingPin}
                      onClick={async () => {
                        try {
                          setLoadingPin(true);
                          await fijarAsignacion(selectedAsig.asig.id, selectedAsig.pozo.id, selectedAsig.asig.hora_inicio, false);
                          closeModal();
                          toast.success('Asignación liberada'); if (onUpdate) onUpdate();
                        } catch (e: any) { toast.error(e.message); } finally { setLoadingPin(false); }
                      }}
                    >
                      {loadingPin ? '...' : 'Desfijar (Auto)'}
                    </button>
                  )}

                  {isDescargando ? (
                    <button 
                      type="button"
                      disabled={loadingPin || !isDifferentPozo || !confirmacionFisica}
                      onClick={() => setShowConfirmModal(true)}
                      className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-md text-sm text-white ${
                        !isDifferentPozo || !confirmacionFisica
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                          : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30 cursor-pointer'
                      }`}
                    >
                      {isDifferentPozo ? 'Validar Desvío Físico' : 'Sin Cambios'}
                    </button>
                  ) : (
                    <button 
                      type="button"
                      className="flex-1 font-bold py-3 rounded-xl transition-colors shadow-md text-white bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 cursor-pointer text-sm"
                      disabled={loadingPin}
                      onClick={async () => {
                        try {
                          setLoadingPin(true);
                          await fijarAsignacion(selectedAsig.asig.id, selectedAsig.pozo.id, selectedAsig.asig.hora_inicio, true, false);
                          closeModal();
                          toast.success('Asignación fijada'); 
                          if (onUpdate) onUpdate();
                        } catch (e: any) { toast.error(e.message); } finally { setLoadingPin(false); }
                      }}
                    >
                      {loadingPin ? 'Guardando...' : 'Fijar Plan'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Barrera 3: Modal Secundario de Confirmación Crítica */}
            {showConfirmModal && (
              <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-[430px] border-t-4 border-t-amber-600 animate-in fade-in zoom-in duration-150">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                    <h4 className="text-lg font-bold text-slate-900">¿Confirmar Desvío en Terreno?</h4>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 my-3 text-xs space-y-1.5 text-slate-700">
                    <div>Camión: <strong className="text-slate-900">{selectedAsig.asig.patente}</strong> ({selectedAsig.asig.grupo})</div>
                    <div>Cambio de tolva: <strong className="text-emerald-700">{formatearNombreEquipo(selectedAsig.pozoOriginal.nombre)}</strong> &rarr; <strong className="text-amber-800">{formatearNombreEquipo(selectedAsig.pozo.nombre)}</strong></div>
                  </div>

                  <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                    Al confirmar, el sistema liberará <strong className="text-slate-800">{formatearNombreEquipo(selectedAsig.pozoOriginal.nombre)}</strong> de inmediato para otros camiones y bloqueará <strong className="text-slate-800">{formatearNombreEquipo(selectedAsig.pozo.nombre)}</strong> por el tiempo restante de descarga, recalculando todo el plan de bodega.
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={loadingPin}
                      onClick={() => setShowConfirmModal(false)}
                      className="flex-1 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs transition-colors cursor-pointer"
                    >
                      Volver a Revisar
                    </button>
                    <button
                      type="button"
                      disabled={loadingPin}
                      onClick={ejecutarDesvio}
                      className="flex-1 py-2.5 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/30 text-xs transition-colors cursor-pointer"
                    >
                      {loadingPin ? 'Re-optimizando...' : 'Sí, Confirmar Desvío'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Modal de Detalle de Maquinaria (Prensas) */}
      <ModalDetalleMaquinaria
        nombreEquipo={selectedEquipoModal}
        isOpen={!!selectedEquipoModal}
        onClose={() => setSelectedEquipoModal(null)}
        onSelectViaje={onSelectViaje}
      />

      {/* Modal de Contingencia y Parada Operativa de Pozo (Opción A) */}
      {modalContingenciaPozo && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[115] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                modalContingenciaPozo.operativa 
                  ? 'bg-amber-100 text-amber-700 border border-amber-300' 
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              }`}>
                {modalContingenciaPozo.operativa ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {modalContingenciaPozo.operativa ? 'Declarar Parada Imprevista' : 'Reactivar Tolva de Recepción'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Control de Contingencia en Planta · {formatearNombreEquipo(modalContingenciaPozo.nombre)}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 mb-5 leading-relaxed">
              {modalContingenciaPozo.operativa ? (
                <p>
                  ¿Confirmar la parada imprevista de <strong className="text-slate-900">{formatearNombreEquipo(modalContingenciaPozo.nombre)}</strong>? 
                  El optimizador matemático HiGHS excluirá esta tolva del balance y <strong>Celery redistribuirá de inmediato</strong> los camiones en cola hacia las tolvas operativas.
                </p>
              ) : (
                <p>
                  ¿Confirmar la reactivación de <strong className="text-slate-900">{formatearNombreEquipo(modalContingenciaPozo.nombre)}</strong>? 
                  La tolva volverá a estar disponible para recibir descargas y el modelo equilibrará la asignación de patio.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                disabled={loadingContingencia}
                onClick={() => setModalContingenciaPozo(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loadingContingencia}
                onClick={async () => {
                  try {
                    setLoadingContingencia(true);
                    const esParada = modalContingenciaPozo.operativa;
                    const nombreEq = formatearNombreEquipo(modalContingenciaPozo.nombre);
                    if (onSimulatingChange) {
                      onSimulatingChange(
                        true,
                        esParada
                          ? `Contingencia en Planta: Replanificando patio por parada en ${nombreEq}...`
                          : `Reactivando ${nombreEq} y recalculando balance de patio...`,
                        esParada
                          ? `Tolva fuera de servicio. Tráfico reenrutado con éxito.`
                          : `Tolva reactivada y reincorporada a la recepción.`
                      );
                    }
                    await toggleOperatividadPozo(modalContingenciaPozo.id);
                    setModalContingenciaPozo(null);
                    toast.success(
                      esParada
                        ? `${nombreEq} fuera de servicio. Tráfico redistribuido.`
                        : `${nombreEq} reactivado con éxito.`
                    );
                    if (onUpdate) onUpdate();
                  } catch (err: any) {
                    toast.error(err.message || 'Error al cambiar estado de tolva');
                  } finally {
                    setLoadingContingencia(false);
                    if (onSimulatingChange) onSimulatingChange(false);
                  }
                }}
                className={`px-4 py-2 text-xs font-extrabold text-white rounded-lg transition-all shadow-md cursor-pointer ${
                  modalContingenciaPozo.operativa
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                }`}
              >
                {loadingContingencia ? 'Procesando en Celery...' : modalContingenciaPozo.operativa ? 'Confirmar Parada' : 'Confirmar Reactivación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
