import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Building2, Stethoscope, Heart, Pill, FlaskConical, Users, Clock, FileText, Settings, ChevronDown, ChevronRight, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"

const BASE = "/cacsb_frecuencias"

const navItems = [
  { label: "Emssanar Alta Complejidad", icon: Building2, children: [
    { label: "Subsidiado", children: [
      { label: "Resumen", href: "emssanar/alta/subsidiado/resumen" },
      { label: "Detalle", href: "emssanar/alta/subsidiado/detalle" },
      { label: "Ventas",  href: "emssanar/alta/subsidiado/ventas" },
    ]},
    { label: "Contributivo", children: [
      { label: "Resumen", href: "emssanar/alta/contributivo/resumen" },
      { label: "Detalle", href: "emssanar/alta/contributivo/detalle" },
      { label: "Ventas",  href: "emssanar/alta/contributivo/ventas" },
    ]},
  ]},
  { label: "Emssanar Mediana Complejidad", icon: Building2, children: [
    { label: "Subsidiado",   children: [{ label: "Resumen", href: "emssanar/mediana/subsidiado/resumen" },{ label: "Detalle", href: "emssanar/mediana/subsidiado/detalle" }]},
    { label: "Contributivo", children: [{ label: "Resumen", href: "emssanar/mediana/contributivo/resumen" },{ label: "Detalle", href: "emssanar/mediana/contributivo/detalle" }]},
  ]},
  { label: "Emssanar Evento", icon: Stethoscope, children: [
    { label: "Subsidiado",   href: "emssanar/evento/subsidiado" },
    { label: "Contributivo", href: "emssanar/evento/contributivo" },
  ]},
  { label: "SURA", icon: Heart, children: [{ label: "Evento", children: [
    { label: "Subsidiado",   href: "sura/evento/subsidiado" },
    { label: "Contributivo", href: "sura/evento/contributivo" },
  ]}]},
  { label: "Dispensario Medico", icon: Pill,         href: "dispensario" },
  { label: "Asmet Salud",        icon: FlaskConical, href: "asmet-salud" },
  { label: "Nueva EPS", icon: Building2, children: [
    { label: "Resumen",    href: "nueva-eps/resumen" },
    { label: "Por Egreso", href: "nueva-eps/egreso" },
    { label: "Por Venta",  href: "nueva-eps/venta" },
  ]},
]

const systemItems = [
  { label: "Usuarios",      icon: Users,    href: "usuarios" },
  { label: "Control ETL",   icon: Clock,    href: "cronjob" },
  { label: "Normativas",    icon: FileText, href: "normativas" },
  { label: "Configuracion", icon: Settings, href: "configuracion" },
]

export function Sidebar() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggle = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }))

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    navigate('/login')
  }

  return (
    <aside className="sidebar-header w-64 min-h-screen flex flex-col text-white shadow-xl flex-shrink-0">
      <div className="p-4 border-b border-white/10">
        <div className="flex flex-col items-center text-center gap-2">
          <img src={`${BASE}/images/logo_cacsb_blanc.png`} alt="CACSB" className="h-12 object-contain" />
          <div>
            <p className="font-bold text-sm leading-tight">Control de Contratos</p>
            <p className="text-xs text-blue-200">Clinica Santa Barbara</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map((item, i) => (
          <NavItem key={i} item={item} location={location.pathname} expanded={expanded} toggle={toggle} depth={0} />
        ))}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-blue-300 uppercase tracking-wider px-2 mb-1">Sistema</p>
          {systemItems.map((item, i) => (
            <NavLink key={i} to={item.href} className={({ isActive }) => cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5", isActive ? "bg-white/20 text-white font-medium" : "text-blue-100 hover:bg-white/10")}>
              <item.icon className="h-4 w-4" />{item.label}
            </NavLink>
          ))}
        </div>
      </nav>
      {/* Usuario + logout */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.email}</p>
            <p className="text-xs text-blue-300">v1.0.0 · CACSB 2026</p>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-2 text-blue-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 ml-2">
            <LogOut className="h-4 w-4"/>
          </button>
        </div>
      </div>
    </aside>
  )
}

function NavItem({ item, location, expanded, toggle, depth }: any) {
  if (!item.children?.length && item.href) {
    return (
      <NavLink to={item.href} className={({ isActive }) => cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors mb-0.5", depth===0?"":depth===1?"ml-4":"ml-7", isActive?"bg-white/20 text-white font-medium":"text-blue-100 hover:bg-white/10")}>
        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
        <span className="truncate">{item.label}</span>
      </NavLink>
    )
  }
  const isExpanded = expanded[item.label] ?? false
  return (
    <div className={cn("mb-0.5", depth>0&&"ml-4")}>
      <button onClick={() => toggle(item.label)} className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm text-blue-100 hover:bg-white/10 transition-colors">
        <span className="flex items-center gap-2 truncate">{item.icon && <item.icon className="h-4 w-4 shrink-0"/>}{item.label}</span>
        {isExpanded?<ChevronDown className="h-3 w-3"/>:<ChevronRight className="h-3 w-3"/>}
      </button>
      {isExpanded && <div className="mt-0.5">{item.children.map((c:any,i:number)=><NavItem key={i} item={c} location={location} expanded={expanded} toggle={toggle} depth={depth+1}/>)}</div>}
    </div>
  )
}
