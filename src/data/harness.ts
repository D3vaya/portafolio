// Capas de un agente: el harness alrededor y el modelo al centro, que es lo que el harness envuelve.
export const layers = [
  { id: "evaluacion", name: "Verificación" },
  { id: "control", name: "Control" },
  { id: "memoria", name: "Memoria" },
  { id: "herramientas", name: "Herramientas" },
  { id: "contexto", name: "Contexto" },
  { id: "modelo", name: "Modelo" },
]

// Ventana de contexto de la simulación. Las cifras son ilustrativas, pero de un orden plausible.
export const CONTEXT_WINDOW = 200_000
// Si la próxima pregunta no cabe holgada, el harness compacta antes de seguir
export const COMPACT_AT = 0.85

// Un tramo de la ventana. `fixed`: la parte estable del inicio, la que reutiliza la caché.
export type Segment = { id: string; label: string; tokens: number; fixed?: boolean; delay?: number }
export type ContextChange = {
  add?: Segment[]
  cache?: { delay: number; mode: "write" | "read" }
  compact?: { delay: number; tokens: number }
}

// Cada mensaje viaja por una pista entre dos nodos del diagrama; `delay` está en ms.
// `blocked`: el texto que muestra el paquete cuando un hook lo detiene.
export type Message = { from: string; to: string; label: string; delay?: number; blocked?: string }
export type Step = {
  title: string
  say: string
  text: string
  layer?: string
  active: string[]
  messages: Message[]
  context?: ContextChange
  // El paso en que la respuesta llega a la consola
  reveal?: boolean
}

export type Prompt = {
  id: string
  // Ancla de la respuesta; también la usa el menú
  anchor: string
  label: string
  packet: string
  skill: string
  skillTokens: number
  answerTokens: number
  // Lo propio de cada pregunta: herramientas, verificación o hooks
  steps: Step[]
}

export const FIXED: Segment[] = [
  { id: "sistema", label: "Sistema", tokens: 3_000, fixed: true },
  { id: "defs", label: "Herramientas", tokens: 12_000, fixed: true },
  { id: "memoria", label: "CLAUDE.md y memoria", tokens: 2_000, fixed: true, delay: 1100 },
  { id: "indice", label: "Skills (índice)", tokens: 1_000, fixed: true, delay: 1600 },
]

export const fmt = (n: number) => (n < 1000 ? String(n) : `${Math.round(n / 100) / 10}k`.replace(".", ","))

// Una lectura de datos: el modelo la pide, el harness la ejecuta y el resultado vuelve al contexto
const readStep = (o: { title: string; say: string; text: string; ask: string; call: string; result: string; tokens: number }): Step => ({
  title: o.title,
  say: o.say,
  text: o.text,
  layer: "herramientas",
  active: ["core", "modelo", "herramientas"],
  messages: [
    { from: "modelo", to: "core", label: o.ask },
    { from: "core", to: "herramientas", label: o.call, delay: 1250 },
    { from: "herramientas", to: "core", label: o.result, delay: 2500 },
  ],
  context: { add: [{ id: "resultados", label: "Resultados", tokens: o.tokens, delay: 3400 }] },
})

// Antes de responder, el borrador se compara con la fuente
const verifyStep = (what: string, n: number): Step => ({
  title: "Verifica contra el CV",
  say: "Verificando…",
  text: `Antes de responder compara ${what} del borrador con cv.json. Si algo no cuadra, lo corrige antes de mostrártelo.`,
  layer: "evaluacion",
  active: ["core", "herramientas"],
  messages: [
    { from: "core", to: "herramientas", label: "compara con cv.json" },
    { from: "herramientas", to: "core", label: `${n} de ${n} cuadran`, delay: 1250 },
  ],
  context: { add: [{ id: "resultados", label: "Resultados", tokens: 1_000, delay: 2400 }] },
})

// Los conteos vienen del CV. Se pasan como números para no mandar cv.json entero al navegador,
// que además trae datos privados.
export type Counts = { work: number; skills: number; certificates: number }

