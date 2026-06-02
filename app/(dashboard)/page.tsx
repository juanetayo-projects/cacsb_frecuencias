import Image from 'next/image'
import { LayoutDashboard, Database, Clock, Users } from 'lucide-react'
import { MetricCard } from '@/components/cards/MetricCard'

export default function HomePage() {
  return (
    <div className="p-6">
      {/* Banner */}
      <div className="card-odoo mb-6 overflow-hidden">
        <div className="sidebar-header p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image src="/images/logo_cacsb_blanc.png" alt="CACSB" width={60} height={60} className="rounded-lg" />
              <div>
                <h1 className="text-2xl font-bold">Frecuencias de Uso CACSB</h1>
                <p className="text-blue-200 mt-1">Control de Contratos — Clínica Santa Bárbara</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de bienvenida */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Aseguradoras Activas"
          value={6}
          icon={<LayoutDashboard className="h-6 w-6" />}
          helpText="Total de aseguradoras con contratos activos en el sistema"
        />
        <MetricCard
          title="Páginas del Reporte"
          value={36}
          icon={<Database className="h-6 w-6" />}
          helpText="Total de vistas y reportes disponibles en el sistema"
        />
        <MetricCard
          title="Tablas ETL"
          value={26}
          icon={<Clock className="h-6 w-6" />}
          helpText="Tablas de ejecución actualizadas diariamente desde Azure SQL"
        />
        <MetricCard
          title="Actualización"
          value="Diaria 00:00"
          icon={<Clock className="h-6 w-6" />}
          helpText="Los datos se actualizan automáticamente cada día a medianoche"
        />
      </div>

      {/* Navegación rápida */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Emssanar Alta — Subsidiado',   href: '/emssanar/alta/subsidiado/resumen',    color: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
          { label: 'Emssanar Alta — Contributivo', href: '/emssanar/alta/contributivo/resumen',  color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200' },
          { label: 'Emssanar Mediana — Sub',       href: '/emssanar/mediana/subsidiado/resumen', color: 'bg-violet-50 hover:bg-violet-100 border-violet-200' },
          { label: 'Emssanar Mediana — Cont',      href: '/emssanar/mediana/contributivo/resumen',color:'bg-purple-50 hover:bg-purple-100 border-purple-200' },
          { label: 'SURA',                         href: '/sura/evento/contributivo',              color: 'bg-teal-50 hover:bg-teal-100 border-teal-200' },
          { label: 'Nueva EPS',                    href: '/nueva-eps/egreso',                     color: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200' },
          { label: 'Asmet Salud',                  href: '/asmet-salud',                          color: 'bg-green-50 hover:bg-green-100 border-green-200' },
          { label: 'Dispensario Médico',           href: '/dispensario',                          color: 'bg-lime-50 hover:bg-lime-100 border-lime-200' },
          { label: 'Control ETL',                  href: '/cronjob',                              color: 'bg-amber-50 hover:bg-amber-100 border-amber-200' },
        ].map((item, i) => (
          <a key={i} href={item.href}
            className={`card-odoo border p-4 text-center font-medium text-cacsb-700 text-sm transition-all ${item.color}`}>
            {item.label}
          </a>
        ))}
      </div>
    </div>
  )
}
