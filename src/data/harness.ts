// Capas de un agente: el harness alrededor y el modelo al centro, que es lo que el harness envuelve.
export const layers = [
  { id: "evaluacion", name: "Verificación" },
  { id: "orquestacion", name: "Orquestación" },
  { id: "control", name: "Control" },
  { id: "memoria", name: "Memoria" },
  { id: "herramientas", name: "Herramientas" },
  { id: "contexto", name: "Contexto" },
  { id: "modelo", name: "Modelo" },
]

// Ventana de contexto de la simulación. Las cifras son ilustrativas, pero de un orden plausible.
export const CONTEXT_WINDOW = 200_000

// Un tramo de la ventana. `fixed`: la parte estable del inicio, la que reutiliza la caché.
// `keep`: sobrevive a la compactación (Claude Code vuelve a adjuntar las skills usadas).
export type Segment = { id: string; label: string; tokens: number; fixed?: boolean; keep?: boolean; delay?: number }
export type ContextChange = {
  add?: Segment[]
  cache?: { delay: number }
  compact?: { delay: number; tokens: number }
}

// Lo que hace el harness con un prompt, de que llega hasta que responde. Cada mensaje viaja
// por una pista entre dos nodos del diagrama; `delay` y la duración están en ms.
export type Message = { from: string; to: string; label: string; delay?: number; blocked?: boolean }
export type Step = {
  title: string
  say: string
  text: string
  layer?: string
  active: string[]
  messages: Message[]
  context?: ContextChange
}

export const steps: Step[] = [
  {
    title: "Llega el prompt",
    say: "¡Prompt nuevo!",
    text: "Escribes «Agrega login con Google». El mensaje no va directo al modelo: primero lo recibe Claude Code, el harness.",
    active: ["usuario", "core"],
    messages: [{ from: "usuario", to: "core", label: "Agrega login con Google" }],
  },
  {
    title: "Arma el contexto",
    say: "Armando contexto",
    text: "Junta el prompt con lo que cargó al abrir la sesión: instrucciones de sistema, herramientas, CLAUDE.md y memoria. De las skills solo entra el índice: nombre y descripción.",
    layer: "contexto",
    active: ["core", "memoria", "skills"],
    messages: [
      { from: "memoria", to: "core", label: "CLAUDE.md + memoria" },
      { from: "skills", to: "core", label: "índice de skills", delay: 500 },
    ],
    context: {
      add: [
        { id: "sistema", label: "Sistema", tokens: 3_000, fixed: true },
        { id: "defs", label: "Herramientas", tokens: 12_000, fixed: true },
        { id: "memoria", label: "CLAUDE.md y memoria", tokens: 2_000, fixed: true, delay: 1100 },
        { id: "indice", label: "Skills (índice)", tokens: 1_000, fixed: true, delay: 1600 },
        { id: "prompt", label: "Prompt", tokens: 20, delay: 1900 },
      ],
    },
  },
  {
    title: "Reusa la caché de prompt",
    say: "Esto ya lo tengo",
    text: "El inicio del contexto es idéntico al de la llamada anterior, así que se lee desde la caché y no se procesa otra vez. La primera llamada lo guarda; las siguientes lo reutilizan: más barato y más rápido.",
    layer: "contexto",
    active: ["core", "cache"],
    messages: [
      { from: "core", to: "cache", label: "¿mismo inicio?" },
      { from: "cache", to: "core", label: "18k desde caché", delay: 1400 },
    ],
    context: { cache: { delay: 2500 } },
  },
  {
    title: "El modelo decide",
    say: "Pensando…",
    text: "El modelo lee el contexto y, por la descripción de cada skill, decide usar la de autenticación. El modelo propone; el harness ejecuta.",
    layer: "modelo",
    active: ["core", "modelo"],
    messages: [
      { from: "core", to: "modelo", label: "contexto + prompt" },
      { from: "modelo", to: "core", label: "usar skill: auth", delay: 1600 },
    ],
  },
  {
    title: "Carga la skill",
    say: "Cargo la skill auth",
    text: "Recién ahora el harness carga las instrucciones completas de esa skill. Las demás siguen ocupando solo su nombre y descripción.",
    layer: "contexto",
    active: ["core", "skills"],
    messages: [{ from: "skills", to: "core", label: "SKILL.md de auth" }],
    context: { add: [{ id: "skill", label: "Skill auth", tokens: 4_000, keep: true, delay: 1100 }] },
  },
  {
    title: "Usa herramientas",
    say: "Leyendo archivos",
    text: "El modelo pide buscar y leer archivos. El harness ejecuta cada herramienta y devuelve el resultado al contexto.",
    layer: "herramientas",
    active: ["core", "modelo", "herramientas"],
    messages: [
      { from: "modelo", to: "core", label: "busca la sesión" },
      { from: "core", to: "herramientas", label: "grep session", delay: 1300 },
      { from: "herramientas", to: "core", label: "3 archivos", delay: 2600 },
    ],
    context: { add: [{ id: "resultados", label: "Resultados", tokens: 9_000, delay: 3700 }] },
  },
  {
    title: "Hooks y permisos",
    say: "Eso no. Bloqueado.",
    text: "Antes de ejecutar una herramienta, el harness revisa los permisos y corre los hooks configurados, como PreToolUse. Editar archivos pasa; git push --force queda bloqueado.",
    layer: "control",
    active: ["core", "herramientas"],
    messages: [
      { from: "core", to: "herramientas", label: "edita auth.ts" },
      { from: "core", to: "herramientas", label: "git push --force", delay: 1700, blocked: true },
    ],
    context: { add: [{ id: "resultados", label: "Resultados", tokens: 2_000, delay: 1100 }] },
  },
  {
    title: "Verifica",
    say: "Verificando…",
    text: "Corre las pruebas y abre la app en un navegador real con un servidor MCP. Los resultados vuelven al contexto para corregir si algo falla.",
    layer: "evaluacion",
    active: ["core", "herramientas", "navegador"],
    messages: [
      { from: "core", to: "herramientas", label: "npm test" },
      { from: "herramientas", to: "navegador", label: "abre /login", delay: 900 },
      { from: "navegador", to: "herramientas", label: "captura ok", delay: 2100 },
      { from: "herramientas", to: "core", label: "12 de 12 pruebas", delay: 3300 },
    ],
    context: { add: [{ id: "resultados", label: "Resultados", tokens: 6_000, delay: 4400 }] },
  },
  {
    title: "Compacta el contexto",
    say: "Hago espacio",
    text: "Tras muchas vueltas la ventana se llena. El harness pide un resumen de la conversación y lo deja en lugar de los turnos antiguos; la parte fija y la skill en uso se mantienen.",
    layer: "contexto",
    active: ["core", "modelo"],
    messages: [
      { from: "core", to: "modelo", label: "resume lo anterior", delay: 1100 },
      { from: "modelo", to: "core", label: "resumen", delay: 2500 },
    ],
    context: {
      add: [{ id: "turnos", label: "Más turnos", tokens: 146_000 }],
      compact: { delay: 3700, tokens: 7_000 },
    },
  },
  {
    title: "Responde y recuerda",
    say: "Listo, con evidencia",
    text: "La respuesta vuelve con evidencia: los cambios y las pruebas que pasaron. Lo que vale la pena queda en memoria para la próxima sesión.",
    layer: "memoria",
    active: ["core", "usuario", "memoria"],
    messages: [
      { from: "core", to: "usuario", label: "Listo: 12 de 12 pruebas" },
      { from: "core", to: "memoria", label: "callback en /auth/cb", delay: 900 },
    ],
  },
]
