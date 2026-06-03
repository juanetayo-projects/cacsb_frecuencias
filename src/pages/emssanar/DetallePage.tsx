import { useState, useMemo } from 'react'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { formatearPesos, formatearNumero, generarAnios, MESES } from '@/lib/calculations'
import { exportarExcel, exportarPDF } from '@/lib/exportar'
import { Download, RefreshCw, HelpCircle, Loader2, AlertCircle, List, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Configuración por modalidad ───────────────────────────────────────────────
const CONFIG: Record<string, { titulo: string; tablaFrq: string; subtitulo: string }> = {
  'emssanar-alta-sub':  { titulo: 'Emssanar Alta — Subsidiado',    tablaFrq: 'emssanar_frecuencias_alta_sub',   subtitulo: 'Alta Complejidad Subsidiado'    },
  'emssanar-alta-cont': { titulo: 'Emssanar Alta — Contributivo',  tablaFrq: 'emssanar_frecuencias_alta_cont',  subtitulo: 'Alta Complejidad Contributivo'  },
  'emssanar-media-sub': { titulo: 'Emssanar Mediana — Subsidiado', tablaFrq: 'emssanar_frecuencias_media_sub',  subtitulo: 'Mediana Complejidad Subsidiado' },
  'emssanar-media-cont':{ titulo: 'Emssanar Mediana — Contributivo',tablaFrq: 'emssanar_frecuencias_media_cont', subtitulo: 'Mediana Complejidad Contributivo'},
}

interface FrecuenciaRow {
  id: number
  ingreso: string
  fecha_ingreso: string
  fecha_egreso: string
  venta: string
  estado: string
  cup: string
  cantidad: number
  descripcion: string
  tipo_producto: string
  valor_unitario: number
  year: number
  mes: number
  fecha_reporte: string
}

type SortDir = 'asc' | 'desc'
interface Sort { col: keyof FrecuenciaRow; dir: SortDir }

const BASE    = '/cacsb_frecuencias'
const ANIOS   = generarAnios()
const POR_PAG = 25

interface Props { aseguradora: keyof typeof CONFIG }

export function DetallePage({ aseguradora }: Props) {
  const cfg = CONFIG[aseguradora] || CONFIG['emssanar-alta-sub']

  // Filtros
  const [filtroAnio,     setFiltroAnio]     = useState(0)
  const [filtroMes,      setFiltroMes]      = useState(0)
  const [filtroEstado,   setFiltroEstado]   = useState('')
  const [filtroCup,      setFiltroCup]      = useState('')
  const [filtroTipo,     setFiltroTipo]     = useState('')
  const [pagina,         setPagina]         = useState(1)
  const [sort,           setSort]           = useState<Sort>({ col: 'fecha_egreso', dir: 'desc' })

  // Filtros para Supabase
  const filters: Record<string, unknown> = {}
  if (filtroAnio)   filters.year   = filtroAnio
  if (filtroMes)    filters.mes    = filtroMes
  if (filtroEstado) filters.estado = filtroEstado

  const { data, loading, error, refetch } = useSupabaseQuery<FrecuenciaRow>({
    table:   cfg.tablaFrq,
    orderBy: { column: sort.col as string, ascending: sort.dir === 'asc' },
    filters,
  })

  // Filtros client-side (cup / tipo / búsqueda texto)
  const filtrado = useMemo(() => {
    let rows = [...data]
    if (filtroCup)  rows = rows.filter(r =>
      r.cup?.toLowerCase().includes(filtroCup.toLowerCase()) ||
      r.descripcion?.toLowerCase().includes(filtroCup.toLowerCase()))
    if (filtroTipo) rows = rows.filter(r => r.tipo_producto === filtroTipo)
    return rows
  }, [data, filtroCup, filtroTipo])

  const totalPags = Math.ceil(filtrado.length / POR_PAG)
  const paginados = filtrado.slice((pagina-1)*POR_PAG, pagina*POR_PAG)

  // Métricas rápidas
  const metrics = useMemo(() => ({
    totalRegistros:  filtrado.length,
    totalIngresos:   new Set(filtrado.map(r => r.ingreso)).size,
    totalCantidad:   filtrado.reduce((s,r) => s + r.cantidad, 0),
    totalValor:      filtrado.reduce((s,r) => s + r.cantidad * (r.valor_unitario||0), 0),
    totalCups:       new Set(filtrado.map(r => r.cup)).size,
    fechaReporte:    data[0]?.fecha_reporte || '',
  }), [filtrado, data])

  // Listas únicas para filtros
  const tiposUnicos  = useMemo(() => [...new Set(data.map(r => r.tipo_producto).filter(Boolean))].sort(), [data])
  const estadosUnicos = useMemo(() => [...new Set(data.map(r => r.estado).filter(Boolean))].sort(), [data])

  // Ordenamiento en columna
  const handleSort = (col: keyof FrecuenciaRow) => {
    setSort(prev => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }))
    setPagina(1)
  }

  const SortIcon = ({ col: c }: { col: keyof FrecuenciaRow }) => (
    sort.col === c
      ? sort.dir === 'asc'
        ? <ChevronUp className="h-3 w-3 inline ml-0.5"/>
        : <ChevronDown className="h-3 w-3 inline ml-0.5"/>
      : <ChevronUp className="h-3 w-3 inline ml-0.5 opacity-30"/>
  )

  const handleExcel = () => exportarExcel(
    filtrado.map(r => ({
      Ingreso: r.ingreso, 'F.Ingreso': r.fecha_ingreso, 'F.Egreso': r.fecha_egreso,
      Venta: r.venta, Estado: r.estado, CUP: r.cup,
      Descripción: r.descripcion, TipoProducto: r.tipo_producto,
      Cantidad: r.cantidad, ValorUnitario: r.valor_unitario,
      ValorTotal: r.cantidad * (r.valor_unitario||0),
      Año: r.year, Mes: r.mes,
    })),
    cfg.titulo + ' — Detalle', cfg.tablaFrq + '_detalle'
  )

  const handlePDF = () => exportarPDF(
    filtrado.map(r => ({
      Ingreso: r.ingreso, CUP: r.cup,
      Descripción: r.descripcion?.substring(0,30),
      Tipo: r.tipo_producto, Cantidad: r.cantidad,
      'V.Unitario': formatearPesos(r.valor_unitario),
      'V.Total': formatearPesos(r.cantidad*(r.valor_unitario||0)),
      Estado: r.estado, Mes: `${r.mes}/${r.year}`,
    })),
    cfg.titulo + ' — Detalle', cfg.tablaFrq + '_detalle'
  )

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <img src={`${BASE}/images/logo_cacsb2.png`} alt="" className="h-9 w-9 object-contain"/>
          <div>
            <h1 className="text-xl font-bold text-[#1a4a7a] flex items-center gap-2">
              <List className="h-5 w-5"/> {cfg.subtitulo}
            </h1>
            <p className="text-xs text-gray-500">Detalle de Frecuencias por Procedimiento — Emssanar</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {metrics.fechaReporte && (
            <span className="text-xs bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5">
              <b className="text-gray-500">ETL:</b>{' '}
              <span className="font-semibold text-[#1a4a7a]">{metrics.fechaReporte}</span>
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Registros',       value: formatearNumero(metrics.totalRegistros),  help: 'Total de líneas de detalle' },
          { label: 'Ingresos únicos', value: formatearNumero(metrics.totalIngresos),   help: 'Pacientes/ingresos distintos' },
          { label: 'Total Cantidad',  value: formatearNumero(metrics.totalCantidad),   help: 'Suma de unidades dispensadas' },
          { label: 'Valor Total',     value: formatearPesos(metrics.totalValor),       help: 'Suma del valor ejecutado (cantidad × valor unitario)' },
          { label: 'CUPs distintos',  value: formatearNumero(metrics.totalCups),       help: 'Número de procedimientos/productos únicos' },
        ].map((m, i) => (
          <div key={i} className="card-odoo p-4 group relative">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-help">
              <HelpCircle className="h-3.5 w-3.5 text-gray-300"/>
              <div className="absolute right-0 top-4 w-44 bg-gray-900 text-white text-xs rounded-lg p-2 z-50 hidden group-hover:block shadow-lg">
                {m.help}
              </div>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">{m.label}</p>
            <p className="text-xl font-bold text-[#1a4a7a]">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card-odoo p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">CUP / Descripción</label>
            <input value={filtroCup} onChange={e => { setFiltroCup(e.target.value); setPagina(1) }}
              placeholder="Buscar CUP..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Tipo Producto</label>
            <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent">
              <option value="">Todos</option>
              {tiposUnicos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Estado</label>
            <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(1) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent">
              <option value="">Todos</option>
              {estadosUnicos.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Año</label>
            <select value={filtroAnio} onChange={e => { setFiltroAnio(+e.target.value); setPagina(1) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent">
              <option value={0}>Todos</option>
              {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Mes</label>
            <select value={filtroMes} onChange={e => { setFiltroMes(+e.target.value); setPagina(1) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent">
              <option value={0}>Todos</option>
              {MESES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFiltroCup(''); setFiltroTipo(''); setFiltroEstado(''); setFiltroAnio(0); setFiltroMes(0); setPagina(1) }}
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
            Detalle de Procedimientos
            <span className="text-xs font-normal text-gray-400 ml-2 normal-case">
              ({formatearNumero(filtrado.length)} registros — pág. {pagina}/{totalPags || 1})
            </span>
          </h3>
          <span className="text-xs text-gray-400">{POR_PAG} por página</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2"/>
            <p>Cargando detalle...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2"/>
            <p className="font-medium">Error al cargar</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
        ) : filtrado.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-2">🔍</p>
            <p className="font-medium">Sin resultados</p>
            <p className="text-sm mt-1">Ajuste los filtros o ejecute el ETL</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1a4a7a] text-white select-none">
                    {([
                      { col: 'ingreso',      label: 'Ingreso',     help: 'Número de ingreso del paciente' },
                      { col: 'fecha_ingreso',label: 'F. Ingreso',  help: 'Fecha de ingreso hospitalario' },
                      { col: 'fecha_egreso', label: 'F. Egreso',   help: 'Fecha de egreso hospitalario' },
                      { col: 'venta',        label: 'Venta',       help: 'Número de venta' },
                      { col: 'estado',       label: 'Estado',      help: 'Estado de la venta (Activa/Facturada)' },
                      { col: 'cup',          label: 'CUP',         help: 'Código Único de Procedimientos en Salud' },
                      { col: 'descripcion',  label: 'Descripción', help: 'Nombre del procedimiento o producto' },
                      { col: 'tipo_producto',label: 'Tipo',        help: 'Clasificación del producto' },
                      { col: 'cantidad',     label: 'Cantidad',    help: 'Unidades ejecutadas' },
                      { col: 'valor_unitario',label: 'V. Unitario',help: 'Valor unitario del procedimiento' },
                      { col: 'mes',          label: 'Período',     help: 'Mes y año de la venta' },
                    ] as Array<{ col: keyof FrecuenciaRow; label: string; help: string }>).map(col => (
                      <th key={col.col}
                        onClick={() => handleSort(col.col)}
                        className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer hover:bg-[#2e6db4] transition-colors">
                        <div className="flex items-center gap-1">
                          {col.label}
                          <SortIcon col={col.col}/>
                          <div className="relative group cursor-help" onClick={e => e.stopPropagation()}>
                            <HelpCircle className="h-3 w-3 text-blue-200 opacity-70 ml-0.5"/>
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
                    <tr key={row.id}
                      className={cn(
                        'border-b border-gray-100 hover:bg-blue-50 transition-colors',
                        i % 2 === 1 && 'bg-[#f4f6f9]'
                      )}>
                      <td className="px-3 py-2 font-medium text-[#1a4a7a] text-xs">{row.ingreso}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.fecha_ingreso}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.fecha_egreso}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{row.venta}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          row.estado === 'FACTURADA' ? 'bg-green-100 text-green-700' :
                          row.estado === 'ACTIVA'    ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {row.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs font-mono font-semibold">{row.cup}</td>
                      <td className="px-3 py-2 text-xs max-w-[180px]">
                        <span className="truncate block" title={row.descripcion}>{row.descripcion}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{row.tipo_producto}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums font-medium">{formatearNumero(row.cantidad)}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums">{formatearPesos(row.valor_unitario)}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                        {MESES[row.mes] || row.mes}/{row.year}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <p className="text-xs text-gray-500">
                {formatearNumero((pagina-1)*POR_PAG+1)}–{formatearNumero(Math.min(pagina*POR_PAG, filtrado.length))} de {formatearNumero(filtrado.length)} registros
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPagina(1)} disabled={pagina===1}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors">«</button>
                <button onClick={() => setPagina(p => Math.max(1,p-1))} disabled={pagina===1}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors">‹ Ant</button>
                <span className="px-3 py-1.5 text-xs bg-[#1a4a7a] text-white rounded-lg font-medium">{pagina}</span>
                <button onClick={() => setPagina(p => Math.min(totalPags,p+1))} disabled={pagina===totalPags}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors">Sig ›</button>
                <button onClick={() => setPagina(totalPags)} disabled={pagina===totalPags}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors">»</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
