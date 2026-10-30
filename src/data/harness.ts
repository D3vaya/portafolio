// Capas de un harness, de la más externa a la más interna.
export const layers = [
  {
    id: "evaluacion",
    name: "Evaluación",
    lead: "Cómo sé que mejoró.",
    body: "Cambiar un prompt sin evals es adivinar. Defino casos con criterios de éxito, mido la tasa de acierto y reviso la traza de cada fallo antes de dar algo por terminado.",
    practice: [
      "Conjuntos de casos con criterios de éxito explícitos",
      "Trazas paso a paso para encontrar dónde se equivocó el agente",
      "En Carcassonne Latam, el Bot IA se evalúa en partidas completas",
    ],
  },
  {
    id: "orquestacion",
    name: "Orquestación",
    lead: "Muchos agentes, un resultado.",
    body: "Las tareas grandes se dividen: un agente planifica, otros investigan o implementan en paralelo en espacios aislados y otro verifica. El harness hace que se coordinen sin pisarse.",
    practice: [
      "Subagentes con contexto acotado para búsquedas y revisiones",
      "Un worktree aislado por agente para trabajar en paralelo",
      "Flujos con dependencias y verificación cruzada de hallazgos",
    ],
  },
  {
    id: "control",
    name: "Control",
    lead: "Qué pasa antes y después de cada acción.",
    body: "Hooks que validan, bloquean o enriquecen cada llamada. Permisos por herramienta. Lo irreversible pide confirmación; lo rutinario fluye sin interrumpir a nadie.",
    practice: [
      "Hooks antes y después de cada herramienta para formato, pruebas y políticas",
      "Permisos y comandos permitidos definidos por proyecto",
      "Límites de costo y de tiempo por corrida",
    ],
  },
  {
    id: "memoria",
    name: "Memoria",
    lead: "Lo que sobrevive entre sesiones.",
    body: "Sin memoria, cada sesión empieza de cero y repite errores. Con memoria mal curada, el agente arrastra supuestos viejos. Diseño qué se guarda, cuándo se olvida y cómo se verifica.",
    practice: [
      "Memoria persistente con búsqueda semántica entre sesiones",
      "Decisiones guardadas como hechos verificables, no como transcripciones",
    ],
  },
  {
    id: "herramientas",
    name: "Herramientas",
    lead: "Qué puede tocar y con qué contrato.",
    body: "Un agente vale lo que valen sus herramientas. Las diseño como una API: nombres claros, entradas tipadas y errores que le explican al modelo cómo corregir.",
    practice: [
      "Servidores MCP que conectan agentes con datos y servicios reales",
      "En Porteria, un chat que arma KPIs consultando la operación",
      "Navegador controlado por el agente para verificar lo que construye",
    ],
  },
  {
    id: "contexto",
    name: "Contexto",
    lead: "Qué sabe el agente en cada momento.",
    body: "El contexto es un presupuesto. Instrucciones del proyecto, skills que se cargan solo cuando la tarea las necesita y resúmenes en lugar de volcados completos.",
    practice: [
      "Skills empaquetadas por dominio, con instrucciones y scripts propios",
      "Instrucciones por repositorio que fijan convenciones y comandos",
      "Compactación de sesiones largas sin perder decisiones",
    ],
  },
  {
    id: "modelo",
    name: "Modelo",
    lead: "El motor. Por sí solo no termina nada.",
    body: "Elegir modelo es la decisión más visible, pero no la única. Lo que separa una demo de un producto en producción es todo lo que lo rodea: eso es el harness.",
    practice: [
      "Modelo por tarea: razonamiento profundo donde importa, rapidez donde alcanza",
      "Costo por tarea medido, no estimado",
    ],
  },
]

// Una corrida ilustrativa, de la tarea a la entrega. Cada mensaje viaja por una pista
// entre dos nodos del diagrama; `delay` y la duración están en ms.
export type Message = { from: string; to: string; label: string; delay?: number; blocked?: boolean }
export type Step = { title: string; say: string; text: string; layer?: string; active: string[]; messages: Message[] }

