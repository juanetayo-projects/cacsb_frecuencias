import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { DashboardLayout } from './components/layout/DashboardLayout'

// Auth
import { LoginPage }         from './pages/auth/LoginPage'

// Páginas Emssanar
import { ResumenPage }        from './pages/emssanar/ResumenPage'
import { DetallePage }        from './pages/emssanar/DetallePage'
import { VentasPage }         from './pages/emssanar/VentasPage'
import { ResumenFacturaPage } from './pages/emssanar/ResumenFacturaPage'
import { EventoPage }         from './pages/emssanar/EventoPage'

// Páginas SURA
import { SuraEventoPage }    from './pages/sura/SuraEventoPage'

// Páginas Nueva EPS
import { NuEPSPage }         from './pages/nuevaeps/NuEPSPage'
import { NuEPSResumenPage }  from './pages/nuevaeps/NuEPSResumenPage'

// Páginas Asmet Salud
import { AsmetPage }         from './pages/asmet/AsmetPage'

// Páginas otras aseguradoras
import { DispensarioPage }   from './pages/dispensario/Dispensario'

// Sistema
import { HomePage }          from './pages/Home'
import { UsuariosPage }      from './pages/sistema/Usuarios'
import { CronjobPage }       from './pages/sistema/Cronjob'
import { NormativasPage }    from './pages/sistema/Normativas'
import { ConfiguracionPage } from './pages/sistema/Configuracion'

const BASE = '/cacsb_frecuencias'

function emssanarRoutes(base: string, id: string) {
  return [
    <Route key={`${id}-r`}  path={`${base}/resumen`}         element={<ResumenPage       aseguradora={id as any}/>}/>,
    <Route key={`${id}-d`}  path={`${base}/detalle`}          element={<DetallePage       aseguradora={id as any}/>}/>,
    <Route key={`${id}-v`}  path={`${base}/ventas`}           element={<VentasPage        aseguradora={id as any}/>}/>,
    <Route key={`${id}-rf`} path={`${base}/resumen-factura`}  element={<ResumenFacturaPage aseguradora={id as any}/>}/>,
  ]
}

export default function App() {
  return (
    <BrowserRouter basename={BASE}>
      <Routes>
        {/* Login — público */}
        <Route path="/login" element={<LoginPage />} />

        {/* Dashboard — protegido por useAuth en DashboardLayout */}
        <Route element={<DashboardLayout />}>
          <Route index element={<HomePage />} />

          {/* Emssanar Alta */}
          {...emssanarRoutes('emssanar/alta/subsidiado',   'emssanar-alta-sub')}
          {...emssanarRoutes('emssanar/alta/contributivo', 'emssanar-alta-cont')}

          {/* Emssanar Mediana */}
          {...emssanarRoutes('emssanar/mediana/subsidiado',   'emssanar-media-sub')}
          {...emssanarRoutes('emssanar/mediana/contributivo', 'emssanar-media-cont')}

          {/* Emssanar Evento */}
          <Route path="emssanar/evento/subsidiado"   element={<EventoPage tipo="subsidiado"   />}/>
          <Route path="emssanar/evento/contributivo" element={<EventoPage tipo="contributivo" />}/>

          {/* SURA */}
          <Route path="sura/evento/subsidiado"   element={<SuraEventoPage tipo="subsidiado"   />}/>
          <Route path="sura/evento/contributivo" element={<SuraEventoPage tipo="contributivo" />}/>

          {/* Nueva EPS */}
          <Route path="nueva-eps/resumen" element={<NuEPSResumenPage />}/>
          <Route path="nueva-eps/egreso"  element={<NuEPSPage tipo="egreso"/>}/>
          <Route path="nueva-eps/venta"   element={<NuEPSPage tipo="venta" />}/>

          {/* Asmet Salud / Dispensario */}
          <Route path="asmet-salud"  element={<AsmetPage />}/>
          <Route path="dispensario"  element={<DispensarioPage />}/>

          {/* Sistema */}
          <Route path="usuarios"      element={<UsuariosPage />}/>
          <Route path="cronjob"       element={<CronjobPage />}/>
          <Route path="normativas"    element={<NormativasPage />}/>
          <Route path="configuracion" element={<ConfiguracionPage />}/>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}
