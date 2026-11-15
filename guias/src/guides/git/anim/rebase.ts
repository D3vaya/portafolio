/*
  Animación: rebase. Git busca la base común, aparta los commits de la rama, mueve la base al final de
  main y los re-aplica uno por uno como copias nuevas (D′, E′). Los originales quedan sin rama.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo } from "./_kit";
import "./rebase.css";

// la historia anterior a B no se dibuja: con 5 columnas el texto se lee mejor en móvil
const B = c("B", 0, 0), C = c("C", 1, 0, "B"), F = c("F", 2, 0, "C");
const D = c("D", 2, 1, "C"), E = c("E", 3, 1, "D");
const Dp = c("D′", 3, 0, "F"), Ep = c("E′", 4, 0, "D′");

type Paso = { g: Grafo; cmd: string; out?: string; rule?: boolean };
const R = "git rebase main";
const PASOS: Paso[] = [
  { cmd: "git switch feature", out: "Switched to branch 'feature'",
    g: { nodes: [B, C, F, D, E], refs: [{ name: "main", at: "F" }, { name: "feature", at: "E" }], head: "feature" } },
  { cmd: "git merge-base main feature", out: "c3d4e5f",
    g: { nodes: [B, { ...C, tone: "hl", msg: "base común" }, F, D, E], refs: [{ name: "main", at: "F" }, { name: "feature", at: "E" }], head: "feature" } },
  { cmd: R,
    g: { nodes: [B, C, { ...F, tone: "hl" }, { ...D, tone: "ghost", msg: "pendiente" }, { ...E, tone: "ghost", msg: "pendiente" }],
      refs: [{ name: "main", at: "F" }, { name: "feature", at: "E" }], head: "F" } },
  { cmd: R,
    g: { nodes: [B, C, F, { ...D, tone: "ghost", msg: "copiado" }, { ...E, tone: "ghost", msg: "pendiente" }, { ...Dp, tone: "copy" }],
      refs: [{ name: "main", at: "F" }, { name: "feature", at: "E" }], head: "D′" } },
  { cmd: R, out: "Successfully rebased and updated refs/heads/feature.",
    g: { nodes: [B, C, F, { ...D, tone: "ghost" }, { ...E, tone: "ghost" }, { ...Dp, tone: "copy" }, { ...Ep, tone: "copy" }],
      refs: [{ name: "main", at: "F" }, { name: "feature", at: "E′" }], head: "feature" } },
  { cmd: "git switch main && git merge feature", out: "Updating f6a7b8c..e1f2a3b\nFast-forward",
    g: { nodes: [B, C, F, { ...D, tone: "ghost", msg: "en reflog" }, { ...E, tone: "ghost", msg: "en reflog" }, { ...Dp, tone: "copy" }, { ...Ep, tone: "copy" }],
      refs: [{ name: "main", at: "E′" }, { name: "feature", at: "E′" }], head: "main" } },
  { cmd: "", rule: true,
    g: { nodes: [B, C, F, { ...D, tone: "ghost", msg: "en reflog" }, { ...E, tone: "ghost", msg: "en reflog" }, { ...Dp, tone: "copy" }, { ...Ep, tone: "copy" }],
      refs: [{ name: "main", at: "E′" }, { name: "feature", at: "E′" }], head: "main" } },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let g: ReturnType<typeof grafo>;
let term: ReturnType<typeof consola>;
let rule: HTMLElement;

export const rebase: Escena = {
  title: "Rebase rehace tus commits sobre otra base",
  steps: [
    { title: "Dos ramas que se separaron", text: "<code>feature</code> salió de C con D y E. Mientras tanto, <code>main</code> avanzó a F. Estás en <code>feature</code>.", ms: 6500 },
    { title: "Busca la base común", text: "<code>git rebase main</code> empieza buscando el último commit que comparten las dos ramas: C. Lo que vino después en tu rama es lo que hay que mover.", ms: 7500 },
    { title: "Aparta D y E", text: "Git guarda D y E como pendientes y se para en F, el final de <code>main</code>, con HEAD separado (ámbar). Esa es la nueva base.", ms: 7500 },
    { title: "Re-aplica D como D′", text: "Aplica el cambio de D encima de F y crea D′: mismo cambio y mensaje, pero otro padre, así que otro hash. Es una copia (lila).", ms: 8000 },
    { title: "Re-aplica E y mueve feature", text: "Lo mismo con E: nace E′. Al terminar, <code>feature</code> salta a E′. D y E quedan sin rama (punteados).", ms: 7500 },
    { title: "Ahora el merge es fast-forward", text: "E′ desciende de F, así que fusionar <code>feature</code> en <code>main</code> solo avanza la etiqueta: sin commit de merge. D y E siguen en <code>git reflog</code> un tiempo.", ms: 8500 },
    { title: "La regla de oro", text: "No hagas rebase de commits que otras personas ya tienen: ellas siguen con D y E, y al traer D′ y E′ tendrán el mismo cambio dos veces.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("rb");
    term = consola(stage);
    const box = document.createElement("div");
    box.className = "rb-graph";
    stage.appendChild(box);
    g = grafo(box, { cols: 5, rows: 2 });
    rule = document.createElement("div");
    rule.className = "rb-rule";
    rule.innerHTML = `<b>Regla de oro</b> Rebase solo en commits que nadie más tiene: tu rama local, antes de compartirla.`;
    stage.appendChild(rule);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-branch"></i>otra rama</span><span><i class="rb-l-det"></i>HEAD separado</span><span><i class="l-copy"></i>copia nueva</span><span><i class="l-ghost"></i>sin rama</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    g.render(p.g, t, instant ? 0 : d);
    rule.classList.toggle("is-on", !!p.rule);
  },
};
