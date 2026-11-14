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
};

export const guides: Guide[] = [
  {
    slug: "claude-code",
    title: "Claude Code",
    tagline: "De tu primer prompt al harness de tu equipo",
    summary:
      "Del primer prompt a diseñar el harness de tu equipo: permisos, memoria, hooks, skills, subagentes, CI y gobernanza. Con simuladores y generadores de configuración.",
    facts: ["4 niveles", "49 lecciones", "4 quizzes", "6 secciones de referencia"],
    progress: { key: "ccacad-v2", total: 53 },
    updated: "noviembre de 2026",
    status: "publicada",
    accent: { light: "#2953c6", sepia: "#3a55a0", dark: "#94abf5" },
    cover: { bg: "#1d2b4f", ink: "#e9c46a" },
  },
  {
    slug: "git",
    title: "Git",
    tagline: "Lo que guarda de verdad y cómo no perder nada",
    summary:
      "Entender qué guarda Git de verdad, y desde ahí: ramas, rebase, conflictos, historial limpio y cómo recuperar lo que creías perdido.",
    facts: [],
    updated: "",
    status: "en preparación",
    accent: { light: "#b4462b", sepia: "#9c3d1f", dark: "#f0937a" },
    cover: { bg: "#5f2216", ink: "#f3d9c4" },
  },
];

export const findGuide = (slug: string) => {
  const g = guides.find((x) => x.slug === slug);
  if (!g) throw new Error(`Guía desconocida: ${slug}`);
  return g;
};