export const buildPrompts = (n: Counts): Prompt[] => [
  {
    id: "perfil",
    anchor: "sobre-mi",
    label: "¿Quién es Juan Carlos?",
    packet: "¿Quién es?",
    skill: "perfil",
    skillTokens: 3_000,
    answerTokens: 1_500,
    steps: [
      readStep({
        title: "Lee el CV",
        say: "Leyendo el CV",
        text: "El modelo pide los datos básicos. El harness ejecuta leer_cv y devuelve el resumen y el rol actual al contexto.",
        ask: "pide datos básicos",
        call: 'leer_cv("basics")',
        result: "resumen + rol actual",
        tokens: 14_000,
      }),
    ],
  },
  {
    id: "trayectoria",
    anchor: "trayectoria",
    label: "¿Dónde ha trabajado?",
    packet: "¿Dónde trabajó?",
    skill: "trayectoria",
    skillTokens: 3_000,
    answerTokens: 3_000,
    steps: [
      readStep({
        title: "Lee su experiencia",
        say: "Leyendo roles",
        text: "El modelo pide la experiencia laboral. El harness ejecuta leer_cv y devuelve cada rol con fechas, logros y stack.",
        ask: "pide experiencia",
        call: 'leer_cv("work")',
        result: `${n.work} roles + estudios`,
        tokens: 26_000,
      }),
      verifyStep("cada fecha y cargo", n.work),
    ],
  },
  {
    id: "productos",
    anchor: "productos",
    label: "¿Qué productos tiene en producción?",
    packet: "¿Qué productos?",
    skill: "productos",
    skillTokens: 3_000,
    answerTokens: 3_000,
    steps: [
      {
        title: "Lee y abre los sitios",
        say: "Abriendo sitios",
        text: "Lee los proyectos del CV y, con un servidor MCP de navegador, abre cada sitio para mirarlo antes de describirlo.",
        layer: "herramientas",
        active: ["core", "modelo", "herramientas", "navegador"],
        messages: [
          { from: "modelo", to: "core", label: "pide proyectos" },
          { from: "core", to: "herramientas", label: 'leer_cv("projects")', delay: 1250 },
          { from: "herramientas", to: "navegador", label: "abre 3 sitios", delay: 2500 },
          { from: "navegador", to: "herramientas", label: "3 capturas", delay: 3750 },
          { from: "herramientas", to: "core", label: "proyectos + capturas", delay: 5000 },
        ],
        context: { add: [{ id: "resultados", label: "Resultados", tokens: 58_000, delay: 5600 }] },
      },
    ],
  },
  {
    id: "stack",
    anchor: "stack",
    label: "¿Qué stack maneja?",
    packet: "¿Qué stack?",
    skill: "stack",
    skillTokens: 3_000,
    answerTokens: 3_000,
    steps: [
      readStep({
        title: "Lee sus habilidades",
        say: "Leyendo el stack",
        text: "El modelo pide las habilidades. El harness ejecuta leer_cv y devuelve la lista con la que se arman las dos especialidades.",
        ask: "pide habilidades",
        call: 'leer_cv("skills")',
        result: `${n.skills} habilidades`,
        tokens: 16_000,
      }),
    ],
  },
  {
    id: "aprendizaje",
    anchor: "aprendizaje",
    label: "¿Qué está aprendiendo?",
    packet: "¿Qué aprende?",
    skill: "aprendizaje",
    skillTokens: 3_000,
    answerTokens: 2_000,
    steps: [
      readStep({
        title: "Lee sus cursos",
        say: "Leyendo cursos",
        text: "El modelo pide cursos y certificados. El harness ejecuta leer_cv y devuelve cada uno con su fecha y su credencial.",
        ask: "pide cursos",
        call: 'leer_cv("certificates")',
        result: `${n.certificates} cursos`,
        tokens: 11_000,
      }),
      verifyStep("cada curso y fecha", n.certificates),
    ],
  },
  {
    id: "contacto",
    anchor: "contacto",
    label: "¿Cómo lo contacto?",
    packet: "¿Cómo contactarlo?",
    skill: "contacto",
    skillTokens: 2_000,
    answerTokens: 1_000,
    steps: [
      readStep({
        title: "Lee sus datos",
        say: "Leyendo datos",
        text: "El modelo pide los datos de contacto. El CV trae de todo: correo, perfiles, teléfono y dirección.",
        ask: "pide contacto",
        call: 'leer_cv("basics")',
        result: "correo, redes, teléfono…",
        tokens: 9_000,
      }),
      {
        title: "Un hook filtra lo privado",
        say: "Eso no se publica",
        text: "La respuesta sale por una herramienta de publicación. Antes, un hook PreToolUse revisa qué va a salir: bloquea el teléfono y la dirección, y deja pasar el correo y los perfiles.",
        layer: "control",
        active: ["core", "herramientas"],
        messages: [
          { from: "core", to: "herramientas", label: "publica teléfono", blocked: "bloqueado: dato privado" },
          { from: "core", to: "herramientas", label: "publica correo y redes", delay: 2200 },
        ],
      },
    ],
  },
]

// ---------- Pasos comunes a toda pregunta ----------
const arrive = (p: Prompt): Step => ({
  title: "Llega la pregunta",
  say: "¡Pregunta nueva!",
  text: `Elegiste «${p.label}». No va directo al modelo: primero la recibe Claude Code, el harness.`,
  active: ["usuario", "core"],
  messages: [{ from: "usuario", to: "core", label: p.packet }],
  context: { add: [{ id: "prompt", label: "Pregunta", tokens: 30, delay: 1100 }] },
})

