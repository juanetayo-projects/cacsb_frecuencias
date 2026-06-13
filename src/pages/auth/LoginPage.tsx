import { useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Loader2, User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'

const BASE = '/cacsb_frecuencias'

export function LoginPage() {
  const navigate = useNavigate()

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [modo,      setModo]      = useState<'login'|'reset'>('login')
  const [resetSent, setResetSent] = useState(false)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Ingrese usuario y contraseña'); return }
    setLoading(true); setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) {
      setError(authError.message.includes('Invalid login') ? 'Usuario o contraseña incorrectos' : authError.message)
      return
    }
    navigate('/')
  }

  const handleReset = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Ingrese su email'); return }
    setLoading(true); setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${BASE}/reset-password`,
    })
    setLoading(false)
    if (resetError) { setError(resetError.message); return }
    setResetSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0D2D6B 0%, #16468E 50%, #0D2D6B 100%)' }}>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Encabezado */}
        <div className="px-8 pt-8 pb-6 text-center" style={{ background: '#0D2D6B' }}>
          <div className="flex justify-center mb-3">
            <img
              src={`${BASE}/images/logo_cacsb2.png`}
              alt="Clínica Santa Bárbara"
              className="h-16 object-contain"
            />
          </div>
          <h1 className="text-lg font-bold text-white">
            Frecuencias de Uso
          </h1>
          <p className="text-sm text-blue-100 mt-1">
            Clínica de Alta Complejidad Santa Bárbara
          </p>
        </div>

        <div className="p-8">
          {resetSent ? (
            /* ── Confirmación de reset ── */
            <div className="text-center py-2">
              <p className="font-semibold text-gray-800 mb-2">Correo enviado</p>
              <p className="text-sm text-gray-500 mb-4">
                Revise su bandeja de entrada en <b>{email}</b> y siga el enlace.
              </p>
              <button onClick={() => { setModo('login'); setResetSent(false) }}
                className="text-sm text-[#16468E] hover:underline font-medium">
                ← Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <form onSubmit={modo === 'login' ? handleLogin : handleReset} className="space-y-4">

              {/* Título */}
              <h2 className="text-xl font-bold text-[#0D2D6B] text-center mb-2">
                {modo === 'login' ? 'Iniciar Sesión' : 'Recuperar Contraseña'}
              </h2>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0"/>
                  {error}
                </div>
              )}

              {/* Campo Usuario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="correo@cacsantabarbara.co"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16468E]/30 focus:border-[#16468E] transition-colors"
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              {modo === 'login' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16468E]/30 focus:border-[#16468E] transition-colors"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                    </button>
                  </div>
                </div>
              )}

              {/* Botón Ingresar */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: loading ? '#64748b' : '#0D2D6B' }}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin"/> Verificando...</>
                ) : (
                  modo === 'login' ? 'Ingresar' : 'Enviar enlace'
                )}
              </button>

              {/* Enlace recuperar */}
              {modo === 'login' && (
                <div className="text-center">
                  <button type="button" onClick={() => { setModo('reset'); setError('') }}
                    className="text-xs text-[#16468E] hover:underline transition-colors">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}
              {modo === 'reset' && (
                <div className="text-center">
                  <button type="button" onClick={() => { setModo('login'); setError('') }}
                    className="text-xs text-[#16468E] hover:underline">
                    ← Volver al inicio de sesión
                  </button>
                </div>
              )}

            </form>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Clínica Santa Bárbara — Sistema Interno
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
