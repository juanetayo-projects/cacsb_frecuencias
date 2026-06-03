import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { DashboardLayout } from './components/layout/DashboardLayout'

// Páginas Emssanar
import { ResumenPage }       from './pages/emssanar/ResumenPage'
import { DetallePage }       from './pages/emssanar/DetallePage'
import { VentasPage }        from './pages/emssanar/VentasPage'
import { ResumenFacturaPage } from './pages/emssanar/ResumenFacturaPage'

// Páginas otras aseguradoras
import { DispensarioPage }   from './pages/dispensario/Dispensario'

// Páginas del sistema
import { HomePage }          from './pages/Home'
import { UsuariosPage }      from './pages/sistema/Usuarios'
import { CronjobPage }       from './pages/sistema/Cronjob'
import { NormativasPage }    from './pages/sistema/Normativas'
import { ConfiguracionPage } from './pages/sistema/Configuracion'

const BASE = '/cacsb_frecuencias'

// Helper para generar las 4 rutas de cada modalidad Emssanar
function emssanarRoutes(base: string, id: string) {
  return [
    <Route key={`${id}-resumen`}  path={`${base}/resumen`}          element={<ResumenPage       aseguradora={id as any} />} />,
    <Route key={`${id}-detalle`}  path={`${base}/detalle`}          element={<DetallePage       aseguradora={id as any} />} />,
    <Route key={`${id}-ventas`}   path={`${base}/ventas`}           element={<VentasPage        aseguradora={id as any} />} />,
    <Route key={`${id}-rfactura`} path={`${base}/resumen-factura`}  element={<ResumenFacturaPage aseguradora={id as any} />} />,
  ]
}

export default function App() {
  return (
    <BrowserRouter basename={BASE}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<HomePage />} />

          {/* ── Emssanar Alta Complejidad ──────────────────────── */}
          {...emssanarRoutes('emssanar/alta/subsidiado',   'emssanar-alta-sub')}
          {...emssanarRoutes('emssanar/alta/contributivo', 'emssanar-alta-cont')}

          {/* ── Emssanar Mediana Complejidad ───────────────────── */}
          {...emssanarRoutes('emssanar/mediana/subsidiado',   'emssanar-media-sub')}
          {...emssanarRoutes('emssanar/mediana/contributivo', 'emssanar-media-cont')}

          {/* ── Emssanar Evento ─────────────────────────────────── */}
          <Route path="emssanar/evento/subsidiado"   element={<DetallePage aseguradora="emssanar-alta-sub"  />} />
          <Route path="emssanar/evento/contributivo" element={<DetallePage aseguradora="emssanar-alta-cont" />} />

          {/* ── SURA ─────────────────────────────────────────────── */}
          <Route path="sura/evento/subsidiado"   element={<ResumenPage aseguradora="emssanar-alta-sub"  />} />
          <Route path="sura/evento/contributivo" element={<ResumenPage aseguradora="emssanar-alta-cont" />} />

          {/* ── Nueva EPS ────────────────────────────────────────── */}
          <Route path="nueva-eps/egreso" element={<ResumenPage aseguradora="emssanar-alta-sub" />} />
          <Route path="nueva-eps/venta"  element={<ResumenPage aseguradora="emssanar-alta-sub" />} />

          {/* ── Asmet / Dispensario ──────────────────────────────── */}
          <Route path="asmet-salud"  element={<ResumenPage   aseguradora="emssanar-alta-sub" />} />
          <Route path="dispensario"  element={<DispensarioPage />} />

          {/* ── Sistema ──────────────────────────────────────────── */}
          <Route path="usuarios"      element={<UsuariosPage />} />
          <Route path="cronjob"       element={<CronjobPage />} />
          <Route path="normativas"    element={<NormativasPage />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}
