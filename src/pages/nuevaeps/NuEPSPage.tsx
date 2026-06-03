import { useState, useMemo } from 'react'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { formatearPesos, formatearNumero, generarAnios, MESES } from '@/lib/calculations'
import { exportarExcel, exportarPDF } from '@/lib/exportar'
import { Download, RefreshCw, HelpCircle, Loader2, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Configuración por tipo ────────────────────────────────────────────────────
const CONFIG = {
  egreso: {
    tabla:    'neps_frecuencias',
    titulo:   'Nueva EPS — Frecuencias por Egreso',
    subtitulo:'Por Egreso (contrato 231)',
    campoFecha: 'fecha_egreso' as const,
  },
  venta: {
    tabla:    'neps_frecuencias_venta',
    titulo:   'Nueva EPS — Frecuencias por Venta',
    subtitulo:'Por Venta (contrato 231)',
    campoFecha: 'fecha_venta' as const,
  },
}

interface NepsRow {
  id: number
  ingreso: string
  fecha_ingreso?: string
  fecha_egreso?:  string
  fecha_venta?:   string
  identificacion: string
  municipio:      string
  contrato:       string
  cup:            string
  cantidad:       number
  producto:       string
  mes:            number
  ano:            number
  valor_unitario: number
  fecha_reporte:  string
  hora_reporte:   string
}

type SortDir = 'asc' | 'desc'
interface Sort { col: keyof NepsRow; dir: SortDir }

const BASE    = '/cacsb_frecuencias'
const ANIOS   = generarAnios()
const POR_PAG = 25

interface Props { tipo: 'egreso' | 'venta' }

export function NuEPSPage({ tipo }: Props) {
  const cfg = CONFIG[tipo]

  // Filtros Supabase
  const [filtroAnio, setFiltroAnio] = useState(0)
  const [filtroMes,  setFiltroMes]  = useState(0)
  // Filtros client-side
  const [filtroCup,   setFiltroCup]  = useState('')
  const [filtroMunic, setFiltroMunic]= useState('')
  const [pagina,      setPagina]     = useState(1)
  const [sort,        setSort]       = useState<Sort>({ col: cfg.campoFecha as keyof NepsRow, dir: 'desc' })

  const filters: Record<string, unknown> = {}
  if (filtroAnio) filters.ano = filtroAnio
  if (filtroMes)  filters.mes = filtroMes

  const { data, loading, error, refetch } = useSupabaseQuery<NepsRow>({
    table:   cfg.tabla,
    filters,
    orderBy: { column: sort.col as string, ascending: sort.dir === 'asc' },
  })

  const filtrado = useMemo(() => {
    let rows = data
    if (filtroCup)   rows = rows.filter(r =>
      r.cup?.toLowerCase().includes(filtroCup.toLowerCase()) ||
      r.producto?.toLowerCase().includes(filtroCup.toLowerCase()))
    if (filtroMunic) rows = rows.filter(r =>
      r.municipio?.toLowerCase().includes(filtroMunic.toLowerCase()))
    return rows
  }, [data, filtroCup, filtroMunic])

  const totalPags = Math.ceil(filtrado.length / POR_PAG)
  const paginados = filtrado.slice((pagina-1)*POR_PAG, pagina*POR_PAG)

  const metrics = useMemo(() => ({
    registros:  filtrado.length,
    pacientes:  new Set(filtrado.map(r => r.identificacion)).size,
    ingresos:   new Set(filtrado.map(r => r.ingreso)).size,
    cantidad:   filtrado.reduce((s,r) => s + (r.cantidad||0), 0),
    valor:      filtrado.reduce((s,r) => s + (r.cantidad||0)*(r.valor_unitario||0), 0),
    municipios: new Set(filtrado.map(r => r.municipio)).size,
  }), [filtrado])

  const municipios = useMemo(() =>
    [...new Set(data.map(r => r.municipio).filter(Boolean))].sort().slice(0,30), [data])

  const handleSort = (col: keyof NepsRow) =>
    setSort(prev => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }))

  const SIcon = ({ col: c }: { col: keyof NepsRow }) =>
    sort.col === c
      ? sort.dir === 'asc'
        ? <ChevronUp className="h-3 w-3 inline ml-0.5"/>
        : <ChevronDown className="h-3 w-3 inline ml-0.5"/>
      : <ChevronUp className="h-3 w-3 inline ml-0.5 opacity-25"/>

  const handleExcel = () => exportarExcel(
    filtrado.map(r => ({
      Ingreso: r.ingreso, Identificacion: r.identificacion, Municipio: r.municipio,
      CUP: r.cup, Producto: r.producto, Cantidad: r.cantidad,
      'Valor Unitario': r.valor_unitario,
      'Valor Total': (r.cantidad||0)*(r.valor_unitario||0),
      Mes: r.mes, Año: r.ano,
      [tipo === 'egreso' ? 'F.Egreso' : 'F.Venta']: tipo === 'egreso' ? r.fecha_egreso : r.fecha_venta,
    })),
    cfg.titulo, cfg.tabla
  )

  const handlePDF = () => exportarPDF(
    filtrado.map(r => ({
      Ingreso: r.ingreso, Municipio: r.municipio,
      CUP: r.cup, Cantidad: r.cantidad,
      'V.Total': formatearPesos((r.cantidad||0)*(r.valor_unitario||0)),
      Mes: `${r.mes}/${r.ano}`,
    })),
    cfg.titulo, cfg.tabla
  )

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <img src={`${BASE}/images/logo_cacsb2.png`} alt="" className="h-9 w-9 object-contain"/>
          <div>
            <h1 className="text-xl font-bold text-[#1a4a7a]">Nueva EPS — {cfg.subtitulo}</h1>
            <p className="text-xs text-gray-500">Frecuencias de Uso — Datos desde Supabase (ETL diario Azure SQL)</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {data[0]?.fecha_reporte && (
            <span className="text-xs bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5">
              <b className="text-gray-500">ETL:</b>{' '}
              <span className="font-semibold text-[#1a4a7a]">{data[0].fecha_reporte}</span>
              {data[0].hora_reporte && <span className="ml-1 text-gray-500">{data[0].hora_reporte}</span>}
            </span>
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Registros',    value: formatearNumero(metrics.registros),  help: 'Total de líneas de frecuencia' },
          { label: 'Pacientes',    value: formatearNumero(metrics.pacientes),  help: 'Identificaciones únicas' },
          { label: 'Ingresos',     value: formatearNumero(metrics.ingresos),   help: 'Números de ingreso únicos' },
          { label: 'Municipios',   value: formatearNumero(metrics.municipios), help: 'Municipios de procedencia distintos' },
          { label: 'Cantidad',     value: formatearNumero(metrics.cantidad),   help: 'Total unidades ejecutadas' },
          { label: 'Valor Total',  value: formatearPesos(metrics.valor),       help: 'Valor total ejecutado' },
        ].map((m, i) => (
          <div key={i} className="card-odoo p-4 group relative">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-help">
              <HelpCircle className="h-3.5 w-3.5 text-gray-300"/>
              <div className="absolute right-0 top-4 w-40 bg-gray-900 text-white text-xs rounded-lg p-2 z-50 hidden group-hover:block shadow-lg">
                {m.help}
              </div>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">{m.label}</p>
            <p className="text-lg font-bold text-[#1a4a7a]">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card-odoo p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">CUP / Producto</label>
            <input value={filtroCup} onChange={e => { setFiltroCup(e.target.value); setPagina(1) }}
              placeholder="Buscar CUP..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Municipio</label>
            <select value={filtroMunic} onChange={e => { setFiltroMunic(e.target.value); setPagina(1) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
              <option value="">Todos</option>
              {municipios.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Año</label>
            <select value={filtroAnio} onChange={e => { setFiltroAnio(+e.target.value); setPagina(1) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
              <option value={0}>Todos</option>
              {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Mes</label>
            <select value={filtroMes} onChange={e => { setFiltroMes(+e.target.value); setPagina(1) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
              <option value={0}>Todos</option>
              {MESES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFiltroCup(''); setFiltroMunic(''); setFiltroAnio(0); setFiltroMes(0); setPagina(1) }}
              className="w-full border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-3 py-2 text-sm transition-colors">
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card-odoo overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-[#1a4a7a] text-sm uppercase tracking-wide">
            Detalle de Frecuencias
            <span className="text-xs font-normal text-gray-400 ml-2 normal-case">
              ({formatearNumero(filtrado.length)} registros)
            </span>
          </h3>
          <span className="text-xs text-gray-400">Pág {pagina}/{totalPags||1} · {POR_PAG} por pág</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2"/>
            <p>Cargando desde Supabase...</p>
            <p className="text-xs mt-1">Los datos vienen del ETL diario (Azure SQL → Supabase)</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2"/>
            <p className="font-medium">Error al cargar datos</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
        ) : filtrado.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">🏥</p>
            <p className="font-semibold">Sin datos para los filtros aplicados</p>
            <p className="text-sm mt-1 text-gray-400">
              Los datos se cargan automáticamente cada día a medianoche desde Azure SQL
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1a4a7a] text-white select-none">
                    {([
                      { col: 'ingreso',        label: 'Ingreso',     help: 'Número de ingreso del paciente' },
                      { col: tipo === 'egreso' ? 'fecha_egreso' : 'fecha_venta',
                        label: tipo === 'egreso' ? 'F. Egreso' : 'F. Venta',
                        help: tipo === 'egreso' ? 'Fecha de egreso hospitalario' : 'Fecha de la venta' },
                      { col: 'identificacion', label: 'Identificación', help: 'Número de documento del paciente' },
                      { col: 'municipio',      label: 'Municipio',   help: 'Municipio de procedencia del paciente' },
                      { col: 'cup',            label: 'CUP',         help: 'Código Único de Procedimientos' },
                      { col: 'producto',       label: 'Producto',    help: 'Nombre del procedimiento/producto' },
                      { col: 'cantidad',       label: 'Cantidad',    help: 'Unidades ejecutadas' },
                      { col: 'valor_unitario', label: 'V. Unitario', help: 'Valor unitario del procedimiento' },
                      { col: 'mes',            label: 'Período',     help: 'Mes y año' },
                    ] as Array<{ col: keyof NepsRow; label: string; help: string }>).map(col => (
                      <th key={col.col as string}
                        onClick={() => handleSort(col.col)}
                        className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer hover:bg-[#2e6db4] transition-colors">
                        <div className="flex items-center gap-1">
                          {col.label}
                          <SIcon col={col.col}/>
                          <div className="relative group cursor-help" onClick={e => e.stopPropagation()}>
                            <HelpCircle className="h-3 w-3 text-blue-200 opacity-60"/>
                            <div className="absolute left-0 top-4 w-40 bg-gray-900 text-white text-xs rounded-lg p-2 z-50 hidden group-hover:block shadow-lg font-normal normal-case tracking-normal">
                              {col.help}
                            </div>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginados.map((row, i) => (
                    <tr key={row.id} className={cn('border-b border-gray-100 hover:bg-blue-50 transition-colors', i%2===1 && 'bg-[#f4f6f9]')}>
                      <td className="px-3 py-2.5 font-medium text-[#1a4a7a] text-xs">{row.ingreso}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                        {tipo === 'egreso' ? row.fecha_egreso : row.fecha_venta}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono">{row.identificacion}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[120px] truncate" title={row.municipio}>{row.municipio}</td>
                      <td className="px-3 py-2.5 text-xs font-mono font-semibold">{row.cup}</td>
                      <td className="px-3 py-2.5 text-xs max-w-[180px] truncate" title={row.producto}>{row.producto}</td>
                      <td className="px-3 py-2.5 text-xs text-right tabular-nums font-medium">{formatearNumero(row.cantidad||0)}</td>
                      <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatearPesos(row.valor_unitario||0)}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                        {MESES[row.mes] || row.mes}/{row.ano}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Paginación */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <p className="text-xs text-gray-500">
                {formatearNumero((pagina-1)*POR_PAG+1)}–{formatearNumero(Math.min(pagina*POR_PAG, filtrado.length))} de {formatearNumero(filtrado.length)}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPagina(1)} disabled={pagina===1}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">«</button>
                <button onClick={() => setPagina(p => Math.max(1,p-1))} disabled={pagina===1}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">‹ Ant</button>
                <span className="px-3 py-1.5 text-xs bg-[#1a4a7a] text-white rounded-lg font-medium">{pagina}</span>
                <button onClick={() => setPagina(p => Math.min(totalPags,p+1))} disabled={pagina===totalPags}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">Sig ›</button>
                <button onClick={() => setPagina(totalPags)} disabled={pagina===totalPags}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">»</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
