import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { DashboardLayout } from './components/layout/DashboardLayout'

// PÃ¡ginas del dashboard
import { HomePage }    from './pages/Home'
import { ResumenPage } from './pages/emssanar/alta/subsidiado/Resumen'
import { DetallePage } from './pages/emssanar/alta/subsidiado/Detalle'
import { VentasPage }  from './pages/emssanar/alta/subsidiado/Ventas'

// PÃ¡ginas del sistema
import { UsuariosPage }      from './pages/sistema/Usuarios'
import { CronjobPage }       from './pages/sistema/Cronjob'
import { NormativasPage }    from './pages/sistema/Normativas'
import { ConfiguracionPage } from './pages/sistema/Configuracion'
import { DispensarioPage }    from './pages/dispensario/Dispensario'

// Ruta base para GitHub Pages
const BASE = '/cacsb_frecuencias'

export default function App() {
  return (
    <BrowserRouter basename={BASE}>
      <Routes>
        {/* Dashboard con sidebar */}
        <Route element={<DashboardLayout />}>
          <Route index element={<HomePage />} />

          {/* Emssanar Alta */}
          <Route path="emssanar/alta/subsidiado/resumen"         element={<ResumenPage aseguradora="emssanar-alta-sub" />} />
          <Route path="emssanar/alta/subsidiado/detalle"         element={<DetallePage aseguradora="emssanar-alta-sub" />} />
          <Route path="emssanar/alta/subsidiado/ventas"          element={<VentasPage  aseguradora="emssanar-alta-sub" />} />
          <Route path="emssanar/alta/contributivo/resumen"       element={<ResumenPage aseguradora="emssanar-alta-cont" />} />
          <Route path="emssanar/alta/contributivo/detalle"       element={<DetallePage aseguradora="emssanar-alta-cont" />} />
          <Route path="emssanar/alta/contributivo/ventas"        element={<VentasPage  aseguradora="emssanar-alta-cont" />} />

          {/* Emssanar Mediana */}
          <Route path="emssanar/mediana/subsidiado/resumen"      element={<ResumenPage aseguradora="emssanar-media-sub" />} />
          <Route path="emssanar/mediana/subsidiado/detalle"      element={<DetallePage aseguradora="emssanar-media-sub" />} />
          <Route path="emssanar/mediana/contributivo/resumen"    element={<ResumenPage aseguradora="emssanar-media-cont" />} />
          <Route path="emssanar/mediana/contributivo/detalle"    element={<DetallePage aseguradora="emssanar-media-cont" />} />

          {/* Sura, NEPS, Asmet, Dispensario */}
          <Route path="sura/evento/subsidiado"    element={<ResumenPage aseguradora="sura-sub" />} />
          <Route path="sura/evento/contributivo"  element={<ResumenPage aseguradora="sura-cont" />} />
          <Route path="nueva-eps/egreso"          element={<ResumenPage aseguradora="neps-egreso" />} />
          <Route path="nueva-eps/venta"           element={<ResumenPage aseguradora="neps-venta" />} />
          <Route path="asmet-salud"               element={<ResumenPage aseguradora="asmet" />} />
          <Route path="dispensario"               element={<DispensarioPage />} />

          {/* Sistema */}
          <Route path="usuarios"      element={<UsuariosPage />} />
          <Route path="cronjob"       element={<CronjobPage />} />
          <Route path="normativas"    element={<NormativasPage />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />
        </Route>

        {/* RedirecciÃ³n por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}