export const steps: Step[] = [
  {
    title: "Llega una tarea",
    say: "¡Tarea nueva!",
    text: "Alguien pide algo concreto: agregar inicio de sesión con Google. Claude Code, el harness, la recibe y decide cómo resolverla.",
    active: ["tarea", "core"],
    messages: [{ from: "tarea", to: "core", label: "agrega login con Google" }],
  },
  {
    title: "Carga solo el contexto necesario",
    say: "Cargo solo lo justo",
    text: "No lee todo el repositorio. Trae la skill de autenticación y recuerda una decisión de otra sesión: el proyecto usa Supabase.",
    layer: "contexto",
    active: ["skills", "memoria", "core"],
    messages: [
      { from: "skills", to: "core", label: "skill: auth" },
      { from: "memoria", to: "core", label: "usamos Supabase", delay: 500 },
    ],
  },
  {
    title: "Piensa con el modelo",
    say: "Pensando un plan…",
    text: "Con ese contexto le pide un plan al modelo. El modelo razona; el harness decide qué hacer con la respuesta.",
    layer: "modelo",
    active: ["core", "modelo"],
    messages: [
      { from: "core", to: "modelo", label: "¿cuál es el plan?" },
      { from: "modelo", to: "core", label: "plan en 3 pasos", delay: 1500 },
    ],
  },
  {
    title: "Delega en paralelo",
    say: "Delego en paralelo",
    text: "Lanza subagentes con contexto acotado: uno busca dónde vive la sesión mientras otro ya empieza a implementar.",
    layer: "orquestacion",
    active: ["core", "explorador", "implementador"],
    messages: [
      { from: "core", to: "explorador", label: "¿dónde está la sesión?" },
      { from: "core", to: "implementador", label: "implementa el login", delay: 250 },
      { from: "explorador", to: "core", label: "src/lib/auth.ts", delay: 1600 },
    ],
  },
  {
    title: "Usa herramientas con contrato",
    say: "Abriendo el PR",
    text: "El implementador trabaja con un servidor MCP de GitHub: crea una rama, sube los cambios y abre el pull request.",
    layer: "herramientas",
    active: ["implementador", "github"],
    messages: [{ from: "implementador", to: "github", label: "abre PR #142" }],
  },
  {
    title: "Un hook frena lo peligroso",
    say: "Eso no. Bloqueado.",
    text: "Antes de cada acción corre un hook. Un push forzado a main queda bloqueado sin que una persona tenga que estar vigilando.",
    layer: "control",
    active: ["implementador", "github"],
    messages: [{ from: "implementador", to: "github", label: "git push --force", blocked: true }],
  },
  {
    title: "Verifica antes de entregar",
    say: "Verificando…",
    text: "Un verificador abre la app en un navegador real, prueba el flujo completo y corre los casos de evaluación.",
    layer: "evaluacion",
    active: ["core", "verificador", "navegador"],
    messages: [
      { from: "core", to: "verificador", label: "verifica" },
      { from: "verificador", to: "navegador", label: "abre /login", delay: 1200 },
      { from: "navegador", to: "verificador", label: "captura ok", delay: 2400 },
      { from: "verificador", to: "core", label: "12 de 12 casos", delay: 3600 },
    ],
  },
  {
    title: "Recuerda lo aprendido",
    say: "Anotado para después",
    text: "Guarda lo que vale la pena para la próxima sesión, como un hecho verificable y no como una conversación completa.",
    layer: "memoria",
    active: ["core", "memoria"],
    messages: [{ from: "core", to: "memoria", label: "callback en /auth/cb" }],
  },
  {
    title: "Entrega con evidencia",
    say: "Listo, con evidencia",
    text: "El resultado vuelve con pruebas: el pull request, los casos que pasaron y la captura. Así debería cerrar cualquier tarea de un agente.",
    active: ["core", "tarea"],
    messages: [{ from: "core", to: "tarea", label: "PR listo, 12 de 12" }],
  },
]

// Lo que ofrezco: cada servicio dice para quién es, qué hago y qué queda.
export const services = [
  {
    id: "diagnostico",
    name: "Diagnóstico de tu flujo con agentes",
    when: "Los agentes ya están en uso, pero los resultados son irregulares y nadie sabe bien por qué.",
    what: "Reviso cómo se usan hoy los agentes: qué contexto reciben, qué herramientas tocan, qué se revisa antes de aceptar su trabajo y cuánto cuesta.",
    get: "Un informe con los problemas encontrados y un plan priorizado para resolverlos.",
    layers: ["contexto", "herramientas", "control", "evaluacion"],
  },
  {
    id: "claude-code",
    name: "Claude Code listo para tu equipo",
    when: "Cada persona usa Claude Code a su manera y el resultado depende de quién lo use.",
    what: "Configuro skills, hooks, permisos e instrucciones por repositorio, y conecto por MCP las herramientas que el equipo ya usa.",
    get: "Un harness compartido dentro de tus repositorios, documentado para que el equipo lo mantenga.",
    layers: ["contexto", "control", "memoria", "orquestacion"],
  },
  {
    id: "producto",
    name: "Agentes dentro de tu producto",
    when: "Quieres una funcionalidad con IA que funcione con usuarios reales, no solo en la demo.",
    what: "Diseño las herramientas que usa el agente, sus límites y los casos de evaluación, y lo integro a tu producto.",
    get: "La funcionalidad en producción, con métricas para saber si un cambio la mejora o la empeora.",
    layers: ["modelo", "herramientas", "evaluacion"],
  },
]
