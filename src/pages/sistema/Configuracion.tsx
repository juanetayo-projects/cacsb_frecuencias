import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Settings, Save, Loader2, RefreshCw, HelpCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Parametro {
  clave: string; valor: string; descripcion: string | null
  tipo: string; editable: boolean; actualizado_en: string
}

const GRUPOS: Record<string, string[]> = {
  'ETL':            ['etl_meses_atras','etl_batch_size','etl_timezone','etl_log_level','etl_hora_ejecucion'],
  'Aplicacion':     ['app_nombre','app_subtitulo','app_version'],
  'Dashboard':      ['dashboard_filas_tabla','dashboard_color_ok','dashboard_color_alert'],
  'Email (Resend)': ['resend_from','email_asunto_default','email_auto_envio','email_destinatarios'],
  'Conexion':       ['mssql_host','mssql_db','id_user_company'],
}

const TIPO_COLOR: Record<string, string> = {
  string:  'bg-blue-50 text-blue-700',
  number:  'bg-green-50 text-green-700',
  boolean: 'bg-purple-50 text-purple-700',
  json:    'bg-orange-50 text-orange-700',
  secret:  'bg-red-50 text-red-700',
}

export function ConfiguracionPage() {
  const [params,    setParams]    = useState<Parametro[]>([])
  const [loading,   setLoading]   = useState(true)
  const [editando,  setEditando]  = useState<string|null>(null)
  const [valTemp,   setValTemp]   = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('parametros').select('*').order('clave')
    if (error) { toast.error('Error: ' + error.message) }
    setParams(data || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const guardar = async (clave: string) => {
    setGuardando(true)
    const { error } = await supabase.from('parametros')
      .update({ valor: valTemp, actualizado_en: new Date().toISOString(), actualizado_por: 'admin' })
      .eq('clave', clave)
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Parametro actualizado')
    setEditando(null)
    cargar()
  }

  const fmtFecha = (f: string) =>
    new Date(f).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })

  const getParam = (clave: string) => params.find(p => p.clave === clave)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl"><Settings className="h-6 w-6 text-[#1a4a7a]"/></div>
          <div>
            <h1 className="text-xl font-bold text-[#1a4a7a]">Configuracion del Sistema</h1>
            <p className="text-xs text-gray-500">Parametros globales de la aplicacion y el ETL</p>
          </div>
        </div>
        <button onClick={cargar} className="btn-cacsb flex items-center gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5"/> Recargar
        </button>
      </div>

      {loading ? (
        <div className="card-odoo p-12 text-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2"/>
          <p>Cargando configuracion...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(GRUPOS).map(([grupo, claves]) => {
            const items = claves.map(c => getParam(c)).filter(Boolean) as Parametro[]
            if (!items.length) return null
            return (
              <div key={grupo} className="card-odoo overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-semibold text-[#1a4a7a] text-sm uppercase tracking-wide flex items-center gap-2">
                    <Settings className="h-4 w-4"/> {grupo}
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map(p => (
                    <div key={p.clave} className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-xs font-mono font-semibold text-[#1a4a7a] bg-blue-50 px-2 py-0.5 rounded">{p.clave}</code>
                          <span className={cn('px-2 py-0.5 text-xs rounded-full font-medium', TIPO_COLOR[p.tipo] || 'bg-gray-100 text-gray-600')}>{p.tipo}</span>
                          {!p.editable && <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">Solo lectura</span>}
                        </div>
                        {p.descripcion && <p className="text-xs text-gray-500 mb-1">{p.descripcion}</p>}
                        <p className="text-xs text-gray-300">Actualizado: {fmtFecha(p.actualizado_en)}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {editando === p.clave ? (
                          <>
                            {p.tipo === 'boolean' ? (
                              <select value={valTemp} onChange={e => setValTemp(e.target.value)}
                                className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-300 w-28">
                                <option value="true">true</option>
                                <option value="false">false</option>
                              </select>
                            ) : (
                              <input value={valTemp} onChange={e => setValTemp(e.target.value)}
                                className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-300 w-48 font-mono"/>
                            )}
                            <button onClick={() => guardar(p.clave)} disabled={guardando}
                              className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60">
                              {guardando ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4"/>}
                            </button>
                            <button onClick={() => setEditando(null)} className="p-1.5 bg-gray-400 text-white rounded-lg hover:bg-gray-500">
                              <span className="text-xs px-0.5">x</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <span className={cn('font-mono text-sm px-3 py-1 rounded-lg border max-w-[200px] truncate block',
                              p.tipo === 'secret' ? 'text-gray-300 bg-gray-50 border-gray-200' : 'bg-gray-50 border-gray-200')}>
                              {p.tipo === 'secret' ? '••••••••••••' : p.valor}
                            </span>
                            {p.editable && (
                              <button onClick={() => { setEditando(p.clave); setValTemp(p.valor) }}
                                className="p-1.5 text-[#1a4a7a] hover:bg-blue-100 rounded-lg transition-colors">
                                <Save className="h-4 w-4"/>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="card-odoo p-4 bg-amber-50 border border-amber-200">
        <div className="flex items-start gap-2">
          <HelpCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0"/>
          <div>
            <p className="text-xs font-semibold text-amber-800 mb-1">Nota sobre credenciales</p>
            <p className="text-xs text-amber-700">
              Las credenciales de base de datos (MSSQL_PASS, PG_PASS) NO se almacenan aqui.
              Se gestionan como GitHub Secrets en el repositorio para mayor seguridad.
              Solo edite los parametros operacionales (meses atras, batch size, timezone, etc).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
