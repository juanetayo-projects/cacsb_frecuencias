'use client'

import { HelpCircle, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatearPesos, formatearNumero, calcularCumplimiento } from '@/lib/calculations'

export interface FilaEjecucion {
  agrupador: string
  eventosEjecutados: number
  eventosContratados: number
  valorEjecutado: number
  valorContratoMes: number
}

interface Props {
  data: FilaEjecucion[]
  loading?: boolean
  titulo?: string
  helpText?: string
}

const COLS = [
  { key: 'agrupador',          label: 'Agrupador',          help: 'Tipo de servicio médico agrupado por la aseguradora' },
  { key: 'eventosEjecutados',  label: 'Eventos Ejecutados',  help: 'Total de eventos de salud realmente realizados en el período' },
  { key: 'eventosContratados', label: 'Eventos Contratados', help: 'Total de eventos pactados en el contrato con la aseguradora' },
  { key: 'valorEjecutado',     label: 'Valor Ejecutado',     help: 'Valor total en pesos de los eventos ejecutados' },
  { key: 'valorContratoMes',   label: 'Valor Contrato Mes',  help: 'Valor total pactado en el contrato para el período' },
  { key: 'cumplimiento',       label: '% Cumplimiento',      help: 'Porcentaje de cumplimiento: Ejecutado / Contratado × 100. Azul ≥ 100%, Rojo < 100%' },
]

export function EjecucionAgrupadorTable({ data, loading, titulo, helpText }: Props) {
  if (loading) {
    return (
      <div className="card-odoo p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded mb-2" />
        ))}
      </div>
    )
  }

  return (
    <div className="card-odoo overflow-hidden">
      {/* Título de la tabla */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-cacsb-700 text-sm uppercase tracking-wide">
            {titulo || 'Ejecución por Agrupador'}
          </h3>
          {helpText && (
            <div className="relative group cursor-help">
              <HelpCircle className="h-4 w-4 text-gray-400" />
              <div className="absolute left-0 top-5 w-64 bg-gray-900 text-white text-xs rounded-lg p-2.5 z-50 hidden group-hover:block shadow-lg">
                {helpText}
              </div>
            </div>
          )}
        </div>
        <span className="text-xs text-gray-400">{data.length} registros</span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-striped">
          <thead>
            <tr className="bg-cacsb-700 text-white">
              {COLS.map(col => (
                <th key={col.key}
                  className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    <div className="relative group cursor-help">
                      <HelpCircle className="h-3 w-3 text-blue-200 opacity-70" />
                      <div className="absolute left-0 top-4 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 z-50 hidden group-hover:block shadow-lg font-normal normal-case tracking-normal">
                        {col.help}
                      </div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  No hay datos para el período seleccionado
                </td>
              </tr>
            ) : data.map((fila, i) => {
              const pct = calcularCumplimiento(fila.eventosEjecutados, fila.eventosContratados)
              const isOk = pct >= 100
              return (
                <tr key={i} className={cn(
                  'border-b border-gray-100 transition-colors hover:bg-blue-50',
                  isOk ? 'cumpl-ok' : 'cumpl-alert'
                )}>
                  <td className="px-4 py-3 font-medium">{fila.agrupador}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(fila.eventosEjecutados)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(fila.eventosContratados)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatearPesos(fila.valorEjecutado)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatearPesos(fila.valorContratoMes)}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{pct}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
