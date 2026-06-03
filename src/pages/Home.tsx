const BASE = '/cacsb_frecuencias'

const accesos = [
  { label: 'Emssanar Alta — Subsidiado',    href: 'emssanar/alta/subsidiado/resumen',    color: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
  { label: 'Emssanar Alta — Contributivo',  href: 'emssanar/alta/contributivo/resumen',  color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200' },
  { label: 'Emssanar Mediana — Sub',        href: 'emssanar/mediana/subsidiado/resumen', color: 'bg-violet-50 hover:bg-violet-100 border-violet-200' },
  { label: 'Emssanar Mediana — Cont',       href: 'emssanar/mediana/contributivo/resumen',color:'bg-purple-50 hover:bg-purple-100 border-purple-200' },
  { label: 'SURA',                          href: 'sura/evento/contributivo',              color: 'bg-teal-50 hover:bg-teal-100 border-teal-200' },
  { label: 'Nueva EPS',                     href: 'nueva-eps/egreso',                     color: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200' },
  { label: 'Asmet Salud',                   href: 'asmet-salud',                          color: 'bg-green-50 hover:bg-green-100 border-green-200' },
  { label: 'Dispensario Médico',            href: 'dispensario',                          color: 'bg-lime-50 hover:bg-lime-100 border-lime-200' },
  { label: 'Control ETL',                   href: 'cronjob',                              color: 'bg-amber-50 hover:bg-amber-100 border-amber-200' },
]

export function HomePage() {
  return (
    <div className="p-6">
      <div className="card-odoo mb-6 overflow-hidden">
        <div className="sidebar-header p-6 text-white flex items-center gap-4">
          <img src={`${BASE}/images/logo_cacsb_blanc.png`} alt="CACSB" className="w-14 h-14 rounded-lg object-contain" />
          <div>
            <h1 className="text-2xl font-bold">Frecuencias de Uso CACSB</h1>
            <p className="text-blue-200 mt-1">Control de Contratos — Clínica Santa Bárbara</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Aseguradoras', value: '6' },
          { label: 'Páginas Reporte', value: '36' },
          { label: 'Tablas ETL', value: '26' },
          { label: 'Actualización', value: 'Diaria 00:00' },
        ].map((m, i) => (
          <div key={i} className="card-odoo p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">{m.label}</p>
            <p className="text-3xl font-bold text-[#1a4a7a]">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {accesos.map((a, i) => (
          <a key={i} href={`${BASE}/${a.href}`}
            className={`card-odoo border p-4 text-center font-medium text-[#1a4a7a] text-sm transition-all ${a.color}`}>
            {a.label}
          </a>
        ))}
      </div>
    </div>
  )
}
