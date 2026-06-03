import { useState, useMemo } from 'react'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { formatearPesos, formatearNumero, generarAnios } from '@/lib/calculations'
import { exportarExcel, exportarPDF } from '@/lib/exportar'
import { Download, RefreshCw, HelpCircle, Loader2, AlertCircle, TrendingUp, Users, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cn } from '@/lib/utils'

interface AsmetRow {
  id: number
  ingreso: string
  no_identificacion: string
  cup: string
  plan: string
  producto: string
  cantidad: number
  mes_anio_venta: string
  fecha_reporte: string
}

interface AsmetNtRow {
  id: number
  cup: string
  costo_unitario: number
  agrupador: string
  subagrupador: string
}

interface FilaResumen {
  plan: string
  mesAnio: string
  eventosEjecutados: number
  cantidadPacientes: number
  cantidadIngresos: number
  valorEjecutado: number
}

const BASE  = '/cacsb_frecuencias'
const ANIOS = generarAnios()
const POR_PAG = 25

export function AsmetPage() {
  const [vista,        setVista]        = useState<'resumen'|'detalle'>('resumen')
  const [filtroPlan,   setFiltroPlan]   = useState('')
  const [filtroMes,    setFiltroMes]    = useState('')
  const [filtroCup,    setFiltroCup]    = useState('')
  const [pagina,       setPagina]       = useState(1)

  // Datos desde Supabase
  const { data: frecuencias, loading: loadingFrq, error, refetch } =
    useSupabaseQuery<AsmetRow>({ table: 'asmet_salud_frecuencias' })

  const { data: normativa, loading: loadingNt } =
    useSupabaseQuery<AsmetNtRow>({ table: 'asmet_salud_nt' })

  const mapaNt = useMemo(() => {
    const m = new Map<string, AsmetNtRow>()
    normativa.forEach(n => m.set(n.cup, n))
    return m
  }, [normativa])

  // Resumen por plan + mes_anio_venta (igual que Data Studio)
  const resumenPlan = useMemo((): FilaResumen[] => {
    if (!frecuencias.length) return []

    const grupos = new Map<string, {
      pacientes: Set<string>
      ingresos:  Set<string>
      cantidad:  number
      valor:     number
    }>()

    frecuencias.forEach(f => {
      if (filtroPlan && f.plan !== filtroPlan) return
      if (filtroMes  && f.mes_anio_venta !== filtroMes) return
      if (filtroCup  && !f.cup?.toLowerCase().includes(filtroCup.toLowerCase()) &&
          !f.producto?.toLowerCase().includes(filtroCup.toLowerCase())) return

      const nt    = mapaNt.get(f.cup)
      const costo = nt?.costo_unitario || 0
      const key   = `${f.plan}||${f.mes_anio_venta}`
      const prev  = grupos.get(key) || { pacientes: new Set(), ingresos: new Set(), cantidad: 0, valor: 0 }

      prev.pacientes.add(f.no_identificacion)
      prev.ingresos.add(f.ingreso)
      prev.cantidad += f.cantidad || 0
      prev.valor    += (f.cantidad || 0) * costo
      grupos.set(key, prev)
    })

    return [...grupos.entries()].map(([key, v]) => {
      const [plan, mesAnio] = key.split('||')
      return {
        plan, mesAnio,
        eventosEjecutados: v.ingresos.size,
        cantidadPacientes: v.pacientes.size,
        cantidadIngresos:  v.ingresos.size,
        valorEjecutado:    v.valor,
      }
    }).sort((a, b) => a.mesAnio.localeCompare(b.mesAnio) || a.plan.localeCompare(b.plan))
  }, [frecuencias, mapaNt, filtroPlan, filtroMes, filtroCup])

  // Detalle filtrado
  const detalleFiltrado = useMemo(() => {
    let rows = frecuencias
    if (filtroPlan) rows = rows.filter(r => r.plan === filtroPlan)
    if (filtroMes)  rows = rows.filter(r => r.mes_anio_venta === filtroMes)
    if (filtroCup)  rows = rows.filter(r =>
      r.cup?.toLowerCase().includes(filtroCup.toLowerCase()) ||
      r.producto?.toLowerCase().includes(filtroCup.toLowerCase()))
    return rows
  }, [frecuencias, filtroPlan, filtroMes, filtroCup])

  const totalPags = Math.ceil(detalleFiltrado.length / POR_PAG)
  const paginados = detalleFiltrado.slice((pagina-1)*POR_PAG, pagina*POR_PAG)

  // KPIs globales
  const metrics = useMemo(() => ({
    eventos:   new Set(frecuencias.map(r => r.ingreso)).size,
    pacientes: new Set(frecuencias.map(r => r.no_identificacion)).size,
    planes:    new Set(frecuencias.map(r => r.plan).filter(Boolean)).size,
    valor:     frecuencias.reduce((s,r) => {
      const nt = mapaNt.get(r.cup)
      return s + (r.cantidad||0) * (nt?.costo_unitario||0)
    }, 0),
    fechaReporte: frecuencias[0]?.fecha_reporte || '',
  }), [frecuencias, mapaNt])

  // Datos para gráfico por mes
  const datosMes = useMemo(() => {
    const m = new Map<string, { cantidad: number; valor: number }>()
    resumenPlan.forEach(r => {
      const prev = m.get(r.mesAnio) || { cantidad: 0, valor: 0 }
      m.set(r.mesAnio, { cantidad: prev.cantidad + r.cantidadIngresos, valor: prev.valor + r.valorEjecutado })
    })
    return [...m.entries()].map(([mes, v]) => ({ mes, ...v })).sort((a,b) => a.mes.localeCompare(b.mes))
  }, [resumenPlan])

  const planes  = useMemo(() => [...new Set(frecuencias.map(r => r.plan).filter(Boolean))].sort(), [frecuencias])
  const meses   = useMemo(() => [...new Set(frecuencias.map(r => r.mes_anio_venta).filter(Boolean))].sort(), [frecuencias])
  const loading = loadingFrq || loadingNt

  const handleExcel = () => exportarExcel(
    vista === 'resumen'
      ? resumenPlan.map(r => ({
          Plan: r.plan, 'Mes/Año': r.mesAnio,
          'Eventos Ejecutados': r.eventosEjecutados,
          'Pacientes': r.cantidadPacientes,
          'Valor Ejecutado': r.valorEjecutado,
        }))
      : detalleFiltrado.map(r => ({
          Ingreso: r.ingreso, Identificacion: r.no_identificacion,
          Plan: r.plan, CUP: r.cup, Producto: r.producto,
          Cantidad: r.cantidad, 'Mes/Año': r.mes_anio_venta,
        })),
    'Asmet Salud', 'asmet_salud'
  )
  const handlePDF = () => exportarPDF(
    resumenPlan.map(r => ({
      Plan: r.plan, 'Mes/Año': r.mesAnio,
      Eventos: r.eventosEjecutados, Pacientes: r.cantidadPacientes,
      'Valor': formatearPesos(r.valorEjecutado),
    })),
    'Asmet Salud — Resumen', 'asmet_salud'
  )

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <img src={`${BASE}/images/logo_cacsb2.png`} alt="" className="h-9 w-9 object-contain"/>
          <div>
            <h1 className="text-xl font-bold text-[#1a4a7a]">Asmet Salud — Frecuencias</h1>
            <p className="text-xs text-gray-500">Contrato 59 · Planes 659 y 660</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {metrics.fechaReporte && (
            <span className="text-xs bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5">
              <b className="text-gray-500">ETL:</b>{' '}
              <span className="font-semibold text-[#1a4a7a]">{metrics.fechaReporte}</span>
            </span>
          )}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['resumen','detalle'] as const).map(v => (
              <button key={v} onClick={() => setVista(v)}
                className={cn('px-3 py-1.5 text-xs rounded-md transition-colors font-medium capitalize',
                  vista === v ? 'bg-white text-[#1a4a7a] shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {v}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Eventos',   value: formatearNumero(metrics.eventos),   icon: <Activity className="h-5 w-5"/>,  help: 'Ingresos únicos registrados en Asmet Salud' },
          { label: 'Pacientes',       value: formatearNumero(metrics.pacientes), icon: <Users className="h-5 w-5"/>,     help: 'Identificaciones únicas atendidas' },
          { label: 'Planes activos',  value: formatearNumero(metrics.planes),    icon: <TrendingUp className="h-5 w-5"/>,help: 'Planes del contrato con actividad' },
          { label: 'Valor Ejecutado', value: formatearPesos(metrics.valor),      icon: <TrendingUp className="h-5 w-5"/>,help: 'Valor total calculado con costo_unitario de asmet_salud_nt' },
        ].map((m,i) => (
          <div key={i} className="card-odoo p-5 group relative">
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-help">
              <HelpCircle className="h-4 w-4 text-gray-300"/>
              <div className="absolute right-0 top-5 w-48 bg-gray-900 text-white text-xs rounded-lg p-2.5 z-50 hidden group-hover:block shadow-lg">{m.help}</div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Plan</label>
            <select value={filtroPlan} onChange={e => { setFiltroPlan(e.target.value); setPagina(1) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
              <option value="">Todos</option>
              {planes.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Mes/Año</label>
            <select value={filtroMes} onChange={e => { setFiltroMes(e.target.value); setPagina(1) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
              <option value="">Todos</option>
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">CUP / Producto</label>
            <input value={filtroCup} onChange={e => { setFiltroCup(e.target.value); setPagina(1) }}
              placeholder="Buscar..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300"/>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFiltroPlan(''); setFiltroMes(''); setFiltroCup(''); setPagina(1) }}
              className="w-full border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-3 py-2 text-sm transition-colors">
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card-odoo p-12 text-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2"/>
          <p>Cargando Asmet Salud desde Supabase...</p>
        </div>
      ) : error ? (
        <div className="card-odoo p-8 text-center text-red-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2"/><p>{error}</p>
        </div>
      ) : vista === 'resumen' ? (
        <>
          {/* Gráfico por mes */}
          {datosMes.length > 0 && (
            <div className="card-odoo p-5">
              <h3 className="font-semibold text-[#1a4a7a] text-sm uppercase tracking-wide mb-4">Evolución Mensual</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={datosMes} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff"/>
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickLine={false}/>
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}/>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v:number) => formatearNumero(v)}/>
                  <Legend wrapperStyle={{ fontSize: 12 }}/>
                  <Bar dataKey="cantidad" name="Eventos" fill="#1a4a7a" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Tabla resumen por plan */}
          <div className="card-odoo overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-[#1a4a7a] text-sm uppercase tracking-wide">
                Ejecución por Plan y Mes
                <span className="text-xs font-normal text-gray-400 ml-2 normal-case">({resumenPlan.length} registros)</span>
              </h3>
            </div>
            {resumenPlan.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-3xl mb-2">📋</p>
                <p>Sin datos — ejecute el runner ETL de Asmet Salud</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#1a4a7a] text-white">
                      {[
                        { label: 'Plan',               help: 'Plan del contrato Asmet Salud (659 o 660)' },
                        { label: 'Mes/Año',            help: 'Período de la venta en formato MM/AAAA' },
                        { label: 'Eventos Ejecutados', help: 'Número de ingresos con actividad registrada' },
                        { label: 'Pacientes',          help: 'Identificaciones únicas de pacientes' },
                        { label: 'Valor Ejecutado',    help: 'SUM(cantidad × costo_unitario) de asmet_salud_nt' },
                      ].map(col => (
                        <th key={col.label} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {col.label}
                            <div className="relative group cursor-help">
                              <HelpCircle className="h-3 w-3 text-blue-200 opacity-70"/>
                              <div className="absolute left-0 top-4 w-44 bg-gray-900 text-white text-xs rounded-lg p-2 z-50 hidden group-hover:block shadow-lg font-normal normal-case tracking-normal">{col.help}</div>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resumenPlan.map((r, i) => (
                      <tr key={i} className={cn('border-b border-gray-100 hover:bg-blue-50 transition-colors', i%2===1 && 'bg-[#f4f6f9]')}>
                        <td className="px-4 py-3 font-semibold text-[#1a4a7a] text-sm">{r.plan}</td>
                        <td className="px-4 py-3 text-sm font-medium">{r.mesAnio}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{formatearNumero(r.eventosEjecutados)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(r.cantidadPacientes)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#1a4a7a]">{formatearPesos(r.valorEjecutado)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-800 text-white font-semibold">
                      <td className="px-4 py-3" colSpan={2}>TOTAL</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(resumenPlan.reduce((s,r)=>s+r.eventosEjecutados,0))}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatearNumero(resumenPlan.reduce((s,r)=>s+r.cantidadPacientes,0))}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatearPesos(resumenPlan.reduce((s,r)=>s+r.valorEjecutado,0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── Detalle ─────────────────────────────────────────────────────── */
        <div className="card-odoo overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-[#1a4a7a] text-sm uppercase tracking-wide">
              Detalle por CUP
              <span className="text-xs font-normal text-gray-400 ml-2 normal-case">({formatearNumero(detalleFiltrado.length)} registros)</span>
            </h3>
            <span className="text-xs text-gray-400">Pág {pagina}/{totalPags||1}</span>
          </div>
          {detalleFiltrado.length === 0 ? (
            <div className="p-12 text-center text-gray-400"><p>Sin datos para los filtros aplicados</p></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#1a4a7a] text-white">
                      {['Ingreso','Identificación','Plan','CUP','Producto','Cantidad','Mes/Año'].map(h => (
                        <th key={h} className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginados.map((r, i) => (
                      <tr key={r.id} className={cn('border-b border-gray-100 hover:bg-blue-50 transition-colors', i%2===1 && 'bg-[#f4f6f9]')}>
                        <td className="px-3 py-2.5 font-medium text-[#1a4a7a] text-xs">{r.ingreso}</td>
                        <td className="px-3 py-2.5 text-xs font-mono">{r.no_identificacion}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-600">{r.plan}</td>
                        <td className="px-3 py-2.5 text-xs font-mono font-semibold">{r.cup}</td>
                        <td className="px-3 py-2.5 text-xs max-w-[160px] truncate" title={r.producto}>{r.producto}</td>
                        <td className="px-3 py-2.5 text-xs text-right tabular-nums font-medium">{formatearNumero(r.cantidad||0)}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{r.mes_anio_venta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                <p className="text-xs text-gray-500">{(pagina-1)*POR_PAG+1}–{Math.min(pagina*POR_PAG,detalleFiltrado.length)} de {formatearNumero(detalleFiltrado.length)}</p>
                <div className="flex gap-1">
                  <button onClick={() => setPagina(p=>Math.max(1,p-1))} disabled={pagina===1} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">← Ant</button>
                  <span className="px-3 py-1.5 text-xs bg-[#1a4a7a] text-white rounded-lg">{pagina}</span>
                  <button onClick={() => setPagina(p=>Math.min(totalPags,p+1))} disabled={pagina===totalPags} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">Sig →</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
