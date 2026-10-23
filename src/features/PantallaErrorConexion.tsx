'use client';

import React from 'react';
import { InstitutionalFooter } from './InstitutionalFooter';

interface PantallaErrorConexionProps {
  errorMensaje: string;
  apiUrl: string;
  onReintentar: () => void;
  reintentando?: boolean;
}

export const PantallaErrorConexion: React.FC<PantallaErrorConexionProps> = ({
  errorMensaje,
  apiUrl,
  onReintentar,
  reintentando = false,
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-stone-100/90 text-stone-900 justify-between">
      {/* Header Institucional Superior */}
      <header className="h-16 bg-[#000000] text-white flex items-center justify-between px-6 shadow-md z-10 shrink-0 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <img 
            src="/images/logos/logo_vct_white.png" 
            alt="Viña Concha y Toro" 
            className="h-10 w-auto object-contain" 
          />
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#CF5128] bg-[#CF5128]/10 px-2 py-0.5 rounded border border-[#CF5128]/30 font-bold">
            Bodega Lontué
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-block text-xs text-stone-400 font-mono">
            DSS Optimización y Control de Vendimia
          </span>
          <div className="h-7 border-l border-stone-800 hidden sm:block"></div>
          <img 
            src="/images/logos/logo_cii_white.png" 
            alt="Centro de Investigación e Innovación · Viña Concha y Toro" 
            className="h-10 md:h-11 w-auto object-contain brightness-0 invert" 
          />
        </div>
      </header>

      {/* Contenido Central: Tarjeta de Contingencia */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200/90 max-w-xl w-full p-8 md:p-10 flex flex-col items-center text-center">
          {/* Icono de Alerta de Conexión */}
          <div className="w-16 h-16 rounded-full bg-[#FE6D2C]/10 border border-[#FE6D2C]/30 flex items-center justify-center text-[#FE6D2C] mb-5 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-12.728 0m0 0l2.829-2.829m-2.829 2.829L3 21m2.829-5.636a5 5 0 010-7.072m0 0l2.829 2.829" />
            </svg>
          </div>

          <h2 className="text-2xl font-black text-stone-900 tracking-tight mb-2">
            Servidor DSS No Disponible
          </h2>

          <p className="text-sm text-stone-600 mb-6 leading-relaxed">
            No fue posible establecer comunicación con el backend de optimización matemática y control de vendimia.
          </p>

          {/* Caja Informativa de Diagnóstico */}
          <div className="w-full bg-stone-50 rounded-xl p-4 border border-stone-200/80 text-left mb-6 space-y-2.5">
            <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Diagnóstico de Conexión
            </div>
            
            <div className="flex items-center gap-2 text-xs text-stone-700 font-mono bg-white p-2 rounded-lg border border-stone-200 truncate">
              <span className="text-stone-400 font-bold">URL:</span>
              <span className="font-semibold text-stone-800 truncate" title={apiUrl}>{apiUrl}</span>
            </div>

            <p className="text-xs text-stone-500 leading-normal">
              Posibles causas a verificar:
            </p>
            <ul className="text-xs text-stone-600 list-disc list-inside space-y-1 pl-1">
              <li>El contenedor Docker del backend (<code className="bg-stone-200/70 px-1 py-0.5 rounded text-[11px] text-stone-800">dss_v2_web</code>) está apagado o iniciando.</li>
              <li>La dirección remota o túnel HTTPS no está activo o configurado.</li>
              <li>El puerto 8080 no responde a peticiones HTTP.</li>
            </ul>

            {errorMensaje && (
              <div className="pt-2 border-t border-stone-200/80">
                <span className="text-[11px] font-bold text-red-600">Detalle del Error: </span>
                <span className="text-[11px] font-mono text-stone-600">{errorMensaje}</span>
              </div>
            )}
          </div>

          {/* Botón de Acción: Reintentar Conexión */}
          <button
            type="button"
            onClick={onReintentar}
            disabled={reintentando}
            className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer ${
              reintentando
                ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                : 'bg-[#FE6D2C] hover:bg-[#CF5128] text-white hover:shadow-lg active:scale-95'
            }`}
          >
            {reintentando ? (
              <>
                <div className="w-4 h-4 border-2 border-stone-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Conectando con el servidor...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reintentar Conexión</span>
              </>
            )}
          </button>
        </div>
      </main>

      {/* Footer Institucional */}
      <InstitutionalFooter />
    </div>
  );
};
