import { useMemo } from 'react'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { formatearNumero, generarAnios } from '@/lib/calculations'
import { exportarExcel } from '@/lib/exportar'
import { Download, RefreshCw, BarChart3, HelpCircle, Loader2, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

const CONFIG: Record<string, { titulo: string; tabla: string; subtitulo: string }> = {
  'emssanar-alta-sub':  { titulo: 'Emssanar Alta — Sub',   tabla: 'emssanar_ventas_alta_sub',   subtitulo: 'Alta Complejidad Subsidiado'    },
  'emssanar-alta-cont': { titulo: 'Emssanar Alta — Cont',  tabla: 'emssanar_ventas_alta_cont',  subtitulo: 'Alta Complejidad Contributivo'  },
  'emssanar-media-sub': { titulo: 'Emssanar Media — Sub',  tabla: 'emssanar_ventas_media_sub',  subtitulo: 'Mediana Complejidad Subsidiado' },
  'emssanar-media-cont':{ titulo: 'Emssanar Media — Cont', tabla: 'emssanar_ventas_media_cont', subtitulo: 'Mediana Complejidad Contributivo'},
}

interface VentasRow {
  id: number
  Facturada: number
  Pendiente: number
  Eliminada: number
  EstadoCuenta: number
  mes: string
}

const BASE  = '/cacsb_frecuencias'
const ORDEN_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface Props { aseguradora: keyof typeof CONFIG }

export function VentasPage({ aseguradora }: Props) {
  const cfg = CONFIG[aseguradora] || CONFIG['emssanar-alta-sub']

  const { data, loading, error, refetch } = useSupabaseQuery<VentasRow>({ table: cfg.tabla })

  const dataSorted = useMemo(() =>
    [...data].sort((a, b) => ORDEN_MESES.indexOf(a.mes) - ORDEN_MESES.indexOf(b.mes)),
  [data])

  const totales = useMemo(() => ({
    Facturada:    data.reduce((s,r) => s + (r.Facturada    || 0), 0),
    Pendiente:    data.reduce((s,r) => s + (r.Pendiente    || 0), 0),
    Eliminada:    data.reduce((s,r) => s + (r.Eliminada    || 0), 0),
    EstadoCuenta: data.reduce((s,r) => s + (r.EstadoCuenta || 0), 0),
  }), [data])

  const handleExcel = () => exportarExcel(
    dataSorted.map(r => ({
      Mes: r.mes, Facturada: r.Facturada, Pendiente: r.Pendiente,
      Eliminada: r.Eliminada, 'Estado Cuenta': r.EstadoCuenta,
      Total: (r.Facturada||0)+(r.Pendiente||0)+(r.EstadoCuenta||0),
    })),
    cfg.titulo + ' — Ventas', cfg.tabla
  )

  const COLS = [
    { key: 'Facturada',    color: '#1a4a7a', help: 'Ventas con estado Facturada' },
    { key: 'Pendiente',    color: '#f59e0b', help: 'Ventas pendientes de procesar' },
    { key: 'EstadoCuenta', color: '#2e6db4', help: 'Ventas en estado de cuenta' },
    { key: 'Eliminada',    color: '#ef4444', help: 'Ventas eliminadas' },
  ]

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <img src={`${BASE}/images/logo_cacsb2.png`} alt="" className="h-9 w-9 object-contain"/>
          <div>
            <h1 className="text-xl font-bold text-[#1a4a7a] flex items-center gap-2">
              <BarChart3 className="h-5 w-5"/> {cfg.subtitulo}
            </h1>
            <p className="text-xs text-gray-500">Resumen de Ventas por Estado y Mes — Emssanar</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={refetch} className="btn-cacsb flex items-center gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5"/> Actualizar
          </button>
          <button onClick={handleExcel} className="btn-cacsb flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-800">
            <Download className="h-3.5 w-3.5"/> Excel
          </button>
        </div>
      </div>

      {/* KPIs totales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {COLS.map(col => (
          <div key={col.key} className="card-odoo p-5 group relative">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-help">
              <HelpCircle className="h-3.5 w-3.5 text-gray-300"/>
              <div className="absolute right-0 top-4 w-40 bg-gray-900 text-white text-xs rounded-lg p-2 z-50 hidden group-hover:block shadow-lg">
                {col.help}
              </div>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">{col.key}</p>
            <p className="text-2xl font-bold" style={{ color: col.color }}>
              {formatearNumero(totales[col.key as keyof typeof totales])}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card-odoo p-12 text-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2"/>
          <p>Cargando datos de ventas...</p>
        </div>
      ) : error ? (
        <div className="card-odoo p-8 text-center text-red-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2"/>
          <p className="font-medium">Error: {error}</p>
        </div>
      ) : dataSorted.length === 0 ? (
        <div className="card-odoo p-12 text-center text-gray-400">
          <BarChart3 className="h-8 w-8 mx-auto mb-2"/>
          <p>Sin datos de ventas — ejecute el runner ETL</p>
        </div>
      ) : (
        <>
          {/* Gráfico de barras */}
          <div className="card-odoo p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#1a4a7a] text-sm uppercase tracking-wide flex items-center gap-2">
                <BarChart3 className="h-4 w-4"/> Ventas por Mes y Estado
              </h3>
              <div className="relative group cursor-help">
                <HelpCircle className="h-4 w-4 text-gray-300"/>
                <div className="absolute right-0 top-5 w-52 bg-gray-900 text-white text-xs rounded-lg p-2.5 z-50 hidden group-hover:block shadow-lg">
                  Distribución mensual de ventas por estado. Permite identificar tendencias y meses con mayor actividad.
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataSorted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff"/>
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickLine={false}/>
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}/>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(val: number) => formatearNumero(val)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }}/>
                <Bar dataKey="Facturada"    fill="#1a4a7a" radius={[3,3,0,0]}/>
                <Bar dataKey="EstadoCuenta" fill="#2e6db4" radius={[3,3,0,0]}/>
                <Bar dataKey="Pendiente"    fill="#f59e0b" radius={[3,3,0,0]}/>
                <Bar dataKey="Eliminada"    fill="#ef4444" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla detallada */}
          <div className="card-odoo overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-[#1a4a7a] text-sm uppercase tracking-wide">Detalle por Mes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1a4a7a] text-white">
                    {['Mes','Facturada','Pendiente','Estado Cuenta','Eliminada','Total'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataSorted.map((row, i) => {
                    const total = (row.Facturada||0)+(row.Pendiente||0)+(row.EstadoCuenta||0)
                    return (
                      <tr key={row.id} className={cn('border-b border-gray-100 hover:bg-blue-50 transition-colors', i%2===1 && 'bg-[#f4f6f9]')}>
                        <td className="px-4 py-3 font-semibold text-[#1a4a7a]">{row.mes}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-[#1a4a7a]">{formatearNumero(row.Facturada||0)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-amber-600">{formatearNumero(row.Pendiente||0)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-blue-600">{formatearNumero(row.EstadoCuenta||0)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-500">{formatearNumero(row.Eliminada||0)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold">{formatearNumero(total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-800 text-white font-semibold">
                    <td className="px-4 py-3">TOTAL</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(totales.Facturada)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(totales.Pendiente)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(totales.EstadoCuenta)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(totales.Eliminada)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatearNumero(totales.Facturada+totales.Pendiente+totales.EstadoCuenta)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
