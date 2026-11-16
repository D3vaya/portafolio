/*
  Animación: cherry-pick. Copia un solo commit (el arreglo del IVA) de main a release/1.0: la copia
  H′ tiene el mismo cambio, otro padre y otro hash. El original sigue en main. -x deja constancia.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo, type Nodo } from "./_kit";
import "./cherry-pick.css";

const A = c("A", 0, 0), G = c("G", 1, 0, "A"), H = c("H", 2, 0, "G"), I = c("I", 3, 0, "H");
const R = c("R", 1, 1, "A");
const Hp = c("H′", 2, 1, "R"), Ip = c("I′", 3, 1, "H′");

const REL = "release/1.0";
const refs = (rel: string) => [{ name: "main", at: "I" }, { name: REL, at: rel }];
type Paso = { cmd: string; out?: string; g: Grafo };
const g = (nodes: Nodo[], rel: string): Grafo => ({ nodes, refs: refs(rel), head: REL });

const PASOS: Paso[] = [
  { cmd: `git switch ${REL}`, out: `Switched to branch '${REL}'`, g: g([A, G, { ...H, msg: "IVA" }, I, R], "R") },
  { cmd: "git log --oneline main",
    out: `9e8d7c6 agrega cupones\n<span class="hl">4b5a6c7 arregla cálculo del IVA</span>\n1a2b3c4 nuevo diseño del carrito\n0f1e2d3 primer commit`,
    g: g([A, G, { ...H, tone: "hl", msg: "IVA" }, I, R], "R") },
  { cmd: "git cherry-pick -x 4b5a6c7", out: `[${REL} d1e2f3a] arregla cálculo del IVA\n 1 file changed, 3 insertions(+), 1 deletion(-)`,
    g: g([A, G, { ...H, tone: "hl", msg: "IVA" }, I, R, { ...Hp, tone: "copy" }], "H′") },
  { cmd: "", g: g([A, G, { ...H, tone: "hl", msg: "4b5a6c7" }, I, R, { ...Hp, tone: "copy", msg: "d1e2f3a" }], "H′") },
  { cmd: "git log -1 --format=%B",
    out: `arregla cálculo del IVA\n\n<span class="hl">(cherry picked from commit 4b5a6c7e1f9a3b2c8d0e4f6a7b9c1d3e5f7a9b0c)</span>`,
    g: g([A, G, H, I, R, { ...Hp, tone: "copy" }], "H′") },
  { cmd: "git cherry-pick 9e8d7c6",
    g: g([A, G, H, { ...I, tone: "hl", msg: "dos veces" }, R, { ...Hp, tone: "copy" }, { ...Ip, tone: "copy", msg: "dos veces" }], "I′") },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let gr: ReturnType<typeof grafo>;
let term: ReturnType<typeof consola>;

export const cherryPick: Escena = {
  title: "Cherry-pick copia un commit a otra rama",
  steps: [
    { title: "Dos ramas que divergieron", text: "<code>main</code> sigue avanzando; <code>release/1.0</code> es la versión publicada. En <code>main</code>, el commit H arregla el cálculo del IVA. Estás en <code>release/1.0</code>.", ms: 7500 },
    { title: "Encuentra el commit", text: "Solo quieres ese arreglo, no el resto de <code>main</code>. Busca su hash con <code>git log</code>: <code>4b5a6c7</code>.", ms: 6500 },
    { title: "cherry-pick crea una copia", text: "<code>git cherry-pick</code> aplica el cambio de H sobre tu rama y crea H′ (lila). <code>release/1.0</code> avanza a H′. El resto de <code>main</code> no viene.", ms: 7500 },
    { title: "Mismo cambio, otro commit", text: "H′ tiene el mismo cambio y mensaje, pero otro padre (R), así que otro hash. El original H sigue en <code>main</code>, intacto.", ms: 7500 },
    { title: "-x deja constancia", text: "Con <code>-x</code>, Git agrega al mensaje de qué commit salió la copia. Útil en ramas públicas: cualquiera puede rastrear el original.", ms: 7500 },
    { title: "No reemplaza a merge", text: "Para traer muchos commits, usa merge. Copiarlos uno a uno deja cada cambio dos veces, con hashes distintos, y puede dar conflictos en merges futuros.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("cp");
    term = consola(stage);
    const box = document.createElement("div");
    box.className = "cp-graph";
    stage.appendChild(box);
    gr = grafo(box, { cols: 5, rows: 2 });
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-branch"></i>otra rama</span><span><i class="l-copy"></i>copia (cherry-pick)</span><span><i class="cp-l-hl"></i>commit que copias</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    gr.render(p.g, t, instant ? 0 : d);
  },
};
