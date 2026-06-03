/**
 * LÃ³gica de cÃ¡lculo de cumplimiento y valores del dashboard
 */

/**
 * Calcula el porcentaje de cumplimiento
 */
export function calcularCumplimiento(ejecutado: number, contratado: number): number {
  if (contratado === 0) return 0
  return Math.round((ejecutado / contratado) * 100)
}

/**
 * Color de cumplimiento: azul >= 100%, rojo < 100%
 */
export function colorCumplimiento(pct: number): 'ok' | 'alert' {
  return pct >= 100 ? 'ok' : 'alert'
}

/**
 * Clases Tailwind para filas de tabla segÃºn cumplimiento
 */
export function claseFilaCumplimiento(pct: number): string {
  return pct >= 100
    ? 'bg-cacsb-700 text-white font-medium'
    : 'bg-cumplimiento-alertBg text-cumplimiento-alert font-medium'
}

/**
 * Formatea valor monetario en pesos colombianos
 */
export function formatearPesos(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

/**
 * Formatea nÃºmero con separadores de miles
 */
export function formatearNumero(valor: number): string {
  return new Intl.NumberFormat('es-CO').format(valor)
}

/**
 * Nombre del mes en espaÃ±ol
 */
export function nombreMes(mes: number): string {
  const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return meses[mes] || ''
}

/**
 * Genera rango de aÃ±os disponibles (3 aÃ±os atrÃ¡s + actual)
 */
export function generarAnios(): number[] {
  const actual = new Date().getFullYear()
  return [actual, actual - 1, actual - 2]
}


export const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
