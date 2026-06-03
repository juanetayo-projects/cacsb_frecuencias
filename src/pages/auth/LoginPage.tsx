import { useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Loader2, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react'

const BASE = '/cacsb_frecuencias'

export function LoginPage() {
  const navigate = useNavigate()

  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [modo,        setModo]        = useState<'login'|'reset'>('login')
  const [resetSent,   setResetSent]   = useState(false)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Ingrese email y contraseña'); return }
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (authError) {
      if (authError.message.includes('Invalid login')) {
        setError('Email o contraseña incorrectos')
      } else {
        setError(authError.message)
      }
      return
    }

    navigate('/')
  }

  const handleReset = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Ingrese su email'); return }
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${BASE}/reset-password`,
    })

    setLoading(false)
    if (resetError) { setError(resetError.message); return }
    setResetSent(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a2040] via-[#1a4a7a] to-[#2e6db4] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
              <img src={`${BASE}/images/logo_cacsb_blanc.png`} alt="CACSB" className="h-16 w-16 object-contain"/>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Control de Contratos</h1>
          <p className="text-blue-200 text-sm">Clínica Santa Bárbara — CACSB</p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#1a4a7a] to-[#2e6db4] px-6 py-4">
            <h2 className="text-white font-semibold text-lg">
              {modo === 'login' ? 'Iniciar Sesión' : 'Recuperar Contraseña'}
            </h2>
            <p className="text-blue-200 text-xs mt-0.5">
              {modo === 'login' ? 'Ingrese sus credenciales' : 'Le enviaremos un enlace de recuperación'}
            </p>
          </div>

          <div className="p-6">
            {resetSent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-green-600"/>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Correo enviado</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Revise su bandeja de entrada en <b>{email}</b> y siga el enlace para restablecer su contraseña.
                </p>
                <button onClick={() => { setModo('login'); setResetSent(false) }}
                  className="text-sm text-[#1a4a7a] hover:underline font-medium">
                  Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <form onSubmit={modo === 'login' ? handleLogin : handleReset} className="space-y-4">

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 flex-shrink-0"/>
                    {error}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="usuario@cacsb.net"
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a4a7a] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Contraseña (solo en login) */}
                {modo === 'login' && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a4a7a] focus:border-transparent outline-none transition-all"
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showPass ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Botón principal */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1a4a7a] hover:bg-[#123560] text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-150 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin"/> {modo === 'login' ? 'Ingresando...' : 'Enviando...'}</>
                    : <><Lock className="h-4 w-4"/> {modo === 'login' ? 'Ingresar al Sistema' : 'Enviar Enlace'}</>
                  }
                </button>

                {/* Enlace secundario */}
                <div className="text-center pt-1">
                  {modo === 'login' ? (
                    <button type="button" onClick={() => { setModo('reset'); setError('') }}
                      className="text-xs text-[#2e6db4] hover:underline font-medium">
                      ¿Olvidó su contraseña?
                    </button>
                  ) : (
                    <button type="button" onClick={() => { setModo('login'); setError('') }}
                      className="text-xs text-[#2e6db4] hover:underline font-medium">
                      ← Volver al inicio de sesión
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-300 text-xs mt-6">
          v1.0.0 — Control de Contratos CACSB © 2026
        </p>
      </div>
    </div>
  )
}
