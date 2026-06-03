import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { Clock, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'

interface LogEntry {
  id: number
  runner: string
  fecha_inicio: string
  fecha_fin: string | null
  duracion_seg: number | null
  registros_insertados: number
  estado: 'OK' | 'ERROR' | 'RUNNING'
  mensaje_error: string | null
}

const RUNNERS = [
  { id: 'emssanar',    label: 'Emssanar',      tablas: 14 },
  { id: 'sura',        label: 'SURA',           tablas: 8  },
  { id: 'nuevaeps',    label: 'Nueva EPS',      tablas: 2  },
  { id: 'asmetsalud',  label: 'Asmet Salud',    tablas: 2  },
  { id: 'dispensario', label: 'Dispensario',    tablas: 1  },
]

export function CronjobPage() {
  const { data: logs, loading, error, refetch } = useSupabaseQuery<LogEntry>({
    table:   'log_cronjob',
    orderBy: { column: 'fecha_inicio', ascending: false },
    limit:   50,
  })

  const estadoBadge = (estado: string) => {
    if (estado === 'OK')      return <span className="badge-ok flex items-center gap-1"><CheckCircle className="h-3 w-3"/>OK</span>
    if (estado === 'ERROR')   return <span className="badge-error flex items-center gap-1"><XCircle className="h-3 w-3"/>ERROR</span>
    return <span className="badge-run flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/>RUNNING</span>
  }

  const fmtFecha = (f: string | null) =>
    f ? new Date(f).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—'

  const fmtDur = (s: number | null) => s ? `${s.toFixed(1)}s` : '—'

  // Última ejecución por runner
  const ultimaEjecucion = RUNNERS.map(r => ({
    ...r,
    ultimo: logs.find(l => l.runner === r.id),
  }))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a4a7a] flex items-center gap-2">
            <Clock className="h-5 w-5" /> Control ETL — CronJob
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Historial de ejecuciones — Actualización diaria 00:00 AM</p>
        </div>
        <button onClick={refetch} className="btn-cacsb flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {/* Cards de estado por runner */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {ultimaEjecucion.map(r => (
          <div key={r.id} className="card-odoo p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{r.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{r.tablas} tablas</p>
            {r.ultimo ? (
              <div className="mt-2 space-y-1">
                {estadoBadge(r.ultimo.estado)}
                <p className="text-xs text-gray-500">{fmtFecha(r.ultimo.fecha_inicio)}</p>
                <p className="text-xs font-medium text-[#1a4a7a]">{r.ultimo.registros_insertados.toLocaleString()} registros</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-2">Sin ejecuciones</p>
            )}
          </div>
        ))}
      </div>

      {/* Tabla de historial */}
      <div className="card-odoo overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-[#1a4a7a] text-sm uppercase tracking-wide">
            Historial de Ejecuciones
          </h3>
          <span className="text-xs text-gray-400">{logs.length} registros</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Cargando historial...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Error al cargar datos</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Clock className="h-8 w-8 mx-auto mb-2" />
            <p>No hay ejecuciones registradas</p>
            <p className="text-sm mt-1">Los runners ETL aún no han sido ejecutados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-striped">
              <thead>
                <tr className="bg-[#1a4a7a] text-white">
                  {['Runner','Inicio','Fin','Duración','Registros','Estado','Error'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#1a4a7a] capitalize">{log.runner}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtFecha(log.fecha_inicio)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtFecha(log.fecha_fin)}</td>
                    <td className="px-4 py-3 text-xs tabular-nums">{fmtDur(log.duracion_seg)}</td>
                    <td className="px-4 py-3 text-xs tabular-nums font-medium">{log.registros_insertados.toLocaleString()}</td>
                    <td className="px-4 py-3">{estadoBadge(log.estado)}</td>
                    <td className="px-4 py-3 text-xs text-red-500 max-w-xs truncate">{log.mensaje_error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
