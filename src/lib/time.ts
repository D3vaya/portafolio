// Fecha de referencia para trabajos sin endDate. Se fija en build para que
// el HTML estático y la línea "ahora" coincidan.
export const NOW = new Date()

export const toDate = (value: string | null | undefined) =>
  value ? new Date(`${value}T00:00:00`) : NOW

// Años decimales: 2014-07-01 -> 2014.5
export const toYear = (value: string | null | undefined) => {
  const d = toDate(value)
  return d.getFullYear() + d.getMonth() / 12
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

export const formatMonth = (value: string | null | undefined) => {
  if (!value) return "hoy"
  const d = toDate(value)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export const duration = (start: string, end: string | null) => {
  const a = toDate(start)
  const b = toDate(end)
  const months = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth()
  const years = Math.floor(months / 12)
  const rest = months % 12
  const y = years ? `${years} ${years === 1 ? "año" : "años"}` : ""
  const m = rest ? `${rest} ${rest === 1 ? "mes" : "meses"}` : ""
  return [y, m].filter(Boolean).join(" y ") || "menos de un mes"
}

export const yearsSince = (start: string) =>
  Math.floor((NOW.getTime() - toDate(start).getTime()) / (365.25 * 24 * 3600 * 1000))

// Asigna cada intervalo a la primera fila libre, como un flame chart
// cuando dos tareas se solapan.
export const assignRows = <T extends { from: number; to: number }>(items: T[]) => {
  const rowEnds: number[] = []
  return [...items]
    .sort((a, b) => a.from - b.from)
    .map((item) => {
      let row = rowEnds.findIndex((end) => end <= item.from)
      if (row === -1) row = rowEnds.length
      rowEnds[row] = item.to
      return { ...item, row }
    })
}
