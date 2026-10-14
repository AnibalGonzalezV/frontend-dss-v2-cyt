'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ColaPatio } from './ColaPatio';
import { TableroGantt } from './TableroGantt';
import { BodegaPipeline } from './BodegaPipeline';
import { ModalTrazabilidad } from './ModalTrazabilidad';
import { fetchGanttData, simularSiguientePaso, initSimulacion } from '@/api/ganttService';
import { GanttDataResponse } from '@/types';
import toast from 'react-hot-toast';

export const Dashboard = () => {
  const [data, setData] = useState<GanttDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInitModal, setShowInitModal] = useState(false);
  
  // Estado de navegación por pestañas
  const [activeTab, setActiveTab] = useState<'patio' | 'bodega'>('patio');
  
  // Estado para el Modal de Trazabilidad Enológica
  const [selectedViajeId, setSelectedViajeId] = useState<number | null>(null);
  const [showTraceModal, setShowTraceModal] = useState(false);
  
  // Extraemos el reloj virtual de la base de datos
  const virtualTime = data?.reloj_virtual ? new Date(data.reloj_virtual).getTime() : null;

  const loadData = async () => {
    try {
      const result = await fetchGanttData();
      setData(result);
    } catch (error) {
      console.error(error);
      setIsPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Bucle de Auto-Play independiente
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const tick = async () => {
      if (!isPlayingRef.current) return;
      
      setSimulating(true);
      try {
        if (data?.kpis && data.kpis.procesados >= data.kpis.total_dia && data.kpis.total_dia > 0) {
          toast.success('¡Día completado! Todos los camiones procesados.');
          setIsPlaying(false);
          setSimulating(false);
          return;
        }
        await simularSiguientePaso();
        await loadData();
      } catch (e) {
        console.error("Error en Auto-Play:", e);
        setIsPlaying(false);
      } finally {
        setSimulating(false);
        if (isPlayingRef.current) {
          timeoutId = setTimeout(tick, 1000);
        }
      }
    };

    if (isPlaying) {
      tick();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isPlaying, data]); // Añadido data a dependencias

  const handleInitDia = () => {
    setShowInitModal(true);
  };

  const handleInitDiaConfirm = async () => {
    setShowInitModal(false);
    setIsPlaying(false);
    setSimulating(true);
    try {
      await initSimulacion();
      await loadData();
      toast.success("Día reiniciado exitosamente");
    } catch (e) {
      console.error(e);
      toast.error("Error al inicializar");
    } finally {
      setSimulating(false);
    }
  };

  const handleSimularPaso = async () => {
    setSimulating(true);
    try {
      await simularSiguientePaso();
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error("Error en el optimizador");
    } finally {
      setSimulating(false);
    }
  };

  if (loading && !data) {
    return <div className="flex h-screen items-center justify-center text-xl font-semibold">Cargando Estado del Patio...</div>;
  }

  const pozosVisibles = data?.pozos.map(pozo => {
    return {
      ...pozo,
      asignaciones: pozo.asignaciones.filter(asig => {
        if (!virtualTime) return true;
        const inicio = new Date(asig.hora_inicio).getTime();
        const fin = new Date(asig.hora_fin).getTime();
        return inicio <= virtualTime + (4 * 3600000) && fin > virtualTime - 3600000; 
      })
    };
  }) || [];

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shadow-md z-10 shrink-0">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Bodega Lontué <span className="text-blue-400">| DSS Patio</span>
            </h1>
          </div>

          {/* Navegación por Pestañas */}
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/80">
            <button
              onClick={() => setActiveTab('patio')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'patio'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Patio y Programación (Gantt)
            </button>

            <button
              onClick={() => setActiveTab('bodega')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'bodega'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Bodega y Flotación (5 Etapas)
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {virtualTime && (
            <div className="bg-slate-800 px-4 py-1.5 rounded-lg border border-slate-700 text-sm font-mono flex items-center gap-3 shadow-inner">
              <span className="text-slate-400 uppercase text-xs font-bold tracking-wider">Reloj Virtual</span>
              <span className="text-red-400 font-bold text-lg">{new Date(virtualTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
            </div>
          )}
          
          <button 
            onClick={handleInitDia}
            disabled={simulating}
            className={`px-4 py-2 rounded-lg font-bold transition-all shadow-md flex items-center gap-2 ${
              simulating && !isPlaying
                ? 'bg-slate-600 text-slate-300 cursor-not-allowed' 
                : 'bg-slate-700 hover:bg-slate-600 text-white active:scale-95'
            }`}
          >
            ↻ Reiniciar Día
          </button>
          
          <button 
            onClick={handleSimularPaso}
            disabled={simulating || isPlaying}
            className={`px-4 py-2 rounded-lg font-bold transition-all shadow-md flex items-center gap-2 ${
              (simulating || isPlaying)
                ? 'bg-slate-600 text-slate-300 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
            }`}
          >
            ▶ 15 min
          </button>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-6 py-2 rounded-lg font-bold transition-all shadow-md flex items-center gap-2 w-48 justify-center ${
              isPlaying 
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? '⏸ Pausar Simulación' : '▶️ Auto-Play'}
          </button>
        </div>
      </header>
      
      {/* KPI BAR */}
      <div className="bg-white border-b border-slate-200 h-16 shrink-0 flex items-center px-6 gap-6 shadow-sm z-[5]">
        {data?.kpis && (
          <>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Día</span>
              <span className="text-xl font-extrabold text-slate-700">{data.kpis.total_dia}</span>
            </div>
            <div className="h-8 border-l border-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">En Ruta (GPS)</span>
              <span className="text-xl font-extrabold text-amber-500">{data.kpis.en_ruta}</span>
            </div>
            <div className="h-8 border-l border-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">En Patio</span>
              <span className="text-xl font-extrabold text-blue-600">{data.kpis.en_patio}</span>
            </div>
            <div className="h-8 border-l border-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Descargando</span>
              <span className="text-xl font-extrabold text-emerald-500">{data.kpis.descargando}</span>
            </div>
            <div className="h-8 border-l border-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Procesados</span>
              <span className="text-xl font-extrabold text-slate-800">{data.kpis.procesados}</span>
            </div>
            <div className="h-8 border-l border-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Espera Máx Actual</span>
              <span className={`text-xl font-extrabold ${data.kpis.espera_max_hrs > 2.0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {data.kpis.espera_max_hrs} hrs
              </span>
            </div>
            <div className="h-8 border-l border-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Alertas Atraso</span>
              <span className={`text-xl font-extrabold ${data.kpis.atrasados > 0 ? 'text-red-600 animate-pulse' : 'text-slate-300'}`}>
                {data.kpis.atrasados}
              </span>
            </div>
            
            <div className="ml-auto flex items-center gap-2">
               <div className={`w-3 h-3 rounded-full ${simulating ? 'bg-amber-400 animate-ping' : 'bg-slate-200'}`}></div>
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{simulating ? 'Optimizando...' : 'En Reposo'}</span>
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
              virtualTime={virtualTime} 
              onUpdate={loadData}
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
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors"
                onClick={() => setShowInitModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-md shadow-red-500/30"
                onClick={handleInitDiaConfirm}
              >
                Sí, Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
