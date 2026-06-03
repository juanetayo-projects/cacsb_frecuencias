import { useMemo } from 'react'
import { useSupabaseQuery } from './useSupabaseQuery'
import { calcularCumplimiento } from '@/lib/calculations'

interface FrecuenciaRow {
  cup: string
  cantidad: number
  tipo_producto: string
  valor_unitario: number
  year: number
  mes: number
  ingreso?: string
  fecha_reporte?: string
  hora_reporte?: string
}

interface NormativaRow {
  cup: string
  agrupador: string
  subagrupador: string
  costo_unitario: number
  evento_mes_subagrupador: number
}

export interface FilaCumplimiento {
  agrupador: string
  subagrupador: string
  eventosEjecutados: number
  eventosContratados: number
  valorEjecutado: number
  valorContratoMes: number
  pct: number
}

interface UseCumplimientoOptions {
  tablaFrecuencias:  string
  tablaNormativa:    string
  cupsInternaciones?: string[]
  filtroAnio?:        number
  filtroMes?:         number
  filtroAgrupador?:   string
  filtroSubagrupador?:string
}

export function useCumplimiento({
  tablaFrecuencias,
  tablaNormativa,
  cupsInternaciones = ['110A01','107M01','129A02','129A01','132P01'],
  filtroAnio,
  filtroMes,
  filtroAgrupador,
  filtroSubagrupador,
}: UseCumplimientoOptions) {

  const filtrosFrq: Record<string, unknown> = {}
  if (filtroAnio) filtrosFrq.year = filtroAnio
  if (filtroMes)  filtrosFrq.mes  = filtroMes

  const { data: frecuencias, loading: loadingFrq, error, refetch } =
    useSupabaseQuery<FrecuenciaRow>({ table: tablaFrecuencias, filters: filtrosFrq })

  const { data: normativa, loading: loadingNt } =
    useSupabaseQuery<NormativaRow>({ table: tablaNormativa })

  // Mapa cup → normativa para lookup O(1)
  const mapaNT = useMemo(() => {
    const m = new Map<string, NormativaRow>()
    normativa.forEach(n => m.set(n.cup, n))
    return m
  }, [normativa])

  // Resumen por agrupador
  const resumenAgrupador = useMemo((): FilaCumplimiento[] => {
    if (!frecuencias.length || !normativa.length) return []

    // Ejecución real agrupada
    const ejec = new Map<string, { cantidad: number; valor: number }>()

    frecuencias.forEach(f => {
      const nt = mapaNT.get(f.cup)
      if (!nt) return

      const esMedInsumo = f.tipo_producto === 'Medicamentos' || f.tipo_producto === 'Insumos'
      const costo = esMedInsumo ? (f.valor_unitario || 0) : (nt.costo_unitario || 0)

      const prev = ejec.get(nt.agrupador) || { cantidad: 0, valor: 0 }
      ejec.set(nt.agrupador, {
        cantidad: prev.cantidad + f.cantidad,
        valor:    prev.valor + f.cantidad * costo,
      })
    })

    // Contratado por agrupador
    const cont = new Map<string, { cantidad: number; valor: number; sub: string }>()
    normativa.forEach(nt => {
      const prev = cont.get(nt.agrupador) || { cantidad: 0, valor: 0, sub: nt.subagrupador }
      cont.set(nt.agrupador, {
        cantidad: prev.cantidad + nt.evento_mes_subagrupador,
        valor:    prev.valor + nt.evento_mes_subagrupador * nt.costo_unitario,
        sub:      nt.subagrupador,
      })
    })

    // Construir filas
    const filas: FilaCumplimiento[] = []
    cont.forEach((c, agrupador) => {
      if (filtroAgrupador    && agrupador !== filtroAgrupador)      return
      if (filtroSubagrupador && c.sub !== filtroSubagrupador)       return

      const e = ejec.get(agrupador) || { cantidad: 0, valor: 0 }
      filas.push({
        agrupador,
        subagrupador:       c.sub,
        eventosEjecutados:  e.cantidad,
        eventosContratados: c.cantidad,
        valorEjecutado:     e.valor,
        valorContratoMes:   c.valor,
        pct: calcularCumplimiento(e.cantidad, c.cantidad),
      })
    })

    return filas.sort((a, b) => a.agrupador.localeCompare(b.agrupador))
  }, [frecuencias, normativa, mapaNT, filtroAgrupador, filtroSubagrupador])

  const totales = useMemo(() => ({
    totalEventos:   frecuencias.reduce((s, f) => s + f.cantidad, 0),
    totalPacientes: new Set(frecuencias.map(f => f.ingreso)).size,
    fechaReporte:   frecuencias[0]?.fecha_reporte || '',
    horaReporte:    frecuencias[0]?.hora_reporte  || '',
  }), [frecuencias])

  const agrupadores    = useMemo(() => [...new Set(normativa.map(n => n.agrupador))].sort(),    [normativa])
  const subagrupadores = useMemo(() => [...new Set(normativa.map(n => n.subagrupador))].sort(), [normativa])

  return { resumenAgrupador, totales, agrupadores, subagrupadores, loading: loadingFrq || loadingNt, error, refetch }
}
