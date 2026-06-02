'use client'

import { MESES, generarAnios } from '@/lib/calculations'

interface Filtros {
  agrupador: string
  subagrupador: string
  anio: number
  mes: number
}

interface Props {
  filtros: Filtros
  agrupadores?: string[]
  subagrupadores?: string[]
  onChange: (filtros: Filtros) => void
  onLimpiar?: () => void
}

export function DashboardFilters({
  filtros, agrupadores = [], subagrupadores = [], onChange, onLimpiar
}: Props) {
  const anios = generarAnios()

  const set = (key: keyof Filtros, value: string | number) =>
    onChange({ ...filtros, [key]: value })

  return (
    <div className="card-odoo p-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end">
        {/* Agrupador */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">
            Agrupador
          </label>
          <select
            value={filtros.agrupador}
            onChange={e => set('agrupador', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cacsb-500 focus:border-transparent bg-white">
            <option value="">Todos</option>
            {agrupadores.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Subagrupador */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">
            Subagrupador
          </label>
          <select
            value={filtros.subagrupador}
            onChange={e => set('subagrupador', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cacsb-500 focus:border-transparent bg-white">
            <option value="">Todos</option>
            {subagrupadores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Año */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">
            Año
          </label>
          <select
            value={filtros.anio}
            onChange={e => set('anio', parseInt(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cacsb-500 focus:border-transparent bg-white">
            <option value={0}>Todos</option>
            {anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Mes */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">
            Mes
          </label>
          <select
            value={filtros.mes}
            onChange={e => set('mes', parseInt(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cacsb-500 focus:border-transparent bg-white">
            <option value={0}>Todos</option>
            {MESES.slice(1).map((m, i) => (
              <option key={i+1} value={i+1}>{m}</option>
            ))}
          </select>
        </div>

        {/* Limpiar */}
        <div>
          <button
            onClick={onLimpiar}
            className="w-full border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-3 py-2 text-sm transition-colors">
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  )
}
