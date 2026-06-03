/**
 * Tipos TypeScript para las tablas de Supabase
 * Generados manualmente basados en el schema de migrations/001, 002, 003
 */

export type Database = {
  public: {
    Tables: {
      // ETL Tables
      emssanar_frecuencias_alta_cont: { Row: EmssanarFrecuencias; Insert: EmssanarFrecuencias; Update: Partial<EmssanarFrecuencias> }
      emssanar_frecuencias_alta_sub:  { Row: EmssanarFrecuencias; Insert: EmssanarFrecuencias; Update: Partial<EmssanarFrecuencias> }
      emssanar_frecuencias_media_cont:{ Row: EmssanarFrecuencias; Insert: EmssanarFrecuencias; Update: Partial<EmssanarFrecuencias> }
      emssanar_frecuencias_media_sub: { Row: EmssanarFrecuencias; Insert: EmssanarFrecuencias; Update: Partial<EmssanarFrecuencias> }
      neps_frecuencias:               { Row: NepsFrecuencias;     Insert: NepsFrecuencias;     Update: Partial<NepsFrecuencias>     }
      neps_frecuencias_venta:         { Row: NepsFrecuenciasVenta;Insert: NepsFrecuenciasVenta;Update: Partial<NepsFrecuenciasVenta>}
      sura_frecuencias:               { Row: SuraFrecuencias;     Insert: SuraFrecuencias;     Update: Partial<SuraFrecuencias>     }
      asmet_salud_frecuencias:        { Row: AsmetFrecuencias;    Insert: AsmetFrecuencias;    Update: Partial<AsmetFrecuencias>    }
      dispensario_medico_frecuencias: { Row: DispensarioFrecuencias; Insert: DispensarioFrecuencias; Update: Partial<DispensarioFrecuencias> }
      // Normative Tables
      emssanar_nt_alta_cont:  { Row: EmssanarNt; Insert: EmssanarNt; Update: Partial<EmssanarNt> }
      emssanar_nt_alta_sub:   { Row: EmssanarNt; Insert: EmssanarNt; Update: Partial<EmssanarNt> }
      emssanar_nt_media_cont: { Row: EmssanarNt; Insert: EmssanarNt; Update: Partial<EmssanarNt> }
      emssanar_nt_media_sub:  { Row: EmssanarNt; Insert: EmssanarNt; Update: Partial<EmssanarNt> }
      neps_nt:                { Row: NepsNt;      Insert: NepsNt;     Update: Partial<NepsNt>     }
      asmet_salud_nt:         { Row: AsmetNt;     Insert: AsmetNt;    Update: Partial<AsmetNt>    }
      // System Tables
      usuarios:    { Row: Usuario;   Insert: UsuarioInsert; Update: Partial<Usuario>   }
      log_cronjob: { Row: LogCronjob;Insert: LogCronjobInsert; Update: Partial<LogCronjob> }
      parametros:  { Row: Parametro; Insert: Parametro;     Update: Partial<Parametro> }
      log_email:   { Row: LogEmail;  Insert: LogEmailInsert;Update: Partial<LogEmail>  }
    }
  }
}

// ETL Row types
export interface EmssanarFrecuencias {
  id: number
  ingreso: string | null
  fecha_ingreso: string | null
  fecha_egreso: string | null
  venta: string | null
  estado: string | null
  cup: string | null
  cantidad: number | null
  descripcion: string | null
  tipo_producto: string | null
  valor_unitario: number | null
  year: number | null
  mes: number | null
  fecha_reporte: string | null
  hora_reporte: string | null
}

export interface NepsFrecuencias {
  id: number
  ingreso: string | null
  fecha_ingreso: string | null
  fecha_egreso: string | null
  identificacion: string | null
  municipio: string | null
  contrato: string | null
  cup: string | null
  cantidad: number | null
  producto: string | null
  mes: number | null
  ano: number | null
  valor_unitario: number | null
  fecha_reporte: string | null
  hora_reporte: string | null
}

export interface NepsFrecuenciasVenta extends Omit<NepsFrecuencias, 'fecha_ingreso' | 'fecha_egreso' | 'ano'> {
  fecha_venta: string | null
  ano: number | null
}

export interface SuraFrecuencias {
  id: number
  ingreso: string | null
  fecha_ingreso: string | null
  fecha_egreso: string | null
  documento: string | null
  nombres: string | null
  apellidos: string | null
  aseguradora: string | null
  contrato: string | null
  plan: string | null
  venta: string | null
  fecha_venta: string | null
  estado: string | null
  ubicacion: string | null
  cup: string | null
  cantidad: number | null
  descripcion: string | null
  tipo_producto: string | null
  year: number | null
  mes: number | null
  valor: number | null
}

export interface AsmetFrecuencias {
  id: number
  ingreso: string | null
  no_identificacion: string | null
  cup: string | null
  plan: string | null
  producto: string | null
  cantidad: number | null
  mes_anio_venta: string | null
  fecha_reporte: string | null
}

export interface DispensarioFrecuencias {
  id: number
  ingreso: string | null
  cup: string | null
  cantidad: number | null
  valor_total: number | null
  valor_unitario: number | null
  producto: string | null
  tipo_producto: string | null
  mes: string | null
  anio: number | null
}

// Normative row types
export interface EmssanarNt {
  id: number
  cup: string
  costo_unitario: number
  agrupador: string | null
  subagrupador: string | null
  evento_mes_subagrupador: number
  vigencia_desde: string | null
  vigencia_hasta: string | null
  creado_en: string
  actualizado_en: string
  actualizado_por: string | null
}

export interface NepsNt {
  id: number
  cup: string
  agrupador: string | null
  subagrupador: string | null
  vigencia_desde: string | null
  vigencia_hasta: string | null
}

export interface AsmetNt {
  id: number
  cup: string
  costo_unitario: number
  agrupador: string | null
  subagrupador: string | null
}

// System row types
export interface Usuario {
  id: string
  nombre: string
  rol: 'admin' | 'analista' | 'viewer'
  activo: boolean
  ultimo_acceso: string | null
  creado_en: string
  creado_por: string | null
}
export type UsuarioInsert = Omit<Usuario, 'creado_en'>

export interface LogCronjob {
  id: number
  runner: string
  fecha_inicio: string | null
  fecha_fin: string | null
  duracion_seg: number | null
  registros_insertados: number
  estado: 'OK' | 'ERROR' | 'RUNNING'
  mensaje_error: string | null
  tablas_afectadas: string | null
  creado_en: string
}
export type LogCronjobInsert = Omit<LogCronjob, 'id' | 'creado_en'>

export interface Parametro {
  clave: string
  valor: string
  descripcion: string | null
  tipo: 'string' | 'number' | 'boolean' | 'json' | 'secret'
  editable: boolean
  actualizado_en: string
  actualizado_por: string | null
}

export interface LogEmail {
  id: number
  destinatarios: string
  asunto: string | null
  seccion: string | null
  filtros: Record<string, unknown> | null
  formato: 'excel' | 'pdf' | 'ambos' | null
  estado: 'OK' | 'ERROR' | null
  mensaje_error: string | null
  resend_id: string | null
  enviado_por: string | null
  creado_en: string
}
export type LogEmailInsert = Omit<LogEmail, 'id' | 'creado_en'>
