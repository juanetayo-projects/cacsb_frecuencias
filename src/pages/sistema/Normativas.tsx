import { useState, useMemo } from 'react'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { supabase } from '@/lib/supabase'
import { formatearPesos, formatearNumero } from '@/lib/calculations'
import { exportarExcel } from '@/lib/exportar'
import { FileText, Plus, Pencil, Trash2, Check, X, Loader2, Download, Upload, HelpCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

const TABLAS_NT = [
  { id: 'emssanar_nt_alta_cont',  label: 'Emssanar Alta Contributivo',   tieneEventos: true  },
  { id: 'emssanar_nt_alta_sub',   label: 'Emssanar Alta Subsidiado',     tieneEventos: true  },
  { id: 'emssanar_nt_media_cont', label: 'Emssanar Mediana Contributivo',tieneEventos: true  },
  { id: 'emssanar_nt_media_sub',  label: 'Emssanar Mediana Subsidiado',  tieneEventos: true  },
  { id: 'neps_nt',                label: 'Nueva EPS',                    tieneEventos: false },
  { id: 'asmet_salud_nt',         label: 'Asmet Salud',                  tieneEventos: false },
]

interface NtRow {
  id: number; cup: string; costo_unitario?: number; agrupador: string;
  subagrupador: string; evento_mes_subagrupador?: number;
}
type FormRow = Omit<NtRow,'id'>
const VACIO: FormRow = { cup:'', costo_unitario:0, agrupador:'', subagrupador:'', evento_mes_subagrupador:0 }

export function NormativasPage() {
  const [tablaActiva, setTablaActiva] = useState(TABLAS_NT[0].id)
  const [editando,    setEditando]    = useState<number|null>(null)
  const [creando,     setCreando]     = useState(false)
  const [guardando,   setGuardando]   = useState(false)
  const [form,        setForm]        = useState<FormRow>(VACIO)
  const [busqueda,    setBusqueda]    = useState('')
  const tablaCfg = TABLAS_NT.find(t => t.id === tablaActiva)!

  const { data, loading, error, refetch } = useSupabaseQuery<NtRow>({
    table: tablaActiva, orderBy: { column: 'agrupador', ascending: true }
  })

  const filtrado = useMemo(() =>
    busqueda ? data.filter(r =>
      r.cup?.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.agrupador?.toLowerCase().includes(busqueda.toLowerCase()))
    : data, [data, busqueda])

  const agrupadores = useMemo(() => new Set(data.map(r => r.agrupador)), [data])

  const guardarEdicion = async (id: number) => {
    setGuardando(true)
    const p: Partial<NtRow> = { cup: form.cup, agrupador: form.agrupador, subagrupador: form.subagrupador }
    if (tablaCfg.tieneEventos) { p.costo_unitario = form.costo_unitario; p.evento_mes_subagrupador = form.evento_mes_subagrupador }
    const { error } = await supabase.from(tablaActiva).update(p).eq('id', id)
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Actualizado'); setEditando(null); refetch()
  }

  const crear = async () => {
    if (!form.cup || !form.agrupador) { toast.error('CUP y Agrupador requeridos'); return }
    setGuardando(true)
    const p: Partial<NtRow> = { cup: form.cup.toUpperCase().trim(), agrupador: form.agrupador, subagrupador: form.subagrupador }
    if (tablaCfg.tieneEventos) { p.costo_unitario = form.costo_unitario||0; p.evento_mes_subagrupador = form.evento_mes_subagrupador||0 }
    const { error } = await supabase.from(tablaActiva).insert(p)
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('CUP creado'); setCreando(false); setForm(VACIO); refetch()
  }

  const eliminar = async (id: number, cup: string) => {
    if (!confirm(`Eliminar CUP "${cup}"?`)) return
    const { error } = await supabase.from(tablaActiva).delete().eq('id', id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Eliminado'); refetch()
  }

  const importarExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' })
      const rows = XLSX.utils.sheet_to_json<Record<string,unknown>>(wb.Sheets[wb.SheetNames[0]])
      if (!rows.length) { toast.error('Archivo vacio'); return }
      const registros = rows.map(r => ({
        cup: String(r['cup']||r['CUP']||'').toUpperCase().trim(),
        agrupador: String(r['agrupador']||r['Agrupador']||''),
        subagrupador: String(r['subagrupador']||r['Subagrupador']||''),
        costo_unitario: Number(r['costo_unitario']||0),
        evento_mes_subagrupador: Number(r['evento_mes_subagrupador']||0),
      })).filter(r => r.cup)
      const { error } = await supabase.from(tablaActiva).upsert(registros, { onConflict: 'cup' })
      if (error) { toast.error('Error: ' + error.message); return }
      toast.success(`${registros.length} registros importados`); refetch()
    }
    reader.readAsBinaryString(file); e.target.value = ''
  }

  const exportar = () => exportarExcel(
    data.map(r => ({ cup:r.cup, agrupador:r.agrupador, subagrupador:r.subagrupador,
      costo_unitario:r.costo_unitario||'', evento_mes_subagrupador:r.evento_mes_subagrupador||'' })),
    `Normativa ${tablaCfg.label}`, tablaActiva)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl"><FileText className="h-6 w-6 text-[#1a4a7a]"/></div>
          <div>
            <h1 className="text-xl font-bold text-[#1a4a7a]">Gestion de Normativas</h1>
            <p className="text-xs text-gray-500">Valores contractuales por CUP</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <label className="btn-cacsb flex items-center gap-1.5 text-xs cursor-pointer bg-purple-700 hover:bg-purple-800">
            <Upload className="h-3.5 w-3.5"/> Importar Excel
            <input type="file" accept=".xlsx,.xls" onChange={importarExcel} className="hidden"/>
          </label>
          <button onClick={exportar} className="btn-cacsb flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-800">
            <Download className="h-3.5 w-3.5"/> Exportar
          </button>
          <button onClick={() => { setCreando(true); setForm(VACIO) }} className="btn-cacsb flex items-center gap-1.5">
            <Plus className="h-4 w-4"/> Nuevo CUP
          </button>
        </div>
      </div>

      <div className="card-odoo p-4">
        <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Aseguradora / Normativa</p>
        <div className="flex flex-wrap gap-2">
          {TABLAS_NT.map(t => (
            <button key={t.id} onClick={() => { setTablaActiva(t.id); setEditando(null); setCreando(false); setBusqueda('') }}
              className={cn('px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors',
                tablaActiva===t.id?'bg-[#1a4a7a] text-white border-[#1a4a7a]':'bg-white text-gray-600 border-gray-200 hover:border-[#1a4a7a] hover:text-[#1a4a7a]')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Total CUPs',     value: formatearNumero(data.length)    },
          { label:'Agrupadores',    value: formatearNumero(agrupadores.size)},
          { label:'Valor Promedio', value: tablaCfg.tieneEventos ? formatearPesos(data.reduce((s,r)=>s+(r.costo_unitario||0),0)/Math.max(data.length,1)) : 'N/A' },
        ].map((m,i)=>(
          <div key={i} className="card-odoo p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">{m.label}</p>
            <p className="text-xl font-bold text-[#1a4a7a]">{m.value}</p>
          </div>
        ))}
      </div>

      {creando && (
        <div className="card-odoo p-5 border-l-4 border-green-500">
          <h3 className="font-semibold text-[#1a4a7a] mb-4">Nuevo CUP</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input value={form.cup} onChange={e=>setForm(f=>({...f,cup:e.target.value.toUpperCase()}))}
              placeholder="CUP *" className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:ring-2 focus:ring-blue-300"/>
            <input value={form.agrupador} onChange={e=>setForm(f=>({...f,agrupador:e.target.value}))}
              placeholder="Agrupador *" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300"/>
            <input value={form.subagrupador} onChange={e=>setForm(f=>({...f,subagrupador:e.target.value}))}
              placeholder="Subagrupador" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300"/>
            {tablaCfg.tieneEventos && (
              <>
                <input type="number" value={form.costo_unitario||''} onChange={e=>setForm(f=>({...f,costo_unitario:+e.target.value}))}
                  placeholder="Costo Unitario" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300"/>
                <input type="number" value={form.evento_mes_subagrupador||''} onChange={e=>setForm(f=>({...f,evento_mes_subagrupador:+e.target.value}))}
                  placeholder="Eventos/Mes" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300"/>
              </>
            )}
            <div className="flex gap-2">
              <button onClick={crear} disabled={guardando} className="flex-1 btn-cacsb flex items-center justify-center gap-1.5 disabled:opacity-60">
                {guardando?<Loader2 className="h-4 w-4 animate-spin"/>:<Check className="h-4 w-4"/>} Guardar
              </button>
              <button onClick={()=>setCreando(false)} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                <X className="h-4 w-4 text-gray-500"/>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar CUP o agrupador..."
          className="max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300"/>
        <span className="text-xs text-gray-400">{filtrado.length} registros</span>
      </div>

      <div className="card-odoo overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-[#1a4a7a] text-sm uppercase tracking-wide">{tablaCfg.label}</h3>
        </div>
        {loading ? (
          <div className="p-12 text-center text-gray-400"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2"/><p>Cargando...</p></div>
        ) : error ? (
          <div className="p-8 text-center text-red-500"><AlertCircle className="h-8 w-8 mx-auto mb-2"/><p>{error}</p></div>
        ) : filtrado.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FileText className="h-8 w-8 mx-auto mb-2"/>
            <p>Sin registros — cree CUPs o importe desde Excel</p>
            <code className="text-xs bg-gray-100 px-3 py-1 rounded mt-2 block">
              cup | agrupador | subagrupador{tablaCfg.tieneEventos?' | costo_unitario | evento_mes_subagrupador':''}
            </code>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1a4a7a] text-white">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase">CUP</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase">Agrupador</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase">Subagrupador</th>
                  {tablaCfg.tieneEventos && (
                    <>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase whitespace-nowrap">Costo Unitario</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase whitespace-nowrap">Eventos/Mes</th>
                    </>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrado.map((row, i) => (
                  <tr key={row.id} className={cn('border-b border-gray-100 hover:bg-blue-50 transition-colors', i%2===1&&'bg-[#f4f6f9]')}>
                    {editando===row.id ? (
                      <>
                        <td className="px-3 py-2"><input value={form.cup} onChange={e=>setForm(f=>({...f,cup:e.target.value.toUpperCase()}))} className="w-24 border border-blue-300 rounded px-2 py-1 text-xs font-mono"/></td>
                        <td className="px-3 py-2"><input value={form.agrupador} onChange={e=>setForm(f=>({...f,agrupador:e.target.value}))} className="w-full border border-blue-300 rounded px-2 py-1 text-xs"/></td>
                        <td className="px-3 py-2"><input value={form.subagrupador} onChange={e=>setForm(f=>({...f,subagrupador:e.target.value}))} className="w-full border border-blue-300 rounded px-2 py-1 text-xs"/></td>
                        {tablaCfg.tieneEventos && (
                          <>
                            <td className="px-3 py-2"><input type="number" value={form.costo_unitario||''} onChange={e=>setForm(f=>({...f,costo_unitario:+e.target.value}))} className="w-28 border border-blue-300 rounded px-2 py-1 text-xs text-right"/></td>
                            <td className="px-3 py-2"><input type="number" value={form.evento_mes_subagrupador||''} onChange={e=>setForm(f=>({...f,evento_mes_subagrupador:+e.target.value}))} className="w-24 border border-blue-300 rounded px-2 py-1 text-xs text-right"/></td>
                          </>
                        )}
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button onClick={()=>guardarEdicion(row.id)} disabled={guardando} className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60">
                              {guardando?<Loader2 className="h-3 w-3 animate-spin"/>:<Check className="h-3 w-3"/>}
                            </button>
                            <button onClick={()=>setEditando(null)} className="p-1.5 bg-gray-400 text-white rounded-lg"><X className="h-3 w-3"/></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2.5 font-mono font-semibold text-xs text-[#1a4a7a]">{row.cup}</td>
                        <td className="px-4 py-2.5 text-xs">{row.agrupador}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{row.subagrupador}</td>
                        {tablaCfg.tieneEventos && (
                          <>
                            <td className="px-4 py-2.5 text-xs text-right tabular-nums font-medium">{formatearPesos(row.costo_unitario||0)}</td>
                            <td className="px-4 py-2.5 text-xs text-right tabular-nums">{formatearNumero(row.evento_mes_subagrupador||0)}</td>
                          </>
                        )}
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1">
                            <button onClick={()=>{setForm({cup:row.cup,costo_unitario:row.costo_unitario||0,agrupador:row.agrupador,subagrupador:row.subagrupador,evento_mes_subagrupador:row.evento_mes_subagrupador||0});setEditando(row.id)}} className="p-1.5 text-[#1a4a7a] hover:bg-blue-100 rounded-lg"><Pencil className="h-3.5 w-3.5"/></button>
                            <button onClick={()=>eliminar(row.id,row.cup)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-3.5 w-3.5"/></button>
                          </div>
                        </td>
                      </>
                    )}
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
