/**
 * Utilidad de mapeo de colores primarios y de alto contraste para grupos de mezcla y bloques de vendimia.
 * Diseñada para evitar gradientes continuos y asegurar máxima diferenciación visual entre bloques contiguos.
 */

export const PRIMARY_PALETTE: string[] = [
  'bg-blue-600 text-white shadow-md border-blue-700',       // 1: Azul Real
  'bg-amber-500 text-white shadow-md border-amber-600',     // 2: Ámbar Dorado
  'bg-emerald-600 text-white shadow-md border-emerald-700', // 3: Verde Esmeralda
  'bg-red-600 text-white shadow-md border-red-700',         // 4: Rojo Carmesí
  'bg-purple-600 text-white shadow-md border-purple-700',   // 5: Púrpura Intenso
  'bg-cyan-600 text-white shadow-md border-cyan-700',       // 6: Cian Brillante
  'bg-pink-600 text-white shadow-md border-pink-700',       // 7: Rosa Magenta
  'bg-lime-600 text-white shadow-md border-lime-700',       // 8: Verde Lima
  'bg-indigo-700 text-white shadow-md border-indigo-800',   // 9: Índigo Marino
  'bg-orange-600 text-white shadow-md border-orange-700',   // 10: Naranja Fuego
  'bg-violet-600 text-white shadow-md border-violet-700',   // 11: Violeta Profundo
  'bg-teal-700 text-white shadow-md border-teal-800',       // 12: Petróleo Teal
  'bg-yellow-600 text-white shadow-md border-yellow-700',   // 13: Amarillo Ocre
  'bg-rose-600 text-white shadow-md border-rose-700',       // 14: Rosa Rubí
  'bg-sky-600 text-white shadow-md border-sky-700',         // 15: Azul Cielo
  'bg-slate-700 text-white shadow-md border-slate-800',     // 16: Grafito Carbón
];

const EXPLICIT_GROUP_MAP: Record<string, string> = {
  'GRUPO-1': PRIMARY_PALETTE[0],
  'GRUPO-2': PRIMARY_PALETTE[1],
  'GRUPO-3': PRIMARY_PALETTE[2],
  'GRUPO-4': PRIMARY_PALETTE[3],
  'GRUPO-5': PRIMARY_PALETTE[4],
  'GRUPO-6': PRIMARY_PALETTE[5],
  'GRUPO-7': PRIMARY_PALETTE[6],
  'GRUPO-8': PRIMARY_PALETTE[7],
  'GRUPO-9': PRIMARY_PALETTE[8],
  'GRUPO-10': PRIMARY_PALETTE[9],
  'GRUPO-11': PRIMARY_PALETTE[10],
  'GRUPO-12': PRIMARY_PALETTE[11],
  'GRUPO-13': PRIMARY_PALETTE[12],
  'GRUPO-14': PRIMARY_PALETTE[13],
  'GRUPO-15': PRIMARY_PALETTE[14],
  'GRUPO-16': PRIMARY_PALETTE[15],
};

export const getGroupColor = (grupo: string | undefined | null): string => {
  if (!grupo || grupo === 'GENERICO') {
    return 'bg-slate-500 text-white shadow-md border-slate-600';
  }

  // Comprobar mapa directo explícito
  if (EXPLICIT_GROUP_MAP[grupo]) {
    return EXPLICIT_GROUP_MAP[grupo];
  }

  // Extraer número de formato GRUPO-X o GRUPO_X
  const match = grupo.match(/GRUPO[_-]?(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    const index = Math.max(0, (num - 1)) % PRIMARY_PALETTE.length;
    return PRIMARY_PALETTE[index];
  }

  // Hash determinístico para nombres de variedades o textos libres
  let hash = 0;
  for (let i = 0; i < grupo.length; i++) {
    hash = grupo.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRIMARY_PALETTE.length;
  return PRIMARY_PALETTE[index];
};

export const getGroupBgColor = (grupo: string | undefined | null): string => {
  const full = getGroupColor(grupo);
  return full.split(' ')[0] || 'bg-slate-700';
};