const assemble = (skillCount: number): Step => ({
  title: "Arma el contexto",
  say: "Armando contexto",
  text: "Junta la pregunta con lo que cargó al abrir la sesión: instrucciones de sistema, herramientas, CLAUDE.md y memoria. De las skills solo entra el índice: nombre y descripción.",
  layer: "contexto",
  active: ["core", "memoria", "skills"],
  messages: [
    { from: "memoria", to: "core", label: "CLAUDE.md + memoria" },
    { from: "skills", to: "core", label: `índice: ${skillCount} skills`, delay: 500 },
  ],
  context: { add: FIXED },
})

const fixedTokens = FIXED.reduce((n, s) => n + s.tokens, 0)

const writeCache = (): Step => ({
  title: "Escribe la caché",
  say: "Guardo el inicio",
  text: "Es la primera llamada de la sesión: el inicio estable del contexto queda en la caché de prompt. Las próximas preguntas lo leerán de ahí, más barato y más rápido.",
  layer: "contexto",
  active: ["core", "cache"],
  messages: [
    { from: "core", to: "cache", label: "guarda el inicio" },
    { from: "cache", to: "core", label: `${fmt(fixedTokens)} en caché`, delay: 1250 },
  ],
  context: { cache: { delay: 2300, mode: "write" } },
})

const readCache = (tokens: number, compacted: boolean): Step => ({
  title: "Reusa la caché",
  say: "Esto ya lo tengo",
  text: compacted
    ? `Tras el resumen solo la parte fija sigue idéntica: sistema, herramientas y CLAUDE.md. Esos ${fmt(tokens)} tokens salen de la caché.`
    : `Todo lo anterior, incluidas las preguntas ya respondidas, es idéntico al inicio de la llamada previa: ${fmt(tokens)} tokens salen de la caché en vez de procesarse otra vez.`,
  layer: "contexto",
  active: ["core", "cache"],
  messages: [
    { from: "core", to: "cache", label: "¿mismo inicio?" },
    { from: "cache", to: "core", label: `${fmt(tokens)} desde caché`, delay: 1250 },
  ],
  context: { cache: { delay: 2300, mode: "read" } },
})

const compactStep = (): Step => ({
  title: "Compacta el contexto",
  say: "Hago espacio",
  text: "La ventana está por llenarse. El harness pide al modelo un resumen de la conversación y lo deja en lugar de las preguntas anteriores; las skills usadas se vuelven a adjuntar.",
  layer: "contexto",
  active: ["core", "modelo"],
  messages: [
    { from: "core", to: "modelo", label: "resume lo anterior" },
    { from: "modelo", to: "core", label: "resumen", delay: 1250 },
  ],
  context: { compact: { delay: 2500, tokens: 6_000 } },
})

const choose = (p: Prompt): Step => ({
  title: "El modelo elige la skill",
  say: "Pensando…",
  text: `El modelo lee la pregunta y el índice de skills. Por su descripción elige «${p.skill}». El modelo propone; el harness ejecuta.`,
  layer: "modelo",
  active: ["core", "modelo"],
  messages: [
    { from: "core", to: "modelo", label: "pregunta + contexto" },
    { from: "modelo", to: "core", label: `usar skill: ${p.skill}`, delay: 1250 },
  ],
})

const load = (p: Prompt): Step => ({
  title: "Carga la skill",
  say: `Cargo «${p.skill}»`,
  text: `Recién ahora el harness carga las instrucciones completas de «${p.skill}». Las demás skills siguen ocupando solo su descripción.`,
  layer: "contexto",
  active: ["core", "skills"],
  messages: [{ from: "skills", to: "core", label: `SKILL.md: ${p.skill}` }],
  context: { add: [{ id: "skill", label: `Skill ${p.skill}`, tokens: p.skillTokens, delay: 1100 }] },
})

const answer = (p: Prompt): Step => ({
  title: "Responde",
  say: "Aquí tienes",
  text: "La respuesta llega a la consola, armada con el contenido real de mi CV. Es una simulación: está escrita de antemano.",
  active: ["core", "usuario"],
  messages: [{ from: "core", to: "usuario", label: "respuesta lista" }],
  context: { add: [{ id: "respuesta", label: "Respuesta", tokens: p.answerTokens, delay: 1100 }] },
  reveal: true,
})

// Lo que suma una pregunta a la ventana, para decidir si hay que compactar antes
export const estimate = (p: Prompt) =>
  30 + p.skillTokens + p.answerTokens + p.steps.flatMap((s) => s.context?.add ?? []).reduce((n, a) => n + a.tokens, 0)

// Arma la corrida de una pregunta según cómo está la sesión
export const planRun = (p: Prompt, skillCount: number, state: { total: number; fixed: number; cacheWritten: boolean }): Step[] => {
  const steps = [arrive(p)]
  if (!state.cacheWritten) steps.push(assemble(skillCount), writeCache())
  else {
    const compacted = state.total + estimate(p) > COMPACT_AT * CONTEXT_WINDOW
    if (compacted) steps.push(compactStep())
    steps.push(readCache(compacted ? state.fixed : state.total, compacted))
  }
  return [...steps, choose(p), load(p), ...p.steps, answer(p)]
}
