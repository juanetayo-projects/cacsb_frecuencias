// ── Colores del dashboard ─────────────────────────────────────────────────────
export const COLORS = {
  primary:    '#1a4a7a',   // Azul primario CACSB
  secondary:  '#2e6db4',   // Azul secundario
  accent:     '#e8f0fa',   // Azul claro fondo
  ok:         '#1a4a7a',   // Cumplimiento >= 100%
  alert:      '#b02020',   // Cumplimiento < 100%
  okBg:       '#e8f0fa',
  alertBg:    '#fde8e8',
  rowOdd:     '#f4f6f9',   // Filas impares tablas
}

// ── Aseguradoras ──────────────────────────────────────────────────────────────
export const ASEGURADORAS = [
  { id: 'emssanar-alta-sub',  label: 'Emssanar Alta - Subsidiado',     tablas: { frec: 'emssanar_frecuencias_alta_sub',   nt: 'emssanar_nt_alta_sub'   } },
  { id: 'emssanar-alta-cont', label: 'Emssanar Alta - Contributivo',   tablas: { frec: 'emssanar_frecuencias_alta_cont',  nt: 'emssanar_nt_alta_cont'  } },
  { id: 'emssanar-media-sub', label: 'Emssanar Mediana - Subsidiado',  tablas: { frec: 'emssanar_frecuencias_media_sub',  nt: 'emssanar_nt_media_sub'  } },
  { id: 'emssanar-media-cont',label: 'Emssanar Mediana - Contributivo',tablas: { frec: 'emssanar_frecuencias_media_cont', nt: 'emssanar_nt_media_cont' } },
  { id: 'sura',               label: 'SURA',                           tablas: { frec: 'sura_frecuencias',                nt: null                      } },
  { id: 'neps',               label: 'Nueva EPS',                      tablas: { frec: 'neps_frecuencias',                nt: 'neps_nt'                 } },
  { id: 'asmet',              label: 'Asmet Salud',                    tablas: { frec: 'asmet_salud_frecuencias',         nt: 'asmet_salud_nt'          } },
  { id: 'dispensario',        label: 'Dispensario Médico',             tablas: { frec: 'dispensario_medico_frecuencias',  nt: null                      } },
] as const

// ── Meses en español ──────────────────────────────────────────────────────────
export const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// ── Roles ─────────────────────────────────────────────────────────────────────
export const ROLES = {
  admin:    { label: 'Administrador', color: 'bg-red-100 text-red-800'    },
  analista: { label: 'Analista',      color: 'bg-blue-100 text-blue-800'  },
  viewer:   { label: 'Visualizador',  color: 'bg-gray-100 text-gray-800'  },
}

// ── Runners ETL ───────────────────────────────────────────────────────────────
export const ETL_RUNNERS = [
  { id: 'emssanar',   label: 'Emssanar',       tablas: 14, hora: '00:00' },
  { id: 'sura',       label: 'SURA',            tablas: 8,  hora: '01:00' },
  { id: 'nuevaeps',   label: 'Nueva EPS',       tablas: 2,  hora: '02:00' },
  { id: 'asmetsalud', label: 'Asmet Salud',     tablas: 2,  hora: '03:00' },
  { id: 'dispensario',label: 'Dispensario',     tablas: 1,  hora: '04:00' },
]
