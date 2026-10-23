'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ColaPatio } from './ColaPatio';
import { TableroGantt } from './TableroGantt';
import { BodegaPipeline } from './BodegaPipeline';
import { ModalTrazabilidad } from './ModalTrazabilidad';
import { InstitutionalFooter } from './InstitutionalFooter';
import { PantallaErrorConexion } from './PantallaErrorConexion';
import { fetchGanttData, simularSiguientePaso, initSimulacion, API_BASE_URL } from '@/api/ganttService';
import { GanttDataResponse } from '@/types';
import toast from 'react-hot-toast';

export const Dashboard = () => {
  const [data, setData] = useState<GanttDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [statusBannerMessage, setStatusBannerMessage] = useState<string>('Optimizador HiGHS recalculando patio...');
  const [statusSuccessMessage, setStatusSuccessMessage] = useState<string>('Planificación actualizada');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInitModal, setShowInitModal] = useState(false);

  // Estado de navegación por pestañas
  const [activeTab, setActiveTab] = useState<'patio' | 'bodega'>('patio');
  
  // Estado para el Modal de Trazabilidad Enológica
  const [selectedViajeId, setSelectedViajeId] = useState<number | null>(null);
  const [showTraceModal, setShowTraceModal] = useState(false);
  
  // Extraemos el reloj virtual de la base de datos
  const virtualTime = data?.reloj_virtual ? new Date(data.reloj_virtual).getTime() : null;

  // Entrega el 100% de los camiones programados y finalizados al Gantt para permitir auditoría histórica retrospectiva
  const pozosVisibles = useMemo(() => {
    return data?.pozos || [];
  }, [data?.pozos]);

  const loadData = async (isManualRetry: boolean = false) => {
    if (isManualRetry) setRetrying(true);
    try {
      setConnectionError(null);
      const result = await fetchGanttData();
      setData(result);
    } catch (error) {
      console.error('Error al cargar datos del DSS:', error);
      const msg = error instanceof Error ? error.message : 'No fue posible conectar con el servidor DSS.';
      setConnectionError(msg);
      setIsPlaying(false);
    } finally {
      setLoading(false);
      if (isManualRetry) setRetrying(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const isTickingRef = useRef(false);

  const handleSimulatingChange = (isSim: boolean, msg?: string, successMsg?: string) => {
    if (isSim && isPlayingRef.current) {
      setIsPlaying(false); // Pausar Auto-Play inmediatamente ante contingencia o acción manual
    }
    if (msg) setStatusBannerMessage(msg);
    if (successMsg) setStatusSuccessMessage(successMsg);
    setSimulating(isSim);
    if (!isSim && successMsg) {
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2500);
    }
  };

  // Bucle de Auto-Play controlado y serializado
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const tick = async () => {
      if (!isPlayingRef.current || isTickingRef.current) return;
      isTickingRef.current = true;
      
      setStatusBannerMessage('Auto-Play: Optimizando ventana móvil (HiGHS)...');
      setStatusSuccessMessage('Paso sincronizado en tiempo real');
      setSimulating(true);
      try {
        const curData = dataRef.current;
        if (curData?.kpis && curData.kpis.procesados >= curData.kpis.total_dia && curData.kpis.total_dia > 0) {
          toast.success('¡Día completado! Todos los camiones procesados.');
          setIsPlaying(false);
          setSimulating(false);
          return;
        }
        await simularSiguientePaso();
        await loadData();
      } catch (e) {
        console.error("Error en Auto-Play:", e);
        const errorMsg = e instanceof Error ? e.message : 'Error durante la optimizacion en Auto-Play';
        toast.error(errorMsg);
        setIsPlaying(false);
      } finally {
        isTickingRef.current = false;
        setSimulating(false);
        if (isPlayingRef.current) {
          timeoutId = setTimeout(tick, 1000);
        }
      }
    };

    if (isPlaying) {
      tick();
    } else {
      isTickingRef.current = false;
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isPlaying]); // Depende estrictamente de isPlaying, nunca de data para evitar tormenta de re-renders

  const handleInitDia = () => {
    setShowInitModal(true);
  };

  const handleInitDiaConfirm = async () => {
    setShowInitModal(false);
    setIsPlaying(false);
    setStatusBannerMessage('Inicializando turno demo (09:00 hrs) con 85 camiones...');
    setStatusSuccessMessage('Turno reiniciado exitosamente a las 09:00 hrs');
    setSimulating(true);
    try {
      await initSimulacion();
      await loadData();
      toast.success("Día reiniciado exitosamente");
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2500);
    } catch (e) {
      console.error(e);
      const errorMsg = e instanceof Error ? e.message : 'Error al inicializar la simulacion';
      toast.error(errorMsg);
    } finally {
      setSimulating(false);
    }
  };

  const handleSimularPaso = async () => {
    if (simulating) return;
    setIsPlaying(false);
    setStatusBannerMessage('Avanzando 15 min y resolviendo optimizador HiGHS...');
    setStatusSuccessMessage('Reloj y planificación sincronizados (+15m)');
    setSimulating(true);
    try {
      await simularSiguientePaso();
      await loadData();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2500);
    } catch (e) {
      console.error(e);
      const errorMsg = e instanceof Error ? e.message : 'Error en el optimizador';
      toast.error(errorMsg);
    } finally {
      setSimulating(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col h-screen bg-stone-900 text-white items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#FE6D2C] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-lg font-bold tracking-wide">Cargando Estado del Patio y Programacion...</div>
        <div className="text-xs text-stone-400 font-mono">Conectando a {API_BASE_URL}</div>
      </div>
    );
  }

  if (!data && connectionError) {
    return (
      <PantallaErrorConexion
        errorMensaje={connectionError}
        apiUrl={API_BASE_URL}
        onReintentar={() => loadData(true)}
        reintentando={retrying}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-stone-100/80 relative">
      {/* Banner de Aviso de Conexion Degradada (cuando hay datos previos en memoria) */}
      {connectionError && data && (
        <div className="bg-red-700 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow-lg z-[100] border-b border-red-800 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Aviso de Conexion: {connectionError}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={retrying}
            className="bg-white/20 hover:bg-white/30 text-white px-3.5 py-1 rounded-lg text-xs cursor-pointer font-bold transition-all ml-4 shrink-0 flex items-center gap-1.5"
          >
            {retrying ? 'Reintentando...' : 'Reintentar sincronizacion'}
          </button>
        </div>
      )}
      {/* ISLA FLOTANTE DE CONTROL OPERATIVO (Píldora Centrada Pegada Debajo del Header en Todas las Pestañas) */}
      <div className="fixed top-[70px] left-1/2 -translate-x-1/2 z-[90] flex items-center bg-[#000000]/95 backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-2xl border border-stone-700/80 transition-all duration-300 hover:border-stone-500">
        <div className="flex items-center gap-1.5">
          {/* Botón Icono: Reiniciar Día */}
          <button 
            type="button"
            onClick={handleInitDia}
            disabled={simulating}
            title="Reiniciar Día (Inicializar turno a las 09:00)"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              simulating && !isPlaying
                ? 'text-stone-600 cursor-not-allowed' 
                : 'text-stone-300 hover:text-white hover:bg-stone-800 active:scale-90'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <div className="h-4 border-l border-stone-700/80"></div>

          {/* Botón Icono: 15 min */}
          <button 
            type="button"
            onClick={handleSimularPaso}
            disabled={simulating || isPlaying}
            title="Avanzar 15 minutos (Simulación)"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              (simulating || isPlaying)
                ? 'text-stone-600 cursor-not-allowed' 
                : 'text-[#CF5128] hover:text-[#FE6D2C] hover:bg-[#CF5128]/20 active:scale-90'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>

          <div className="h-4 border-l border-stone-700/80"></div>

          {/* Botón Icono: Auto-Play */}
          <button 
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pausar Simulación Auto-Play' : 'Iniciar Simulación Continua Auto-Play'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
              isPlaying 
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.7)] animate-pulse' 
                : 'bg-[#FE6D2C] hover:bg-[#E65C1E] text-white hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(254,80,0,0.4)]'
            }`}
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* Indicador de Estado Integrado en la Isla (Celery / HiGHS) */}
        {simulating && (
          <div className="flex items-center gap-2 pl-2.5 pr-1 border-l border-stone-700/80 text-[11px] font-sans text-orange-200 animate-pulse">
            <div className="w-2.5 h-2.5 border-2 border-[#FE6D2C] border-t-transparent rounded-full animate-spin"></div>
            <span className="font-extrabold max-w-[220px] truncate">{statusBannerMessage}</span>
          </div>
        )}
        {!simulating && syncSuccess && (
          <div className="flex items-center gap-2 pl-2.5 pr-1 border-l border-stone-700/80 text-[11px] font-sans text-emerald-200">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
            <span className="font-extrabold">{statusSuccessMessage}</span>
          </div>
        )}
      </div>

      <header className="h-16 bg-[#000000] text-white flex items-center justify-between px-6 shadow-md z-10 shrink-0 border-b border-stone-800">
        <div className="flex items-center gap-6">
          {/* Logo Oficial Viña Concha y Toro */}
          <div className="flex items-center gap-3">
            <img 
              src="/images/logos/logo_vct_white.png" 
              alt="Viña Concha y Toro" 
              className="h-10 w-auto object-contain cursor-pointer transition-opacity hover:opacity-95" 
            />
            <span className="hidden xl:inline-block text-[11px] font-mono uppercase tracking-widest text-[#CF5128] bg-[#CF5128]/10 px-2 py-0.5 rounded border border-[#CF5128]/30 font-bold">
              Bodega Lontué
            </span>
          </div>

          {/* Navegación por Pestañas */}
          <div className="flex bg-stone-900 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => setActiveTab('patio')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'patio'
                  ? 'bg-[#FE6D2C] text-white shadow-sm font-black'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Patio y Programación (Gantt)
            </button>

            <button
              onClick={() => setActiveTab('bodega')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'bodega'
                  ? 'bg-[#FE6D2C] text-white shadow-sm font-black'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Bodega y Flotación (5 Etapas)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {virtualTime && (
            <div className="bg-stone-900 px-3.5 py-1.5 rounded-lg border border-stone-800 text-xs font-mono flex items-center gap-2.5 shadow-inner">
              <span className="text-stone-400 uppercase text-[10px] font-bold tracking-wider">Reloj Virtual</span>
              <span className="text-[#FE6D2C] font-bold text-base">{new Date(virtualTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
            </div>
          )}

          <div className="h-7 border-l border-stone-800 hidden sm:block"></div>

          {/* Logo CII Centro de Investigación e Innovación - Full Derecha */}
          <div className="flex items-center" title="Centro de Investigación e Innovación · Viña Concha y Toro">
            <img 
              src="/images/logos/logo_cii_white.png" 
              alt="Centro de Investigación e Innovación (CII) · Viña Concha y Toro" 
              className="h-11 md:h-12 w-auto object-contain brightness-0 invert transition-opacity hover:opacity-95" 
            />
          </div>
        </div>
      </header>
      
      {/* KPI BAR */}
      <div className="bg-white border-b border-stone-200/90 h-16 shrink-0 flex items-center px-6 gap-6 shadow-2xs z-[5]">
        {data?.kpis && (
          <>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-stone-400">Total Día</span>
              <span className="text-xl font-black text-stone-800">{data.kpis.total_dia}</span>
            </div>
            <div className="h-8 border-l border-stone-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-stone-400">En Ruta (GPS)</span>
              <span className="text-xl font-black text-[#CF5128]">{data.kpis.en_ruta}</span>
            </div>
            <div className="h-8 border-l border-stone-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-stone-400">En Patio</span>
              <span className="text-xl font-black text-[#FE6D2C]">{data.kpis.en_patio}</span>
            </div>
            <div className="h-8 border-l border-stone-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-stone-400">Descargando</span>
              <span className="text-xl font-black text-emerald-600">{data.kpis.descargando}</span>
            </div>
            <div className="h-8 border-l border-stone-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-stone-400">Procesados</span>
              <span className="text-xl font-black text-stone-900">{data.kpis.procesados}</span>
            </div>
            <div className="h-8 border-l border-stone-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-stone-400">Espera Máx Actual</span>
              <span className={`text-xl font-black ${data.kpis.espera_max_hrs > 2.0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {data.kpis.espera_max_hrs} hrs
              </span>
            </div>
            <div className="h-8 border-l border-stone-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-stone-400">Alertas Atraso</span>
              <span className={`text-xl font-black ${data.kpis.atrasados > 0 ? 'text-red-600 animate-pulse' : 'text-stone-300'}`}>
                {data.kpis.atrasados}
              </span>
            </div>
            
            <div className="ml-auto flex items-center gap-2">
               <div className={`w-3 h-3 rounded-full ${simulating ? 'bg-[#FE6D2C] animate-ping' : 'bg-stone-300'}`}></div>
               <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{simulating ? 'Optimizando...' : 'En Reposo'}</span>
            </div>
          </>
        )}
      </div>

      {activeTab === 'patio' ? (
        <div className="flex flex-1 overflow-hidden p-4 gap-4">
          <div className="w-72 flex-shrink-0 h-full z-20 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
            <ColaPatio 
              camiones={data?.cola_patio || []} 
              onSelectViaje={(vId) => {
                setSelectedViajeId(vId);
                setShowTraceModal(true);
              }}
            />
          </div>
          <div className="flex-1 h-full rounded-xl overflow-hidden shadow-sm border border-slate-200">
            <TableroGantt 
              pozos={pozosVisibles} 
              prensas={data?.prensas}
              virtualTime={virtualTime} 
              onUpdate={loadData}
              onSimulatingChange={handleSimulatingChange}
              onPauseAutoPlay={() => setIsPlaying(false)}
              onSelectViaje={(vId) => {
                setSelectedViajeId(vId);
                setShowTraceModal(true);
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <BodegaPipeline 
            virtualTime={virtualTime} 
            onSelectViaje={(vId) => {
              setSelectedViajeId(vId);
              setShowTraceModal(true);
            }}
          />
        </div>
      )}

      {/* Modal de Auditoría de Trazabilidad Enológica de 5 Etapas */}
      <ModalTrazabilidad
        viajeId={selectedViajeId}
        isOpen={showTraceModal}
        onClose={() => {
          setShowTraceModal(false);
          setSelectedViajeId(null);
        }}
      />

      {/* Modal de Reinicio Personalizado */}
      {showInitModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[450px] border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 text-red-600 p-2.5 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800">Reiniciar Simulación</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Esta acción <span className="font-bold text-red-600">borrará todo el historial</span> del patio e inicializará un nuevo turno a las 09:00 a. m. con 85 camiones en ruta. ¿Estás seguro de continuar?
            </p>
            <div className="flex gap-3">
              <button 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
                onClick={() => setShowInitModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-md shadow-red-500/30 cursor-pointer"
                onClick={handleInitDiaConfirm}
              >
                Sí, Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Institucional con 3 logos: UCN · UTEM · CII Concha y Toro */}
      <InstitutionalFooter />
    </div>
  );
};
