import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const APP_NOMBRE = 'Control de Contratos CACSB — Clínica Santa Bárbara'

/**
 * Exporta datos a Excel con encabezado de la app
 */
export function exportarExcel(
  data: Record<string, unknown>[],
  titulo: string,
  nombreArchivo: string
): void {
  if (!data.length) return

  const wb = XLSX.utils.book_new()

  // Fila de encabezado de la app
  const cabecera = [
    [APP_NOMBRE],
    [titulo],
    [`Generado: ${new Date().toLocaleString('es-CO')}`],
    [], // fila vacía
    Object.keys(data[0]), // columnas
    ...data.map(row => Object.values(row)),
  ]

  const ws = XLSX.utils.aoa_to_sheet(cabecera)

  // Estilo de encabezado (ancho de columnas)
  ws['!cols'] = Object.keys(data[0]).map(() => ({ wch: 18 }))

  XLSX.utils.book_append_sheet(wb, ws, titulo.substring(0, 31))
  XLSX.writeFile(wb, `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

/**
 * Exporta datos a PDF con logo y encabezado de la app
 */
export function exportarPDF(
  data: Record<string, unknown>[],
  titulo: string,
  nombreArchivo: string
): void {
  if (!data.length) return

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Encabezado
  doc.setFontSize(14)
  doc.setTextColor(26, 74, 122)
  doc.text(APP_NOMBRE, 14, 15)

  doc.setFontSize(11)
  doc.setTextColor(46, 109, 180)
  doc.text(titulo, 14, 22)

  doc.setFontSize(8)
  doc.setTextColor(130, 130, 130)
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 28)

  // Tabla
  const columnas = Object.keys(data[0])
  const filas    = data.map(row => Object.values(row).map(v => String(v ?? '')))

  autoTable(doc, {
    head:        [columnas],
    body:        filas,
    startY:      32,
    styles:      { fontSize: 7, cellPadding: 2 },
    headStyles:  { fillColor: [26, 74, 122], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [244, 246, 249] },
    margin:      { left: 14, right: 14 },
  })

  doc.save(`${nombreArchivo}_${new Date().toISOString().split('T')[0]}.pdf`)
}
