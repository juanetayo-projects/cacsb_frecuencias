'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Clock, FileText,
  Settings, ChevronDown, ChevronRight,
  Building2, Stethoscope, Heart, Pill, FlaskConical
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  {
    label: 'Emssanar Alta Complejidad',
    icon: Building2,
    children: [
      {
        label: 'Subsidiado',
        children: [
          { label: 'Detalle',           href: '/emssanar/alta/subsidiado/detalle' },
          { label: 'Resumen',           href: '/emssanar/alta/subsidiado/resumen' },
          { label: 'Ventas',            href: '/emssanar/alta/subsidiado/ventas' },
          { label: 'Resumen x Factura', href: '/emssanar/alta/subsidiado/resumen-factura' },
        ]
      },
      {
        label: 'Contributivo',
        children: [
          { label: 'Detalle',           href: '/emssanar/alta/contributivo/detalle' },
          { label: 'Resumen',           href: '/emssanar/alta/contributivo/resumen' },
          { label: 'Ventas',            href: '/emssanar/alta/contributivo/ventas' },
          { label: 'Resumen x Factura', href: '/emssanar/alta/contributivo/resumen-factura' },
        ]
      },
    ]
  },
  {
    label: 'Emssanar Mediana Complejidad',
    icon: Building2,
    children: [
      {
        label: 'Subsidiado',
        children: [
          { label: 'Detalle',           href: '/emssanar/mediana/subsidiado/detalle' },
          { label: 'Resumen',           href: '/emssanar/mediana/subsidiado/resumen' },
          { label: 'Ventas',            href: '/emssanar/mediana/subsidiado/ventas' },
          { label: 'Resumen x Factura', href: '/emssanar/mediana/subsidiado/resumen-factura' },
        ]
      },
      {
        label: 'Contributivo',
        children: [
          { label: 'Detalle',           href: '/emssanar/mediana/contributivo/detalle' },
          { label: 'Resumen',           href: '/emssanar/mediana/contributivo/resumen' },
          { label: 'Ventas',            href: '/emssanar/mediana/contributivo/ventas' },
          { label: 'Resumen x Factura', href: '/emssanar/mediana/contributivo/resumen-factura' },
        ]
      },
    ]
  },
  {
    label: 'Emssanar Evento',
    icon: Stethoscope,
    children: [
      { label: 'Subsidiado',   href: '/emssanar/evento/subsidiado' },
      { label: 'Contributivo', href: '/emssanar/evento/contributivo' },
    ]
  },
  {
    label: 'SURA',
    icon: Heart,
    children: [
      {
        label: 'Evento',
        children: [
          { label: 'Subsidiado',   href: '/sura/evento/subsidiado' },
          { label: 'Contributivo', href: '/sura/evento/contributivo' },
        ]
      },
    ]
  },
  { label: 'Dispensario Médico', icon: Pill,         href: '/dispensario' },
  { label: 'Asmet Salud',        icon: FlaskConical, href: '/asmet-salud' },
  { label: 'Nueva EPS',          icon: Building2,
    children: [
      { label: 'Por Egreso', href: '/nueva-eps/egreso' },
      { label: 'Por Venta',  href: '/nueva-eps/venta' },
    ]
  },
]

const systemItems = [
  { label: 'Usuarios',      icon: Users,          href: '/usuarios' },
  { label: 'Control ETL',   icon: Clock,           href: '/cronjob' },
  { label: 'Normativas',    icon: FileText,        href: '/normativas' },
  { label: 'Configuración', icon: Settings,        href: '/configuracion' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggle = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <aside className="sidebar-header w-64 min-h-screen flex flex-col text-white shadow-xl">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Image src="/images/logo_cacsb_blanc.png" alt="CACSB" width={40} height={40} className="rounded" />
          <div>
            <p className="font-bold text-sm leading-tight">Control de Contratos</p>
            <p className="text-xs text-blue-200">Clínica Santa Bárbara</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map((item, i) => (
          <NavItem key={i} item={item} pathname={pathname} expanded={expanded} toggle={toggle} depth={0} />
        ))}

        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-blue-300 uppercase tracking-wider px-2 mb-1">Sistema</p>
          {systemItems.map((item, i) => (
            <Link key={i} href={item.href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                pathname === item.href
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-blue-100 hover:bg-white/10'
              )}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 text-xs text-blue-300">
        v1.0.0 — CACSB © 2026
      </div>
    </aside>
  )
}

function NavItem({ item, pathname, expanded, toggle, depth }: any) {
  const key = item.label
  const isExpanded = expanded[key] ?? false
  const hasChildren = item.children?.length > 0

  if (!hasChildren && item.href) {
    return (
      <Link href={item.href}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors mb-0.5',
          depth === 0 ? 'ml-0' : depth === 1 ? 'ml-4' : 'ml-7',
          pathname === item.href
            ? 'bg-white/20 text-white font-medium'
            : 'text-blue-100 hover:bg-white/10'
        )}>
        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
        <span className="truncate">{item.label}</span>
      </Link>
    )
  }

  return (
    <div className={cn('mb-0.5', depth > 0 && 'ml-4')}>
      <button onClick={() => toggle(key)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm text-blue-100 hover:bg-white/10 transition-colors">
        <span className="flex items-center gap-2 truncate">
          {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
          {item.label}
        </span>
        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {isExpanded && (
        <div className="mt-0.5">
          {item.children.map((child: any, i: number) => (
            <NavItem key={i} item={child} pathname={pathname} expanded={expanded} toggle={toggle} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
