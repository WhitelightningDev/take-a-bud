type ZaIdParseResult =
  | { ok: true; birthDate: { year: number; month: number; day: number }; age: number }
  | { ok: false; error: string }

function isDigits(value: string) {
  return /^\d+$/.test(value)
}

function isValidDateParts(year: number, month: number, day: number) {
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  const d = new Date(year, month - 1, day)
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  )
}

function computeAge(
  birth: { year: number; month: number; day: number },
  today: Date,
) {
  let age = today.getFullYear() - birth.year
  const m = today.getMonth() + 1
  const d = today.getDate()
  if (m < birth.month || (m === birth.month && d < birth.day)) {
    age -= 1
  }
  return age
}

export function parseZaIdNumber(idNumber: string, now = new Date()): ZaIdParseResult {
  const trimmed = idNumber.trim()
  if (trimmed.length !== 13 || !isDigits(trimmed)) {
    return { ok: false, error: 'ID number must be 13 digits.' }
  }

  const yy = Number(trimmed.slice(0, 2))
  const mm = Number(trimmed.slice(2, 4))
  const dd = Number(trimmed.slice(4, 6))

  const currentYear = now.getFullYear()
  const currentYY = currentYear % 100
  const fullYear = yy <= currentYY ? 2000 + yy : 1900 + yy

  if (!isValidDateParts(fullYear, mm, dd)) {
    return { ok: false, error: 'ID number date of birth is invalid.' }
  }

  const age = computeAge({ year: fullYear, month: mm, day: dd }, now)
  if (age < 0 || age > 130) {
    return { ok: false, error: 'ID number date of birth is invalid.' }
  }

  return {
    ok: true,
    birthDate: { year: fullYear, month: mm, day: dd },
    age,
  }
}

export function assertZaIdIs18Plus(idNumber: string, now = new Date()) {
  const parsed = parseZaIdNumber(idNumber, now)
  if (!parsed.ok) throw new Error(parsed.error)
  if (parsed.age < 18) {
    throw new Error('You must be 18+ to use Take A Bud.')
  }
}

export function isZaId18Plus(idNumber: string, now = new Date()) {
  const parsed = parseZaIdNumber(idNumber, now)
  return parsed.ok && parsed.age >= 18
}
