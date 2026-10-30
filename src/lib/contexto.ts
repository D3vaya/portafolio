import type { Segment, Step } from "@/data/harness"

// Estado de la ventana de contexto a lo largo de la sesión: cada pregunta suma tramos,
// la caché los marca y la compactación los resume.
// `cur`: es de la pregunta en curso. `fresh`: recién creado por un resumen, aún no está en caché.
export type Seg = Segment & { cur?: boolean; cached?: boolean; fresh?: boolean }
export type Session = {
  segs: Seg[]
  cacheWritten: boolean
  cacheRead: number
  tools: number
  blocked: number
  // Tokens de cada skill usada, para volver a adjuntarlas tras compactar
  skills: Record<string, number>
}

export const newSession = (): Session => ({ segs: [], cacheWritten: false, cacheRead: 0, tools: 0, blocked: 0, skills: {} })

const HISTORY = ["conversacion", "resumen", "readjuntas"]
const rank = (s: Seg) => (s.fixed ? 0 : s.cur ? 2 : 1)
const sum = (segs: Seg[]) => segs.reduce((n, s) => n + s.tokens, 0)

export const totals = (segs: Seg[]) => ({ total: sum(segs), fixed: sum(segs.filter((s) => s.fixed)) })

// La ventana en el paso `index` de una corrida, `t` ms después de que empezó ese paso
export const fold = (base: Session, steps: Step[], index: number, t: number) => {
  let segs: Seg[] = base.segs.map((s) => ({ ...s }))
  let cacheRead = base.cacheRead
  steps.slice(0, index + 1).forEach((step, k) => {
    const now = k < index ? Infinity : t
    const c = step.context
    if (!c) return
    for (const a of c.add ?? []) {
      if ((a.delay ?? 0) > now) continue
      const found = segs.find((s) => s.id === a.id && s.cur)
      if (found) found.tokens += a.tokens
      else segs.push({ ...a, cur: !a.fixed })
    }
    if (c.compact && c.compact.delay <= now) {
      const reattach = Math.min(25_000, Object.values(base.skills).reduce((n, v) => n + Math.min(5_000, v), 0))
      segs = segs.filter((s) => !HISTORY.includes(s.id))
      segs.push({ id: "resumen", label: "Resumen", tokens: c.compact.tokens, fresh: true })
      if (reattach) segs.push({ id: "readjuntas", label: "Skills re-adjuntas", tokens: reattach, fresh: true })
    }
    if (c.cache && c.cache.delay <= now) {
      // Escribir guarda la parte fija; leer reutiliza todo lo que ya estaba antes de esta pregunta
      const hit = segs.filter((s) => (c.cache!.mode === "write" ? s.fixed : !s.cur && !s.fresh))
      for (const s of hit) s.cached = true
      cacheRead = c.cache.mode === "write" ? 0 : sum(hit)
    }
  })
  segs.sort((a, b) => rank(a) - rank(b))
  return { segs, cacheRead, ...totals(segs), cachedSum: sum(segs.filter((s) => s.cached)) }
}

// Al terminar una corrida lo de la pregunta pasa a ser parte de la conversación
export const commit = (base: Session, steps: Step[], skill: { id: string; tokens: number }): Session => {
  const r = fold(base, steps, steps.length - 1, Infinity)
  const turn = r.segs.filter((s) => s.cur)
  const segs: Seg[] = r.segs.filter((s) => !s.cur).map((s) => ({ ...s, fresh: false }))
  const conv = segs.find((s) => s.id === "conversacion")
  const added = sum(turn)
  if (conv) {
    conv.tokens += added
    conv.cached = false
  } else segs.push({ id: "conversacion", label: "Conversación", tokens: added })
  const messages = steps.flatMap((s) => s.messages)
  return {
    segs,
    cacheWritten: true,
    cacheRead: r.cacheRead,
    tools: base.tools + messages.filter(isToolCall).length,
    blocked: base.blocked + messages.filter((m) => m.blocked).length,
    skills: { ...base.skills, [skill.id]: skill.tokens },
  }
}

// Una llamada a herramienta: lo que el harness manda a la terminal o a un servidor MCP
export const isToolCall = (m: { from: string; to: string; blocked?: string }) =>
  !m.blocked && (m.to === "navegador" || (m.to === "herramientas" && m.from === "core"))
