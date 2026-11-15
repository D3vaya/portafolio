export type Guide = {
  slug: string;
  title: string;
  /** Subtítulo corto que va en la portada. */
  tagline: string;
  summary: string;
  /** Short facts shown under the summary on the index. */
  facts: string[];
  updated: string;
  /** Dónde guarda la guía su progreso en localStorage y cuántas lecciones (con quizzes) tiene. */
  progress?: { key: string; total: number };
  status: "publicada" | "en preparación";
  /** Color de la guía para enlaces y progreso, ajustado a cada tema de lectura. */
  accent: { light: string; sepia: string; dark: string };
  /** Portada: fondo y color del título. */
  cover: { bg: string; ink: string };
  /** Color de la señal en su placa de la biblioteca. */
  signal: string;
};

export const guides: Guide[] = [
  {
    slug: "claude-code",
    title: "Claude Code",
    tagline: "De tu primer prompt al harness de tu equipo",
    summary:
      "Del primer prompt a diseñar el harness de tu equipo: permisos, memoria, hooks, skills, subagentes, CI y gobernanza. Con simuladores y generadores de configuración.",
    facts: ["4 niveles", "52 lecciones", "4 quizzes", "6 secciones de referencia"],
    progress: { key: "ccacad-v2", total: 56 },
    updated: "noviembre de 2026",
    status: "publicada",
    accent: { light: "#2953c6", sepia: "#3a55a0", dark: "#94abf5" },
    cover: { bg: "#1d2b4f", ink: "#e9c46a" },
    signal: "#ff5b1f",
  },
  {
    slug: "git",
    title: "Git",
    tagline: "Lo que guarda de verdad y cómo no perder nada",
    summary:
      "Entender qué guarda Git de verdad, y desde ahí: ramas, merge, rebase, conflictos, reset, reflog y Git por dentro. Con 34 animaciones y un laboratorio donde escribes comandos y ves el grafo.",
    facts: ["4 niveles", "42 lecciones", "34 animaciones", "laboratorio interactivo"],
    progress: { key: "gitguia-v1", total: 46 },
    updated: "noviembre de 2026",
    status: "publicada",
    accent: { light: "#b4462b", sepia: "#9c3d1f", dark: "#f0937a" },
    cover: { bg: "#5f2216", ink: "#f3d9c4" },
    signal: "#3ddc97",
  },
];

export const findGuide = (slug: string) => {
  const g = guides.find((x) => x.slug === slug);
  if (!g) throw new Error(`Guía desconocida: ${slug}`);
  return g;
};
