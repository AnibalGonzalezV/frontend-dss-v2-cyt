'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ColaPatio } from './ColaPatio';
import { TableroGantt } from './TableroGantt';
import { fetchGanttData, simularSiguientePaso, initSimulacion } from '@/api/ganttService';
import { GanttDataResponse } from '@/types';

export const Dashboard = () => {
  const [data, setData] = useState<GanttDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Extraemos el reloj virtual de la base de datos
  const virtualTime = data?.reloj_virtual ? new Date(data.reloj_virtual).getTime() : null;

  const loadData = async () => {
    try {
      const result = await fetchGanttData();
      setData(result);
    } catch (error) {
      console.error(error);
      setIsPlaying(false); // Detener si hay error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Usamos Refs para evitar los problemas de closure en funciones recursivas
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
        await simularSiguientePaso();
        await loadData();
      } catch (e) {
        console.error("Error en Auto-Play:", e);
        setIsPlaying(false);
      } finally {
        setSimulating(false);
        // Si seguimos jugando, programamos el siguiente tick
        if (isPlayingRef.current) {
          timeoutId = setTimeout(tick, 1000); // 1 segundo de respiro
        }
      }
    };

    if (isPlaying) {
      tick();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isPlaying]); // Solo se dispara cuando cambia isPlaying

  const handleInitDia = async () => {
    if(!confirm("¿Borrar todo e inicializar 85 camiones a las 09:00?")) return;
    setIsPlaying(false);
    setSimulating(true);
    try {
      await initSimulacion();
      await loadData();
    } catch (e) {
      console.error(e);
      alert("Error al inicializar");
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
      alert("Error en el optimizador");
    } finally {
      setSimulating(false);
    }
  };

  if (loading && !data) {
    return <div className="flex h-screen items-center justify-center text-xl font-semibold">Cargando Estado del Patio...</div>;
  }

  // --- LÓGICA DE SIMULACIÓN MPC (Filtros Visuales 2 horas) ---
  const pozosVisibles = data?.pozos.map(pozo => {
    return {
      ...pozo,
      asignaciones: pozo.asignaciones.filter(asig => {
        if (!virtualTime) return true;
        const inicio = new Date(asig.hora_inicio).getTime();
        const fin = new Date(asig.hora_fin).getTime();
        return inicio <= virtualTime + (2 * 3600000) && fin > virtualTime - 3600000; 
      })
    };
  }) || [];

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shadow-md z-10 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Bodega Lontué <span className="text-blue-400">| DSS Patio</span></h1>
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
            🔄 Reiniciar Día
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
            ⏩ 15 min
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

      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        <div className="w-72 flex-shrink-0 h-full z-20 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
          <ColaPatio camiones={data?.cola_patio || []} />
        </div>
        <div className="flex-1 h-full rounded-xl overflow-hidden shadow-sm border border-slate-200">
          <TableroGantt pozos={pozosVisibles} virtualTime={virtualTime} onUpdate={loadData} />
        </div>
      </div>
    </div>
  );
};
