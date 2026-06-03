export function DetallePage({ aseguradora }: { aseguradora: string }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#1a4a7a] mb-4">Detalle — {aseguradora}</h1>
      <div className="card-odoo p-8 text-center text-gray-400">
        <p className="text-4xl mb-2">📋</p>
        <p className="text-lg font-medium">Módulo en desarrollo</p>
      </div>
    </div>
  )
}
