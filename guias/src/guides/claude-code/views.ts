/*
  Separa el contenido de la guía (content.html) en una página por vista.
  Cada vista tiene su URL, su título y su descripción, para que los buscadores
  puedan indexar por separado "hooks de Claude Code", "comandos", etc.
*/
import content from "./content.html?raw";

export const BASE = "/claude-code/";
export const LEVELS = ["basico", "intermedio", "avanzado", "experto"] as const;
export const REFERENCE = ["comandos", "hooks", "skills", "settings", "glosario", "novedades"] as const;
export const VIEWS = ["inicio", ...LEVELS, ...REFERENCE] as const;
export type ViewId = (typeof VIEWS)[number];

export const viewUrl = (v: string) => (v === "inicio" ? BASE : `${BASE}${v}/`);

/** Nombre corto (navegación, migas) y título para buscadores (≤ 60 caracteres). */
export const META: Record<ViewId, { label: string; title: string }> = {
  inicio: { label: "Inicio", title: "Guía de Claude Code en español, de cero a experto" },
  basico: { label: "Básico", title: "Claude Code desde cero: instalación y primeros pasos" },
  intermedio: { label: "Intermedio", title: "Claude Code: permisos, CLAUDE.md, contexto y sesiones" },
  avanzado: { label: "Avanzado", title: "Claude Code avanzado: hooks, subagentes, skills y MCP" },
  experto: { label: "Experto", title: "Claude Code en equipo: CI, SDK, plugins y gobernanza" },
  comandos: { label: "Comandos", title: "Todos los comandos de Claude Code, con ejemplos" },
  hooks: { label: "Hooks", title: "Hooks de Claude Code: eventos, exit codes y recetas" },
  skills: { label: "Skills", title: "Skills de Claude Code: SKILL.md explicado con ejemplos" },
  settings: { label: "Settings", title: "Settings de Claude Code: scopes, precedencia y claves" },
  glosario: { label: "Glosario", title: "Glosario de Claude Code: términos explicados en español" },
  novedades: { label: "Novedades", title: "Novedades de Claude Code: qué cambió en noviembre de 2026" },
};

const INICIO_DESCRIPTION =
  "Guía en español de Claude Code: instalación, permisos, memoria, hooks, skills, subagentes, MCP, CI y gobernanza, con simuladores interactivos.";

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const clip = (s: string, n = 158) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n - 1)) + "…");

/* ---------- cortar content.html ---------- */
const starts = [...content.matchAll(/<section class="view" id="v-([a-z]+)"/g)].map((m) => ({ id: m[1], at: m.index! }));
const footerMatch = content.match(/<footer>[\s\S]*?<\/footer>/);
const sections: Record<string, string> = {};
starts.forEach((s, i) => {
  const end = content.indexOf("</section>", s.at) + "</section>".length;
  if (i + 1 < starts.length && end > starts[i + 1].at) throw new Error(`Vista ${s.id} sin cierre`);
  sections[s.id] = content.slice(s.at, end);
});
for (const v of VIEWS) if (!sections[v]) throw new Error(`Falta la vista ${v} en content.html`);

/** Enlaces "#basico" del contenido pasan a la URL de la vista (rastreables). */
const linkViews = (html: string) =>
  html.replace(/href="#([a-z]+)"/g, (m, id) => ((VIEWS as readonly string[]).includes(id) ? `href="${viewUrl(id)}"` : m));

/** Lecciones por nivel, para calcular el progreso de niveles que no están en la página. */
export const LESSONS: Record<string, string[]> = Object.fromEntries(
  LEVELS.map((l) => [l, [...sections[l].matchAll(/<article class="lesson" id="([a-z0-9]+)"/g)].map((m) => m[1])]),
);
export const WIDGETS = (content.match(/class="wd[ "]/g) || []).length;

export const FOOTER = footerMatch ? footerMatch[0] : "";

export type View = {
  id: ViewId;
  url: string;
  label: string;
  title: string;
  description: string;
  heading: string;
  html: string;
  lessons: { id: string; title: string }[];
};

export const views: View[] = VIEWS.map((id) => {
  const html = sections[id];
  const lead = html.match(/<div class="lvhead">[\s\S]*?<p>([\s\S]*?)<\/p>/);
  const h1 = html.match(/<h1>([\s\S]*?)<\/h1>/);
  return {
    id,
    url: viewUrl(id),
    label: META[id].label,
    title: META[id].title,
    description: id === "inicio" ? INICIO_DESCRIPTION : clip(text(lead ? lead[1] : "")),
    heading: h1 ? text(h1[1]) : META[id].label,
    // la vista ya llega visible: cada página tiene una sola
    html: linkViews(html).replace(`<section class="view" id="v-${id}"`, `<section class="view on" id="v-${id}"`),
    lessons: [...html.matchAll(/<article class="lesson" id="([a-z0-9]+)" data-t="([^"]*)"/g)].map((m) => ({
      id: m[1],
      title: text(m[2]),
    })),
  };
});
