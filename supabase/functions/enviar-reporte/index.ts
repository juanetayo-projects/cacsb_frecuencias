// Supabase Edge Function: enviar-reporte
// Recibe datos del reporte y los envía via Resend
// Deploy: supabase functions deploy enviar-reporte

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  destinatarios: string[]
  asunto:        string
  seccion:       string
  mensaje?:      string
  datos?:        Record<string, unknown>[]
  filtros?:      Record<string, unknown>
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { destinatarios, asunto, seccion, mensaje, datos, filtros }: EmailRequest
      = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY no configurada en Supabase Edge Functions')
    }

    // Construir tabla HTML con los datos si se proporcionan
    let tablaHtml = ''
    if (datos && datos.length > 0) {
      const columnas = Object.keys(datos[0])
      tablaHtml = `
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px">
          <thead>
            <tr style="background:#1a4a7a;color:white">
              ${columnas.map(c => `<th style="padding:8px 12px;text-align:left;font-weight:600">${c}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${datos.slice(0, 50).map((fila, i) => `
              <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f4f6f9'}">
                ${columnas.map(c => `<td style="padding:7px 12px;border-bottom:1px solid #e2e8f0">${fila[c] ?? ''}</td>`).join('')}
              </tr>
            `).join('')}
            ${datos.length > 50 ? `<tr><td colspan="${columnas.length}" style="padding:8px 12px;text-align:center;color:#64748b;font-style:italic">... y ${datos.length - 50} registros más (ver Excel adjunto)</td></tr>` : ''}
          </tbody>
        </table>
      `
    }

    // Construir filtros aplicados
    let filtrosHtml = ''
    if (filtros && Object.keys(filtros).length > 0) {
      const filtrosActivos = Object.entries(filtros)
        .filter(([, v]) => v !== null && v !== '' && v !== 0)
        .map(([k, v]) => `<span style="background:#e8f0fa;color:#1a4a7a;padding:2px 8px;border-radius:12px;font-size:12px;margin-right:6px">${k}: <b>${v}</b></span>`)
        .join('')
      if (filtrosActivos) {
        filtrosHtml = `<p style="margin:12px 0 4px;font-size:12px;color:#64748b">Filtros aplicados:</p><p>${filtrosActivos}</p>`
      }
    }

    const fechaGeneracion = new Date().toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      dateStyle: 'full',
      timeStyle: 'short',
    })

    // HTML del email
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
      <body style="font-family:Inter,Arial,sans-serif;margin:0;padding:0;background:#f8fafc">
        <div style="max-width:900px;margin:0 auto;padding:24px">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#1a4a7a,#2e6db4);padding:24px 32px;border-radius:12px 12px 0 0;color:white">
            <h1 style="margin:0 0 4px;font-size:20px;font-weight:700">Control de Contratos CACSB</h1>
            <p style="margin:0;font-size:14px;opacity:0.85">Clínica Santa Bárbara — Reporte Automático</p>
          </div>

          <!-- Contenido -->
          <div style="background:white;padding:24px 32px;border:1px solid #e2e8f0;border-top:none">
            <h2 style="color:#1a4a7a;font-size:16px;margin:0 0 8px">${seccion}</h2>
            <p style="color:#64748b;font-size:13px;margin:0 0 16px">Generado el ${fechaGeneracion}</p>

            ${mensaje ? `<p style="color:#374151;font-size:14px;margin:0 0 16px">${mensaje}</p>` : ''}
            ${filtrosHtml}
            ${tablaHtml}
          </div>

          <!-- Footer -->
          <div style="background:#f8fafc;padding:16px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
            <p style="color:#94a3b8;font-size:12px;margin:0">
              Este reporte fue generado automáticamente por el sistema <b>Control de Contratos CACSB</b>.
              Para más información, acceda a la aplicación.
            </p>
          </div>

        </div>
      </body>
      </html>
    `

    // Llamar a Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'Control de Contratos CACSB <reportes@cacsb.net>',
        to:      destinatarios,
        subject: asunto || `[CACSB] Reporte: ${seccion}`,
        html,
      }),
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json()
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`)
    }

    const resendData = await resendResponse.json()

    return new Response(
      JSON.stringify({ success: true, id: resendData.id, mensaje: 'Email enviado correctamente' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error en enviar-reporte:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
