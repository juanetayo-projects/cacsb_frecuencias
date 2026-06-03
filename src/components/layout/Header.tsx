'use client'

import Image from 'next/image'
import { Bell, LogOut, User, Download } from 'lucide-react'

interface HeaderProps {
  titulo: string
  subtitulo?: string
  fechaEjecucion?: string
  horaEjecucion?: string
  onExportExcel?: () => void
  onExportPdf?: () => void
  onEnviarEmail?: () => void
}

export function Header({
  titulo, subtitulo, fechaEjecucion, horaEjecucion,
  onExportExcel, onExportPdf, onEnviarEmail
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Título de la sección */}
        <div className="flex items-center gap-4">
          <Image src="/images/logo_cacsb2.png" alt="CACSB" width={36} height={36} className="rounded" />
          <div>
            <h1 className="text-lg font-bold text-cacsb-700">{titulo}</h1>
            {subtitulo && <p className="text-xs text-gray-500">{subtitulo}</p>}
          </div>
        </div>

        {/* Fecha de ejecución ETL */}
        {fechaEjecucion && (
          <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
            <span className="text-gray-500 text-xs font-medium">ÚLTIMA EJECUCIÓN ETL</span>
            <span className="font-semibold text-cacsb-700">{fechaEjecucion}</span>
            {horaEjecucion && <span className="text-gray-600">{horaEjecucion}</span>}
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2">
          {onExportExcel && (
            <button onClick={onExportExcel}
              title="Exportar a Excel"
              className="btn-cacsb flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-800">
              <Download className="h-3.5 w-3.5" />
              Excel
            </button>
          )}
          {onExportPdf && (
            <button onClick={onExportPdf}
              title="Exportar a PDF"
              className="btn-cacsb flex items-center gap-1.5 text-xs bg-red-700 hover:bg-red-800">
              <Download className="h-3.5 w-3.5" />
              PDF
            </button>
          )}
          {onEnviarEmail && (
            <button onClick={onEnviarEmail}
              title="Enviar por email"
              className="btn-cacsb flex items-center gap-1.5 text-xs">
              📧 Email
            </button>
          )}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="h-4 w-4 text-gray-500" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <User className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
    </header>
  )
}
