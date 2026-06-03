import { useState } from 'react'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { Download, Mail, RefreshCw, HelpCircle, Loader2, AlertCircle } from 'lucide-react'
import { formatearPesos, formatearNumero, nombreMes, generarAnios, MESES } from '@/lib/calculations'
import { exportarExcel, exportarPDF } from '@/lib/exportar'

interface DispensarioRow {
  id: number
  ingreso: string
  fecha_ingreso: string
  fecha_egreso: string
  numero_venta: string
  estado_venta: string
  cup: string
  cantidad: number
  valor_total: number
  valor_unitario: number
  producto: string
  tipo_producto: string
  mes: string
  anio: number
  fecha_reporte: string
}

const ANIOS = generarAnios()

export function DispensarioPage() {
  const [filtroAnio, setFiltroAnio]  = useState<number>(0)
  const [filtroMes,  setFiltroMes]   = useState<number>(0)
  const [filtroCup,  setFiltroCup]   = useState('')
  const [pagina,     setPagina]      = useState(1)
  const POR_PAGINA = 25

  const filters: Record<string, unknown> = {}
  if (filtroAnio) filters.anio = filtroAnio
  if (filtroMes)  filters.mes  = String(filtroMes).padStart(2,'0')

  const { data, loading, error, refetch } = useSupabaseQuery<DispensarioRow>({
    table:   'dispensario_medico_frecuencias',
    orderBy: { column: 'fecha_egreso', ascending: false },
    filters,
  })

  // Filtro CUP client-side
  const filtrado = filtroCup
    ? data.filter(r => r.cup?.toLowerCase().includes(filtroCup.toLowerCase()) ||
                       r.producto?.toLowerCase().includes(filtroCup.toLowerCase()))
    : data

  const totalPaginas = Math.ceil(filtrado.length / POR_PAGINA)
  const pagados      = filtrado.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA)

  // Métricas
  const totalEventos   = filtrado.length
  const totalIngresos  = new Set(filtrado.map(r => r.ingreso)).size
  const totalValor     = filtrado.reduce((s, r) => s + (r.valor_total || 0), 0)
  const ultimaEjecucion = data[0]?.fecha_reporte

  const handleExcelExport = () => exportarExcel(filtrado, 'Dispensario Médico', 'dispensario_medico')
  const handlePdfExport   = () => exportarPDF(filtrado, 'Dispensario Médico — CACSB', 'dispensario_medico')

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <img src="/cacsb_frecuencias/images/logo_cacsb2.png" alt="" className="h-8 w-8 object-contain" />
            <h1 className="text-xl font-bold text-[#1a4a7a]">Dispensario Médico</h1>
          </div>
          <p className="text-xs text-gray-500">Contrato 198 — Frecuencias de Uso</p>
        </div>
        <div className="flex items-center gap-2">
          {ultimaEjecucion && (
            <span className="text-xs bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600">
              <b>Última ejecución:</b> {ultimaEjecucion}
            </span>
          )}
          <button onClick={refetch} className="btn-cacsb flex items-center gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Actualizar
          </button>
          <button onClick={handleExcelExport} className="btn-cacsb flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-800">
            <Download className="h-3.5 w-3.5" /> Excel
          </button>
          <button onClick={handlePdfExport} className="btn-cacsb flex items-center gap-1.5 text-xs bg-red-700 hover:bg-red-800">
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Eventos',   value: formatearNumero(totalEventos),   help: 'Total de registros de dispensario en el período filtrado' },
          { label: 'Total Ingresos',  value: formatearNumero(totalIngresos),  help: 'Número de ingresos únicos (pacientes) atendidos' },
          { label: 'Valor Total',     value: formatearPesos(totalValor),      help: 'Suma del valor total de todos los productos dispensados' },
          { label: 'Productos',       value: formatearNumero(new Set(filtrado.map(r=>r.cup)).size), help: 'Número de CUPs (productos) distintos dispensados' },
        ].map((m, i) => (
          <div key={i} className="card-odoo p-5 group relative">
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-help">
              <HelpCircle className="h-4 w-4 text-gray-300" />
              <div className="absolute right-0 top-5 w-52 bg-gray-900 text-white text-xs rounded-lg p-2.5 z-50 hidden group-hover:block shadow-lg">
                {m.help}
              </div>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">{m.label}</p>
            <p className="text-2xl font-bold text-[#1a4a7a]">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card-odoo p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">CUP / Producto</label>
            <input value={filtroCup} onChange={e => { setFiltroCup(e.target.value); setPagina(1) }}
              placeholder="Buscar..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent" />
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFiltroAnio(0); setFiltroMes(0); setFiltroCup(''); setPagina(1) }}
              className="w-full border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-3 py-2 text-sm transition-colors">
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card-odoo overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-[#1a4a7a] text-sm uppercase tracking-wide flex items-center gap-2">
            Detalle de Frecuencias
            <span className="text-xs text-gray-400 font-normal normal-case">
              ({formatearNumero(filtrado.length)} registros)
            </span>
          </h3>
          <span className="text-xs text-gray-400">Página {pagina} de {totalPaginas || 1}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Cargando datos desde Supabase...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Error al cargar datos</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
            <p className="text-xs text-gray-400 mt-2">Verifique que el ETL haya ejecutado y que las tablas tengan datos.</p>
          </div>
        ) : filtrado.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-2">💊</p>
            <p className="font-medium">Sin datos para los filtros aplicados</p>
            <p className="text-sm mt-1">Ejecute el runner ETL o ajuste los filtros</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-striped">
                <thead>
                  <tr className="bg-[#1a4a7a] text-white">
                    {[
                      { label: 'Ingreso',     help: 'Número de ingreso del paciente' },
                      { label: 'F. Ingreso',  help: 'Fecha de ingreso del paciente' },
                      { label: 'F. Egreso',   help: 'Fecha de egreso del paciente' },
                      { label: 'CUP',         help: 'Código Único de Procedimientos en Salud' },
                      { label: 'Producto',    help: 'Nombre del producto o medicamento dispensado' },
                      { label: 'Tipo',        help: 'Tipo de producto (Medicamento, Insumo, etc.)' },
                      { label: 'Cantidad',    help: 'Cantidad dispensada' },
                      { label: 'V. Unitario', help: 'Valor unitario del producto' },
                      { label: 'V. Total',    help: 'Valor total = Cantidad × Valor Unitario' },
                      { label: 'Estado',      help: 'Estado de la venta' },
                      { label: 'Mes',         help: 'Mes y año de la venta' },
                    ].map(col => (
                      <th key={col.label} className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {col.label}
                          <div className="relative group cursor-help">
                            <HelpCircle className="h-3 w-3 text-blue-200 opacity-70" />
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
                  {pagados.map(row => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="px-3 py-2 font-medium text-[#1a4a7a] text-xs">{row.ingreso}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.fecha_ingreso}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.fecha_egreso}</td>
                      <td className="px-3 py-2 text-xs font-mono font-medium">{row.cup}</td>
                      <td className="px-3 py-2 text-xs max-w-[200px] truncate" title={row.producto}>{row.producto}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{row.tipo_producto}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums">{formatearNumero(row.cantidad)}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums">{formatearPesos(row.valor_unitario)}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums font-medium">{formatearPesos(row.valor_total)}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.estado_venta === 'Facturada' ? 'bg-green-100 text-green-700' :
                          row.estado_venta === 'Activa'   ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{row.estado_venta}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{nombreMes(+row.mes)} {row.anio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Mostrando {(pagina-1)*POR_PAGINA+1}–{Math.min(pagina*POR_PAGINA, filtrado.length)} de {formatearNumero(filtrado.length)}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPagina(p => Math.max(1, p-1))} disabled={pagina===1}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  ← Anterior
                </button>
                <button onClick={() => setPagina(p => Math.min(totalPaginas, p+1))} disabled={pagina===totalPaginas}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Siguiente →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
