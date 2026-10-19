/**
 * Utilidades de formateo para nombres de maquinaria e indicadores operacionales en Bodega Lontué.
 */

export function formatearNombreEquipo(nombre?: string | null): string {
  if (!nombre) return '';
  const trimmed = nombre.trim();

  // Pozos de Recepción: P_01, P_1, P01 -> Pozo 01
  if (trimmed.startsWith('P_') || /^P\d+$/.test(trimmed)) {
    const num = trimmed.replace('P_', '').replace('P', '');
    return `Pozo ${num.padStart(2, '0')}`;
  }

  // Prensas Neumáticas: PR_01, PR_1, PR01 -> Prensa 01
  if (trimmed.startsWith('PR_') || /^PR\d+$/.test(trimmed)) {
    const num = trimmed.replace('PR_', '').replace('PR', '');
    return `Prensa ${num.padStart(2, '0')}`;
  }

  // Cubas de Pre-flotación (Pulmón): CubaPF_01 -> Cuba PreF 01
  if (trimmed.startsWith('CubaPF_')) {
    const num = trimmed.replace('CubaPF_', '');
    return `Cuba PreF ${num.padStart(2, '0')}`;
  }

  // Flotadores Continuos: FLT_01 -> Flotador 01
  if (trimmed.startsWith('FLT_')) {
    const num = trimmed.replace('FLT_', '');
    return `Flotador ${num.padStart(2, '0')}`;
  }

  // Cubas de Fermentación Final: CubaF_01 -> Cuba Fermentación 01
  if (trimmed.startsWith('CubaF_')) {
    const num = trimmed.replace('CubaF_', '');
    return `Cuba Fermentación ${num.padStart(2, '0')}`;
  }

  return trimmed;
}

export function formatearTipoEquipo(tipo?: string | null): string {
  if (!tipo) return 'Maquinaria';
  switch (tipo.toUpperCase()) {
    case 'POZO':
      return 'Pozo de Recepción';
    case 'PRENSA':
      return 'Prensa Neumática Industrial';
    case 'CUBA_PREFLOTACION':
      return 'Cuba Pulmón Pre-Flotación';
    case 'FLOTADOR':
      return 'Módulo de Flotación Continua';
    case 'CUBA_FLOTACION':
    case 'CUBA_FERMENTACION':
      return 'Cuba de Fermentación Final';
    default:
      return tipo;
  }
}
