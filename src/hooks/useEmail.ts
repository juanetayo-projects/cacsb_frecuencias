import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface EmailParams {
  destinatarios: string[]
  asunto:   string
  seccion:  string
  mensaje?: string
  datos?:   Record<string, unknown>[]
  filtros?: Record<string, unknown>
}

interface EmailResult {
  enviando: boolean
  enviarEmail: (params: EmailParams) => Promise<boolean>
}

export function useEmail(): EmailResult {
  const [enviando, setEnviando] = useState(false)

  const enviarEmail = async (params: EmailParams): Promise<boolean> => {
    if (!params.destinatarios.length) {
      toast.error('Debe especificar al menos un destinatario')
      return false
    }

    setEnviando(true)
    try {
      const { data, error } = await supabase.functions.invoke('enviar-reporte', {
        body: params,
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Error desconocido')

      // Registrar en log_email
      await supabase.from('log_email').insert({
        destinatarios: params.destinatarios.join(', '),
        asunto:        params.asunto,
        seccion:       params.seccion,
        filtros:       params.filtros || {},
        estado:        'OK',
        resend_id:     data.id,
        enviado_por:   (await supabase.auth.getUser()).data.user?.email,
      })

      toast.success(`Email enviado a ${params.destinatarios.join(', ')}`)
      return true

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error enviando email'
      toast.error(`Error: ${msg}`)

      // Registrar error
      await supabase.from('log_email').insert({
        destinatarios: params.destinatarios.join(', '),
        asunto:        params.asunto,
        seccion:       params.seccion,
        estado:        'ERROR',
        mensaje_error: msg,
        enviado_por:   (await supabase.auth.getUser()).data.user?.email,
      })
      return false
    } finally {
      setEnviando(false)
    }
  }

  return { enviando, enviarEmail }
}
