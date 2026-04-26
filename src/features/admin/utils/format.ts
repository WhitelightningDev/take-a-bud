export function formatZar(cents: number) {
  return (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'ZAR',
  })
}

export function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}

export function formatDate(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString()
}