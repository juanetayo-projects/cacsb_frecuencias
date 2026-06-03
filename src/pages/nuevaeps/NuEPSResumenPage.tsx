import { useState, useMemo } from 'react'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { formatearNumero, formatearPesos, generarAnios, MESES } from '@/lib/calculations'
import { exportarExcel, exportarPDF } from '@/lib/exportar'
import {
  Download, RefreshCw, HelpCircle, Loader2, AlertCircle,
  TrendingUp, Users, Activity
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { cn } from '@/lib/utils'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface NepsRow {
  id: number
  ingreso: string
  identificacion: string
  municipio: string
  cup: string
  cantidad: number
  producto: string
  mes: number
  ano: number
  valor_unitario: number
  fecha_reporte: string
  hora_reporte: string
}

interface NepsNtRow {
  id: number
  cup: string
  agrupador: string
  subagrupador: string
}

interface FilaAgrupador {
  agrupador: string
  subagrupador: string
  eventos: number
  pacientes: number
  cantidad: number
  valor: number
  cups: number
}

const BASE    = '/cacsb_frecuencias'
const ANIOS   = generarAnios()
const COLORES = ['#1a4a7a','#2e6db4','#4178d3','#5b9bd5','#7eb8e8','#a8d1f5','#1e7a4e','#2d9c64']

// ── Componente ────────────────────────────────────────────────────────────────
export function NuEPSResumenPage() {
  const [filtroAnio,        setFiltroAnio]        = useState(0)
  const [filtroMes,         setFiltroMes]          = useState(0)
  const [filtroAgrupador,   setFiltroAgrupador]    = useState('')
  const [filtroSubagrupador,setFiltroSubagrupador] = useState('')
  const [vista,             setVista]              = useState<'tabla'|'grafico'>('tabla')

  // ── Datos desde Supabase ──────────────────────────────────────────────────
  const filtrosFrq: Record<string, unknown> = {}
  if (filtroAnio) filtrosFrq.ano = filtroAnio
  if (filtroMes)  filtrosFrq.mes = filtroMes

  const { data: frecuencias, loading: loadingFrq, error, refetch } =
    useSupabaseQuery<NepsRow>({ table: 'neps_frecuencias', filters: filtrosFrq })

  const { data: normativa, loading: loadingNt } =
    useSupabaseQuery<NepsNtRow>({ table: 'neps_nt' })

  // ── Mapa cup → normativa ──────────────────────────────────────────────────
  const mapaNt = useMemo(() => {
    const m = new Map<string, NepsNtRow>()
    normativa.forEach(n => m.set(n.cup, n))
    return m
  }, [normativa])

  // ── Agrupación por agrupador ──────────────────────────────────────────────
  const resumen = useMemo((): FilaAgrupador[] => {
    if (!frecuencias.length || !normativa.length) return []

    const grupos = new Map<string, {
      subagrupador: string
      eventos: Set<string>   // ingresos únicos
      pacientes: Set<string> // identificaciones únicas
      cantidad: number
      valor: number
      cups: Set<string>
    }>()

    frecuencias.forEach(f => {
      const nt = mapaNt.get(f.cup)
      if (!nt) return
      if (filtroAgrupador    && nt.agrupador    !== filtroAgrupador)    return
      if (filtroSubagrupador && nt.subagrupador !== filtroSubagrupador) return

      const prev = grupos.get(nt.agrupador) || {
        subagrupador: nt.subagrupador,
        eventos:      new Set<string>(),
        pacientes:    new Set<string>(),
        cantidad:     0,
        valor:        0,
        cups:         new Set<string>(),
      }
      prev.eventos.add(f.ingreso)
      prev.pacientes.add(f.identificacion)
      prev.cantidad += f.cantidad || 0
      prev.valor    += (f.cantidad || 0) * (f.valor_unitario || 0)
      prev.cups.add(f.cup)
      grupos.set(nt.agrupador, prev)
    })

    return [...grupos.entries()]
      .map(([agrupador, v]) => ({
        agrupador,
        subagrupador: v.subagrupador,
        eventos:      v.eventos.size,
        pacientes:    v.pacientes.size,
        cantidad:     v.cantidad,
        valor:        v.valor,
        cups:         v.cups.size,
      }))
      .sort((a, b) => b.eventos - a.eventos)
  }, [frecuencias, normativa, mapaNt, filtroAgrupador, filtroSubagrupador])

  // ── Métricas globales ─────────────────────────────────────────────────────
  const totales = useMemo(() => ({
    totalEventos:   new Set(frecuencias.map(f => f.ingreso)).size,
    totalPacientes: new Set(frecuencias.map(f => f.identificacion)).size,
    totalCantidad:  frecuencias.reduce((s,f) => s + (f.cantidad||0), 0),
    totalValor:     frecuencias.reduce((s,f) => s + (f.cantidad||0)*(f.valor_unitario||0), 0),
    fechaReporte:   frecuencias[0]?.fecha_reporte || '',
    horaReporte:    frecuencias[0]?.hora_reporte  || '',
  }), [frecuencias])

  const agrupadores    = useMemo(() => [...new Set(normativa.map(n => n.agrupador))].sort(),    [normativa])
  const subagrupadores = useMemo(() => [...new Set(normativa.map(n => n.subagrupador))].sort(), [normativa])

  const loading = loadingFrq || loadingNt

  // ── Exports ───────────────────────────────────────────────────────────────
  const handleExcel = () => exportarExcel(
    resumen.map(r => ({
      Agrupador: r.agrupador, Subagrupador: r.subagrupador,
      'Eventos (Ingresos)': r.eventos, 'Pacientes Únicos': r.pacientes,
      'Total Cantidad': r.cantidad, 'Valor Total': r.valor, 'CUPs': r.cups,
    })),
    'Nueva EPS — Resumen por Agrupador', 'neps_resumen_agrupador'
  )

  const handlePDF = () => exportarPDF(
    resumen.map(r => ({
      Agrupador: r.agrupador, Eventos: r.eventos,
      Pacientes: r.pacientes, Cantidad: r.cantidad,
      'Valor Total': formatearPesos(r.valor),
    })),
    'Nueva EPS — Resumen por Agrupador', 'neps_resumen_agrupador'
  )

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <img src={`${BASE}/images/logo_cacsb2.png`} alt="" className="h-9 w-9 object-contain"/>
          <div>
            <h1 className="text-xl font-bold text-[#1a4a7a]">Nueva EPS — Resumen por Agrupador</h1>
            <p className="text-xs text-gray-500">Contrato 231 — Agrupación por tipo de servicio</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {totales.fechaReporte && (
            <span className="text-xs bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5">
              <b className="text-gray-500">ETL:</b>{' '}
              <span className="font-semibold text-[#1a4a7a]">{totales.fechaReporte}</span>
              {totales.horaReporte && <span className="text-gray-500 ml-1">{totales.horaReporte}</span>}
            </span>
          )}
          {/* Toggle tabla / gráfico */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setVista('tabla')}
              className={cn('px-3 py-1.5 text-xs rounded-md transition-colors font-medium',
                vista === 'tabla' ? 'bg-white text-[#1a4a7a] shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              Tabla
            </button>
            <button onClick={() => setVista('grafico')}
              className={cn('px-3 py-1.5 text-xs rounded-md transition-colors font-medium',
                vista === 'grafico' ? 'bg-white text-[#1a4a7a] shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              Gráfico
            </button>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Eventos',    value: formatearNumero(totales.totalEventos),   icon: <Activity className="h-5 w-5"/>,  help: 'Ingresos únicos con frecuencias registradas en el período' },
          { label: 'Total Pacientes',  value: formatearNumero(totales.totalPacientes), icon: <Users className="h-5 w-5"/>,     help: 'Identificaciones únicas de pacientes atendidos' },
          { label: 'Total Cantidad',   value: formatearNumero(totales.totalCantidad),  icon: <TrendingUp className="h-5 w-5"/>,help: 'Suma de todas las unidades de procedimientos ejecutados' },
          { label: 'Valor Ejecutado',  value: formatearPesos(totales.totalValor),      icon: <TrendingUp className="h-5 w-5"/>,help: 'Valor total ejecutado (cantidad × valor unitario)' },
        ].map((m, i) => (
          <div key={i} className="card-odoo p-5 group relative">
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-help">
              <HelpCircle className="h-4 w-4 text-gray-300"/>
              <div className="absolute right-0 top-5 w-52 bg-gray-900 text-white text-xs rounded-lg p-2.5 z-50 hidden group-hover:block shadow-lg">
                {m.help}
              </div>
            </div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">{m.label}</p>
                <p className="text-2xl font-bold text-[#1a4a7a]">{m.value}</p>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-xl text-[#2e6db4]">{m.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card-odoo p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Agrupador</label>
            <select value={filtroAgrupador} onChange={e => setFiltroAgrupador(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
              <option value="">Todos</option>
              {agrupadores.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Subagrupador</label>
            <select value={filtroSubagrupador} onChange={e => setFiltroSubagrupador(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
              <option value="">Todos</option>
              {subagrupadores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Año</label>
            <select value={filtroAnio} onChange={e => setFiltroAnio(+e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
              <option value={0}>Todos</option>
              {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Mes</label>
            <select value={filtroMes} onChange={e => setFiltroMes(+e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
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

      {loading ? (
        <div className="card-odoo p-12 text-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2"/>
          <p>Cruzando neps_frecuencias con neps_nt...</p>
          <p className="text-xs mt-1 text-gray-300">Datos desde Supabase (ETL diario Azure SQL)</p>
        </div>
      ) : error ? (
        <div className="card-odoo p-8 text-center text-red-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2"/>
          <p className="font-medium">Error: {error}</p>
        </div>
      ) : resumen.length === 0 ? (
        <div className="card-odoo p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-semibold">Sin datos para el período seleccionado</p>
          <p className="text-sm mt-1">Ejecute el runner ETL de Nueva EPS y verifique que neps_nt tenga registros</p>
        </div>
      ) : vista === 'grafico' ? (
        /* ── Vista Gráfico ──────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Barras — Eventos por agrupador */}
          <div className="card-odoo p-5">
            <h3 className="font-semibold text-[#1a4a7a] text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4"/> Eventos por Agrupador
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={resumen.slice(0,8)} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff"/>
                <XAxis dataKey="agrupador" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0}/>
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatearNumero(v)}/>
                <Bar dataKey="eventos" name="Eventos" fill="#1a4a7a" radius={[3,3,0,0]}/>
                <Bar dataKey="pacientes" name="Pacientes" fill="#2e6db4" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie — Distribución de valor */}
          <div className="card-odoo p-5">
            <h3 className="font-semibold text-[#1a4a7a] text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4"/> Distribución de Valor
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={resumen.slice(0,8)}
                  dataKey="valor"
                  nameKey="agrupador"
                  cx="50%" cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name?.substring(0,15)} ${(percent*100).toFixed(0)}%`}
                  labelLine={true}
                  fontSize={9}
                >
                  {resumen.slice(0,8).map((_, i) => (
                    <Cell key={i} fill={COLORES[i % COLORES.length]}/>
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatearPesos(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        /* ── Vista Tabla ────────────────────────────────────────────────── */
        <div className="card-odoo overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-[#1a4a7a] text-sm uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="h-4 w-4"/> Ejecución por Agrupador
              <span className="text-xs font-normal text-gray-400 normal-case ml-1">
                ({resumen.length} agrupadores)
              </span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1a4a7a] text-white">
                  {[
                    { label: 'Agrupador',    help: 'Tipo de servicio médico según contrato NEPS' },
                    { label: 'Subagrupador', help: 'Subcategoría del agrupador' },
                    { label: 'Eventos',      help: 'Número de ingresos únicos con actividad' },
                    { label: 'Pacientes',    help: 'Identificaciones únicas de pacientes' },
                    { label: 'Cantidad',     help: 'Total de unidades de procedimientos' },
                    { label: 'Valor Total',  help: 'Valor ejecutado (cantidad × valor unitario)' },
                    { label: 'CUPs',         help: 'Número de procedimientos distintos' },
                  ].map(col => (
                    <th key={col.label} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                      <div className="flex items-center gap-1">
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
                {resumen.map((fila, i) => (
                  <tr key={i} className={cn('border-b border-gray-100 hover:bg-blue-50 transition-colors', i%2===1 && 'bg-[#f4f6f9]')}>
                    <td className="px-4 py-3 font-semibold text-[#1a4a7a]">{fila.agrupador}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fila.subagrupador}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{formatearNumero(fila.eventos)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(fila.pacientes)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(fila.cantidad)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#1a4a7a]">{formatearPesos(fila.valor)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500">{fila.cups}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-800 text-white font-semibold">
                  <td className="px-4 py-3" colSpan={2}>TOTAL ({resumen.length} agrupadores)</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(resumen.reduce((s,r)=>s+r.eventos,0))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(resumen.reduce((s,r)=>s+r.pacientes,0))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(resumen.reduce((s,r)=>s+r.cantidad,0))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatearPesos(resumen.reduce((s,r)=>s+r.valor,0))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(new Set(resumen.flatMap(()=>[])).size)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
