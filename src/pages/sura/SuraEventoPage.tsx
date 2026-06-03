import { useState, useMemo } from 'react'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { formatearPesos, formatearNumero, generarAnios } from '@/lib/calculations'
import { exportarExcel, exportarPDF } from '@/lib/exportar'
import { Download, RefreshCw, HelpCircle, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EventoRow {
  id: number
  ingreso: string
  ultima_ubicacion: string
  producto: string
  tipo_producto: string
  cup: string
  cantidad: number
  valor_unitario: number
  mes_anio_factura: string
  fecha_reporte: string
}

const CONFIG = {
  subsidiado:   { tabla: 'sura_evento_sub',  titulo: 'SURA — Evento Subsidiado',   subtitulo: 'Evento Subsidiado' },
  contributivo: { tabla: 'sura_evento_cont', titulo: 'SURA — Evento Contributivo', subtitulo: 'Evento Contributivo' },
}

const BASE    = '/cacsb_frecuencias'
const POR_PAG = 25

interface Props { tipo: 'subsidiado' | 'contributivo' }

export function SuraEventoPage({ tipo }: Props) {
  const cfg = CONFIG[tipo]

  const [filtroMes,  setFiltroMes]  = useState('')
  const [filtroCup,  setFiltroCup]  = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [pagina,     setPagina]     = useState(1)

  const { data, loading, error, refetch } = useSupabaseQuery<EventoRow>({
    table:   cfg.tabla,
    orderBy: { column: 'ingreso', ascending: true },
  })

  const filtrado = useMemo(() => {
    let rows = data
    if (filtroMes)  rows = rows.filter(r => r.mes_anio_factura === filtroMes)
    if (filtroCup)  rows = rows.filter(r =>
      r.cup?.toLowerCase().includes(filtroCup.toLowerCase()) ||
      r.producto?.toLowerCase().includes(filtroCup.toLowerCase()))
    if (filtroTipo) rows = rows.filter(r => r.tipo_producto === filtroTipo)
    return rows
  }, [data, filtroMes, filtroCup, filtroTipo])

  const totalPags = Math.ceil(filtrado.length / POR_PAG)
  const paginados = filtrado.slice((pagina-1)*POR_PAG, pagina*POR_PAG)

  const metrics = useMemo(() => ({
    registros:  filtrado.length,
    ingresos:   new Set(filtrado.map(r => r.ingreso)).size,
    cantidad:   filtrado.reduce((s,r) => s + (r.cantidad||0), 0),
    valor:      filtrado.reduce((s,r) => s + (r.cantidad||0) * (r.valor_unitario||0), 0),
  }), [filtrado])

  const meses  = useMemo(() => [...new Set(data.map(r => r.mes_anio_factura).filter(Boolean))].sort(), [data])
  const tipos  = useMemo(() => [...new Set(data.map(r => r.tipo_producto).filter(Boolean))].sort(), [data])

  const handleExcel = () => exportarExcel(
    filtrado.map(r => ({
      Ingreso: r.ingreso, 'Última Ubicación': r.ultima_ubicacion,
      CUP: r.cup, Producto: r.producto, Tipo: r.tipo_producto,
      Cantidad: r.cantidad, 'Valor Unitario': r.valor_unitario,
      'Valor Total': r.cantidad * r.valor_unitario,
      'Mes/Año Factura': r.mes_anio_factura,
    })),
    cfg.titulo, cfg.tabla
  )

  const handlePDF = () => exportarPDF(
    filtrado.map(r => ({
      Ingreso: r.ingreso, CUP: r.cup,
      Producto: r.producto?.substring(0,30),
      Cantidad: r.cantidad,
      'V.Total': formatearPesos(r.cantidad * r.valor_unitario),
      Mes: r.mes_anio_factura,
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
            <h1 className="text-xl font-bold text-[#1a4a7a]">SURA — {cfg.subtitulo}</h1>
            <p className="text-xs text-gray-500">Frecuencias de Evento — Datos desde Supabase (ETL diario)</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {data[0]?.fecha_reporte && (
            <span className="text-xs bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5">
              <b className="text-gray-500">ETL:</b>{' '}
              <span className="font-semibold text-[#1a4a7a]">{data[0].fecha_reporte}</span>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Registros',  value: formatearNumero(metrics.registros), help: 'Total de líneas de evento' },
          { label: 'Ingresos',   value: formatearNumero(metrics.ingresos),  help: 'Pacientes/ingresos únicos' },
          { label: 'Cantidad',   value: formatearNumero(metrics.cantidad),  help: 'Total unidades ejecutadas' },
          { label: 'Valor Total',value: formatearPesos(metrics.valor),      help: 'Cantidad × Valor Unitario' },
        ].map((m, i) => (
          <div key={i} className="card-odoo p-5 group relative">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-help">
              <HelpCircle className="h-3.5 w-3.5 text-gray-300"/>
              <div className="absolute right-0 top-4 w-40 bg-gray-900 text-white text-xs rounded-lg p-2 z-50 hidden group-hover:block shadow-lg">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">CUP / Producto</label>
            <input value={filtroCup} onChange={e => { setFiltroCup(e.target.value); setPagina(1) }}
              placeholder="Buscar..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Tipo Producto</label>
            <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
              <option value="">Todos</option>
              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Mes/Año Factura</label>
            <select value={filtroMes} onChange={e => { setFiltroMes(e.target.value); setPagina(1) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
              <option value="">Todos</option>
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFiltroCup(''); setFiltroTipo(''); setFiltroMes(''); setPagina(1) }}
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
            Detalle de Eventos SURA
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
            <AlertCircle className="h-8 w-8 mx-auto mb-2"/>
            <p className="font-medium">Error: {error}</p>
          </div>
        ) : filtrado.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p className="font-medium">Sin datos</p>
            <p className="text-sm mt-1">Ejecute el runner ETL de SURA para cargar los datos</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1a4a7a] text-white">
                    {[
                      { label: 'Ingreso',         help: 'Número de ingreso del paciente' },
                      { label: 'Última Ubicación', help: 'Última ubicación registrada del paciente' },
                      { label: 'CUP',              help: 'Código Único de Procedimientos' },
                      { label: 'Producto',         help: 'Nombre del producto/procedimiento' },
                      { label: 'Tipo',             help: 'Clasificación del producto' },
                      { label: 'Cantidad',         help: 'Unidades ejecutadas' },
                      { label: 'V. Unitario',      help: 'Valor unitario del producto' },
                      { label: 'V. Total',         help: 'Cantidad × Valor Unitario' },
                      { label: 'Mes Factura',      help: 'Mes y año de la factura' },
                    ].map(col => (
                      <th key={col.label} className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {col.label}
                          <div className="relative group cursor-help">
                            <HelpCircle className="h-3 w-3 text-blue-200 opacity-70"/>
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
                      <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[120px] truncate" title={row.ultima_ubicacion}>{row.ultima_ubicacion}</td>
                      <td className="px-3 py-2.5 text-xs font-mono font-semibold">{row.cup}</td>
                      <td className="px-3 py-2.5 text-xs max-w-[180px] truncate" title={row.producto}>{row.producto}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{row.tipo_producto}</td>
                      <td className="px-3 py-2.5 text-xs text-right tabular-nums font-medium">{formatearNumero(row.cantidad||0)}</td>
                      <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatearPesos(row.valor_unitario||0)}</td>
                      <td className="px-3 py-2.5 text-xs text-right tabular-nums font-semibold text-[#1a4a7a]">
                        {formatearPesos((row.cantidad||0) * (row.valor_unitario||0))}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{row.mes_anio_factura}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Paginación */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <p className="text-xs text-gray-500">
                {(pagina-1)*POR_PAG+1}–{Math.min(pagina*POR_PAG, filtrado.length)} de {formatearNumero(filtrado.length)}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPagina(p => Math.max(1,p-1))} disabled={pagina===1}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">← Ant</button>
                <span className="px-3 py-1.5 text-xs bg-[#1a4a7a] text-white rounded-lg">{pagina}</span>
                <button onClick={() => setPagina(p => Math.min(totalPags,p+1))} disabled={pagina===totalPags}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">Sig →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
