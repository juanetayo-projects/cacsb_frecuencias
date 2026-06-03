import { useState } from 'react'
import { useCumplimiento } from '@/hooks/useCumplimiento'
import { formatearPesos, formatearNumero, generarAnios, MESES } from '@/lib/calculations'
import { exportarExcel, exportarPDF } from '@/lib/exportar'
import { Download, RefreshCw, HelpCircle, Loader2, AlertCircle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// Configuración por modalidad
const CONFIG: Record<string, { titulo: string; tablaFrq: string; tablaNt: string; subtitulo: string }> = {
  'emssanar-alta-sub':  { titulo: 'Emssanar Alta Complejidad — Subsidiado',    tablaFrq: 'emssanar_frecuencias_alta_sub',   tablaNt: 'emssanar_nt_alta_sub',   subtitulo: 'Alta Complejidad Subsidiado' },
  'emssanar-alta-cont': { titulo: 'Emssanar Alta Complejidad — Contributivo',  tablaFrq: 'emssanar_frecuencias_alta_cont',  tablaNt: 'emssanar_nt_alta_cont',  subtitulo: 'Alta Complejidad Contributivo' },
  'emssanar-media-sub': { titulo: 'Emssanar Mediana Complejidad — Subsidiado', tablaFrq: 'emssanar_frecuencias_media_sub',  tablaNt: 'emssanar_nt_media_sub',  subtitulo: 'Mediana Complejidad Subsidiado' },
  'emssanar-media-cont':{ titulo: 'Emssanar Mediana Complejidad — Contributivo',tablaFrq: 'emssanar_frecuencias_media_cont', tablaNt: 'emssanar_nt_media_cont', subtitulo: 'Mediana Complejidad Contributivo' },
}

const BASE   = '/cacsb_frecuencias'
const ANIOS  = generarAnios()

interface Props { aseguradora: keyof typeof CONFIG }

export function ResumenPage({ aseguradora }: Props) {
  const cfg = CONFIG[aseguradora] || CONFIG['emssanar-alta-sub']

  const [filtroAnio,        setFiltroAnio]        = useState(0)
  const [filtroMes,         setFiltroMes]          = useState(0)
  const [filtroAgrupador,   setFiltroAgrupador]    = useState('')
  const [filtroSubagrupador,setFiltroSubagrupador] = useState('')

  const { resumenAgrupador, totales, agrupadores, subagrupadores, loading, error, refetch } =
    useCumplimiento({
      tablaFrecuencias:  cfg.tablaFrq,
      tablaNormativa:    cfg.tablaNt,
      filtroAnio:        filtroAnio  || undefined,
      filtroMes:         filtroMes   || undefined,
      filtroAgrupador:   filtroAgrupador   || undefined,
      filtroSubagrupador: filtroSubagrupador || undefined,
    })

  const pctGlobal = resumenAgrupador.length
    ? Math.round(resumenAgrupador.reduce((s,f) => s + f.pct, 0) / resumenAgrupador.length)
    : 0

  const handleExcel = () => exportarExcel(
    resumenAgrupador.map(f => ({
      Agrupador:           f.agrupador,
      Subagrupador:        f.subagrupador,
      'Eventos Ejecutados':f.eventosEjecutados,
      'Eventos Contratados':f.eventosContratados,
      'Valor Ejecutado':   f.valorEjecutado,
      'Valor Contrato Mes':f.valorContratoMes,
      '% Cumplimiento':    f.pct + '%',
    })),
    cfg.titulo, cfg.tablaFrq
  )

  const handlePDF = () => exportarPDF(
    resumenAgrupador.map(f => ({
      Agrupador:    f.agrupador,
      Ejecutados:   f.eventosEjecutados,
      Contratados:  f.eventosContratados,
      'Val. Ejec':  formatearPesos(f.valorEjecutado),
      'Val. Cont':  formatearPesos(f.valorContratoMes),
      '% Cumpl':    f.pct + '%',
    })),
    cfg.titulo, cfg.tablaFrq
  )

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <img src={`${BASE}/images/logo_cacsb2.png`} alt="" className="h-9 w-9 object-contain" />
          <div>
            <h1 className="text-xl font-bold text-[#1a4a7a]">{cfg.subtitulo}</h1>
            <p className="text-xs text-gray-500">Resumen de Ejecución por Agrupador — Emssanar</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {totales.fechaReporte && (
            <div className="text-xs bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5">
              <span className="text-gray-500 font-medium">FECHA ETL:</span>{' '}
              <span className="font-semibold text-[#1a4a7a]">{totales.fechaReporte}</span>
              {totales.horaReporte && <span className="text-gray-600 ml-1">{totales.horaReporte}</span>}
            </div>
          )}
          <button onClick={refetch} className="btn-cacsb flex items-center gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5"/> Actualizar
          </button>
          <button onClick={handleExcel} className="btn-cacsb flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-800">
            <Download className="h-3.5 w-3.5"/> Excel
          </button>
          <button onClick={handlePDF} className="btn-cacsb flex items-center gap-1.5 text-xs bg-red-700 hover:bg-red-800">
            <Download className="h-3.5 w-3.5"/> PDF
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Eventos',   value: formatearNumero(totales.totalEventos),   help: 'Total de eventos de salud ejecutados en el período' },
          { label: 'Total Pacientes', value: formatearNumero(totales.totalPacientes), help: 'Número de ingresos/pacientes únicos atendidos' },
          { label: '% Cumplimiento',  value: `${pctGlobal}%`,                         help: 'Promedio de cumplimiento de todos los agrupadores' },
          { label: 'Agrupadores',     value: formatearNumero(resumenAgrupador.length), help: 'Número de agrupadores con actividad en el período' },
        ].map((m, i) => (
          <div key={i} className="card-odoo p-5 group relative">
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-help">
              <HelpCircle className="h-4 w-4 text-gray-300"/>
              <div className="absolute right-0 top-5 w-52 bg-gray-900 text-white text-xs rounded-lg p-2.5 z-50 hidden group-hover:block shadow-lg">
                {m.help}
              </div>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">{m.label}</p>
            <p className={cn('text-2xl font-bold', i === 2
              ? pctGlobal >= 100 ? 'text-[#1a4a7a]' : 'text-red-600'
              : 'text-[#1a4a7a]')}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card-odoo p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Agrupador</label>
            <select value={filtroAgrupador} onChange={e => setFiltroAgrupador(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent">
              <option value="">Todos</option>
              {agrupadores.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Subagrupador</label>
            <select value={filtroSubagrupador} onChange={e => setFiltroSubagrupador(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent">
              <option value="">Todos</option>
              {subagrupadores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Año</label>
            <select value={filtroAnio} onChange={e => setFiltroAnio(+e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent">
              <option value={0}>Todos</option>
              {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Mes</label>
            <select value={filtroMes} onChange={e => setFiltroMes(+e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent">
              <option value={0}>Todos</option>
              {MESES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFiltroAgrupador(''); setFiltroSubagrupador(''); setFiltroAnio(0); setFiltroMes(0) }}
              className="w-full border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-3 py-2 text-sm transition-colors">
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla EJECUCIÓN POR AGRUPADOR */}
      <div className="card-odoo overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-[#1a4a7a] text-sm uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="h-4 w-4"/> Ejecución por Agrupador
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#1a4a7a] inline-block"/> ≥ 100%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block"/> &lt; 100%</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2"/>
            <p>Calculando cumplimiento...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2"/>
            <p className="font-medium">Error al cargar datos</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
        ) : resumenAgrupador.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-2">📊</p>
            <p className="font-medium">Sin datos</p>
            <p className="text-sm mt-1">Ejecute el runner ETL o verifique los filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1a4a7a] text-white">
                  {[
                    { label: 'Agrupador',           help: 'Tipo de servicio médico agrupado por contrato' },
                    { label: 'Eventos Ejecutados',   help: 'Total de eventos realmente realizados' },
                    { label: 'Eventos Contratados',  help: 'Total de eventos pactados en contrato' },
                    { label: 'Valor Ejecutado',      help: 'Valor $ total de los eventos ejecutados' },
                    { label: 'Valor Contrato Mes',   help: 'Valor $ total pactado para el período' },
                    { label: '% Cumplimiento',       help: 'Ejecutado / Contratado × 100. Azul ≥ 100%, Rojo < 100%' },
                  ].map(col => (
                    <th key={col.label} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        <div className="relative group cursor-help">
                          <HelpCircle className="h-3 w-3 text-blue-200 opacity-70"/>
                          <div className="absolute left-0 top-4 w-44 bg-gray-900 text-white text-xs rounded-lg p-2 z-50 hidden group-hover:block shadow-lg font-normal normal-case tracking-normal">
                            {col.help}
                          </div>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resumenAgrupador.map((fila, i) => (
                  <tr key={i} className={cn(
                    'border-b border-gray-100 transition-colors',
                    fila.pct >= 100
                      ? 'bg-[#1a4a7a] text-white hover:bg-[#123560]'
                      : 'bg-red-50 text-red-800 hover:bg-red-100'
                  )}>
                    <td className="px-4 py-3 font-semibold">{fila.agrupador}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(fila.eventosEjecutados)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(fila.eventosContratados)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatearPesos(fila.valorEjecutado)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatearPesos(fila.valorContratoMes)}</td>
                    <td className="px-4 py-3 text-right font-bold text-lg tabular-nums">{fila.pct}%</td>
                  </tr>
                ))}
              </tbody>
              {/* Totales */}
              <tfoot>
                <tr className="bg-gray-800 text-white font-semibold">
                  <td className="px-4 py-3">TOTAL</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatearNumero(resumenAgrupador.reduce((s,f) => s + f.eventosEjecutados, 0))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatearNumero(resumenAgrupador.reduce((s,f) => s + f.eventosContratados, 0))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatearPesos(resumenAgrupador.reduce((s,f) => s + f.valorEjecutado, 0))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatearPesos(resumenAgrupador.reduce((s,f) => s + f.valorContratoMes, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-lg">{pctGlobal}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
