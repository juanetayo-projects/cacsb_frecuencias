import { useState, useMemo } from 'react'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { formatearPesos, formatearNumero, generarAnios, MESES } from '@/lib/calculations'
import { exportarExcel, exportarPDF } from '@/lib/exportar'
import { Download, RefreshCw, HelpCircle, Loader2, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const CONFIG = {
  subsidiado:   { tabla: 'emssanar_frecuencias_evento_sub',  titulo: 'Emssanar Evento Subsidiado',   contrato: 41 },
  contributivo: { tabla: 'emssanar_frecuencias_evento_cont', titulo: 'Emssanar Evento Contributivo', contrato: 45 },
}

interface EventoRow {
  id: number
  ingreso: string
  municipio: string
  ultima_ubicacion: string
  estado_ingreso: string
  contrato: string
  numero_venta: string
  estado: string
  tipo_producto: string
  producto: string
  cup: string
  cantidad: number
  valor_unitario: number
  year: number
  mes: number
  fecha_reporte: string
  hora_reporte: string
}

const BASE    = '/cacsb_frecuencias'
const ANIOS   = generarAnios()
const POR_PAG = 25

interface Props { tipo: 'subsidiado' | 'contributivo' }

export function EventoPage({ tipo }: Props) {
  const cfg = CONFIG[tipo]

  const [filtroAnio,    setFiltroAnio]    = useState(0)
  const [filtroMes,     setFiltroMes]     = useState(0)
  const [filtroEstado,  setFiltroEstado]  = useState('')
  const [filtroCup,     setFiltroCup]     = useState('')
  const [filtroMunic,   setFiltroMunic]   = useState('')
  const [sortDir,       setSortDir]       = useState<'asc'|'desc'>('desc')
  const [pagina,        setPagina]        = useState(1)

  const filters: Record<string, unknown> = {}
  if (filtroAnio)   filters.year   = filtroAnio
  if (filtroMes)    filters.mes    = filtroMes
  if (filtroEstado) filters.estado = filtroEstado

  const { data, loading, error, refetch } = useSupabaseQuery<EventoRow>({
    table:   cfg.tabla,
    filters,
    orderBy: { column: 'year', ascending: sortDir === 'asc' },
  })

  const filtrado = useMemo(() => {
    let rows = data
    if (filtroCup)    rows = rows.filter(r => r.cup?.toLowerCase().includes(filtroCup.toLowerCase()) || r.producto?.toLowerCase().includes(filtroCup.toLowerCase()))
    if (filtroMunic)  rows = rows.filter(r => r.municipio?.toLowerCase().includes(filtroMunic.toLowerCase()))
    return rows
  }, [data, filtroCup, filtroMunic])

  const totalPags = Math.ceil(filtrado.length / POR_PAG)
  const paginados = filtrado.slice((pagina-1)*POR_PAG, pagina*POR_PAG)

  const metrics = useMemo(() => ({
    registros:  filtrado.length,
    ingresos:   new Set(filtrado.map(r => r.ingreso)).size,
    municipios: new Set(filtrado.map(r => r.municipio)).size,
    cantidad:   filtrado.reduce((s,r) => s + (r.cantidad||0), 0),
    valor:      filtrado.reduce((s,r) => s + (r.cantidad||0)*(r.valor_unitario||0), 0),
  }), [filtrado])

  const estados  = useMemo(() => [...new Set(data.map(r => r.estado).filter(Boolean))].sort(), [data])
  const municipios = useMemo(() => [...new Set(data.map(r => r.municipio).filter(Boolean))].sort().slice(0,25), [data])

  const handleExcel = () => exportarExcel(
    filtrado.map(r => ({
      Ingreso: r.ingreso, Municipio: r.municipio, 'Ultima Ubicacion': r.ultima_ubicacion,
      'Estado Ingreso': r.estado_ingreso, Contrato: r.contrato, 'N° Venta': r.numero_venta,
      Estado: r.estado, 'Tipo Producto': r.tipo_producto, Producto: r.producto,
      CUP: r.cup, Cantidad: r.cantidad, 'Valor Unitario': r.valor_unitario,
      Año: r.year, Mes: r.mes,
    })),
    cfg.titulo, cfg.tabla
  )

  const handlePDF = () => exportarPDF(
    filtrado.map(r => ({
      Ingreso: r.ingreso, Municipio: r.municipio, CUP: r.cup,
      Producto: r.producto?.substring(0,25), Cantidad: r.cantidad,
      'V.Total': formatearPesos((r.cantidad||0)*(r.valor_unitario||0)),
      Período: `${r.mes}/${r.year}`,
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
            <h1 className="text-xl font-bold text-[#1a4a7a]">{cfg.titulo}</h1>
            <p className="text-xs text-gray-500">Contrato {cfg.contrato} — Datos desde Supabase (ETL diario)</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {data[0]?.fecha_reporte && (
            <span className="text-xs bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5">
              <b className="text-gray-500">ETL:</b>{' '}
              <span className="font-semibold text-[#1a4a7a]">{data[0].fecha_reporte}</span>
              {data[0].hora_reporte && <span className="text-gray-500 ml-1">{data[0].hora_reporte}</span>}
            </span>
          )}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['desc','asc'] as const).map(d => (
              <button key={d} onClick={() => { setSortDir(d); setPagina(1) }}
                className={cn('px-3 py-1.5 text-xs rounded-md transition-colors font-medium flex items-center gap-1',
                  sortDir===d?'bg-white text-[#1a4a7a] shadow-sm':'text-gray-500 hover:text-gray-700')}>
                {d==='desc'?<ChevronDown className="h-3 w-3"/>:<ChevronUp className="h-3 w-3"/>}
                {d==='desc'?'Reciente':'Antiguo'}
              </button>
            ))}
          </div>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Registros',   value: formatearNumero(metrics.registros),  help: 'Total de líneas de evento' },
          { label: 'Ingresos',    value: formatearNumero(metrics.ingresos),   help: 'Ingresos hospitalarios únicos' },
          { label: 'Municipios',  value: formatearNumero(metrics.municipios), help: 'Municipios de procedencia distintos' },
          { label: 'Cantidad',    value: formatearNumero(metrics.cantidad),   help: 'Total de unidades ejecutadas' },
          { label: 'Valor Total', value: formatearPesos(metrics.valor),       help: 'Valor ejecutado total' },
        ].map((m,i) => (
          <div key={i} className="card-odoo p-4 group relative">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-help">
              <HelpCircle className="h-3.5 w-3.5 text-gray-300"/>
              <div className="absolute right-0 top-4 w-40 bg-gray-900 text-white text-xs rounded-lg p-2 z-50 hidden group-hover:block shadow-lg">{m.help}</div>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">{m.label}</p>
            <p className="text-lg font-bold text-[#1a4a7a]">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card-odoo p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">CUP / Producto</label>
            <input value={filtroCup} onChange={e=>{setFiltroCup(e.target.value);setPagina(1)}} placeholder="Buscar..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Municipio</label>
            <select value={filtroMunic} onChange={e=>{setFiltroMunic(e.target.value);setPagina(1)}}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
              <option value="">Todos</option>
              {municipios.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Estado Venta</label>
            <select value={filtroEstado} onChange={e=>{setFiltroEstado(e.target.value);setPagina(1)}}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
              <option value="">Todos</option>
              {estados.map(e=><option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Año</label>
            <select value={filtroAnio} onChange={e=>{setFiltroAnio(+e.target.value);setPagina(1)}}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
              <option value={0}>Todos</option>
              {ANIOS.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Mes</label>
            <select value={filtroMes} onChange={e=>{setFiltroMes(+e.target.value);setPagina(1)}}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
              <option value={0}>Todos</option>
              {MESES.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={()=>{setFiltroCup('');setFiltroMunic('');setFiltroEstado('');setFiltroAnio(0);setFiltroMes(0);setPagina(1)}}
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
            Detalle de Eventos
            <span className="text-xs font-normal text-gray-400 ml-2 normal-case">
              ({formatearNumero(filtrado.length)} registros)
            </span>
          </h3>
          <span className="text-xs text-gray-400">Pág {pagina}/{totalPags||1}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2"/>
            <p>Cargando desde Supabase...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2"/><p>{error}</p>
          </div>
        ) : filtrado.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-3xl mb-2">📋</p>
            <p className="font-medium">Sin datos — ejecute el runner ETL de Emssanar</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1a4a7a] text-white">
                    {[
                      { label:'Ingreso',         help:'Número de ingreso hospitalario' },
                      { label:'Municipio',        help:'Municipio de procedencia del paciente' },
                      { label:'Última Ubicación', help:'Última ubicación registrada en el sistema' },
                      { label:'Estado Ingreso',   help:'Estado actual del ingreso (Activo/Egresado)' },
                      { label:'N° Venta',         help:'Número de la venta asociada' },
                      { label:'Estado',           help:'Estado de la venta' },
                      { label:'CUP',              help:'Código Único de Procedimientos' },
                      { label:'Producto',         help:'Nombre del procedimiento' },
                      { label:'Cantidad',         help:'Unidades ejecutadas' },
                      { label:'V. Unitario',      help:'Valor unitario del procedimiento' },
                      { label:'Período',          help:'Mes y año' },
                    ].map(col=>(
                      <th key={col.label} className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {col.label}
                          <div className="relative group cursor-help">
                            <HelpCircle className="h-3 w-3 text-blue-200 opacity-70"/>
                            <div className="absolute left-0 top-4 w-40 bg-gray-900 text-white text-xs rounded-lg p-2 z-50 hidden group-hover:block shadow-lg font-normal normal-case tracking-normal">{col.help}</div>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginados.map((row,i)=>(
                    <tr key={row.id} className={cn('border-b border-gray-100 hover:bg-blue-50 transition-colors', i%2===1&&'bg-[#f4f6f9]')}>
                      <td className="px-3 py-2.5 font-medium text-[#1a4a7a] text-xs">{row.ingreso}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[100px] truncate" title={row.municipio}>{row.municipio}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[100px] truncate" title={row.ultima_ubicacion}>{row.ultima_ubicacion}</td>
                      <td className="px-3 py-2.5 text-xs">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                          row.estado_ingreso==='Egresado'?'bg-green-100 text-green-700':
                          row.estado_ingreso==='Activo'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600')}>
                          {row.estado_ingreso}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{row.numero_venta}</td>
                      <td className="px-3 py-2.5 text-xs">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                          row.estado==='FACTURADA'?'bg-green-100 text-green-700':
                          row.estado==='ACTIVA'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600')}>
                          {row.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono font-semibold">{row.cup}</td>
                      <td className="px-3 py-2.5 text-xs max-w-[160px] truncate" title={row.producto}>{row.producto}</td>
                      <td className="px-3 py-2.5 text-xs text-right tabular-nums font-medium">{formatearNumero(row.cantidad||0)}</td>
                      <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatearPesos(row.valor_unitario||0)}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                        {MESES[row.mes]||row.mes}/{row.year}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <p className="text-xs text-gray-500">{formatearNumero((pagina-1)*POR_PAG+1)}–{formatearNumero(Math.min(pagina*POR_PAG,filtrado.length))} de {formatearNumero(filtrado.length)}</p>
              <div className="flex gap-1">
                <button onClick={()=>setPagina(1)} disabled={pagina===1} className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">«</button>
                <button onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={pagina===1} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">‹ Ant</button>
                <span className="px-3 py-1.5 text-xs bg-[#1a4a7a] text-white rounded-lg font-medium">{pagina}</span>
                <button onClick={()=>setPagina(p=>Math.min(totalPags,p+1))} disabled={pagina===totalPags} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">Sig ›</button>
                <button onClick={()=>setPagina(totalPags)} disabled={pagina===totalPags} className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">»</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
