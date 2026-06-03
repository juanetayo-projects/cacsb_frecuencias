import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Plus, Pencil, Trash2, Check, X, Loader2, ShieldCheck, Eye, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Usuario {
  id: string
  nombre: string
  rol: 'admin' | 'analista' | 'viewer'
  activo: boolean
  ultimo_acceso: string | null
  creado_en: string
}

const ROLES = {
  admin:    { label: 'Administrador', icon: ShieldCheck, color: 'bg-red-100 text-red-700 border-red-200' },
  analista: { label: 'Analista',      icon: BarChart3,   color: 'bg-blue-100 text-blue-700 border-blue-200' },
  viewer:   { label: 'Visualizador',  icon: Eye,         color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const fmtFecha = (f: string | null) =>
  f ? new Date(f).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '-'

export function UsuariosPage() {
  const [usuarios,  setUsuarios]  = useState<Usuario[]>([])
  const [loading,   setLoading]   = useState(true)
  const [editando,  setEditando]  = useState<string | null>(null)
  const [creando,   setCreando]   = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [busqueda,  setBusqueda]  = useState('')
  const [form,      setForm]      = useState({ nombre: '', rol: 'viewer' as Usuario['rol'], activo: true, email: '' })

  const cargarUsuarios = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('usuarios').select('*').order('creado_en', { ascending: false })
    if (error) { toast.error('Error: ' + error.message) }
    setUsuarios(data || [])
    setLoading(false)
  }

  useEffect(() => { cargarUsuarios() }, [])

  const filtrados = usuarios.filter(u => u.nombre?.toLowerCase().includes(busqueda.toLowerCase()))

  const guardarEdicion = async (id: string) => {
    setGuardando(true)
    const { error } = await supabase.from('usuarios')
      .update({ nombre: form.nombre, rol: form.rol, activo: form.activo })
      .eq('id', id)
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Usuario actualizado')
    setEditando(null)
    cargarUsuarios()
  }

  const crearUsuario = async () => {
    if (!form.email || !form.nombre) { toast.error('Email y nombre son requeridos'); return }
    setGuardando(true)
    const userId = crypto.randomUUID()
    const { error } = await supabase.from('usuarios').insert({
      id: userId, nombre: form.nombre, rol: form.rol, activo: form.activo, creado_por: 'admin'
    })
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(`Usuario ${form.nombre} creado`)
    setCreando(false)
    setForm({ nombre: '', rol: 'viewer', activo: true, email: '' })
    cargarUsuarios()
  }

  const toggleActivo = async (u: Usuario) => {
    const { error } = await supabase.from('usuarios').update({ activo: !u.activo }).eq('id', u.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado')
    cargarUsuarios()
  }

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`Eliminar "${nombre}"?`)) return
    const { error } = await supabase.from('usuarios').delete().eq('id', id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Usuario eliminado')
    cargarUsuarios()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl"><Users className="h-6 w-6 text-[#1a4a7a]"/></div>
          <div>
            <h1 className="text-xl font-bold text-[#1a4a7a]">Gestion de Usuarios</h1>
            <p className="text-xs text-gray-500">Control de acceso y roles</p>
          </div>
        </div>
        <button onClick={() => setCreando(true)} className="btn-cacsb flex items-center gap-2">
          <Plus className="h-4 w-4"/> Nuevo Usuario
        </button>
      </div>

      {creando && (
        <div className="card-odoo p-5 border-l-4 border-[#1a4a7a]">
          <h3 className="font-semibold text-[#1a4a7a] mb-4">Nuevo Usuario</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Email</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email"
                placeholder="usuario@cacsb.net" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300"/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Nombre</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre completo" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300"/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Rol</label>
              <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value as any }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300">
                <option value="viewer">Visualizador</option>
                <option value="analista">Analista</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={crearUsuario} disabled={guardando}
                className="flex-1 btn-cacsb flex items-center justify-center gap-1.5 disabled:opacity-60">
                {guardando ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>} Crear
              </button>
              <button onClick={() => setCreando(false)} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                <X className="h-4 w-4 text-gray-500"/>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar usuario..."
          className="max-w-xs border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300"/>
        <div className="flex gap-3 text-xs text-gray-500">
          <span><b className="text-green-600">{usuarios.filter(u=>u.activo).length}</b> activos</span>
          <span><b className="text-gray-500">{usuarios.filter(u=>!u.activo).length}</b> inactivos</span>
          <span><b className="text-red-600">{usuarios.filter(u=>u.rol==='admin').length}</b> admin</span>
        </div>
      </div>

      <div className="card-odoo overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-[#1a4a7a] text-sm uppercase tracking-wide">
            Usuarios <span className="text-xs font-normal text-gray-400 ml-1 normal-case">({filtrados.length})</span>
          </h3>
        </div>
        {loading ? (
          <div className="p-12 text-center text-gray-400"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2"/><p>Cargando...</p></div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center text-gray-400"><Users className="h-8 w-8 mx-auto mb-2"/><p>Sin usuarios</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1a4a7a] text-white">
                  {['Nombre','Rol','Estado','Ultimo Acceso','Creado','Acciones'].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u, i) => {
                  const rc = ROLES[u.rol]; const RIcon = rc.icon
                  return (
                    <tr key={u.id} className={cn('border-b border-gray-100 hover:bg-blue-50 transition-colors', i%2===1&&'bg-[#f4f6f9]')}>
                      {editando === u.id ? (
                        <>
                          <td className="px-4 py-2" colSpan={2}>
                            <div className="flex gap-2">
                              <input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))}
                                className="flex-1 border border-blue-300 rounded-lg px-2 py-1.5 text-sm"/>
                              <select value={form.rol} onChange={e=>setForm(f=>({...f,rol:e.target.value as any}))}
                                className="border border-blue-300 rounded-lg px-2 py-1.5 text-sm">
                                <option value="viewer">Visualizador</option>
                                <option value="analista">Analista</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                          </td>
                          <td className="px-4 py-2" colSpan={3}/>
                          <td className="px-4 py-2">
                            <div className="flex gap-1">
                              <button onClick={()=>guardarEdicion(u.id)} disabled={guardando}
                                className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60">
                                {guardando?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Check className="h-3.5 w-3.5"/>}
                              </button>
                              <button onClick={()=>setEditando(null)} className="p-1.5 bg-gray-400 text-white rounded-lg hover:bg-gray-500">
                                <X className="h-3.5 w-3.5"/>
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium text-[#1a4a7a]">{u.nombre}</td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', rc.color)}>
                              <RIcon className="h-3 w-3"/>{rc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={()=>toggleActivo(u)}
                              className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                                u.activo?'bg-green-100 text-green-700 hover:bg-green-200':'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                              {u.activo?'Activo':'Inactivo'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{fmtFecha(u.ultimo_acceso)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{fmtFecha(u.creado_en)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={()=>{setForm({nombre:u.nombre,rol:u.rol,activo:u.activo,email:''});setEditando(u.id)}}
                                className="p-1.5 text-[#1a4a7a] hover:bg-blue-100 rounded-lg transition-colors" title="Editar">
                                <Pencil className="h-3.5 w-3.5"/>
                              </button>
                              <button onClick={()=>eliminar(u.id,u.nombre)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                <Trash2 className="h-3.5 w-3.5"/>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card-odoo p-5">
        <h3 className="font-semibold text-[#1a4a7a] text-sm mb-3 uppercase tracking-wide">Descripcion de Roles</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(ROLES).map(([key, rc]) => {
            const Icon = rc.icon
            return (
              <div key={key} className={cn('p-3 rounded-lg border', rc.color)}>
                <div className="flex items-center gap-2 mb-1"><Icon className="h-4 w-4"/><span className="font-semibold text-sm">{rc.label}</span></div>
                <p className="text-xs opacity-80">
                  {key==='admin'    &&'Acceso total: usuarios, normativas y configuracion'}
                  {key==='analista' &&'Ver todos los reportes y exportar datos'}
                  {key==='viewer'   &&'Solo visualizar reportes del dashboard'}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
