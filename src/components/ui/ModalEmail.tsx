'use client'
import { useState } from 'react'
import { useEmail } from '@/hooks/useEmail'
import { X, Mail, Plus, Trash2, Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open:     boolean
  onClose:  () => void
  seccion:  string
  datos?:   Record<string, unknown>[]
  filtros?: Record<string, unknown>
}

export function ModalEmail({ open, onClose, seccion, datos, filtros }: Props) {
  const { enviando, enviarEmail } = useEmail()
  const [destinatarios, setDestinatarios] = useState<string[]>([''])
  const [asunto, setAsunto] = useState(`[CACSB] Reporte: ${seccion}`)
  const [mensaje, setMensaje] = useState('')

  if (!open) return null

  const addDestinatario = () => setDestinatarios(d => [...d, ''])
  const removeDestinatario = (i: number) => setDestinatarios(d => d.filter((_, j) => j !== i))
  const updateDestinatario = (i: number, val: string) =>
    setDestinatarios(d => d.map((v, j) => j === i ? val : v))

  const handleEnviar = async () => {
    const validos = destinatarios.filter(d => d.includes('@'))
    if (!validos.length) return
    const ok = await enviarEmail({
      destinatarios: validos,
      asunto,
      seccion,
      mensaje,
      datos:   datos?.slice(0, 100),
      filtros,
    })
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a4a7a] to-[#2e6db4] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Mail className="h-5 w-5"/>
            <h3 className="font-semibold">Enviar Reporte por Email</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="h-5 w-5"/>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* Info del reporte */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm">
            <p className="font-medium text-[#1a4a7a]">{seccion}</p>
            {datos && (
              <p className="text-gray-500 text-xs mt-0.5">
                {datos.length.toLocaleString('es-CO')} registros · Se incluirán los primeros 50 en el email
              </p>
            )}
          </div>

          {/* Destinatarios */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Destinatarios
              </label>
              <button onClick={addDestinatario}
                className="text-xs text-[#1a4a7a] hover:underline flex items-center gap-1">
                <Plus className="h-3 w-3"/> Agregar
              </button>
            </div>
            <div className="space-y-2">
              {destinatarios.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="email"
                    value={d}
                    onChange={e => updateDestinatario(i, e.target.value)}
                    placeholder="correo@cacsb.net"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                  />
                  {destinatarios.length > 1 && (
                    <button onClick={() => removeDestinatario(i)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4"/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Asunto */}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
              Asunto
            </label>
            <input
              value={asunto}
              onChange={e => setAsunto(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent"
            />
          </div>

          {/* Mensaje opcional */}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
              Mensaje (opcional)
            </label>
            <textarea
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              rows={3}
              placeholder="Escriba un mensaje adicional para incluir en el email..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleEnviar}
            disabled={enviando || !destinatarios.some(d => d.includes('@'))}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
              'bg-[#1a4a7a] text-white hover:bg-[#123560] shadow-sm hover:shadow-md',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}>
            {enviando
              ? <><Loader2 className="h-4 w-4 animate-spin"/> Enviando...</>
              : <><Send className="h-4 w-4"/> Enviar Email</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
