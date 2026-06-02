# 🏥 Control de Contratos CACSB

**Frecuencias de Uso — Clínica Santa Bárbara**

Sistema web de control y seguimiento de contratos con aseguradoras, que reemplaza el reporte de Google Data Studio con funcionalidades avanzadas de gestión, automatización y comunicación.

![CACSB](public/images/logo_cacsb2.png)

---

## 📋 Descripción

Esta aplicación permite:
- Visualizar el cumplimiento de contratos con **6 aseguradoras** (Emssanar, SURA, Nueva EPS, Asmet Salud, Dispensario)
- Automatizar la extracción de datos desde **Azure SQL Server** hacia **Supabase**
- Gestionar los valores normativos (contratos) directamente desde la app
- Exportar reportes en **Excel** y **PDF**
- Enviar reportes por **email** (Resend)
- Monitorear las ejecuciones del **ETL CronJob**

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Base de datos | Supabase (PostgreSQL) |
| ETL | PHP 8.3 |
| CronJob | GitHub Actions |
| Email | Resend |

---

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/[usuario]/cacsb-frecuencias.git
cd cacsb-frecuencias
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env.local
# Completar con los valores reales de Supabase
```

### 4. Crear tablas en Supabase
```bash
# En el Supabase SQL Editor, ejecutar en orden:
supabase/migrations/001_etl_tables.sql
supabase/migrations/002_normativas.sql
supabase/migrations/003_sistema.sql
supabase/seed/parametros_iniciales.sql
```

### 5. Ejecutar en desarrollo
```bash
npm run dev
```

---

## 📁 Estructura del Proyecto

```
cacsb-frecuencias/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Páginas de autenticación
│   └── (dashboard)/        # Dashboard principal (36 páginas)
├── components/             # Componentes React reutilizables
│   ├── cards/              # MetricCard, ScorecardFecha
│   ├── charts/             # Gráficos Recharts
│   ├── tables/             # Tablas de datos
│   ├── filters/            # Filtros del dashboard
│   └── layout/             # Sidebar, Header
├── etl/                    # PHP runners ETL
│   ├── runners/            # emssanar, sura, nuevaeps, asmetsalud, dispensario
│   └── lib/                # db.php, etl.php, config.php
├── lib/                    # Utilidades TypeScript
│   ├── supabase.ts         # Cliente Supabase
│   ├── calculations.ts     # Lógica % cumplimiento
│   └── constants.ts        # Constantes y configuración
├── supabase/
│   ├── migrations/         # Schema SQL (001, 002, 003)
│   └── seed/               # Datos iniciales
└── public/images/          # Logo CACSB
```

---

## 🔧 Configuración ETL

El ETL corre diariamente a medianoche (Colombia):

| Runner | Hora COL | Tablas |
|---|---|---|
| emssanar.php | 00:00 | 14 tablas |
| sura.php | 01:00 | 8 tablas |
| nuevaeps.php | 02:00 | 2 tablas |
| asmetsalud.php | 03:00 | 2 tablas |
| dispensario.php | 04:00 | 1 tabla |

---

## 🔑 GitHub Secrets requeridos

```
MSSQL_HOST, MSSQL_DB, MSSQL_USER, MSSQL_PASS
PG_HOST, PG_DB, PG_USER, PG_PASS
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
```

---

## 📊 Módulos

1. **Dashboard** — 36 páginas de reportes por aseguradora
2. **Usuarios** — CRUD con roles (Admin, Analista, Viewer)
3. **Control ETL** — Historial y estado de ejecuciones
4. **Normativas** — Gestión de valores contractuales
5. **Configuración** — Parámetros del sistema

---

## 📄 Licencia

Privado — Clínica Santa Bárbara CACSB © 2026
