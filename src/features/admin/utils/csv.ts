type CsvRow = Record<string, string | number | boolean | null | undefined>

function escapeCsvValue(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

export function buildCsv(rows: CsvRow[]) {
  const columns = Array.from(
    rows.reduce((set, row) => {
      for (const key of Object.keys(row)) set.add(key)
      return set
    }, new Set<string>()),
  )

  return [
    columns.map(escapeCsvValue).join(','),
    ...rows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(',')),
  ].join('\n')
}

export function downloadCsv(filename: string, rows: CsvRow[]) {
  const csv = buildCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}