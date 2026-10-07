export const getGroupColor = (grupo: string): string => {
  if (grupo === 'GENERICO') return 'bg-slate-500 text-white shadow-md border-slate-600';
  
  const colors: Record<string, string> = {
    'GRUPO-1': 'bg-emerald-500 text-white shadow-md border-emerald-600',
    'GRUPO-2': 'bg-teal-500 text-white shadow-md border-teal-600',
    'GRUPO-3': 'bg-cyan-500 text-white shadow-md border-cyan-600',
    'GRUPO-4': 'bg-sky-500 text-white shadow-md border-sky-600',
    'GRUPO-5': 'bg-blue-500 text-white shadow-md border-blue-600',
    'GRUPO-6': 'bg-indigo-500 text-white shadow-md border-indigo-600',
    'GRUPO-7': 'bg-violet-500 text-white shadow-md border-violet-600',
    'GRUPO-8': 'bg-purple-500 text-white shadow-md border-purple-600',
    'GRUPO-9': 'bg-fuchsia-500 text-white shadow-md border-fuchsia-600',
    'GRUPO-10': 'bg-rose-500 text-white shadow-md border-rose-600',
    'GRUPO-11': 'bg-amber-500 text-white shadow-md border-amber-600',
  };
  
  return colors[grupo] || 'bg-slate-800 text-white shadow-md border-slate-900';
};
